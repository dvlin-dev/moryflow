/**
 * [PROPS]: { attachments } - 附件列表
 * [POS]: 在用户消息气泡下方展示附件（文件引用、图片等）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Tooltip, TooltipContent, TooltipTrigger } from '@anyhunt/ui/components/tooltip'

import type {
  MessageAttachment,
  FileRefAttachment,
  ImageAttachment,
} from '../../types/attachment'
import { isFileRef, isImage } from '../../types/attachment'
import { FileTypeIcon } from './file-type-icon'

type MessageAttachmentsProps = {
  attachments: MessageAttachment[]
}

export const MessageAttachments = ({ attachments }: MessageAttachmentsProps) => {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="mt-1.5 flex flex-col items-end gap-1 pr-2">
      {attachments.map((att) => {
        if (isFileRef(att)) {
          return <FileRefItem key={att.id} attachment={att} />
        }
        if (isImage(att)) {
          return <ImageItem key={att.id} attachment={att} />
        }
        // 其他类型暂不支持
        return null
      })}
    </div>
  )
}

/** 文件引用项 */
const FileRefItem = ({ attachment }: { attachment: FileRefAttachment }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex w-fit max-w-full items-center gap-2 text-sm text-muted-foreground">
        <FileTypeIcon extension={attachment.extension} className="size-4 shrink-0" />
        <span className="truncate">{attachment.name}</span>
      </div>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs">
      <p className="truncate text-xs">{attachment.path}</p>
    </TooltipContent>
  </Tooltip>
)

/** 图片项 - TODO: 实现图片上传后完善 */
const ImageItem = ({ attachment }: { attachment: ImageAttachment }) => (
  <img
    src={attachment.url}
    alt={attachment.alt ?? 'image'}
    className="max-h-32 max-w-48 rounded object-cover"
  />
)
