/**
 * [PROPS]: MessageMetaAttachmentsProps - 结构化附件列表
 * [POS]: 用于展示 file-ref / image 等结构化附件（Lucide icon map）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { HTMLAttributes } from 'react';
import {
  FileCode,
  File,
  FileMusic,
  FileArchive,
  Video,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip';
import { cn } from '../../lib/utils';
import type { ChatAttachment } from '@anyhunt/types';

export type MessageMetaAttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  attachments: ChatAttachment[];
};

type FileRefAttachment = Extract<ChatAttachment, { type: 'file-ref' }>;
type ImageAttachment = Extract<ChatAttachment, { type: 'image' }>;

const EXTENSION_ICON_MAP: Record<string, LucideIcon> = {
  md: File,
  txt: File,
  doc: File,
  docx: File,
  pdf: File,
  rtf: File,
  json: FileCode,
  yaml: FileCode,
  yml: FileCode,
  toml: FileCode,
  xml: FileCode,
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  py: FileCode,
  go: FileCode,
  rs: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  h: FileCode,
  hpp: FileCode,
  cs: FileCode,
  rb: FileCode,
  php: FileCode,
  swift: FileCode,
  kt: FileCode,
  scala: FileCode,
  vue: FileCode,
  svelte: FileCode,
  html: FileCode,
  htm: FileCode,
  css: FileCode,
  scss: FileCode,
  sass: FileCode,
  less: FileCode,
  sql: FileCode,
  sh: FileCode,
  bash: FileCode,
  zsh: FileCode,
  fish: FileCode,
  ps1: FileCode,
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  mp3: FileMusic,
  wav: FileMusic,
  ogg: FileMusic,
  flac: FileMusic,
  aac: FileMusic,
  m4a: FileMusic,
  mp4: Video,
  mkv: Video,
  avi: Video,
  mov: Video,
  webm: Video,
  wmv: Video,
  zip: FileArchive,
  rar: FileArchive,
  '7z': FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  bz2: FileArchive,
};

const isFileRef = (attachment: ChatAttachment): attachment is FileRefAttachment =>
  attachment.type === 'file-ref';

const isImage = (attachment: ChatAttachment): attachment is ImageAttachment =>
  attachment.type === 'image';

const getFileIcon = (extension: string): LucideIcon => {
  const key = extension.toLowerCase();
  return EXTENSION_ICON_MAP[key] ?? File;
};

export const MessageMetaAttachments = ({
  attachments,
  className,
  ...props
}: MessageMetaAttachmentsProps) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn('mt-1.5 flex flex-col items-end gap-1 pr-2', className)} {...props}>
      {attachments.map((attachment) => {
        if (isFileRef(attachment)) {
          return <FileRefItem key={attachment.id} attachment={attachment} />;
        }
        if (isImage(attachment)) {
          return <ImageItem key={attachment.id} attachment={attachment} />;
        }
        return null;
      })}
    </div>
  );
};

const FileRefItem = ({ attachment }: { attachment: FileRefAttachment }) => {
  const IconComponent = getFileIcon(attachment.extension);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-fit max-w-full items-center gap-2 text-sm text-muted-foreground">
          <IconComponent className="size-4 shrink-0" />
          <span className="truncate">{attachment.name}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="truncate text-xs">{attachment.path}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const ImageItem = ({ attachment }: { attachment: ImageAttachment }) => (
  <img
    src={attachment.url}
    alt={attachment.alt ?? 'image'}
    className="max-h-32 max-w-48 rounded object-cover"
  />
);
