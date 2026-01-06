import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma';
import { QuotaService } from '../quota';
import type {
  VectorizeFileDto,
  VectorizeResponseDto,
  VectorizeJobData,
} from './dto/vectorize.dto';
import { VectorizeClient } from './vectorize.client';
import type { UserTier } from '../types';

export const VECTORIZE_QUEUE = 'vectorize-queue';

/** 向量化内容最大大小（字节） */
const MAX_CONTENT_SIZE = 100 * 1024; // 100KB

/** 需要从 sync commit 入队向量化的文件信息 */
export interface SyncFileForVectorize {
  fileId: string;
  fileName: string;
  size: number;
}

/** queueFromSync 返回结果 */
export interface QueueFromSyncResult {
  queued: number;
  skipped: number;
}

@Injectable()
export class VectorizeService {
  private readonly logger = new Logger(VectorizeService.name);

  constructor(
    @InjectQueue(VECTORIZE_QUEUE)
    private readonly vectorizeQueue: Queue<VectorizeJobData>,
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly vectorizeClient: VectorizeClient,
  ) {}

  /**
   * 将文件加入向量化队列
   */
  async queueVectorize(
    userId: string,
    dto: VectorizeFileDto,
  ): Promise<VectorizeResponseDto> {
    // 检查内容大小
    const contentSize = Buffer.byteLength(dto.content, 'utf8');
    if (contentSize > MAX_CONTENT_SIZE) {
      const sizeKB = Math.round(contentSize / 1024);
      const maxKB = Math.round(MAX_CONTENT_SIZE / 1024);
      throw new BadRequestException(
        `Content too large: ${sizeKB}KB exceeds limit of ${maxKB}KB`,
      );
    }

    // 获取用户 tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const tier = (user?.tier as UserTier) || 'free';

    // 检查是否已存在该文件的向量化记录
    const existing = await this.prisma.vectorizedFile.findUnique({
      where: { userId_fileId: { userId, fileId: dto.fileId } },
    });

    // 如果是新文件，检查额度
    if (!existing) {
      const quotaCheck = await this.quotaService.checkVectorizeAllowed(
        userId,
        tier,
      );
      if (!quotaCheck.allowed) {
        throw new BadRequestException(quotaCheck.reason);
      }
    }

    // 加入队列
    await this.vectorizeQueue.add(
      'vectorize',
      {
        userId,
        fileId: dto.fileId,
        vaultId: dto.vaultId,
        fileName: dto.fileName,
        content: dto.content,
      },
      {
        jobId: `${userId}_${dto.fileId}`,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    this.logger.log(`Queued vectorize job for file ${dto.fileId}`);

    return {
      queued: true,
      fileId: dto.fileId,
    };
  }

  /**
   * 删除文件向量
   */
  async deleteVector(userId: string, fileId: string): Promise<void> {
    // 检查是否存在向量化记录
    const record = await this.prisma.vectorizedFile.findUnique({
      where: { userId_fileId: { userId, fileId } },
    });

    if (!record) {
      this.logger.warn(`Vector not found for file ${fileId}`);
      return;
    }

    // 调用 Vectorize Worker 删除向量
    try {
      await this.vectorizeClient.delete([fileId]);
    } catch (error) {
      this.logger.error(`Failed to delete vector from worker: ${error}`);
      // 继续删除数据库记录
    }

    // 删除数据库记录
    await this.prisma.$transaction([
      this.prisma.vectorizedFile.delete({
        where: { userId_fileId: { userId, fileId } },
      }),
      this.prisma.userStorageUsage.update({
        where: { userId },
        data: { vectorizedCount: { decrement: 1 } },
      }),
    ]);

    this.logger.log(`Deleted vector for file ${fileId}`);
  }

  /**
   * 获取文件向量化状态
   */
  async getStatus(
    userId: string,
    fileId: string,
  ): Promise<{
    status: 'vectorized' | 'pending' | 'processing' | 'failed' | 'not_found';
    vectorizedAt?: Date;
    error?: string;
  }> {
    // 检查是否已向量化
    const record = await this.prisma.vectorizedFile.findUnique({
      where: { userId_fileId: { userId, fileId } },
    });

    if (record) {
      return {
        status: 'vectorized',
        vectorizedAt: record.vectorizedAt,
      };
    }

    // 检查队列中的任务状态
    const jobId = `${userId}_${fileId}`;
    const job = await this.vectorizeQueue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();

    switch (state) {
      case 'waiting':
      case 'delayed':
        return { status: 'pending' };
      case 'active':
        return { status: 'processing' };
      case 'failed':
        return {
          status: 'failed',
          error: job.failedReason || 'Unknown error',
        };
      default:
        return { status: 'not_found' };
    }
  }

  /**
   * 从 sync commit 批量入队向量化
   * 用于首次同步或增量同步时，将上传的 Markdown 文件入队向量化
   *
   * @param userId 用户 ID
   * @param vaultId Vault ID
   * @param files 需要向量化的文件列表（已筛选 Markdown 和大小）
   */
  async queueFromSync(
    userId: string,
    vaultId: string,
    files: SyncFileForVectorize[],
  ): Promise<QueueFromSyncResult> {
    if (files.length === 0) {
      return { queued: 0, skipped: 0 };
    }

    // 获取用户 tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const tier = (user?.tier as UserTier) || 'free';

    // 获取已存在的向量化记录（用于判断是否需要检查配额）
    const existingRecords = await this.prisma.vectorizedFile.findMany({
      where: {
        userId,
        fileId: { in: files.map((f) => f.fileId) },
      },
      select: { fileId: true },
    });
    const existingSet = new Set(existingRecords.map((r) => r.fileId));

    // 统计新文件数量（用于配额检查）
    const newFilesCount = files.filter(
      (f) => !existingSet.has(f.fileId),
    ).length;

    // 如果有新文件，检查配额是否足够容纳所有新文件
    if (newFilesCount > 0) {
      const quotaCheck = await this.quotaService.checkVectorizeAllowed(
        userId,
        tier,
        newFilesCount,
      );
      if (!quotaCheck.allowed) {
        this.logger.warn(
          `Vectorize quota exceeded for user ${userId}: ${quotaCheck.reason}`,
        );
        return { queued: 0, skipped: files.length };
      }
    }

    // 批量加入队列
    let queued = 0;
    let skipped = 0;

    for (const file of files) {
      // 跳过超过大小限制的文件
      if (file.size > MAX_CONTENT_SIZE) {
        this.logger.debug(
          `Skipping file ${file.fileId}: size ${file.size} exceeds limit`,
        );
        skipped++;
        continue;
      }

      try {
        await this.vectorizeQueue.add(
          'vectorize',
          {
            userId,
            fileId: file.fileId,
            vaultId,
            fileName: file.fileName,
            // 不传 content，由 Processor 从 R2 读取
          },
          {
            jobId: `${userId}_${file.fileId}`,
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        );
        queued++;
      } catch (error) {
        this.logger.error(
          `Failed to queue vectorize job for file ${file.fileId}: ${error}`,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Queued ${queued} files for vectorization from sync commit (skipped: ${skipped})`,
    );

    return { queued, skipped };
  }
}
