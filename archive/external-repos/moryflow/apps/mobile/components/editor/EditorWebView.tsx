/**
 * EditorWebView 组件
 * 基于 WebView 的富文本编辑器容器
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { useThemeColors } from '@/lib/theme'
import { Asset } from 'expo-asset'
import {
  EditorBridge,
  createDefaultEditorState,
  type EditorState,
  type EditorWebViewProps,
} from '@/lib/editor'
import { Text } from '@/components/ui/text'

// 编辑器 bundle HTML（构建时生成）
// eslint-disable-next-line @typescript-eslint/no-require-imports
const editorHtmlAsset = require('@/assets/editor-bundle/index.html')

export function EditorWebView({
  initialContent = '',
  onContentChange,
  onReady,
  onBridgeReady,
  onStateChange,
  onSelectionChange,
  onFocusChange,
  onScroll,
  onError,
}: EditorWebViewProps) {
  const theme = useThemeColors()
  const webViewRef = useRef<WebView>(null)
  const bridgeRef = useRef<EditorBridge | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [assetUri, setAssetUri] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [, setEditorState] = useState<EditorState>(createDefaultEditorState())

  // 加载 HTML 资源
  useEffect(() => {
    async function loadAsset() {
      try {
        const asset = Asset.fromModule(editorHtmlAsset)
        await asset.downloadAsync()
        if (asset.localUri) {
          setAssetUri(asset.localUri)
        } else {
          throw new Error('Asset localUri is null')
        }
      } catch (error) {
        console.error('[EditorWebView] Failed to load asset:', error)
        setLoadError(error instanceof Error ? error.message : 'Failed to load editor')
      }
    }
    loadAsset()
  }, [])

  // 初始化 Bridge
  useEffect(() => {
    bridgeRef.current = new EditorBridge(webViewRef)
    return () => {
      bridgeRef.current = null
    }
  }, [])

  // 设置消息处理器
  useEffect(() => {
    const bridge = bridgeRef.current
    if (!bridge) return

    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      bridge.on('ready', () => {
        setIsLoading(false)
        if (initialContent) {
          bridge.setContent(initialContent)
        }
        onBridgeReady?.(bridge)
        onReady?.()
      })
    )

    unsubscribers.push(
      bridge.on('contentChange', (msg) => {
        onContentChange?.(msg.markdown)
      })
    )

    unsubscribers.push(
      bridge.on('stateChange', (msg) => {
        setEditorState(msg.state)
        onStateChange?.(msg.state)
      })
    )

    unsubscribers.push(
      bridge.on('selectionChange', (msg) => {
        onSelectionChange?.(msg.hasSelection, msg.selectedText)
      })
    )

    unsubscribers.push(
      bridge.on('focus', () => {
        onFocusChange?.(true)
      })
    )

    unsubscribers.push(
      bridge.on('blur', () => {
        onFocusChange?.(false)
      })
    )

    unsubscribers.push(
      bridge.on('scroll', () => {
        onScroll?.()
      })
    )

    unsubscribers.push(
      bridge.on('error', (msg) => {
        console.error('[EditorWebView] Error:', msg.message)
        onError?.(msg)
      })
    )

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [initialContent, onContentChange, onReady, onBridgeReady, onStateChange, onSelectionChange, onFocusChange, onScroll, onError])

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    bridgeRef.current?.handleMessage(event)
  }, [])

  const handleError = useCallback(
    (syntheticEvent: { nativeEvent: { description?: string } }) => {
      const { nativeEvent } = syntheticEvent
      console.error('[EditorWebView] WebView error:', nativeEvent)
      onError?.({ message: nativeEvent.description || 'WebView load failed' })
    },
    [onError]
  )

  const injectedJavaScript = `
    (function() {
      document.body.style.backgroundColor = '${theme.background}';
      document.body.style.color = '${theme.foreground}';
      document.querySelector('meta[name="viewport"]')?.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
      true;
    })();
  `

  if (loadError) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-background">
        <Text className="text-destructive text-center">{loadError}</Text>
      </View>
    )
  }

  if (!assetUri) {
    return (
      <View className="flex-1 bg-background">
        <View className="absolute inset-0 justify-center items-center">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text className="text-muted-foreground mt-2">加载编辑器...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <WebView
        ref={webViewRef}
        source={{ uri: assetUri }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onMessage={handleMessage}
        onError={handleError}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={true}
        scrollEnabled
        bounces={false}
        overScrollMode="never"
        originWhitelist={['*']}
      />

      {isLoading && (
        <View className="absolute inset-0 justify-center items-center bg-background">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </View>
  )
}

export function useEditorBridge(webViewRef: React.RefObject<WebView | null>) {
  const bridgeRef = useRef<EditorBridge | null>(null)

  useEffect(() => {
    bridgeRef.current = new EditorBridge(webViewRef)
    return () => {
      bridgeRef.current = null
    }
  }, [webViewRef])

  return bridgeRef.current
}
