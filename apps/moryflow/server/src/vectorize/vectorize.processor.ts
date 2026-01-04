import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma';
import { R2Service, StorageException, StorageErrorCode } from '../storage';
import { VectorizeClient } from './vectorize.client';
import { VECTORIZE_QUEUE } from './vectorize.service';
import type { VectorizeJobData } from './dto/vectorize.dto';

/**
 * 构建向量化文本
 * 将文件名和内容拼接，确保标题和内容语义都能被检索
 */
function buildVectorText(fileName: string, content: string): string {
  return `文件：${fileName}\n\n${content}`;
}

@Processor(VECTORIZE_QUEUE)
export class VectorizeProcessor extends WorkerHost {
  private readonly logger = new Logger(VectorizeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorizeClient: VectorizeClient,
    private readonly r2Service: R2Service,
  ) {
    super();
  }

  async process(job: Job<VectorizeJobData>): Promise<void> {
    const {
      userId,
      fileId,
      vaultId,
      fileName,
      content: providedContent,
    } = job.data;

    this.logger.log(`Processing vectorize job for file ${fileId}`);

    try {
      // 获取文件内容：优先使用传入的 content，否则从 R2 读取
      let content: string;
      if (providedContent) {
        content = providedContent;
      } else {
        content = await this.readContentFromR2(userId, vaultId, fileId);
      }

      // 构建向量化文本
      const vectorText = buildVectorText(fileName, content);

      // 调用 Vectorize Worker
      await this.vectorizeClient.upsert([
        {
          id: fileId,
          text: vectorText,
          namespace: `user:${userId}`,
          metadata: {
            title: fileName,
            vaultId,
          },
        },
      ]);

      // 使用事务更新数据库记录，避免竞态条件
      await this.prisma.$transaction(async (tx) => {
        // 先检查是否已存在（用于判断是否需要增加计数）
        const existing = await tx.vectorizedFile.findUnique({
          where: { userId_fileId: { userId, fileId } },
          select: { id: true },
        });

        // 使用 upsert 确保原子性
        await tx.vectorizedFile.upsert({
          where: { userId_fileId: { userId, fileId } },
          create: {
            userId,
            fileId,
            title: fileName,
          },
          update: {
            title: fileName,
            vectorizedAt: new Date(),
          },
        });

        // 只有新建时才增加计数
        if (!existing) {
          await tx.userStorageUsage.upsert({
            where: { userId },
            create: {
              userId,
              vectorizedCount: 1,
            },
            update: {
              vectorizedCount: { increment: 1 },
            },
          });
        }
      });

      this.logger.log(`Vectorized file ${fileId} successfully`);
    } catch (error) {
      this.logger.error(`Failed to vectorize file ${fileId}: ${error}`);
      throw error; // 让 BullMQ 重试
    }
  }

  /**
   * 从 R2 读取文件内容
   */
  private async readContentFromR2(
    userId: string,
    vaultId: string,
    fileId: string,
  ): Promise<string> {
    try {
      const buffer = await this.r2Service.downloadFile(userId, vaultId, fileId);
      return buffer.toString('utf-8');
    } catch (error) {
      if (error instanceof StorageException) {
        if (error.code === StorageErrorCode.FILE_NOT_FOUND) {
          throw new Error(`File not found in R2: ${fileId}`);
        }
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read file from R2: ${errorMsg}`);
    }
  }
}
