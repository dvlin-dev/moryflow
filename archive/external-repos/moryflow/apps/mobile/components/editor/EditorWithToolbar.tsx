/**
 * EditorWithToolbar 组件
 * 集成编辑器和工具栏，键盘调起时显示编辑工具栏
 */

import { useCallback, useRef, useState } from 'react'
import { View, Animated } from 'react-native'
import {
  createDefaultEditorState,
  type EditorBridge,
  type EditorState,
  type EditorCommand,
} from '@/lib/editor'
import { useKeyboardHeight } from '@/lib/hooks/use-keyboard-height'
import { EditorWebView } from './EditorWebView'
import { EditorToolbar } from './EditorToolbar'
import { IMAGE_REQUEST_MARKER } from './toolbar-config'

export interface EditorWithToolbarProps {
  /** 初始内容 */
  initialContent?: string
  /** 内容变化回调 */
  onContentChange?: (markdown: string) => void
  /** 是否只读 */
  readOnly?: boolean
  /** 占位符 */
  placeholder?: string
  /** 请求插入图片回调 */
  onRequestImage?: () => Promise<string | null>
  /** Bridge 引用回调 */
  onBridgeReady?: (bridge: EditorBridge) => void
}

export function EditorWithToolbar({
  initialContent = '',
  onContentChange,
  readOnly = false,
  placeholder,
  onRequestImage,
  onBridgeReady,
}: EditorWithToolbarProps) {
  const bridgeRef = useRef<EditorBridge | null>(null)
  const [editorState, setEditorState] = useState<EditorState>(createDefaultEditorState())

  // 键盘高度监听
  const { keyboardHeight, animatedHeight } = useKeyboardHeight()
  
  // 键盘是否打开
  const isKeyboardOpen = keyboardHeight > 0

  // Bridge 就绪回调
  const handleBridgeReady = useCallback(
    (bridge: EditorBridge) => {
      bridgeRef.current = bridge
      onBridgeReady?.(bridge)
    },
    [onBridgeReady]
  )

  // 状态变化
  const handleStateChange = useCallback((state: EditorState) => {
    setEditorState(state)
  }, [])

  // 处理工具栏命令
  const handleCommand = useCallback(
    async (command: EditorCommand) => {
      // 特殊处理图片插入请求
      if (command.type === 'insertImage' && command.src === IMAGE_REQUEST_MARKER) {
        if (onRequestImage) {
          const imageSrc = await onRequestImage()
          if (imageSrc) {
            bridgeRef.current?.insertImage(imageSrc)
          }
        }
        return
      }
      // 发送命令到编辑器
      bridgeRef.current?.sendCommand(command)
    },
    [onRequestImage]
  )

  // 是否显示编辑工具栏（非只读 + 键盘打开）
  const showToolbar = !readOnly && isKeyboardOpen

  return (
    <View className="flex-1 bg-background">
      {/* 编辑器 */}
      <View className="flex-1">
        <EditorWebView
          initialContent={initialContent}
          onContentChange={onContentChange}
          onBridgeReady={handleBridgeReady}
          onStateChange={handleStateChange}
          readOnly={readOnly}
          placeholder={placeholder}
        />
      </View>

      {/* 编辑工具栏 - 仅键盘打开时显示 */}
      {showToolbar && (
        <Animated.View
          className="absolute left-0 right-0"
          style={{ bottom: animatedHeight }}
        >
          <EditorToolbar
            state={editorState}
            onCommand={handleCommand}
            visible
          />
        </Animated.View>
      )}
    </View>
  )
}

