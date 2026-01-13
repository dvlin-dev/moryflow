/**
 * Create Subscription Dialog
 *
 * [PROPS]: open, onOpenChange, onSuccess
 * [POS]: Dialog for creating new digest subscriptions
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aiget/ui';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateSubscription } from '../hooks';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  topic: z.string().min(1, 'Topic is required').max(200),
  interests: z.string().optional(),
  cron: z.string().min(1),
  timezone: z.string().min(1),
  outputLocale: z.string().min(1),
  minItems: z.coerce.number().min(1).max(50),
  searchLimit: z.coerce.number().min(10).max(100),
});

type FormValues = z.infer<typeof formSchema>;

// Common cron presets
const cronPresets = [
  { label: 'Weekly (Monday 8am)', value: '0 8 * * 1' },
  { label: 'Daily (8am)', value: '0 8 * * *' },
  { label: 'Twice daily (8am, 6pm)', value: '0 8,18 * * *' },
  { label: 'Weekdays (8am)', value: '0 8 * * 1-5' },
];

// Common timezones
const timezones = [
  { label: 'Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'Mountain (Denver)', value: 'America/Denver' },
  { label: 'Central (Chicago)', value: 'America/Chicago' },
  { label: 'Eastern (New York)', value: 'America/New_York' },
  { label: 'UTC', value: 'UTC' },
  { label: 'China (Shanghai)', value: 'Asia/Shanghai' },
  { label: 'Japan (Tokyo)', value: 'Asia/Tokyo' },
  { label: 'UK (London)', value: 'Europe/London' },
  { label: 'Germany (Berlin)', value: 'Europe/Berlin' },
];

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSubscriptionDialogProps) {
  const createMutation = useCreateSubscription();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      topic: '',
      interests: '',
      cron: '0 8 * * 1',
      timezone: 'America/Los_Angeles',
      outputLocale: 'en',
      minItems: 5,
      searchLimit: 60,
    },
  });

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
        searchLimit: values.searchLimit,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Subscription</DialogTitle>
          <DialogDescription>
            Set up a new digest subscription to receive curated content on your topic.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My AI News Digest" {...field} />
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
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="AI, Machine Learning, LLMs" {...field} />
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
                  <FormLabel>Interests (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="research papers, product launches, startup funding"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cronPresets.map((preset) => (
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
                        {timezones.map((tz) => (
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="minItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min items per digest</FormLabel>
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
                    <FormLabel>Search limit</FormLabel>
                    <FormControl>
                      <Input type="number" min={10} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
      </DialogContent>
    </Dialog>
  );
}
