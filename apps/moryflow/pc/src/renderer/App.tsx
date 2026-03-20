import { DesktopWorkspace } from '@/workspace';
import { authMethods } from '@/lib/server';
import { I18nProvider } from '@/lib/i18n';
import { Toaster } from '@moryflow/ui/components/sonner';
import { SandboxAuthProvider } from '@/components/sandbox';
import { useEffect } from 'react';
import { QuickChatShell } from '@/quick-chat/quick-chat-shell';
import { UpdateToastListener } from '@/components/update-toast-listener';

const resolveRendererMode = (): 'workspace' | 'quick-chat' => {
  if (typeof window === 'undefined') {
    return 'workspace';
  }
  const mode = new URLSearchParams(window.location.search).get('appMode');
  return mode === 'quick-chat' ? 'quick-chat' : 'workspace';
};

export const App = () => {
  const mode = resolveRendererMode();

  useEffect(() => {
    void authMethods.bootstrapAuth();
  }, []);

  return (
    <I18nProvider>
      <SandboxAuthProvider>
        {mode === 'quick-chat' ? <QuickChatShell /> : <DesktopWorkspace />}
        <Toaster />
        <UpdateToastListener />
      </SandboxAuthProvider>
    </I18nProvider>
  );
};
