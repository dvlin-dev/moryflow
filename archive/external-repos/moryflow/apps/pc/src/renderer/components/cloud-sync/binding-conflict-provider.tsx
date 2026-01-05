/**
 * [PROPS]: children
 * [EMITS]: none
 * [POS]: 绑定冲突 Provider，监听冲突请求并显示弹窗
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useEffect, useState, useCallback } from 'react'
import type { BindingConflictRequest, BindingConflictChoice } from '@shared/ipc'
import { BindingConflictDialog } from './binding-conflict-dialog'

interface BindingConflictProviderProps {
  children: React.ReactNode
}

export function BindingConflictProvider({ children }: BindingConflictProviderProps) {
  const [pendingRequest, setPendingRequest] = useState<BindingConflictRequest | null>(null)

  useEffect(() => {
    const unsubscribe = window.desktopAPI.cloudSync.onBindingConflictRequest((request) => {
      setPendingRequest(request)
    })

    return unsubscribe
  }, [])

  const handleChoice = useCallback(
    async (choice: BindingConflictChoice) => {
      if (!pendingRequest) return

      try {
        await window.desktopAPI.cloudSync.respondBindingConflict({
          requestId: pendingRequest.requestId,
          choice,
        })
      } catch (error) {
        console.error('[BindingConflictProvider] failed to respond:', error)
      } finally {
        // 无论成功失败都关闭弹窗，避免卡住
        setPendingRequest(null)
      }
    },
    [pendingRequest]
  )

  return (
    <>
      {children}
      <BindingConflictDialog
        open={pendingRequest !== null}
        vaultName={pendingRequest?.vaultName ?? ''}
        onChoice={handleChoice}
      />
    </>
  )
}
