/**
 * [PROPS]: children
 * [EMITS]: none
 * [POS]: 沙盒授权 Provider，监听授权请求并显示弹窗
 */

import { useEffect, useState, useCallback } from 'react'
import type { SandboxAuthRequest } from '@shared/ipc'
import type { AuthChoice } from '@aiget/agents-sandbox'
import { SandboxAuthDialog } from './sandbox-auth-dialog'

interface SandboxAuthProviderProps {
  children: React.ReactNode
}

export function SandboxAuthProvider({ children }: SandboxAuthProviderProps) {
  const [pendingRequest, setPendingRequest] = useState<SandboxAuthRequest | null>(null)

  useEffect(() => {
    const unsubscribe = window.desktopAPI.sandbox.onAuthRequest((request) => {
      setPendingRequest(request)
    })

    return unsubscribe
  }, [])

  const handleResponse = useCallback(async (choice: AuthChoice) => {
    if (!pendingRequest) return

    await window.desktopAPI.sandbox.respondAuth({
      requestId: pendingRequest.requestId,
      choice,
    })

    setPendingRequest(null)
  }, [pendingRequest])

  return (
    <>
      {children}
      <SandboxAuthDialog
        open={pendingRequest !== null}
        path={pendingRequest?.path ?? ''}
        onResponse={handleResponse}
      />
    </>
  )
}
