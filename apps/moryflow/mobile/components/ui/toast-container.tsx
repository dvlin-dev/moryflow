import React, { useEffect } from 'react'
import { Toast } from './toast'
import { useToast, setGlobalToastHandler } from '@/lib/contexts/toast.context'

export function ToastContainer() {
  const { toastState, showToast, hideToast } = useToast()

  // 设置全局 toast 处理器
  useEffect(() => {
    setGlobalToastHandler(showToast)
  }, [showToast])

  return (
    <Toast
      message={toastState.message}
      visible={toastState.visible}
      variant={toastState.variant}
      onHide={hideToast}
    />
  )
}