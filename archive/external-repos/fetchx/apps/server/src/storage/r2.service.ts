/**
 * R2 Storage Service
 * 直接与 Cloudflare R2 交互的服务（通过 S3 兼容 API）
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

// ── 错误类型 ────────────────────────────────────────────────

/** 存储错误码 */
export enum StorageErrorCode {
  /** 文件不存在 */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  /** R2 服务异常 */
  SERVICE_ERROR = 'SERVICE_ERROR',
  /** 未配置 */
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  /** 上传失败 */
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  /** 下载失败 */
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
}

/** 存储异常 */
export class StorageException extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'StorageException';
  }
}

// ── 下载结果类型 ────────────────────────────────────────────

export interface DownloadResult {
  stream: Readable;
  contentLength?: number;
  contentType?: string;
  /** R2 对象元数据（如原始文件名） */
  metadata?: Record<string, string>;
}

// ── 服务实现 ────────────────────────────────────────────────

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly cdnBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.accountId = this.configService.get<string>('R2_ACCOUNT_ID', '');
    this.accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID', '');
    this.secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
      '',
    );
    this.bucketName = this.configService.get<string>(
      'R2_BUCKET_NAME',
      'aiget-screenshots',
    );
    this.cdnBaseUrl = this.configService.get<string>('R2_PUBLIC_URL', '');
  }

  /**
   * 获取 S3 客户端（延迟初始化）
   */
  private getClient(): S3Client {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new StorageException(
          'R2 storage is not configured',
          StorageErrorCode.NOT_CONFIGURED,
        );
      }

      const endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });

      this.logger.log('R2 S3Client initialized');
    }
    return this.client;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return Boolean(this.accountId && this.accessKeyId && this.secretAccessKey);
  }

  /**
   * 生成对象键
   * 格式：{userId}/{vaultId}/{fileId}
   */
  private getObjectKey(
    userId: string,
    vaultId: string,
    fileId: string,
  ): string {
    return `${userId}/${vaultId}/${fileId}`;
  }

  /**
   * 获取文件的公开 CDN URL
   */
  getPublicUrl(userId: string, vaultId: string, fileId: string): string {
    const key = this.getObjectKey(userId, vaultId, fileId);
    return `${this.cdnBaseUrl}/${key}`;
  }

  /**
   * 流式上传文件
   * 使用 @aws-sdk/lib-storage 的 Upload 类支持大文件分片上传
   */
  async uploadStream(
    userId: string,
    vaultId: string,
    fileId: string,
    stream: Readable,
    contentType: string = 'application/octet-stream',
    contentLength?: number,
    metadata?: { filename?: string },
  ): Promise<void> {
    const key = this.getObjectKey(userId, vaultId, fileId);

    try {
      const upload = new Upload({
        client: this.getClient(),
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: stream,
          ContentType: contentType,
          ContentLength: contentLength,
          // 存储原始文件名到 Metadata（Base64 编码以支持非 ASCII 字符）
          Metadata: metadata?.filename
            ? {
                filename: Buffer.from(metadata.filename, 'utf-8').toString(
                  'base64',
                ),
              }
            : undefined,
        },
        // 分片大小：5MB（R2 最小分片大小）
        partSize: 5 * 1024 * 1024,
        // 并发上传数
        queueSize: 4,
      });

      await upload.done();
      this.logger.debug(`Uploaded file (stream): ${key}`);
    } catch (error) {
      this.logger.error(`Upload failed: ${key}`, error);
      throw new StorageException(
        `Failed to upload file: ${key}`,
        StorageErrorCode.UPLOAD_FAILED,
        error,
      );
    }
  }

  /**
   * 上传文件（Buffer 版本，保留兼容性）
   */
  async uploadFile(
    userId: string,
    vaultId: string,
    fileId: string,
    content: Buffer,
    contentType: string = 'application/octet-stream',
    metadata?: { filename?: string },
  ): Promise<void> {
    const key = this.getObjectKey(userId, vaultId, fileId);

    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: content,
          ContentType: contentType,
          // 存储原始文件名到 Metadata（Base64 编码以支持非 ASCII 字符）
          Metadata: metadata?.filename
            ? {
                filename: Buffer.from(metadata.filename, 'utf-8').toString(
                  'base64',
                ),
              }
            : undefined,
        }),
      );

      this.logger.debug(`Uploaded file: ${key}, size: ${content.length}`);
    } catch (error) {
      this.logger.error(`Upload failed: ${key}`, error);
      throw new StorageException(
        `Failed to upload file: ${key}`,
        StorageErrorCode.UPLOAD_FAILED,
        error,
      );
    }
  }

  /**
   * 流式下载文件
   * 返回可读流，避免将整个文件加载到内存
   */
  async downloadStream(
    userId: string,
    vaultId: string,
    fileId: string,
  ): Promise<DownloadResult> {
    const key = this.getObjectKey(userId, vaultId, fileId);

    try {
      const response = await this.getClient().send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new StorageException(
          `File not found: ${key}`,
          StorageErrorCode.FILE_NOT_FOUND,
        );
      }

      this.logger.debug(`Downloading file (stream): ${key}`);

      return {
        stream: response.Body as Readable,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error) {
      // 区分文件不存在和其他错误
      if (error instanceof NoSuchKey) {
        throw new StorageException(
          `File not found: ${key}`,
          StorageErrorCode.FILE_NOT_FOUND,
          error,
        );
      }

      if (error instanceof StorageException) {
        throw error;
      }

      this.logger.error(`Download failed: ${key}`, error);
      throw new StorageException(
        `Failed to download file: ${key}`,
        StorageErrorCode.DOWNLOAD_FAILED,
        error,
      );
    }
  }

  /**
   * 下载文件（Buffer 版本，保留兼容性）
   */
  async downloadFile(
    userId: string,
    vaultId: string,
    fileId: string,
  ): Promise<Buffer> {
    const { stream } = await this.downloadStream(userId, vaultId, fileId);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  /**
   * 删除单个文件
   */
  async deleteFile(
    userId: string,
    vaultId: string,
    fileId: string,
  ): Promise<boolean> {
    try {
      const key = this.getObjectKey(userId, vaultId, fileId);

      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.debug(`Deleted file: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileId}`, error);
      return false;
    }
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(
    userId: string,
    vaultId: string,
    fileIds: string[],
  ): Promise<boolean> {
    if (fileIds.length === 0) {
      return true;
    }

    try {
      const objects = fileIds.map((fileId) => ({
        Key: this.getObjectKey(userId, vaultId, fileId),
      }));

      await this.getClient().send(
        new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: objects,
            Quiet: true,
          },
        }),
      );

      this.logger.debug(`Deleted ${fileIds.length} files`);
      return true;
    } catch (error) {
      this.logger.error('Failed to batch delete files', error);
      return false;
    }
  }
}
