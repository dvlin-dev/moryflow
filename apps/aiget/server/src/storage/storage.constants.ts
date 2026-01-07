/**
 * Storage 模块常量配置
 */

import { HttpStatus } from '@nestjs/common';
import { StorageErrorCode } from './r2.service';

/** 最大上传文件大小：50MB */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/** UUID 格式正则 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** userId 格式正则（better-auth 使用 nanoid 格式） */
export const USER_ID_REGEX = /^[a-zA-Z0-9]{20,40}$/;

/** 错误码到 HTTP 状态码的映射 */
export const ERROR_CODE_TO_HTTP_STATUS: Record<StorageErrorCode, HttpStatus> = {
  [StorageErrorCode.FILE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [StorageErrorCode.SERVICE_ERROR]: HttpStatus.SERVICE_UNAVAILABLE,
  [StorageErrorCode.NOT_CONFIGURED]: HttpStatus.SERVICE_UNAVAILABLE,
  [StorageErrorCode.UPLOAD_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [StorageErrorCode.DOWNLOAD_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
};
