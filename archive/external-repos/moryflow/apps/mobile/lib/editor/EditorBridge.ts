/**
 * 编辑器桥接层
 * 负责 React Native 与 WebView 之间的双向通信
 */

import type { RefObject } from 'react'
import type WebView from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import type { EditorCommand, EditorMessage, EditorState } from './types'

/** 消息处理器类型 */
type MessageHandler<T extends EditorMessage['type']> = (
  message: Extract<EditorMessage, { type: T }>
) => void

/** 所有消息处理器的映射 */
type MessageHandlers = {
  [K in EditorMessage['type']]?: MessageHandler<K>
}

/**
 * 编辑器桥接类
 * 管理 RN 与 WebView 编辑器之间的通信
 */
export class EditorBridge {
  private webViewRef: RefObject<WebView | null>
  private handlers: MessageHandlers = {}
  private isReady = false
  private pendingCommands: EditorCommand[] = []

  constructor(webViewRef: RefObject<WebView | null>) {
    this.webViewRef = webViewRef
  }

  /**
   * 发送命令到 WebView 编辑器
   */
  sendCommand(command: EditorCommand): void {
    if (!this.isReady) {
      // 编辑器未就绪，缓存命令
      this.pendingCommands.push(command)
      return
    }

    this.executeCommand(command)
  }

  /**
   * 执行命令（内部方法）
   */
  private executeCommand(command: EditorCommand): void {
    const webView = this.webViewRef.current
    if (!webView) {
      console.warn('[EditorBridge] WebView ref is null')
      return
    }

    const script = `
      (function() {
        try {
          if (window.editorBridge && typeof window.editorBridge.handleCommand === 'function') {
            window.editorBridge.handleCommand(${JSON.stringify(command)});
          } else {
            console.error('[EditorBridge] editorBridge not found on window');
          }
        } catch (e) {
          console.error('[EditorBridge] Error executing command:', e);
        }
        return true;
      })();
    `

    webView.injectJavaScript(script)
  }

  /**
   * 处理来自 WebView 的消息
   */
  handleMessage(event: WebViewMessageEvent): void {
    try {
      const message = JSON.parse(event.nativeEvent.data) as EditorMessage

      // 处理 ready 消息
      if (message.type === 'ready') {
        this.isReady = true
        // 执行缓存的命令
        this.pendingCommands.forEach((cmd) => this.executeCommand(cmd))
        this.pendingCommands = []
      }

      // 调用对应的处理器
      const handler = this.handlers[message.type]
      if (handler) {
        // @ts-expect-error - 类型已通过 MessageHandler 约束
        handler(message)
      }
    } catch (error) {
      console.error('[EditorBridge] Failed to parse message:', error)
    }
  }

  /**
   * 注册消息处理器
   */
  on<T extends EditorMessage['type']>(type: T, handler: MessageHandler<T>): () => void {
    // @ts-expect-error - 类型已通过泛型约束
    this.handlers[type] = handler
    return () => {
      delete this.handlers[type]
    }
  }

  /**
   * 移除消息处理器
   */
  off(type: EditorMessage['type']): void {
    delete this.handlers[type]
  }

  /**
   * 检查编辑器是否就绪
   */
  get ready(): boolean {
    return this.isReady
  }

  /**
   * 重置状态（用于 WebView 重新加载时）
   */
  reset(): void {
    this.isReady = false
    this.pendingCommands = []
  }

  // ============ 便捷方法 ============

  /** 设置内容 */
  setContent(markdown: string): void {
    this.sendCommand({ type: 'setContent', markdown })
  }

  /** 获取内容 */
  getContent(): void {
    this.sendCommand({ type: 'getContent' })
  }

  /** 切换加粗 */
  toggleBold(): void {
    this.sendCommand({ type: 'toggleBold' })
  }

  /** 切换斜体 */
  toggleItalic(): void {
    this.sendCommand({ type: 'toggleItalic' })
  }

  /** 切换下划线 */
  toggleUnderline(): void {
    this.sendCommand({ type: 'toggleUnderline' })
  }

  /** 切换删除线 */
  toggleStrike(): void {
    this.sendCommand({ type: 'toggleStrike' })
  }

  /** 设置标题级别 */
  setHeading(level: 0 | 1 | 2 | 3 | 4 | 5 | 6): void {
    this.sendCommand({ type: 'setHeading', level })
  }

  /** 切换无序列表 */
  toggleBulletList(): void {
    this.sendCommand({ type: 'toggleBulletList' })
  }

  /** 切换有序列表 */
  toggleOrderedList(): void {
    this.sendCommand({ type: 'toggleOrderedList' })
  }

  /** 切换任务列表 */
  toggleTaskList(): void {
    this.sendCommand({ type: 'toggleTaskList' })
  }

  /** 切换代码块 */
  toggleCodeBlock(): void {
    this.sendCommand({ type: 'toggleCodeBlock' })
  }

  /** 切换引用块 */
  toggleBlockquote(): void {
    this.sendCommand({ type: 'toggleBlockquote' })
  }

  /** 插入图片 */
  insertImage(src: string, alt?: string): void {
    this.sendCommand({ type: 'insertImage', src, alt })
  }

  /** 插入表格 */
  insertTable(rows: number, cols: number): void {
    this.sendCommand({ type: 'insertTable', rows, cols })
  }

  /** 撤销 */
  undo(): void {
    this.sendCommand({ type: 'undo' })
  }

  /** 重做 */
  redo(): void {
    this.sendCommand({ type: 'redo' })
  }

  /** 聚焦编辑器 */
  focus(): void {
    this.sendCommand({ type: 'focus' })
  }

  /** 取消聚焦 */
  blur(): void {
    this.sendCommand({ type: 'blur' })
  }
}

/**
 * 创建默认的编辑器状态
 */
export function createDefaultEditorState(): EditorState {
  return {
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    headingLevel: 0,
    isInList: false,
    listType: null,
    isInCodeBlock: false,
    isInBlockquote: false,
    canUndo: false,
    canRedo: false,
  }
}
