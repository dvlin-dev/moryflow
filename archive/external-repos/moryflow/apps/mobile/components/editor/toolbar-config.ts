/**
 * 编辑器工具栏配置
 */

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Image,
  Table,
  Undo,
  Redo,
  type LucideIcon,
} from 'lucide-react-native'
import type { EditorState, EditorCommand } from '@/lib/editor'

/** 工具栏按钮配置 */
export interface ToolbarButton {
  id: string
  icon: LucideIcon
  command: EditorCommand
  isActive?: (state: EditorState) => boolean
  isDisabled?: (state: EditorState) => boolean
}

/** 工具栏分组 */
export interface ToolbarGroup {
  id: string
  buttons: ToolbarButton[]
}

/** 工具栏配置 */
export const TOOLBAR_GROUPS: ToolbarGroup[] = [
  {
    id: 'history',
    buttons: [
      {
        id: 'undo',
        icon: Undo,
        command: { type: 'undo' },
        isDisabled: (state) => !state.canUndo,
      },
      {
        id: 'redo',
        icon: Redo,
        command: { type: 'redo' },
        isDisabled: (state) => !state.canRedo,
      },
    ],
  },
  {
    id: 'format',
    buttons: [
      {
        id: 'bold',
        icon: Bold,
        command: { type: 'toggleBold' },
        isActive: (state) => state.isBold,
      },
      {
        id: 'italic',
        icon: Italic,
        command: { type: 'toggleItalic' },
        isActive: (state) => state.isItalic,
      },
      {
        id: 'underline',
        icon: Underline,
        command: { type: 'toggleUnderline' },
        isActive: (state) => state.isUnderline,
      },
      {
        id: 'strike',
        icon: Strikethrough,
        command: { type: 'toggleStrike' },
        isActive: (state) => state.isStrike,
      },
    ],
  },
  {
    id: 'heading',
    buttons: [
      {
        id: 'h1',
        icon: Heading1,
        command: { type: 'setHeading', level: 1 },
        isActive: (state) => state.headingLevel === 1,
      },
      {
        id: 'h2',
        icon: Heading2,
        command: { type: 'setHeading', level: 2 },
        isActive: (state) => state.headingLevel === 2,
      },
      {
        id: 'h3',
        icon: Heading3,
        command: { type: 'setHeading', level: 3 },
        isActive: (state) => state.headingLevel === 3,
      },
    ],
  },
  {
    id: 'list',
    buttons: [
      {
        id: 'bulletList',
        icon: List,
        command: { type: 'toggleBulletList' },
        isActive: (state) => state.listType === 'bullet',
      },
      {
        id: 'orderedList',
        icon: ListOrdered,
        command: { type: 'toggleOrderedList' },
        isActive: (state) => state.listType === 'ordered',
      },
      {
        id: 'taskList',
        icon: CheckSquare,
        command: { type: 'toggleTaskList' },
        isActive: (state) => state.listType === 'task',
      },
    ],
  },
  {
    id: 'block',
    buttons: [
      {
        id: 'codeBlock',
        icon: Code,
        command: { type: 'toggleCodeBlock' },
        isActive: (state) => state.isInCodeBlock,
      },
      {
        id: 'blockquote',
        icon: Quote,
        command: { type: 'toggleBlockquote' },
        isActive: (state) => state.isInBlockquote,
      },
    ],
  },
  {
    id: 'insert',
    buttons: [
      {
        id: 'image',
        icon: Image,
        command: { type: 'insertImage', src: '' },
      },
      {
        id: 'table',
        icon: Table,
        command: { type: 'insertTable', rows: 3, cols: 3 },
      },
    ],
  },
]

/** 图片插入请求标记 */
export const IMAGE_REQUEST_MARKER = '__REQUEST_IMAGE__'
