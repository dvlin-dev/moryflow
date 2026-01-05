import { DesktopWorkspace } from '@/workspace'
import { useDesktopWorkspace } from '@/workspace/handle'
import { AuthProvider } from '@/lib/server'
import { I18nProvider } from '@/lib/i18n'
import { Toaster } from '@moryflow/ui/components/sonner'
import { SandboxAuthProvider } from '@/components/sandbox'
import { BindingConflictProvider } from '@/components/cloud-sync'

// 内部组件：确保在 I18nProvider 上下文中调用 useDesktopWorkspace
const WorkspaceContainer = () => {
  const workspace = useDesktopWorkspace()
  return (
    <AuthProvider>
      <DesktopWorkspace {...workspace} />
    </AuthProvider>
  )
}

export const App = () => {
  return (
    <I18nProvider>
      <SandboxAuthProvider>
        <BindingConflictProvider>
          <WorkspaceContainer />
          <Toaster />
        </BindingConflictProvider>
      </SandboxAuthProvider>
    </I18nProvider>
  )
}
