/**
 * TipTap 编辑器组件
 * 支持 Markdown 快捷输入
 */
import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '@memai/ui/lib'

interface TiptapEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Enter content...',
  className,
  disabled = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-3 focus:outline-none',
          '[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_blockquote]:my-2',
          '[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg',
          '[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-none',
          '[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-none',
        ),
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // 同步外部 value 变化（用于重置表单）
  useEffect(() => {
    if (editor && value === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.clearContent()
    }
  }, [editor, value])

  return (
    <div
      className={cn(
        'rounded-none border border-input bg-background',
        'focus-within:ring-1 focus-within:ring-ring',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
}

/**
 * 检查 TipTap 内容是否为空
 */
export function isEditorEmpty(html: string): boolean {
  // TipTap 空编辑器返回 <p></p>
  return !html || html === '<p></p>' || html.trim() === ''
}
