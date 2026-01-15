/**
 * [PROPS]: create/settings/publish dialogs state
 * [POS]: Reader 内所有“操作型”弹窗统一渲染出口（避免在页面里散落）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { CreateSubscriptionDialog } from '@/components/reader/CreateSubscriptionDialog';
import { PublishTopicDialog } from '@/components/reader/PublishTopicDialog';
import { SubscriptionSettingsDialog } from '@/components/reader/SubscriptionSettingsDialog';
import type { Subscription } from '@/features/digest/types';

interface ReaderDialogsProps {
  createDialogOpen: boolean;
  createDialogInitialTopic?: string;
  onCreateDialogOpenChange: (open: boolean) => void;

  settingsDialogOpen: boolean;
  onSettingsDialogOpenChange: (open: boolean) => void;

  publishDialogOpen: boolean;
  onPublishDialogOpenChange: (open: boolean) => void;

  selectedSubscription: Subscription | null;
  onPublishClick: () => void;
}

export function ReaderDialogs({
  createDialogOpen,
  createDialogInitialTopic,
  onCreateDialogOpenChange,
  settingsDialogOpen,
  onSettingsDialogOpenChange,
  publishDialogOpen,
  onPublishDialogOpenChange,
  selectedSubscription,
  onPublishClick,
}: ReaderDialogsProps) {
  return (
    <>
      <CreateSubscriptionDialog
        open={createDialogOpen}
        initialTopic={createDialogInitialTopic}
        onOpenChange={onCreateDialogOpenChange}
      />
      <SubscriptionSettingsDialog
        subscription={selectedSubscription}
        open={settingsDialogOpen}
        onOpenChange={onSettingsDialogOpenChange}
        onPublishClick={onPublishClick}
      />
      <PublishTopicDialog
        subscription={selectedSubscription}
        open={publishDialogOpen}
        onOpenChange={onPublishDialogOpenChange}
      />
    </>
  );
}
