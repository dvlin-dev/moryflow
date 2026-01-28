/**
 * [PROPS]: open, onOpenChange, onSuccess
 * [POS]: Dialog for creating new subscriptions with advanced settings (Lucide icons direct render)
 * Renders as Dialog on desktop, Drawer on mobile
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
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
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Label,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@anyhunt/ui';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useCreateSubscription } from '@/features/digest/hooks';
import { CRON_PRESETS, TIMEZONES, DEFAULT_SUBSCRIPTION } from '@/features/digest/constants';
import { useIsMobile } from '@/hooks/useIsMobile';

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
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Optional initial topic/keywords to prefill when opening */
  initialTopic?: string;
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
  const AdvancedToggleIcon = showAdvanced ? ChevronDown : ArrowRight;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      topic: '',
      interests: '',
      cron: DEFAULT_SUBSCRIPTION.cron,
      timezone: DEFAULT_SUBSCRIPTION.timezone,
      outputLocale: DEFAULT_SUBSCRIPTION.outputLocale,
      minItems: DEFAULT_SUBSCRIPTION.minItems,
      minScore: DEFAULT_SUBSCRIPTION.minScore,
      searchLimit: DEFAULT_SUBSCRIPTION.searchLimit,
      generateItemSummaries: true,
      composeNarrative: false,
      tone: 'neutral',
      inboxEnabled: true,
      emailEnabled: false,
      emailTo: '',
      webhookEnabled: false,
      webhookUrl: '',
    },
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
      form.setValue('name', initialTopic.slice(0, 100), { shouldDirty: true });
    }
  }, [open, initialTopic, form]);

  const onSubmit = (values: FormValues) => {
    const interests = values.interests
      ? values.interests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    createMutation.mutate(
      {
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
      },
      {
        onSuccess: () => {
          form.reset();
          setShowAdvanced(false);
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="AI Industry News" {...field} />
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
                <Input placeholder="artificial intelligence, machine learning, LLM" {...field} />
              </FormControl>
              <FormDescription>Keywords used for searching content</FormDescription>
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
                <Textarea
                  placeholder="GPT, Claude, Gemini, open source models"
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormDescription>Comma-separated tags for scoring and filtering</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-0">
              <AdvancedToggleIcon className="size-4" />
              <span>Advanced Settings</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Schedule */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cron"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
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

            {/* Quality control */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quality Control</Label>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="minScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Min Score</FormLabel>
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
                      <FormLabel className="text-xs">Min Items</FormLabel>
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
                      <FormLabel className="text-xs">Search Limit</FormLabel>
                      <FormControl>
                        <Input type="number" min={10} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* AI Processing */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">AI Processing</Label>
              <FormField
                control={form.control}
                name="generateItemSummaries"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm font-normal">Generate Summaries</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="composeNarrative"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm font-normal">Compose Narrative</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Writing Style</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="opinionated">Opinionated</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Delivery channels */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Delivery Channels</Label>
              <FormField
                control={form.control}
                name="inboxEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm font-normal">Inbox (Web)</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emailEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm font-normal">Email</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="webhookEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm font-normal">Webhook</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Subscription'}
          </Button>
        </div>
      </form>
    </Form>
  );

  // Mobile: Drawer (bottom sheet)
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
          <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Subscription</DialogTitle>
          <DialogDescription>
            Create a subscription to receive AI-curated content on your topic.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
