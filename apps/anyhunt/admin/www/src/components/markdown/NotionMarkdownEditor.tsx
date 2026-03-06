/**
 * Notion Markdown Editor
 *
 * [PROPS]: value, onChange, placeholder, readOnly
 * [POS]: 管理后台 Markdown 富文本编辑（Markdown ↔ HTML）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';

import { StarterKit } from '@tiptap/starter-kit';
import { Mention } from '@tiptap/extension-mention';
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji';
import { Placeholder } from '@tiptap/extensions';
import { TextAlign } from '@tiptap/extension-text-align';

import {
  HorizontalRule,
  NodeAlignment,
  NodeBackground,
  UiState,
  htmlToMarkdown,
  markdownToHtml,
} from '@moryflow/tiptap';

import '@moryflow/tiptap/styles/notion-editor.scss';

export interface NotionMarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

function safeMarkdownToHtml(markdown: string): string {
  try {
    return markdownToHtml(markdown);
  } catch {
    return '';
  }
}

export function NotionMarkdownEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  readOnly = false,
}: NotionMarkdownEditorProps) {
  const htmlContent = useMemo(() => safeMarkdownToHtml(value), [value]);
  const skipNextSyncRef = useRef(false);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        undoRedo: false,
        horizontalRule: false,
        dropcursor: { width: 2 },
        link: { openOnClick: false },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder, emptyNodeClass: 'is-empty with-slash' }),
      Mention,
      Emoji.configure({
        emojis: gitHubEmojis.filter((emoji) => !emoji.name.includes('regional')),
        forceFallbackImages: true,
      }),
      NodeBackground,
      NodeAlignment,
      UiState,
    ],
    [placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'notion-like-editor',
      },
    },
    content: htmlContent,
    extensions,
    onUpdate: ({ editor }) => {
      const nextMarkdown = htmlToMarkdown(editor.getHTML());
      skipNextSyncRef.current = true;
      onChange(nextMarkdown);
    },
  });

  useEffect(() => {
    if (!editor) return;

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    const currentHtml = editor.getHTML();
    if (currentHtml === htmlContent) return;
    editor.commands.setContent(htmlContent, { emitUpdate: false });
  }, [editor, htmlContent]);

  if (!editor) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-md border border-border bg-background">
        <span className="text-sm text-muted-foreground">Loading editor…</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="notion-editor-root">
        <div className="notion-editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
