/**
 * [DEFINES]: Video Transcript playground 表单 Schema
 * [USED_BY]: VideoTranscriptPage
 * [POS]: Console Video Transcript 表单校验定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { z } from 'zod/v3';

export const videoTranscriptFormSchema = z.object({
  url: z.string().url('Please enter a valid URL').max(2048),
});

export type VideoTranscriptFormValues = z.infer<typeof videoTranscriptFormSchema>;
