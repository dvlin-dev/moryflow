import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'

type UseMessageEditParams = {
  messageText: string
  onConfirm?: (newContent: string) => void
}

type UseMessageEditResult = {
  isEditing: boolean
  editContent: string
  editSize: { width: number; height: number } | null
  textareaRef: RefObject<HTMLTextAreaElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  setEditContent: (content: string) => void
  startEdit: () => void
  cancelEdit: () => void
  confirmEdit: () => void
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

/**
 * 消息编辑状态管理 hook
 */
export const useMessageEdit = ({ messageText, onConfirm }: UseMessageEditParams): UseMessageEditResult => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editSize, setEditSize] = useState<{ width: number; height: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // 进入编辑时聚焦并移动光标到末尾
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && isEditing) {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }
  }, [isEditing])

  const startEdit = useCallback(() => {
    // 记录原消息内容区域的尺寸
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      setEditSize({ width: rect.width, height: rect.height })
    }
    setEditContent(messageText)
    setIsEditing(true)
  }, [messageText])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditContent('')
    setEditSize(null)
  }, [])

  const confirmEdit = useCallback(() => {
    const trimmed = editContent.trim()
    if (trimmed && trimmed !== messageText) {
      onConfirm?.(trimmed)
    }
    setIsEditing(false)
    setEditContent('')
    setEditSize(null)
  }, [editContent, messageText, onConfirm])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        confirmEdit()
      }
      if (e.key === 'Escape') {
        cancelEdit()
      }
    },
    [confirmEdit, cancelEdit]
  )

  return {
    isEditing,
    editContent,
    editSize,
    textareaRef,
    contentRef,
    setEditContent,
    startEdit,
    cancelEdit,
    confirmEdit,
    handleKeyDown,
  }
}
