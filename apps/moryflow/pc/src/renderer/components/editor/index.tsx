'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import { useEditor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';

// Utils
import { markdownToHtml, htmlToMarkdown } from '@moryflow/tiptap';
import { createNotionEditorExtensions } from './notion-editor-extensions';
import { NotionEditorLoading } from './notion-editor-loading';
import type { EditorSelectionReferenceInput } from '@/workspace/stores/editor-selection-reference-store';

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
  activeFilePath?: string | null;
  onSelectionReferenceChange?: (payload: EditorSelectionReferenceInput | null) => void;
}

const EXCLUDED_SELECTION_NODE_TYPES = new Set([
  'image',
  'imageUpload',
  'video',
  'audio',
  'table',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
]);

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
  activeFilePath = null,
  onSelectionReferenceChange,
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

  const emitSelectionReference = useCallback(() => {
    if (!editor || !activeFilePath || !onSelectionReferenceChange) {
      return;
    }
    const { selection, doc } = editor.state;
    if (selection.empty || selection instanceof CellSelection) {
      onSelectionReferenceChange(null);
      return;
    }
    if (selection.$from.parent.type.spec.code || selection.$to.parent.type.spec.code) {
      onSelectionReferenceChange(null);
      return;
    }
    if (
      selection instanceof NodeSelection &&
      EXCLUDED_SELECTION_NODE_TYPES.has(selection.node.type.name)
    ) {
      onSelectionReferenceChange(null);
      return;
    }
    const selectedText = doc.textBetween(selection.from, selection.to, '\n', '\n').trim();
    if (selectedText.length === 0) {
      onSelectionReferenceChange(null);
      return;
    }
    onSelectionReferenceChange({
      filePath: activeFilePath,
      text: selectedText,
    });
  }, [activeFilePath, editor, onSelectionReferenceChange]);

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

  useEffect(() => {
    if (!editor || !onSelectionReferenceChange || !activeFilePath) {
      return;
    }
    editor.on('selectionUpdate', emitSelectionReference);
    return () => {
      editor.off('selectionUpdate', emitSelectionReference);
    };
  }, [activeFilePath, editor, emitSelectionReference, onSelectionReferenceChange]);

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
