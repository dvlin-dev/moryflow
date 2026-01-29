/**
 * [PROPS]: create/settings/publish dialogs state
 * [POS]: Reader 内所有“操作型”弹窗统一渲染出口（避免在页面里散落）
 * [UPDATE]: 2026-01-28 设置弹窗支持默认 Tab
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@anyhunt/ui';
import { ResponsiveDialog } from '@/components/reader/ResponsiveDialog';
import type { Subscription } from '@/features/digest/types';

const LazyCreateSubscriptionDialog = lazy(() =>
  import('@/components/reader/CreateSubscriptionDialog').then((m) => ({
    default: m.CreateSubscriptionDialog,
  }))
);

const LazySubscriptionSettingsDialog = lazy(() =>
  import('@/components/reader/SubscriptionSettingsDialog').then((m) => ({
    default: m.SubscriptionSettingsDialog,
  }))
);

const LazyPublishTopicDialog = lazy(() =>
  import('@/components/reader/PublishTopicDialog').then((m) => ({
    default: m.PublishTopicDialog,
  }))
);

interface ReaderDialogsProps {
  createDialogOpen: boolean;
  createDialogInitialTopic?: string;
  onCreateDialogOpenChange: (open: boolean) => void;

  settingsDialogOpen: boolean;
  onSettingsDialogOpenChange: (open: boolean) => void;
  settingsDialogTab?: 'basic' | 'history' | 'suggestions' | 'notifications';

  publishDialogOpen: boolean;
  onPublishDialogOpenChange: (open: boolean) => void;

  selectedSubscription: Subscription | null;
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

export function ReaderDialogs({
  createDialogOpen,
  createDialogInitialTopic,
  onCreateDialogOpenChange,
  settingsDialogOpen,
  onSettingsDialogOpenChange,
  settingsDialogTab = 'basic',
  publishDialogOpen,
  onPublishDialogOpenChange,
  selectedSubscription,
  onPublishClick,
}: ReaderDialogsProps) {
  const [shouldRenderCreate, setShouldRenderCreate] = useState(false);
  const [shouldRenderSettings, setShouldRenderSettings] = useState(false);
  const [shouldRenderPublish, setShouldRenderPublish] = useState(false);

  useEffect(() => {
    if (createDialogOpen) setShouldRenderCreate(true);
  }, [createDialogOpen]);

  useEffect(() => {
    if (settingsDialogOpen) setShouldRenderSettings(true);
  }, [settingsDialogOpen]);

  useEffect(() => {
    if (publishDialogOpen) setShouldRenderPublish(true);
  }, [publishDialogOpen]);

  return (
    <>
      {shouldRenderCreate && (
        <Suspense
          fallback={
            <ReaderDialogFallback
              title="New subscription"
              open={createDialogOpen}
              onOpenChange={onCreateDialogOpenChange}
            />
          }
        >
          <LazyCreateSubscriptionDialog
            open={createDialogOpen}
            initialTopic={createDialogInitialTopic}
            onOpenChange={onCreateDialogOpenChange}
          />
        </Suspense>
      )}

      {shouldRenderSettings && (
        <Suspense
          fallback={
            <ReaderDialogFallback
              title="Subscription settings"
              open={settingsDialogOpen}
              onOpenChange={onSettingsDialogOpenChange}
            />
          }
        >
          <LazySubscriptionSettingsDialog
            subscription={selectedSubscription}
            open={settingsDialogOpen}
            onOpenChange={onSettingsDialogOpenChange}
            onPublishClick={onPublishClick}
            defaultTab={settingsDialogTab}
          />
        </Suspense>
      )}

      {shouldRenderPublish && (
        <Suspense
          fallback={
            <ReaderDialogFallback
              title="Publish topic"
              open={publishDialogOpen}
              onOpenChange={onPublishDialogOpenChange}
            />
          }
        >
          <LazyPublishTopicDialog
            subscription={selectedSubscription}
            open={publishDialogOpen}
            onOpenChange={onPublishDialogOpenChange}
          />
        </Suspense>
      )}
    </>
  );
}
