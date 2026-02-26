/**
 * [PROVIDES]: createNotionEditorExtensions
 * [DEPENDS]: @moryflow/tiptap extensions
 * [POS]: NotionEditor 扩展配置工厂（配置与渲染分层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

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

export function createNotionEditorExtensions(placeholder: string) {
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

