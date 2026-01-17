/**
 * Notion Markdown Editor
 *
 * [PROPS]: value, onChange, placeholder, readOnly
 * [POS]: 管理后台 Markdown 富文本编辑（Markdown ↔ HTML）
 */

import { useEffect, useMemo, useRef } from 'react';
import { useEditor } from '@tiptap/react';

import { StarterKit } from '@tiptap/starter-kit';
import { Mention } from '@tiptap/extension-mention';
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji';
import { Placeholder } from '@tiptap/extensions';
import { TextAlign } from '@tiptap/extension-text-align';

import { HorizontalRule } from '@anyhunt/tiptap/nodes/horizontal-rule-node/horizontal-rule-node-extension';
import { NodeBackground } from '@anyhunt/tiptap/extensions/node-background-extension';
import { NodeAlignment } from '@anyhunt/tiptap/extensions/node-alignment-extension';
import { UiState } from '@anyhunt/tiptap/extensions/ui-state-extension';
import { markdownToHtml, htmlToMarkdown } from '@anyhunt/tiptap';
import { EditorRoot, EditorContentArea } from '@anyhunt/tiptap/editors/notion-editor';

import '@anyhunt/tiptap/nodes/blockquote-node/blockquote-node.scss';
import '@anyhunt/tiptap/nodes/code-block-node/code-block-node.scss';
import '@anyhunt/tiptap/nodes/horizontal-rule-node/horizontal-rule-node.scss';
import '@anyhunt/tiptap/nodes/list-node/list-node.scss';
import '@anyhunt/tiptap/nodes/heading-node/heading-node.scss';
import '@anyhunt/tiptap/nodes/paragraph-node/paragraph-node.scss';
import '@anyhunt/tiptap/styles/notion-editor.scss';

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
      <EditorRoot editor={editor}>
        <EditorContentArea />
      </EditorRoot>
    </div>
  );
}
