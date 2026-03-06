/**
 * [DEFINES]: RequestLog Query Schemas + Types
 * [USED_BY]: request-log.controller.ts, request-log.service.ts
 * [POS]: RequestLog 模块 DTO 单一数据源（Zod）
 */

import { z } from 'zod';
import {
  REQUEST_LOG_DEFAULT_LIMIT,
  REQUEST_LOG_DEFAULT_PAGE,
  REQUEST_LOG_MAX_LIMIT,
} from '../request-log.constants';

const optionalDateTime = z
  .string()
  .trim()
  .datetime({ offset: true })
  .optional();

const baseTimeRangeSchema = z.object({
  from: optionalDateTime,
  to: optionalDateTime,
});

export const requestLogListQuerySchema = baseTimeRangeSchema.extend({
  page: z.coerce.number().int().min(1).default(REQUEST_LOG_DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(REQUEST_LOG_MAX_LIMIT)
    .default(REQUEST_LOG_DEFAULT_LIMIT),
  statusCode: z.coerce.number().int().min(100).max(599).optional(),
  routeGroup: z.string().trim().min(1).max(64).optional(),
  pathLike: z.string().trim().min(1).max(512).optional(),
  requestId: z.string().trim().min(1).max(128).optional(),
  userId: z.string().trim().min(1).max(128).optional(),
  apiKeyId: z.string().trim().min(1).max(128).optional(),
  clientIp: z.string().trim().min(1).max(128).optional(),
  errorOnly: z.enum(['true', 'false']).optional(),
});

export type RequestLogListQuery = z.infer<typeof requestLogListQuerySchema>;

export const requestLogOverviewQuerySchema = baseTimeRangeSchema;

export type RequestLogOverviewQuery = z.infer<
  typeof requestLogOverviewQuerySchema
>;

export const requestLogUsersQuerySchema = baseTimeRangeSchema.extend({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(REQUEST_LOG_MAX_LIMIT)
    .default(REQUEST_LOG_DEFAULT_LIMIT),
});

export type RequestLogUsersQuery = z.infer<typeof requestLogUsersQuerySchema>;

export const requestLogIpQuerySchema = baseTimeRangeSchema.extend({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(REQUEST_LOG_MAX_LIMIT)
    .default(REQUEST_LOG_DEFAULT_LIMIT),
  clientIp: z.string().trim().min(1).max(128).optional(),
});

export type RequestLogIpQuery = z.infer<typeof requestLogIpQuerySchema>;
