import { DesktopWorkspace } from '@/workspace';
import { authMethods } from '@/lib/server';
import { I18nProvider } from '@/lib/i18n';
import { Toaster } from '@anyhunt/ui/components/sonner';
import { SandboxAuthProvider } from '@/components/sandbox';
import { BindingConflictProvider } from '@/components/cloud-sync';
import { useEffect } from 'react';

export const App = () => {
  useEffect(() => {
    void authMethods.bootstrapAuth();
  }, []);

  return (
    <I18nProvider>
      <SandboxAuthProvider>
        <BindingConflictProvider>
          <DesktopWorkspace />
          <Toaster />
        </BindingConflictProvider>
      </SandboxAuthProvider>
    </I18nProvider>
  );
};
