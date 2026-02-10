import { DesktopWorkspace } from '@/workspace';
import { AuthProvider } from '@/lib/server';
import { I18nProvider } from '@/lib/i18n';
import { Toaster } from '@anyhunt/ui/components/sonner';
import { SandboxAuthProvider } from '@/components/sandbox';
import { BindingConflictProvider } from '@/components/cloud-sync';

export const App = () => {
  return (
    <I18nProvider>
      <SandboxAuthProvider>
        <BindingConflictProvider>
          <AuthProvider>
            <DesktopWorkspace />
          </AuthProvider>
          <Toaster />
        </BindingConflictProvider>
      </SandboxAuthProvider>
    </I18nProvider>
  );
};
