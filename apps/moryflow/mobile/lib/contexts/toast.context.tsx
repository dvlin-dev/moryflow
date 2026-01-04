import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'

export type ToastVariant = 'default' | 'success' | 'error'

interface ToastState {
  visible: boolean
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toastState: ToastState
  showToast: (message: string, variant?: ToastVariant) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: '',
    variant: 'default'
  })

  const showToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    setToastState({
      visible: true,
      message,
      variant
    })
  }, [])

  const hideToast = useCallback(() => {
    setToastState(prev => ({ ...prev, visible: false }))
  }, [])

  return (
    <ToastContext.Provider value={{ toastState, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// 全局 toast 函数
let globalShowToast: ((message: string, variant?: ToastVariant) => void) | null = null

export function setGlobalToastHandler(handler: (message: string, variant?: ToastVariant) => void) {
  globalShowToast = handler
}

export function toast(message: string, variant: ToastVariant = 'default') {
  if (globalShowToast) {
    globalShowToast(message, variant)
  } else {
    console.warn('Toast handler not initialized. Make sure ToastProvider is rendered.')
  }
}