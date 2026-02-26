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

export interface SubscriptionSettingsTabsModel {
  subscriptionId: string;
  defaultTab: ReaderSettingsDialogTab;
  form: UseFormReturn<UpdateSubscriptionFormValues>;
  status: {
    isRunning: boolean;
    isSaving: boolean;
  };
}

export interface SubscriptionSettingsTabsActions {
  onSubmit: (values: UpdateSubscriptionFormValues) => void;
  onRunNow: () => void;
  onPublishClick?: () => void;
}

interface SubscriptionSettingsTabsProps {
  model: SubscriptionSettingsTabsModel;
  actions: SubscriptionSettingsTabsActions;
}

export function SubscriptionSettingsTabs({ model, actions }: SubscriptionSettingsTabsProps) {
  return (
    <Form {...model.form}>
      <Tabs defaultValue={model.defaultTab} className="flex h-full flex-col">
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
            <SubscriptionSettingsBasicTab form={model.form} />
          </TabsContent>

          <TabsContent value="history" className="m-0 h-full">
            <RunHistoryTab subscriptionId={model.subscriptionId} />
          </TabsContent>

          <TabsContent value="suggestions" className="m-0 h-full">
            <LearningSuggestionsTab subscriptionId={model.subscriptionId} />
          </TabsContent>

          <TabsContent value="notifications" className="m-0 h-full">
            <NotificationsTab form={model.form} />
          </TabsContent>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={actions.onRunNow}
              disabled={model.status.isRunning}
            >
              <Play className="mr-2 size-4" />
              Run Now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={actions.onPublishClick}
              disabled={!actions.onPublishClick}
            >
              <Share className="mr-2 size-4" />
              Publish as Topic
            </Button>
          </div>
          <Button
            type="button"
            onClick={model.form.handleSubmit(actions.onSubmit)}
            disabled={model.status.isSaving}
          >
            {model.status.isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Tabs>
    </Form>
  );
}
