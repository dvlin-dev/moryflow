/**
 * [PROPS]: { extension, className } - 文件扩展名和样式类
 * [POS]: 根据文件扩展名显示对应图标
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  FileTextIcon,
  FileCodeIcon,
  FileJsonIcon,
  FileImageIcon,
  FileAudioIcon,
  FileVideoIcon,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileIcon,
  FileType2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FileTypeIconProps = {
  extension: string
  className?: string
}

/** 扩展名到图标类型的映射 */
const EXTENSION_MAP: Record<string, React.ElementType> = {
  // 文档
  md: FileTextIcon,
  txt: FileTextIcon,
  doc: FileTextIcon,
  docx: FileTextIcon,
  pdf: FileType2Icon,
  rtf: FileTextIcon,

  // 代码
  ts: FileCodeIcon,
  tsx: FileCodeIcon,
  js: FileCodeIcon,
  jsx: FileCodeIcon,
  py: FileCodeIcon,
  go: FileCodeIcon,
  rs: FileCodeIcon,
  java: FileCodeIcon,
  c: FileCodeIcon,
  cpp: FileCodeIcon,
  h: FileCodeIcon,
  hpp: FileCodeIcon,
  cs: FileCodeIcon,
  rb: FileCodeIcon,
  php: FileCodeIcon,
  swift: FileCodeIcon,
  kt: FileCodeIcon,
  scala: FileCodeIcon,
  vue: FileCodeIcon,
  svelte: FileCodeIcon,
  html: FileCodeIcon,
  htm: FileCodeIcon,
  css: FileCodeIcon,
  scss: FileCodeIcon,
  sass: FileCodeIcon,
  less: FileCodeIcon,
  sql: FileCodeIcon,
  sh: FileCodeIcon,
  bash: FileCodeIcon,
  zsh: FileCodeIcon,
  fish: FileCodeIcon,
  ps1: FileCodeIcon,

  // 数据
  json: FileJsonIcon,
  yaml: FileJsonIcon,
  yml: FileJsonIcon,
  toml: FileJsonIcon,
  xml: FileJsonIcon,
  csv: FileSpreadsheetIcon,
  xls: FileSpreadsheetIcon,
  xlsx: FileSpreadsheetIcon,

  // 图片
  png: FileImageIcon,
  jpg: FileImageIcon,
  jpeg: FileImageIcon,
  gif: FileImageIcon,
  svg: FileImageIcon,
  webp: FileImageIcon,
  ico: FileImageIcon,
  bmp: FileImageIcon,

  // 音频
  mp3: FileAudioIcon,
  wav: FileAudioIcon,
  ogg: FileAudioIcon,
  flac: FileAudioIcon,
  aac: FileAudioIcon,
  m4a: FileAudioIcon,

  // 视频
  mp4: FileVideoIcon,
  mkv: FileVideoIcon,
  avi: FileVideoIcon,
  mov: FileVideoIcon,
  webm: FileVideoIcon,
  wmv: FileVideoIcon,

  // 压缩
  zip: FileArchiveIcon,
  rar: FileArchiveIcon,
  '7z': FileArchiveIcon,
  tar: FileArchiveIcon,
  gz: FileArchiveIcon,
  bz2: FileArchiveIcon,
}

export const FileTypeIcon = ({ extension, className }: FileTypeIconProps) => {
  const ext = extension.toLowerCase()
  const IconComponent = EXTENSION_MAP[ext] ?? FileIcon

  return <IconComponent className={cn('size-4 shrink-0 text-muted-foreground', className)} />
}
