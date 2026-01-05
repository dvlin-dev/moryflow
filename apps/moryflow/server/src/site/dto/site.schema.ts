/**
 * Site Module DTOs - Zod Schemas
 * 站点相关的数据传输对象
 *
 * [DEFINES]: Site request/response schemas
 * [USED_BY]: SiteController, SiteService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SiteType, SiteStatus } from '../../../generated/prisma/enums';
import { SUBDOMAIN_REGEX, RESERVED_SUBDOMAINS } from '../site.constants';

// ==========================================
// Request Schemas
// ==========================================

export const CreateSiteSchema = z.object({
  subdomain: z
    .string()
    .transform((v) => v.toLowerCase().trim())
    .pipe(
      z
        .string()
        .min(3, 'Subdomain must be at least 3 characters')
        .max(32, 'Subdomain must be at most 32 characters')
        .regex(SUBDOMAIN_REGEX, 'Invalid subdomain format')
        .refine(
          (v) => !RESERVED_SUBDOMAINS.includes(v),
          'Subdomain is reserved',
        ),
    ),
  type: z.nativeEnum(SiteType),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export class CreateSiteDto extends createZodDto(CreateSiteSchema) {}

export const UpdateSiteSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  showWatermark: z.boolean().optional(),
});

export class UpdateSiteDto extends createZodDto(UpdateSiteSchema) {}

// ==========================================
// Response Schemas
// ==========================================

export const SiteResponseSchema = z.object({
  id: z.string(),
  subdomain: z.string(),
  type: z.nativeEnum(SiteType),
  status: z.nativeEnum(SiteStatus),
  title: z.string().nullable(),
  description: z.string().nullable(),
  favicon: z.string().nullable(),
  showWatermark: z.boolean(),
  publishedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  url: z.string(),
  pageCount: z.number().int(),
});

export type SiteResponseDto = z.infer<typeof SiteResponseSchema>;

export const SiteListResponseSchema = z.object({
  sites: z.array(SiteResponseSchema),
  total: z.number().int(),
});

export type SiteListResponseDto = z.infer<typeof SiteListResponseSchema>;

export const SubdomainCheckResponseSchema = z.object({
  available: z.boolean(),
  subdomain: z.string(),
  message: z.string().optional(),
});

export type SubdomainCheckResponseDto = z.infer<
  typeof SubdomainCheckResponseSchema
>;

export const SubdomainSuggestResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

export type SubdomainSuggestResponseDto = z.infer<
  typeof SubdomainSuggestResponseSchema
>;
