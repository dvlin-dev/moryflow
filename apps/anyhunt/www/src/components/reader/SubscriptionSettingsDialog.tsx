/**
 * [PROPS]: subscription, open, onOpenChange, defaultTab
 * [POS]: Settings dialog with tabs for basic settings, run history, and learning suggestions (Lucide icons direct render)
 * Renders as Dialog on desktop, Drawer on mobile
 * [UPDATE]: 2026-01-28 支持指定默认 Tab（history/suggestions 等）
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
} from '@moryflow/ui';
import { Play, Share } from 'lucide-react';
import { useUpdateSubscription, useTriggerManualRun } from '@/features/digest/hooks';
import { CRON_PRESETS, TIMEZONES } from '@/features/digest/constants';
import { RunHistoryTab } from './RunHistoryTab';
import { LearningSuggestionsTab } from './LearningSuggestionsTab';
import { NotificationsTab } from './NotificationsTab';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Subscription } from '@/features/digest/types';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  topic: z.string().min(1, 'Topic is required').max(200),
  interests: z.string().optional(),
  cron: z.string().min(1),
  timezone: z.string().min(1),
  outputLocale: z.string().min(1),
  minItems: z.coerce.number().min(1).max(50),
  minScore: z.coerce.number().min(0).max(100),
  searchLimit: z.coerce.number().min(10).max(100),
  generateItemSummaries: z.boolean(),
  composeNarrative: z.boolean(),
  tone: z.enum(['neutral', 'opinionated', 'concise']),
  inboxEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  emailTo: z.string().email().optional().or(z.literal('')),
  webhookEnabled: z.boolean(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubscriptionSettingsDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishClick?: () => void;
  defaultTab?: 'basic' | 'history' | 'suggestions' | 'notifications';
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      topic: '',
      interests: '',
      cron: '0 9 * * *',
      timezone: 'UTC',
      outputLocale: 'en',
      minItems: 5,
      minScore: 50,
      searchLimit: 50,
      generateItemSummaries: true,
      composeNarrative: false,
      tone: 'neutral',
      inboxEnabled: true,
      emailEnabled: false,
      emailTo: '',
      webhookEnabled: false,
      webhookUrl: '',
      enabled: true,
    },
  });

  // Reset form when subscription changes (only when dialog opens with new subscription)
  useEffect(() => {
    if (subscription && open) {
      form.reset({
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
        emailTo: '', // Not returned from API for security
        webhookEnabled: subscription.webhookEnabled,
        webhookUrl: '', // Not returned from API for security
        enabled: subscription.enabled,
      });
    }
  }, [subscription?.id, open, form.reset]);

  const onSubmit = (values: FormValues) => {
    if (!subscription) return;

    const interests = values.interests
      ? values.interests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    updateMutation.mutate(
      {
        id: subscription.id,
        data: {
          name: values.name,
          topic: values.topic,
          interests,
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
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleRunNow = () => {
    if (subscription) {
      triggerRun.mutate(subscription.id);
    }
  };

  if (!subscription) return null;

  const tabsContent = (
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic Keywords</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Tags</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="cron"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CRON_PRESETS.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="minScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Score</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Items</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={50} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="searchLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Limit</FormLabel>
                      <FormControl>
                        <Input type="number" min={10} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="font-normal">Subscription Enabled</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="history" className="m-0 h-full">
          <RunHistoryTab subscriptionId={subscription.id} />
        </TabsContent>

        <TabsContent value="suggestions" className="m-0 h-full">
          <LearningSuggestionsTab subscriptionId={subscription.id} />
        </TabsContent>

        <TabsContent value="notifications" className="m-0 h-full">
          <Form {...form}>
            <NotificationsTab form={form} />
          </Form>
        </TabsContent>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-6 py-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunNow}
            disabled={triggerRun.isPending}
          >
            <Play className="mr-2 size-4" />
            Run Now
          </Button>
          <Button variant="outline" size="sm" onClick={onPublishClick}>
            <Share className="mr-2 size-4" />
            Publish as Topic
          </Button>
        </div>
        <Button
          type="submit"
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Tabs>
  );

  // Mobile: Drawer (bottom sheet)
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

  // Desktop: Dialog
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
