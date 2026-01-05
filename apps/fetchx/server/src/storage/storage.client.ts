/**
 * Storage Client
 * 生成预签名 URL（指向本服务的 /api/storage 端点）
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { R2Service } from './r2.service';

export interface PresignUrlResult {
  fileId: string;
  url: string;
  expiresAt: number;
}

export interface BatchPresignResult {
  urls: PresignUrlResult[];
}

/** 预签名 URL 默认过期时间（秒） */
const DEFAULT_PRESIGN_EXPIRES_IN = 3600;

@Injectable()
export class StorageClient {
  private readonly serverUrl: string;
  private readonly apiSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly r2Service: R2Service,
  ) {
    // 服务器 URL，用于生成预签名 URL
    // 生产环境应配置为 https://server.moryflow.com
    this.serverUrl = this.configService.get<string>(
      'SERVER_URL',
      'http://localhost:3000',
    );
    this.apiSecret = this.configService.get<string>('STORAGE_API_SECRET', '');
  }

  /**
   * 生成 HMAC-SHA256 签名
   */
  private generateSignature(
    userId: string,
    vaultId: string,
    fileId: string,
    expires: number,
  ): string {
    const data = `${userId}:${vaultId}:${fileId}:${expires}`;
    return createHmac('sha256', this.apiSecret).update(data).digest('hex');
  }

  /**
   * 构建带签名的预签名 URL
   */
  private buildSignedUrl(
    action: 'upload' | 'download',
    userId: string,
    vaultId: string,
    fileId: string,
    contentType?: string,
    filename?: string,
  ): { url: string; expiresAt: number } {
    const expiresAt = Date.now() + DEFAULT_PRESIGN_EXPIRES_IN * 1000;
    const signature = this.generateSignature(
      userId,
      vaultId,
      fileId,
      expiresAt,
    );

    const url = new URL(this.serverUrl);
    url.pathname = `/api/storage/${action}/${userId}/${vaultId}/${fileId}`;
    url.searchParams.set('expires', expiresAt.toString());
    url.searchParams.set('sig', signature);
    if (contentType) {
      url.searchParams.set('contentType', contentType);
    }
    if (filename) {
      url.searchParams.set('filename', filename);
    }

    return { url: url.toString(), expiresAt };
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return this.r2Service.isConfigured() && Boolean(this.apiSecret);
  }

  /**
   * 获取上传预签名 URL
   */
  getUploadUrl(
    userId: string,
    vaultId: string,
    fileId: string,
    contentType: string,
  ): PresignUrlResult {
    const { url, expiresAt } = this.buildSignedUrl(
      'upload',
      userId,
      vaultId,
      fileId,
      contentType,
    );

    return { fileId, url, expiresAt };
  }

  /**
   * 获取下载预签名 URL
   */
  getDownloadUrl(
    userId: string,
    vaultId: string,
    fileId: string,
  ): PresignUrlResult {
    const { url, expiresAt } = this.buildSignedUrl(
      'download',
      userId,
      vaultId,
      fileId,
    );

    return { fileId, url, expiresAt };
  }

  /**
   * 批量获取预签名 URL
   */
  getBatchUrls(
    userId: string,
    vaultId: string,
    files: Array<{
      fileId: string;
      action: 'upload' | 'download';
      contentType?: string;
      filename?: string;
      size?: number;
    }>,
  ): BatchPresignResult {
    if (files.length === 0) {
      return { urls: [] };
    }

    const urls = files.map((file) => {
      const { url, expiresAt } = this.buildSignedUrl(
        file.action,
        userId,
        vaultId,
        file.fileId,
        file.contentType,
        file.filename,
      );
      return { fileId: file.fileId, url, expiresAt };
    });

    return { urls };
  }

  /**
   * 删除单个文件
   */
  async deleteFile(
    userId: string,
    vaultId: string,
    fileId: string,
  ): Promise<boolean> {
    return this.r2Service.deleteFile(userId, vaultId, fileId);
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(
    userId: string,
    vaultId: string,
    fileIds: string[],
  ): Promise<boolean> {
    return this.r2Service.deleteFiles(userId, vaultId, fileIds);
  }
}
