/**
 * [PROPS]: children, fallback
 * [EMITS]: none
 * [POS]: WorkspaceSheet 错误边界，捕获子组件渲染错误
 */

import React, { Component, type ReactNode } from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { useTranslation } from '@moryflow/shared-i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// 错误回退内容组件（使用 Hook）
function ErrorFallbackContent() {
  const { t } = useTranslation('workspace')
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
      }}
    >
      <Text style={{ fontSize: 16, color: '#999', textAlign: 'center' }}>
        {t('workspaceLoadError')}
      </Text>
    </View>
  )
}

export class WorkspaceSheetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[WorkspaceSheet] Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return <ErrorFallbackContent />
    }

    return this.props.children
  }
}
