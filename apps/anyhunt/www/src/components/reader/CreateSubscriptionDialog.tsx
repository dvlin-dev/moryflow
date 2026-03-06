/**
 * [PROPS]: open, onOpenChange, onSuccess
 * [POS]: Dialog for creating new subscriptions with advanced settings (Lucide icons direct render)
 * Renders as Dialog on desktop, Drawer on mobile
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@moryflow/ui';
import { useCreateSubscription } from '@/features/digest/hooks';
import { useIsMobile } from '@/hooks/useIsMobile';
import { CreateSubscriptionDialogForm } from './CreateSubscriptionDialogForm';
import {
  createSubscriptionFormSchema,
  getCreateSubscriptionDefaultValues,
  parseInterestsInput,
  type CreateSubscriptionFormValues,
} from './subscription-form-schema';

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Optional initial topic/keywords to prefill when opening */
  initialTopic?: string;
}

function getDefaultTopicName(initialTopic: string): string {
  return initialTopic.slice(0, 100);
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
  initialTopic,
}: CreateSubscriptionDialogProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const createMutation = useCreateSubscription();
  const isMobile = useIsMobile();

  const form = useForm<CreateSubscriptionFormValues>({
    resolver: zodResolver(createSubscriptionFormSchema),
    defaultValues: getCreateSubscriptionDefaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (!initialTopic) return;

    const currentTopic = form.getValues('topic');
    if (!currentTopic) {
      form.setValue('topic', initialTopic, { shouldDirty: true });
    }

    const currentName = form.getValues('name');
    if (!currentName) {
      form.setValue('name', getDefaultTopicName(initialTopic), { shouldDirty: true });
    }
  }, [form, initialTopic, open]);

  const handleCreateSuccess = () => {
    form.reset(getCreateSubscriptionDefaultValues());
    setShowAdvanced(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleSubmit = (values: CreateSubscriptionFormValues) => {
    createMutation.mutate(
      {
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
      },
      {
        onSuccess: handleCreateSuccess,
      }
    );
  };

  const formBody = (
    <CreateSubscriptionDialogForm
      form={form}
      showAdvanced={showAdvanced}
      onShowAdvancedChange={setShowAdvanced}
      isSubmitting={createMutation.isPending}
      onCancel={() => onOpenChange(false)}
      onSubmit={handleSubmit}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>New Subscription</DrawerTitle>
            <DrawerDescription>
              Create a subscription to receive AI-curated content on your topic.
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">{formBody}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Subscription</DialogTitle>
          <DialogDescription>
            Create a subscription to receive AI-curated content on your topic.
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
