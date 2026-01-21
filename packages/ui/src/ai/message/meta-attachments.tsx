/**
 * [PROPS]: MessageMetaAttachmentsProps - 结构化附件列表
 * [POS]: 用于展示 file-ref / image 等结构化附件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { HTMLAttributes } from 'react';
import {
  DocumentCodeIcon,
  File01Icon,
  FileAudioIcon,
  FileZipIcon,
  Video01Icon,
  Xls01Icon,
} from '@hugeicons/core-free-icons';

import { Icon, type HugeIcon } from '../../components/icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip';
import { cn } from '../../lib/utils';
import type { ChatAttachment } from '@anyhunt/types';

export type MessageMetaAttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  attachments: ChatAttachment[];
};

type FileRefAttachment = Extract<ChatAttachment, { type: 'file-ref' }>;
type ImageAttachment = Extract<ChatAttachment, { type: 'image' }>;

const EXTENSION_ICON_MAP: Record<string, HugeIcon> = {
  md: File01Icon,
  txt: File01Icon,
  doc: File01Icon,
  docx: File01Icon,
  pdf: File01Icon,
  rtf: File01Icon,
  json: DocumentCodeIcon,
  yaml: DocumentCodeIcon,
  yml: DocumentCodeIcon,
  toml: DocumentCodeIcon,
  xml: DocumentCodeIcon,
  ts: DocumentCodeIcon,
  tsx: DocumentCodeIcon,
  js: DocumentCodeIcon,
  jsx: DocumentCodeIcon,
  py: DocumentCodeIcon,
  go: DocumentCodeIcon,
  rs: DocumentCodeIcon,
  java: DocumentCodeIcon,
  c: DocumentCodeIcon,
  cpp: DocumentCodeIcon,
  h: DocumentCodeIcon,
  hpp: DocumentCodeIcon,
  cs: DocumentCodeIcon,
  rb: DocumentCodeIcon,
  php: DocumentCodeIcon,
  swift: DocumentCodeIcon,
  kt: DocumentCodeIcon,
  scala: DocumentCodeIcon,
  vue: DocumentCodeIcon,
  svelte: DocumentCodeIcon,
  html: DocumentCodeIcon,
  htm: DocumentCodeIcon,
  css: DocumentCodeIcon,
  scss: DocumentCodeIcon,
  sass: DocumentCodeIcon,
  less: DocumentCodeIcon,
  sql: DocumentCodeIcon,
  sh: DocumentCodeIcon,
  bash: DocumentCodeIcon,
  zsh: DocumentCodeIcon,
  fish: DocumentCodeIcon,
  ps1: DocumentCodeIcon,
  csv: Xls01Icon,
  xls: Xls01Icon,
  xlsx: Xls01Icon,
  mp3: FileAudioIcon,
  wav: FileAudioIcon,
  ogg: FileAudioIcon,
  flac: FileAudioIcon,
  aac: FileAudioIcon,
  m4a: FileAudioIcon,
  mp4: Video01Icon,
  mkv: Video01Icon,
  avi: Video01Icon,
  mov: Video01Icon,
  webm: Video01Icon,
  wmv: Video01Icon,
  zip: FileZipIcon,
  rar: FileZipIcon,
  '7z': FileZipIcon,
  tar: FileZipIcon,
  gz: FileZipIcon,
  bz2: FileZipIcon,
};

const isFileRef = (attachment: ChatAttachment): attachment is FileRefAttachment =>
  attachment.type === 'file-ref';

const isImage = (attachment: ChatAttachment): attachment is ImageAttachment =>
  attachment.type === 'image';

const getFileIcon = (extension: string): HugeIcon => {
  const key = extension.toLowerCase();
  return EXTENSION_ICON_MAP[key] ?? File01Icon;
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
          <Icon icon={IconComponent} className="size-4 shrink-0" />
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
