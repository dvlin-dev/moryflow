/**
 * Reader Shell
 *
 * [INPUT]: layout slots (sidebar/list/detail)
 * [OUTPUT]: Desktop Reader shell + shared dialogs
 * [POS]: Reader 路由统一壳层（/welcome, /explore, /topic/*, /inbox/*）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { ReaderLayout } from '@/components/reader/ReaderLayout';
import { ReaderTwoColumnLayout } from '@/components/reader/ReaderTwoColumnLayout';
import { SidePanel } from '@/components/reader/SidePanel';
import { ReaderDialogs } from './ReaderDialogs';
import type { Subscription } from '@/features/digest/types';

type ReaderShellLayout = 'three-pane' | 'two-pane';

interface ReaderShellProps {
  layout: ReaderShellLayout;
  list?: ReactNode;
  detail: ReactNode;
}

export function ReaderShell({ layout, list, detail }: ReaderShellProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogInitialTopic, setCreateDialogInitialTopic] = useState<string | undefined>(
    undefined
  );

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const openCreateSubscription = (initialTopic?: string) => {
    setCreateDialogInitialTopic(initialTopic);
    setCreateDialogOpen(true);
  };

  const openSubscriptionSettings = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setSettingsDialogOpen(true);
  };

  const openPublishTopic = () => setPublishDialogOpen(true);

  const sidebar = (
    <SidePanel
      onCreateSubscription={openCreateSubscription}
      onOpenSubscriptionSettings={openSubscriptionSettings}
    />
  );

  return (
    <>
      {layout === 'three-pane' ? (
        <ReaderLayout sidebar={sidebar} list={list} detail={detail} />
      ) : (
        <ReaderTwoColumnLayout sidebar={sidebar} main={detail} />
      )}

      <ReaderDialogs
        createDialogOpen={createDialogOpen}
        createDialogInitialTopic={createDialogInitialTopic}
        onCreateDialogOpenChange={setCreateDialogOpen}
        settingsDialogOpen={settingsDialogOpen}
        onSettingsDialogOpenChange={setSettingsDialogOpen}
        publishDialogOpen={publishDialogOpen}
        onPublishDialogOpenChange={setPublishDialogOpen}
        selectedSubscription={selectedSubscription}
        onPublishClick={openPublishTopic}
      />
    </>
  );
}
