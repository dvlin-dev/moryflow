import { Suspense, lazy, useEffect, useRef } from 'react'
import type { SettingsSection } from '@/components/settings-dialog/const'

/**
 * 预加载聊天所需的重依赖（streamdown 包含 mermaid/cytoscape，shiki 代码高亮）
 * 使用 requestIdleCallback 在浏览器空闲时加载，不影响首屏渲染
 */
function preloadChatDeps() {
  const preload = () => {
    // 预加载 streamdown（包含 mermaid/cytoscape）
    import('streamdown').catch(() => {})
    // 预加载 shiki（代码高亮）
    import('shiki').catch(() => {})
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 3000 })
  } else {
    setTimeout(preload, 1000)
  }
}

type ChatPaneWrapperProps = {
  fallback: React.ReactNode
  activeFilePath?: string | null
  activeFileContent?: string | null
  vaultPath?: string | null
  onReady?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  onOpenSettings?: (section?: SettingsSection) => void
}

const LazyChatPane = lazy(() =>
  import('@/components/chat-pane').then((mod) => ({
    default: mod.ChatPane
  }))
)

export const ChatPaneWrapper = ({
  fallback,
  activeFilePath,
  activeFileContent,
  vaultPath,
  onReady,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: ChatPaneWrapperProps) => {
  const preloaded = useRef(false)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  // 聊天面板加载后，空闲时预加载重依赖
  useEffect(() => {
    if (!preloaded.current) {
      preloaded.current = true
      preloadChatDeps()
    }
  }, [])

  return (
    <Suspense fallback={fallback}>
      <LazyChatPane
        activeFilePath={activeFilePath ?? undefined}
        activeFileContent={activeFileContent ?? null}
        vaultPath={vaultPath ?? null}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onOpenSettings={onOpenSettings}
      />
    </Suspense>
  )
}
