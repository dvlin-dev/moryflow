/**
 * Storage Controller
 * 文件上传/下载端点（服务端代理模式，流式处理）
 */

import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Req,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { Readable } from 'stream';
import { R2Service, StorageException, StorageErrorCode } from './r2.service';
import { getContentDisposition } from './mime-utils';
import { Public } from '../auth/decorators';
import { SkipResponseWrap } from '../common/decorators';
import {
  MAX_UPLOAD_SIZE,
  UUID_REGEX,
  USER_ID_REGEX,
  ERROR_CODE_TO_HTTP_STATUS,
} from './storage.constants';

@ApiTags('Storage')
@Controller({ path: 'storage', version: '1' })
@SkipResponseWrap()
export class StorageController {
  private readonly logger = new Logger(StorageController.name);
  private readonly apiSecret: string;

  constructor(
    private readonly r2Service: R2Service,
    private readonly configService: ConfigService,
  ) {
    this.apiSecret = this.configService.get<string>('STORAGE_API_SECRET', '');
  }

  /**
   * 将 StorageException 转换为 HttpException
   */
  private toHttpException(error: StorageException): HttpException {
    const status =
      ERROR_CODE_TO_HTTP_STATUS[error.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException(
      {
        message: error.message,
        code: error.code,
      },
      status,
    );
  }

  /**
   * 验证参数格式
   * @throws HttpException 如果格式无效
   */
  private validateParams(
    userId: string,
    vaultId: string,
    fileId: string,
  ): void {
    if (!USER_ID_REGEX.test(userId)) {
      throw new HttpException(
        { message: 'Invalid userId format', code: 'INVALID_PARAM' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!UUID_REGEX.test(vaultId)) {
      throw new HttpException(
        { message: 'Invalid vaultId format', code: 'INVALID_PARAM' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!UUID_REGEX.test(fileId)) {
      throw new HttpException(
        { message: 'Invalid fileId format', code: 'INVALID_PARAM' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 验证请求签名（使用 timing-safe 比较防止时序攻击）
   */
  private verifySignature(
    userId: string,
    vaultId: string,
    fileId: string,
    expires: string,
    signature: string,
  ): boolean {
    // 检查是否过期
    const expiresAt = parseInt(expires, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false;
    }

    // 验证签名（timing-safe comparison）
    const data = `${userId}:${vaultId}:${fileId}:${expiresAt}`;
    const expectedSignature = createHmac('sha256', this.apiSecret)
      .update(data)
      .digest('hex');

    // 长度不同时也需要防止时序攻击
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    );
  }

  /**
   * 创建带大小限制的流
   * 当数据超过限制时会 emit error
   */
  private createSizeLimitedStream(source: Readable, maxSize: number): Readable {
    let totalSize = 0;

    const limited = new Readable({
      read() {},
    });

    source.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        source.destroy();
        limited.destroy(
          new Error(
            `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
          ),
        );
      } else {
        limited.push(chunk);
      }
    });

    source.on('end', () => {
      limited.push(null);
    });

    source.on('error', (err) => {
      limited.destroy(err);
    });

    return limited;
  }

  @Public()
  @Put('upload/:userId/:vaultId/:fileId')
  @ApiOperation({ summary: '上传文件（流式）' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiParam({ name: 'vaultId', description: 'Vault ID' })
  @ApiParam({ name: 'fileId', description: '文件 ID' })
  @ApiQuery({ name: 'expires', description: '过期时间戳' })
  @ApiQuery({ name: 'sig', description: '签名' })
  @ApiQuery({ name: 'filename', description: '原始文件名', required: false })
  async uploadFile(
    @Param('userId') userId: string,
    @Param('vaultId') vaultId: string,
    @Param('fileId') fileId: string,
    @Query('expires') expires: string,
    @Query('sig') signature: string,
    @Query('contentType') contentType: string = 'application/octet-stream',
    @Query('filename') filename: string | undefined,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    this.logger.debug(
      `Upload request: userId=${userId}, vaultId=${vaultId}, fileId=${fileId}, ` +
        `contentType=${contentType}, filename=${filename}`,
    );

    // 验证参数格式
    this.validateParams(userId, vaultId, fileId);

    // 验证签名
    if (!this.verifySignature(userId, vaultId, fileId, expires, signature)) {
      throw new HttpException(
        { message: 'Invalid or expired signature', code: 'INVALID_SIGNATURE' },
        HttpStatus.FORBIDDEN,
      );
    }

    // 检查 R2 是否配置
    if (!this.r2Service.isConfigured()) {
      throw new HttpException(
        {
          message: 'Storage not configured',
          code: StorageErrorCode.NOT_CONFIGURED,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // 检查 Content-Length（如果有）
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_SIZE) {
      throw new HttpException(
        {
          message: `File too large. Maximum size is ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE',
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    try {
      // 创建带大小限制的流
      const limitedStream = this.createSizeLimitedStream(req, MAX_UPLOAD_SIZE);

      // 流式上传到 R2
      await this.r2Service.uploadStream(
        userId,
        vaultId,
        fileId,
        limitedStream,
        contentType,
        contentLength ? parseInt(contentLength, 10) : undefined,
        filename ? { filename } : undefined,
      );

      this.logger.debug(`Uploaded file: ${userId}/${vaultId}/${fileId}`);
      return { success: true };
    } catch (error) {
      // 处理大小限制错误
      if (error instanceof Error && error.message.includes('too large')) {
        throw new HttpException(
          { message: error.message, code: 'FILE_TOO_LARGE' },
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }

      // 处理存储异常
      if (error instanceof StorageException) {
        throw this.toHttpException(error);
      }

      this.logger.error(`Upload failed: ${userId}/${vaultId}/${fileId}`, error);
      throw new HttpException(
        { message: 'Upload failed', code: StorageErrorCode.UPLOAD_FAILED },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('download/:userId/:vaultId/:fileId')
  @ApiOperation({ summary: '下载文件（流式）' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiParam({ name: 'vaultId', description: 'Vault ID' })
  @ApiParam({ name: 'fileId', description: '文件 ID' })
  @ApiQuery({ name: 'expires', description: '过期时间戳' })
  @ApiQuery({ name: 'sig', description: '签名' })
  async downloadFile(
    @Param('userId') userId: string,
    @Param('vaultId') vaultId: string,
    @Param('fileId') fileId: string,
    @Query('expires') expires: string,
    @Query('sig') signature: string,
    @Res() res: Response,
  ): Promise<void> {
    // 验证参数格式
    try {
      this.validateParams(userId, vaultId, fileId);
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse() as {
          message: string;
          code: string;
        };
        res.status(error.getStatus()).json(response);
        return;
      }
      throw error;
    }

    // 验证签名
    if (!this.verifySignature(userId, vaultId, fileId, expires, signature)) {
      res.status(HttpStatus.FORBIDDEN).json({
        message: 'Invalid or expired signature',
        code: 'INVALID_SIGNATURE',
      });
      return;
    }

    // 检查 R2 是否配置
    if (!this.r2Service.isConfigured()) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: 'Storage not configured',
        code: StorageErrorCode.NOT_CONFIGURED,
      });
      return;
    }

    try {
      // 流式下载
      const { stream, contentLength, contentType, metadata } =
        await this.r2Service.downloadStream(userId, vaultId, fileId);

      // 设置响应头
      res.setHeader('Content-Type', contentType ?? 'application/octet-stream');
      if (contentLength !== undefined) {
        res.setHeader('Content-Length', contentLength);
      }

      // 设置 Content-Disposition（如果有原始文件名）
      // Metadata 中的 filename 是 Base64 编码的，需要解码
      const encodedFilename = metadata?.filename;
      if (encodedFilename) {
        const originalFilename = Buffer.from(
          encodedFilename,
          'base64',
        ).toString('utf-8');
        res.setHeader(
          'Content-Disposition',
          getContentDisposition(originalFilename),
        );
      }

      // 流式传输到客户端
      stream.pipe(res);

      stream.on('error', (err) => {
        this.logger.error(
          `Stream error during download: ${userId}/${vaultId}/${fileId}`,
          err,
        );
        // 如果响应还没开始发送，返回错误
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Download failed',
            code: StorageErrorCode.DOWNLOAD_FAILED,
          });
        }
      });

      this.logger.debug(`Downloading file: ${userId}/${vaultId}/${fileId}`);
    } catch (error) {
      // 处理存储异常
      if (error instanceof StorageException) {
        const status =
          ERROR_CODE_TO_HTTP_STATUS[error.code] ??
          HttpStatus.INTERNAL_SERVER_ERROR;
        res.status(status).json({
          message: error.message,
          code: error.code,
        });
        return;
      }

      this.logger.error(
        `Download failed: ${userId}/${vaultId}/${fileId}`,
        error,
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Download failed',
        code: StorageErrorCode.DOWNLOAD_FAILED,
      });
    }
  }
}
