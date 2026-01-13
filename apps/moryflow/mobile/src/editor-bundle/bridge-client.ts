/**
 * WebView 端 Bridge Client
 * 处理来自 React Native 的命令，发送事件到 React Native
 */

import type { Editor } from '@tiptap/react';
import { markdownToHtml, htmlToMarkdown } from '@aiget/tiptap';

// ============ 类型定义 ============

/** 编辑器状态 */
export interface EditorState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  headingLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isInList: boolean;
  listType: 'bullet' | 'ordered' | 'task' | null;
  isInCodeBlock: boolean;
  isInBlockquote: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

/** 发送到 RN 的消息类型 */
export type EditorMessage =
  | { type: 'ready' }
  | { type: 'contentChange'; html: string; markdown: string }
  | { type: 'stateChange'; state: EditorState }
  | { type: 'selectionChange'; hasSelection: boolean; selectedText: string }
  | { type: 'focus' }
  | { type: 'blur' }
  | { type: 'scroll' }
  | { type: 'error'; message: string; stack?: string }
  | { type: 'requestImage' };

/** 从 RN 接收的命令类型 */
export type EditorCommand =
  | { type: 'setContent'; markdown: string }
  | { type: 'getContent' }
  | { type: 'toggleBold' }
  | { type: 'toggleItalic' }
  | { type: 'toggleUnderline' }
  | { type: 'toggleStrike' }
  | { type: 'setHeading'; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'toggleBulletList' }
  | { type: 'toggleOrderedList' }
  | { type: 'toggleTaskList' }
  | { type: 'toggleCodeBlock' }
  | { type: 'toggleBlockquote' }
  | { type: 'insertImage'; src: string; alt?: string }
  | { type: 'insertTable'; rows: number; cols: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'focus' }
  | { type: 'blur' };

// ============ Bridge Client ============

/**
 * WebView 端桥接客户端
 * 负责处理来自 RN 的命令，并将编辑器事件发送到 RN
 */
export class BridgeClient {
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupEventListeners();
  }

  /** 处理来自 RN 的命令 */
  handleCommand(command: EditorCommand): void {
    try {
      switch (command.type) {
        case 'setContent':
          this.editor.commands.setContent(markdownToHtml(command.markdown));
          break;
        case 'getContent':
          this.sendMessage({
            type: 'contentChange',
            html: this.editor.getHTML(),
            markdown: htmlToMarkdown(this.editor.getHTML()),
          });
          break;
        case 'toggleBold':
          this.editor.chain().focus().toggleBold().run();
          break;
        case 'toggleItalic':
          this.editor.chain().focus().toggleItalic().run();
          break;
        case 'toggleUnderline':
          this.editor.chain().focus().toggleUnderline().run();
          break;
        case 'toggleStrike':
          this.editor.chain().focus().toggleStrike().run();
          break;
        case 'setHeading':
          if (command.level === 0) {
            this.editor.chain().focus().setParagraph().run();
          } else {
            this.editor.chain().focus().toggleHeading({ level: command.level }).run();
          }
          break;
        case 'toggleBulletList':
          this.editor.chain().focus().toggleBulletList().run();
          break;
        case 'toggleOrderedList':
          this.editor.chain().focus().toggleOrderedList().run();
          break;
        case 'toggleTaskList':
          this.editor.chain().focus().toggleTaskList().run();
          break;
        case 'toggleCodeBlock':
          this.editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'toggleBlockquote':
          this.editor.chain().focus().toggleBlockquote().run();
          break;
        case 'insertImage':
          this.editor.chain().focus().setImage({ src: command.src, alt: command.alt }).run();
          break;
        case 'insertTable':
          this.editor
            .chain()
            .focus()
            .insertTable({
              rows: command.rows,
              cols: command.cols,
              withHeaderRow: true,
            })
            .run();
          break;
        case 'undo':
          this.editor.chain().focus().undo().run();
          break;
        case 'redo':
          this.editor.chain().focus().redo().run();
          break;
        case 'focus':
          this.editor.commands.focus();
          break;
        case 'blur':
          this.editor.commands.blur();
          break;
      }
    } catch (error) {
      this.sendMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /** 发送消息到 RN */
  sendMessage(message: EditorMessage): void {
    // ReactNativeWebView 由 react-native-webview 注入到 window
    const rn = (
      window as Window & {
        ReactNativeWebView?: { postMessage: (message: string) => void };
      }
    ).ReactNativeWebView;
    if (rn && typeof rn.postMessage === 'function') {
      rn.postMessage(JSON.stringify(message));
    }
  }

  /** 设置编辑器事件监听 */
  private setupEventListeners(): void {
    // 内容变化
    this.editor.on('update', () => {
      this.sendMessage({
        type: 'contentChange',
        html: this.editor.getHTML(),
        markdown: htmlToMarkdown(this.editor.getHTML()),
      });
    });

    // 选区/状态变化
    this.editor.on('selectionUpdate', () => {
      this.sendMessage({
        type: 'stateChange',
        state: this.getEditorState(),
      });

      const { from, to } = this.editor.state.selection;
      const hasSelection = from !== to;
      this.sendMessage({
        type: 'selectionChange',
        hasSelection,
        selectedText: hasSelection ? this.editor.state.doc.textBetween(from, to) : '',
      });
    });

    // 焦点变化
    this.editor.on('focus', () => this.sendMessage({ type: 'focus' }));
    this.editor.on('blur', () => this.sendMessage({ type: 'blur' }));

    // 滚动事件（用于隐藏浮动工具栏）
    const editorElement = this.editor.view.dom;
    editorElement.addEventListener(
      'scroll',
      () => {
        this.sendMessage({ type: 'scroll' });
      },
      { passive: true }
    );
  }

  /** 获取当前编辑器状态 */
  private getEditorState(): EditorState {
    return {
      isBold: this.editor.isActive('bold'),
      isItalic: this.editor.isActive('italic'),
      isUnderline: this.editor.isActive('underline'),
      isStrike: this.editor.isActive('strike'),
      headingLevel: this.getHeadingLevel(),
      isInList: this.editor.isActive('bulletList') || this.editor.isActive('orderedList'),
      listType: this.getListType(),
      isInCodeBlock: this.editor.isActive('codeBlock'),
      isInBlockquote: this.editor.isActive('blockquote'),
      canUndo: this.editor.can().undo(),
      canRedo: this.editor.can().redo(),
    };
  }

  private getHeadingLevel(): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
    for (let level = 1; level <= 6; level++) {
      if (this.editor.isActive('heading', { level })) {
        return level as 1 | 2 | 3 | 4 | 5 | 6;
      }
    }
    return 0;
  }

  private getListType(): 'bullet' | 'ordered' | 'task' | null {
    if (this.editor.isActive('taskList')) return 'task';
    if (this.editor.isActive('bulletList')) return 'bullet';
    if (this.editor.isActive('orderedList')) return 'ordered';
    return null;
  }
}
