/**
 * Reader Shell
 *
 * [INPUT]: layout slots (sidebar/list/detail)
 * [OUTPUT]: Desktop Reader shell + shared dialogs
 * [POS]: Reader 路由统一壳层（/welcome, /explore, /topic/*, /inbox/*）
 * [UPDATE]: 2026-01-28 修复创建订阅时点击事件误传导致初始主题异常
 * [UPDATE]: 2026-01-28 移动端底部导航与 Reader 移动布局重构
 * [UPDATE]: 2026-01-28 移动端与桌面端改为响应式渲染，避免首屏闪烁
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { ReaderLayout } from '@/components/reader/ReaderLayout';
import { ReaderTwoColumnLayout } from '@/components/reader/ReaderTwoColumnLayout';
import { MobileReaderPane } from '@/components/reader/MobileReaderPane';
import { MobileReaderScaffold } from '@/components/reader/MobileReaderScaffold';
import { MobileDetailHeader } from '@/components/reader/MobileDetailHeader';
import { SidePanel } from '@/components/reader/SidePanel';
import { ReaderDialogs } from './ReaderDialogs';
import type { Subscription } from '@/features/digest/types';
import { normalizeInitialTopic } from './initialTopic';
import {
  getActiveMobileTab,
  getMobileBackTarget,
  getMobilePane,
  shouldShowMobileTabs,
} from './mobile-reader-state';
import { ReaderActionsProvider } from './reader-actions';

type ReaderShellLayout = 'three-pane' | 'two-pane';

interface ReaderShellProps {
  layout: ReaderShellLayout;
  list?: ReactNode;
  detail: ReactNode;
}

export function ReaderShell({ layout, list, detail }: ReaderShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogInitialTopic, setCreateDialogInitialTopic] = useState<string | undefined>(
    undefined
  );

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsDialogTab, setSettingsDialogTab] = useState<
    'basic' | 'history' | 'suggestions' | 'notifications'
  >('basic');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const openCreateSubscription = (initialTopic?: string) => {
    setCreateDialogInitialTopic(normalizeInitialTopic(initialTopic));
    setCreateDialogOpen(true);
  };

  const openSubscriptionSettings = (
    subscription: Subscription,
    tab: 'basic' | 'history' | 'suggestions' | 'notifications' = 'basic'
  ) => {
    setSelectedSubscription(subscription);
    setSettingsDialogTab(tab);
    setSettingsDialogOpen(true);
  };

  const openPublishTopic = (subscription?: Subscription) => {
    if (subscription) {
      setSelectedSubscription(subscription);
    }
    setPublishDialogOpen(true);
  };

  const sidebar = (
    <SidePanel
      onCreateSubscription={openCreateSubscription}
      onOpenSubscriptionSettings={openSubscriptionSettings}
    />
  );

  const mobilePane = getMobilePane(pathname);
  const mobileTab = getActiveMobileTab(pathname);
  const showMobileTabs = shouldShowMobileTabs(pathname);
  const mobileBackTarget = getMobileBackTarget(pathname);

  const mobileContent =
    layout === 'three-pane' ? (
      <MobileReaderPane list={list} detail={detail} activePane={mobilePane} />
    ) : (
      <div className="flex h-full flex-col overflow-hidden">{detail}</div>
    );

  return (
    <ReaderActionsProvider
      value={{
        openCreateSubscription,
        openSubscriptionSettings,
        openPublishTopic,
      }}
    >
      <div className="md:hidden">
        <MobileReaderScaffold
          showBottomNav={showMobileTabs}
          activeTabId={mobileTab}
          header={
            mobileBackTarget ? (
              <MobileDetailHeader
                label={mobileBackTarget.label}
                to={mobileBackTarget.to}
                params={mobileBackTarget.params}
              />
            ) : null
          }
        >
          {mobileContent}
        </MobileReaderScaffold>
      </div>
      <div className="hidden md:block">
        {layout === 'three-pane' ? (
          <ReaderLayout sidebar={sidebar} list={list} detail={detail} />
        ) : (
          <ReaderTwoColumnLayout sidebar={sidebar} main={detail} />
        )}
      </div>

      <ReaderDialogs
        createDialogOpen={createDialogOpen}
        createDialogInitialTopic={createDialogInitialTopic}
        onCreateDialogOpenChange={setCreateDialogOpen}
        settingsDialogOpen={settingsDialogOpen}
        onSettingsDialogOpenChange={setSettingsDialogOpen}
        settingsDialogTab={settingsDialogTab}
        publishDialogOpen={publishDialogOpen}
        onPublishDialogOpenChange={setPublishDialogOpen}
        selectedSubscription={selectedSubscription}
        onPublishClick={() => openPublishTopic()}
      />
    </ReaderActionsProvider>
  );
}
