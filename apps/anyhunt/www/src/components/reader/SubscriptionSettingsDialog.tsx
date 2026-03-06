/**
 * [PROPS]: subscription, open, onOpenChange, defaultTab
 * [POS]: Subscription settings dialog container (desktop dialog / mobile drawer)
 * [UPDATE]: 2026-02-26 收敛为容器层，表单与 Tabs 渲染拆分到子模块
 */

import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@moryflow/ui';
import { useUpdateSubscription, useTriggerManualRun } from '@/features/digest/hooks';
import type { Subscription } from '@/features/digest/types';
import type { ReaderSettingsDialogTab } from '@/features/reader-shell/reader-dialog-state';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  getUpdateSubscriptionDefaultValues,
  parseInterestsInput,
  updateSubscriptionFormSchema,
  type UpdateSubscriptionFormValues,
} from './subscription-form-schema';
import { SubscriptionSettingsTabs } from './subscriptions/SubscriptionSettingsTabs';

interface SubscriptionSettingsDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishClick?: () => void;
  defaultTab?: ReaderSettingsDialogTab;
}

export function SubscriptionSettingsDialog({
  subscription,
  open,
  onOpenChange,
  onPublishClick,
  defaultTab = 'basic',
}: SubscriptionSettingsDialogProps) {
  const updateMutation = useUpdateSubscription();
  const triggerRun = useTriggerManualRun();
  const isMobile = useIsMobile();

  const form = useForm<UpdateSubscriptionFormValues>({
    resolver: zodResolver(updateSubscriptionFormSchema),
    defaultValues: getUpdateSubscriptionDefaultValues(),
  });

  useEffect(() => {
    if (!subscription || !open) {
      return;
    }

    const defaultValues = getUpdateSubscriptionDefaultValues();

    form.reset({
      ...defaultValues,
      name: subscription.name,
      topic: subscription.topic,
      interests: subscription.interests.join(', '),
      cron: subscription.cron,
      timezone: subscription.timezone,
      outputLocale: subscription.outputLocale,
      minItems: subscription.minItems,
      minScore: subscription.minScore,
      searchLimit: subscription.searchLimit,
      generateItemSummaries: subscription.generateItemSummaries,
      composeNarrative: subscription.composeNarrative,
      tone: subscription.tone,
      inboxEnabled: subscription.inboxEnabled,
      emailEnabled: subscription.emailEnabled,
      webhookEnabled: subscription.webhookEnabled,
      enabled: subscription.enabled,
    });
  }, [form, open, subscription]);

  const handleSubmit = useCallback(
    (values: UpdateSubscriptionFormValues) => {
      if (!subscription) {
        return;
      }

      updateMutation.mutate(
        {
          id: subscription.id,
          data: {
            name: values.name,
            topic: values.topic,
            interests: parseInterestsInput(values.interests),
            cron: values.cron,
            timezone: values.timezone,
            outputLocale: values.outputLocale,
            minItems: values.minItems,
            minScore: values.minScore,
            searchLimit: values.searchLimit,
            generateItemSummaries: values.generateItemSummaries,
            composeNarrative: values.composeNarrative,
            tone: values.tone,
            inboxEnabled: values.inboxEnabled,
            emailEnabled: values.emailEnabled,
            emailTo: values.emailTo || undefined,
            webhookEnabled: values.webhookEnabled,
            webhookUrl: values.webhookUrl || undefined,
            enabled: values.enabled,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    },
    [onOpenChange, subscription, updateMutation]
  );

  const handleRunNow = useCallback(() => {
    if (!subscription) {
      return;
    }

    triggerRun.mutate(subscription.id);
  }, [subscription, triggerRun]);

  if (!subscription) {
    return null;
  }

  const tabsContent = (
    <SubscriptionSettingsTabs
      model={{
        subscriptionId: subscription.id,
        defaultTab,
        form,
        status: {
          isRunning: triggerRun.isPending,
          isSaving: updateMutation.isPending,
        },
      }}
      actions={{
        onSubmit: handleSubmit,
        onRunNow: handleRunNow,
        onPublishClick,
      }}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{subscription.name}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto pb-4">{tabsContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{subscription.name}</DialogTitle>
        </DialogHeader>
        {tabsContent}
      </DialogContent>
    </Dialog>
  );
}
