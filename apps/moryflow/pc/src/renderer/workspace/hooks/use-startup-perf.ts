import { useCallback, useEffect, useRef } from 'react'
import type { ActiveDocument, RequestState } from '../const'
import { preloadRegistry } from '../preload-registry'
import { preloadChunks } from '../preload-service'
// 从独立文件导入 hash 常量，避免静态导入导致 chunk 无法拆分
import {
  SHIKI_CHUNK_HASH,
  SETTINGS_CHUNK_HASH,
} from '../chunk-hashes'

// Helper functions to access requestIdleCallback APIs that may not be defined in all browsers
function hasRequestIdleCallback(): boolean {
  return typeof window.requestIdleCallback === 'function'
}

function scheduleIdleTask(cb: () => void, timeout?: number): number | null {
  if (hasRequestIdleCallback()) {
    return window.requestIdleCallback(cb, timeout ? { timeout } : undefined)
  }
  return null
}

function cancelIdleTask(id: number): void {
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id)
  }
}

export const usePerfMarker = () => {
  const marked = useRef<Set<string>>(new Set())
  return useCallback((name: string) => {
    if (typeof performance === 'undefined') return
    if (marked.current.has(name)) return
    performance.mark(name)
    marked.current.add(name)
  }, [])
}

export const useStartupPerfMarks = ({
  treeState,
  treeLength,
  activeDoc,
  docState,
  markOnce,
}: {
  treeState: RequestState
  treeLength: number
  activeDoc: ActiveDocument | null
  docState: RequestState
  markOnce: (name: string) => void
}) => {
  useEffect(() => {
    markOnce('startup:skeleton-visible')
  }, [markOnce])

  useEffect(() => {
    const handleFirstInteraction = () => {
      markOnce('startup:first-interaction')
      window.removeEventListener('pointerdown', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true })
    window.addEventListener('keydown', handleFirstInteraction, { once: true })
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [markOnce])

  useEffect(() => {
    if (treeState === 'idle' && treeLength > 0) {
      markOnce('startup:tree-ready')
      markOnce('watcher:ready')
    }
  }, [treeState, treeLength, markOnce])

  useEffect(() => {
    if (activeDoc && docState === 'idle') {
      markOnce('editor:ready')
    }
  }, [activeDoc, docState, markOnce])
}

export const useWorkspaceChunkPreload = ({
  markOnce,
  handleChatReady,
}: {
  markOnce: (name: string) => void
  handleChatReady: () => void
}) => {
  useEffect(() => {
    const scheduleIdle = (cb: () => void) => {
      const id = scheduleIdleTask(cb, 1500)
      if (id !== null) {
        return () => cancelIdleTask(id)
      }
      const timer = setTimeout(cb, 500)
      return () => clearTimeout(timer)
    }

    const cancel = scheduleIdle(() => {
      const editorStart = 'editor:chunk-load-start'
      const chatStart = 'chat:chunk-load-start'
      markOnce(editorStart)
      markOnce(chatStart)
      void preloadChunks([
        {
          key: 'editor',
          hash: undefined,
          loader: async () => {
            const mod = await import('@/components/editor')
            preloadRegistry.set('editor', mod, undefined)
            markOnce('editor:chunk-load-end')
            if (performance?.measure) {
              performance.measure('editor:chunk-loaded', editorStart, 'editor:chunk-load-end')
            }
            return mod
          }
        },
        {
          key: 'chat',
          hash: undefined,
          loader: async () => {
            const mod = await import('@/components/chat-pane')
            preloadRegistry.set('chat', mod, mod.CHAT_CHUNK_HASH)
            markOnce('chat:chunk-load-end')
            if (performance?.measure) {
              performance.measure('chat:chunk-loaded', chatStart, 'chat:chunk-load-end')
            }
            handleChatReady()
            return mod
          }
        },
        {
          key: 'shiki',
          hash: SHIKI_CHUNK_HASH,
          loader: async () => {
            const mod = await import('@anyhunt/ui/ai/code-block')
            preloadRegistry.set('shiki', mod, mod.SHIKI_CHUNK_HASH)
            return mod
          }
        },
        {
          key: 'settings-dialog',
          hash: SETTINGS_CHUNK_HASH,
          loader: async () => {
            const mod = await import('@/components/settings-dialog')
            preloadRegistry.set('settings-dialog', mod, mod.SETTINGS_CHUNK_HASH)
            return mod
          }
        }
      ])
    })

    return () => {
      cancel?.()
    }
  }, [markOnce, handleChatReady])
}
