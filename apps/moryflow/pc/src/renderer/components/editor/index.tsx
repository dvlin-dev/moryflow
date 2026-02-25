'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useEditor } from '@tiptap/react';

// Tiptap Core Extensions
import { StarterKit } from '@tiptap/starter-kit';
import { Mention } from '@tiptap/extension-mention';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { Placeholder, Selection } from '@tiptap/extensions';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Mathematics } from '@tiptap/extension-mathematics';
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji';

// Custom Extensions
import { HorizontalRule } from '@moryflow/tiptap/nodes/horizontal-rule-node/horizontal-rule-node-extension';
import { Image } from '@moryflow/tiptap/nodes/image-node/image-node-extension';
import { NodeBackground } from '@moryflow/tiptap/extensions/node-background-extension';
import { NodeAlignment } from '@moryflow/tiptap/extensions/node-alignment-extension';
import { UiState } from '@moryflow/tiptap/extensions/ui-state-extension';
import { ImageUploadNode } from '@moryflow/tiptap/nodes/image-upload-node/image-upload-node-extension';
import { TableKit } from '@moryflow/tiptap/nodes/table-node/extensions/table-node-extension';
import { TableHandleExtension } from '@moryflow/tiptap/nodes/table-node/extensions/table-handle';

// Utils
import { handleImageUpload, MAX_FILE_SIZE } from '@moryflow/tiptap/utils/tiptap-utils';
import { markdownToHtml, htmlToMarkdown } from '@moryflow/tiptap';

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
 * 加载中占位组件
 */
function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <svg
          className="size-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

/**
 * 创建编辑器扩展配置
 */
function createEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      undoRedo: false,
      horizontalRule: false,
      dropcursor: { width: 2 },
      link: { openOnClick: false },
    }),
    HorizontalRule,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({
      placeholder,
      emptyNodeClass: 'is-empty with-slash',
    }),
    Mention,
    Emoji.configure({
      emojis: gitHubEmojis.filter((emoji) => !emoji.name.includes('regional')),
      forceFallbackImages: true,
    }),
    TableKit.configure({
      table: { resizable: true, cellMinWidth: 120 },
    }),
    NodeBackground,
    NodeAlignment,
    UiState,
    TextStyle,
    Mathematics,
    Superscript,
    Subscript,
    Color,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    Selection,
    Image,
    TableHandleExtension,
    ImageUploadNode.configure({
      accept: 'image/*',
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: handleImageUpload,
      onError: (error) => console.error('Upload failed:', error),
    }),
    Typography,
  ];
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
  const extensions = useMemo(() => createEditorExtensions(placeholder), [placeholder]);

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
    return <LoadingSpinner />;
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
