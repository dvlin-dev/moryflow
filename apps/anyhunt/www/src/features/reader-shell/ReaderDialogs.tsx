/**
 * [PROPS]: dialog state + selected subscription + callbacks
 * [POS]: Reader 内所有“操作型”弹窗统一渲染出口（避免在页面里散落）
 * [UPDATE]: 2026-01-28 设置弹窗支持默认 Tab
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@moryflow/ui';
import { ResponsiveDialog } from '@/components/reader/ResponsiveDialog';
import type { Subscription } from '@/features/digest/types';
import type { ReaderDialogState } from './reader-dialog-state';

const LazyCreateSubscriptionDialog = lazy(() =>
  import('@/components/reader/CreateSubscriptionDialog').then((moduleExports) => ({
    default: moduleExports.CreateSubscriptionDialog,
  }))
);

const LazySubscriptionSettingsDialog = lazy(() =>
  import('@/components/reader/SubscriptionSettingsDialog').then((moduleExports) => ({
    default: moduleExports.SubscriptionSettingsDialog,
  }))
);

const LazyPublishTopicDialog = lazy(() =>
  import('@/components/reader/PublishTopicDialog').then((moduleExports) => ({
    default: moduleExports.PublishTopicDialog,
  }))
);

interface ReaderDialogsProps {
  dialogState: ReaderDialogState;
  selectedSubscription: Subscription | null;
  onDialogOpenChange: (open: boolean) => void;
  onPublishClick: () => void;
}

function ReaderDialogFallback({
  title,
  open,
  onOpenChange,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-3 py-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </ResponsiveDialog>
  );
}

function useLazyDialogMount(open: boolean): boolean {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
    }
  }, [open]);

  return shouldRender;
}

export function ReaderDialogs({
  dialogState,
  selectedSubscription,
  onDialogOpenChange,
  onPublishClick,
}: ReaderDialogsProps) {
  const createDialogOpen = dialogState.type === 'create';
  const createDialogInitialTopic = dialogState.type === 'create' ? dialogState.initialTopic : undefined;

  const settingsDialogOpen = dialogState.type === 'settings';
  const settingsDialogTab = dialogState.type === 'settings' ? dialogState.tab : 'basic';

  const publishDialogOpen = dialogState.type === 'publish';

  const shouldRenderCreate = useLazyDialogMount(createDialogOpen);
  const shouldRenderSettings = useLazyDialogMount(settingsDialogOpen);
  const shouldRenderPublish = useLazyDialogMount(publishDialogOpen);

  return (
    <>
      {shouldRenderCreate ? (
        <Suspense
          fallback={
            <ReaderDialogFallback
              title="New subscription"
              open={createDialogOpen}
              onOpenChange={onDialogOpenChange}
            />
          }
        >
          <LazyCreateSubscriptionDialog
            open={createDialogOpen}
            initialTopic={createDialogInitialTopic}
            onOpenChange={onDialogOpenChange}
          />
        </Suspense>
      ) : null}

      {shouldRenderSettings ? (
        <Suspense
          fallback={
            <ReaderDialogFallback
              title="Subscription settings"
              open={settingsDialogOpen}
              onOpenChange={onDialogOpenChange}
            />
          }
        >
          <LazySubscriptionSettingsDialog
            subscription={selectedSubscription}
            open={settingsDialogOpen}
            onOpenChange={onDialogOpenChange}
            onPublishClick={onPublishClick}
            defaultTab={settingsDialogTab}
          />
        </Suspense>
      ) : null}

      {shouldRenderPublish ? (
        <Suspense
          fallback={
            <ReaderDialogFallback
              title="Publish topic"
              open={publishDialogOpen}
              onOpenChange={onDialogOpenChange}
            />
          }
        >
          <LazyPublishTopicDialog
            subscription={selectedSubscription}
            open={publishDialogOpen}
            onOpenChange={onDialogOpenChange}
          />
        </Suspense>
      ) : null}
    </>
  );
}
