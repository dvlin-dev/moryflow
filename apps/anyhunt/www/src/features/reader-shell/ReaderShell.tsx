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
import type { Subscription } from '@/features/digest/types';
import { ReaderDialogs } from './ReaderDialogs';
import { normalizeInitialTopic } from './initialTopic';
import {
  getActiveMobileTab,
  getMobileBackTarget,
  getMobilePane,
  shouldShowMobileTabs,
} from './mobile-reader-state';
import { ReaderActionsProvider } from './reader-actions';
import {
  getClosedReaderDialogState,
  getDialogSubscription,
  type ReaderDialogState,
  type ReaderSettingsDialogTab,
} from './reader-dialog-state';

type ReaderShellLayout = 'three-pane' | 'two-pane';

interface ReaderShellProps {
  layout: ReaderShellLayout;
  list?: ReactNode;
  detail: ReactNode;
}

function renderMobileContentByLayout(
  layout: ReaderShellLayout,
  list: ReactNode | undefined,
  detail: ReactNode,
  mobilePane: ReturnType<typeof getMobilePane>
): ReactNode {
  if (layout === 'three-pane') {
    return <MobileReaderPane list={list} detail={detail} activePane={mobilePane} />;
  }

  return <div className="flex h-full flex-col overflow-hidden">{detail}</div>;
}

function renderDesktopContentByLayout(
  layout: ReaderShellLayout,
  sidebar: ReactNode,
  list: ReactNode | undefined,
  detail: ReactNode
): ReactNode {
  if (layout === 'three-pane') {
    return <ReaderLayout sidebar={sidebar} list={list} detail={detail} />;
  }

  return <ReaderTwoColumnLayout sidebar={sidebar} main={detail} />;
}

export function ReaderShell({ layout, list, detail }: ReaderShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [dialogState, setDialogState] = useState<ReaderDialogState>(getClosedReaderDialogState());

  const openCreateSubscription = (initialTopic?: string) => {
    setDialogState({
      type: 'create',
      initialTopic: normalizeInitialTopic(initialTopic),
    });
  };

  const openSubscriptionSettings = (
    subscription: Subscription,
    tab: ReaderSettingsDialogTab = 'basic'
  ) => {
    setDialogState({
      type: 'settings',
      subscription,
      tab,
    });
  };

  const openPublishTopic = (subscription?: Subscription) => {
    setDialogState((previousDialogState) => ({
      type: 'publish',
      subscription: subscription ?? getDialogSubscription(previousDialogState),
    }));
  };

  const closeDialogs = () => {
    setDialogState(getClosedReaderDialogState());
  };

  const selectedSubscription = getDialogSubscription(dialogState);

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

  const mobileContent = renderMobileContentByLayout(layout, list, detail, mobilePane);
  const desktopContent = renderDesktopContentByLayout(layout, sidebar, list, detail);

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

      <div className="hidden md:block">{desktopContent}</div>

      <ReaderDialogs
        dialogState={dialogState}
        selectedSubscription={selectedSubscription}
        onDialogOpenChange={(open) => {
          if (!open) {
            closeDialogs();
          }
        }}
        onPublishClick={() => {
          if (dialogState.type !== 'settings') return;
          openPublishTopic(dialogState.subscription);
        }}
      />
    </ReaderActionsProvider>
  );
}
