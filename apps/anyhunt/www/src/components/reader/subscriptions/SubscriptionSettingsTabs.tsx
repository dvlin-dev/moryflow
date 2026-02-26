/**
 * [PROPS]: subscription id, form state, tab config and actions
 * [POS]: Tabbed content for subscription settings dialog
 */

import type { UseFormReturn } from 'react-hook-form';
import { Button, Form, Tabs, TabsContent, TabsList, TabsTrigger } from '@moryflow/ui';
import { Play, Share } from 'lucide-react';
import { RunHistoryTab } from '@/components/reader/RunHistoryTab';
import { LearningSuggestionsTab } from '@/components/reader/LearningSuggestionsTab';
import { NotificationsTab } from '@/components/reader/NotificationsTab';
import type { ReaderSettingsDialogTab } from '@/features/reader-shell/reader-dialog-state';
import type { UpdateSubscriptionFormValues } from '../subscription-form-schema';
import { SubscriptionSettingsBasicTab } from './SubscriptionSettingsBasicTab';

interface SubscriptionSettingsTabsProps {
  subscriptionId: string;
  defaultTab: ReaderSettingsDialogTab;
  form: UseFormReturn<UpdateSubscriptionFormValues>;
  onSubmit: (values: UpdateSubscriptionFormValues) => void;
  onRunNow: () => void;
  onPublishClick?: () => void;
  isRunning: boolean;
  isSaving: boolean;
}

export function SubscriptionSettingsTabs({
  subscriptionId,
  defaultTab,
  form,
  onSubmit,
  onRunNow,
  onPublishClick,
  isRunning,
  isSaving,
}: SubscriptionSettingsTabsProps) {
  return (
    <Form {...form}>
      <Tabs defaultValue={defaultTab} className="flex h-full flex-col">
        <div className="border-b px-6">
          <TabsList className="h-10 w-full justify-start rounded-none border-b-0 bg-transparent p-0">
            <TabsTrigger
              value="basic"
              className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Basic
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Run History
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Learning
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="basic" className="m-0 h-full p-6">
            <SubscriptionSettingsBasicTab form={form} />
          </TabsContent>

          <TabsContent value="history" className="m-0 h-full">
            <RunHistoryTab subscriptionId={subscriptionId} />
          </TabsContent>

          <TabsContent value="suggestions" className="m-0 h-full">
            <LearningSuggestionsTab subscriptionId={subscriptionId} />
          </TabsContent>

          <TabsContent value="notifications" className="m-0 h-full">
            <NotificationsTab form={form} />
          </TabsContent>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRunNow} disabled={isRunning}>
              <Play className="mr-2 size-4" />
              Run Now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPublishClick}
              disabled={!onPublishClick}
            >
              <Share className="mr-2 size-4" />
              Publish as Topic
            </Button>
          </div>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Tabs>
    </Form>
  );
}
