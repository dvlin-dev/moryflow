'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useEditor } from '@tiptap/react';

// Utils
import { markdownToHtml, htmlToMarkdown } from '@moryflow/tiptap';
import { createNotionEditorExtensions } from './notion-editor-extensions';
import { NotionEditorLoading } from './notion-editor-loading';

// Editor Components
import { EditorRoot, EditorContentArea } from '@moryflow/tiptap/editors/notion-editor';
import { TableHandle } from '@moryflow/tiptap/nodes/table-node/ui/table-handle/table-handle';
import { TableSelectionOverlay } from '@moryflow/tiptap/nodes/table-node/ui/table-selection-overlay';
import { TableCellHandleMenu } from '@moryflow/tiptap/nodes/table-node/ui/table-cell-handle-menu';
import { TableExtendRowColumnButtons } from '@moryflow/tiptap/nodes/table-node/ui/table-extend-row-column-button';

// Styles
import '@moryflow/tiptap/nodes/table-node/styles/prosemirror-table.scss';
import '@moryflow/tiptap/nodes/table-node/styles/table-node.scss';
import '@moryflow/tiptap/nodes/blockquote-node/blockquote-node.scss';
import '@moryflow/tiptap/nodes/code-block-node/code-block-node.scss';
import '@moryflow/tiptap/nodes/horizontal-rule-node/horizontal-rule-node.scss';
import '@moryflow/tiptap/nodes/list-node/list-node.scss';
import '@moryflow/tiptap/nodes/image-node/image-node.scss';
import '@moryflow/tiptap/nodes/heading-node/heading-node.scss';
import '@moryflow/tiptap/nodes/paragraph-node/paragraph-node.scss';
import '@moryflow/tiptap/styles/notion-editor.scss';

export interface NotionEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * Notion 风格编辑器（业务层封装）
 *
 * 处理：
 * - Markdown ↔ HTML 转换
 * - Editor 实例创建和配置
 * - 扩展加载
 */
export function NotionEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  readOnly = false,
}: NotionEditorProps) {
  const htmlContent = useMemo(() => markdownToHtml(value), [value]);
  const skipNextSyncRef = useRef(false);

  // 缓存 extensions 配置，避免每次渲染重新创建
  const extensions = useMemo(() => createNotionEditorExtensions(placeholder), [placeholder]);

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
      // 标记本次更新来自内部，下一次 sync 应跳过
      skipNextSyncRef.current = true;
      onChange(nextMarkdown);
    },
  });

  // 外部 value 变化时同步内容
  useEffect(() => {
    if (!editor) return;

    // 如果是内部触发的更新，跳过同步
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    // 内容相同则不更新
    const currentHtml = editor.getHTML();
    if (currentHtml === htmlContent) {
      return;
    }

    editor.commands.setContent(htmlContent, { emitUpdate: false });
  }, [editor, htmlContent]);

  if (!editor) {
    return <NotionEditorLoading />;
  }

  return (
    <EditorRoot editor={editor}>
      <EditorContentArea>
        {/* Table 组件 */}
        <TableExtendRowColumnButtons />
        <TableHandle />
        <TableSelectionOverlay
          showResizeHandles
          cellMenu={(props) => (
            <TableCellHandleMenu
              editor={props.editor}
              onMouseDown={(e) => props.onResizeStart?.('br')(e)}
            />
          )}
        />
      </EditorContentArea>
    </EditorRoot>
  );
}
