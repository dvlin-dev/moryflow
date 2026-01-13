/**
 * Follow Topic Page
 *
 * [INPUT]: Topic slug from URL params
 * [OUTPUT]: Topic details and follow form
 * [POS]: /digest/follow/:slug route
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3'; // 使用 v3 兼容层，解决 @hookform/resolvers 类型兼容问题
import { Calendar01Icon, Time01Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons';
import {
  Button,
  Icon,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Skeleton,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@aiget/ui';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { usePublicTopic, useFollowTopic } from '@/features/digest';
import {
  CRON_PRESETS,
  TIMEZONES,
  DEFAULT_SUBSCRIPTION,
  getCronLabel,
} from '@/features/digest/constants';

// Form schema for follow options
const followFormSchema = z.object({
  cron: z.string().min(1),
  timezone: z.string().min(1),
  minItems: z.coerce.number().min(1).max(50),
});

type FollowFormValues = z.infer<typeof followFormSchema>;

function TopicSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function FollowTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: topic, isLoading, error } = usePublicTopic(slug ?? '');
  const followMutation = useFollowTopic();

  const form = useForm<FollowFormValues>({
    resolver: zodResolver(followFormSchema),
    defaultValues: {
      cron: DEFAULT_SUBSCRIPTION.cron,
      timezone: DEFAULT_SUBSCRIPTION.timezone,
      minItems: DEFAULT_SUBSCRIPTION.minItems,
    },
  });

  // Update form values when topic loads
  useEffect(() => {
    if (topic && !form.formState.isDirty) {
      form.reset({
        cron: topic.cron,
        timezone: topic.timezone,
        minItems: DEFAULT_SUBSCRIPTION.minItems,
      });
    }
  }, [topic, form]);

  const onSubmit = (values: FollowFormValues) => {
    if (!slug) return;

    followMutation.mutate(
      {
        slug,
        data: {
          cron: values.cron,
          timezone: values.timezone,
          minItems: values.minItems,
        },
      },
      {
        onSuccess: () => {
          navigate('/digest/subscriptions');
        },
      }
    );
  };

  if (error) {
    return (
      <div className="container max-w-2xl py-6">
        <Alert variant="destructive">
          <AlertTitle>Topic not found</AlertTitle>
          <AlertDescription>
            The topic you are looking for does not exist or is no longer available.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/digest/subscriptions')}>
            Back to Subscriptions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Subscribe to Topic</h1>
        <p className="text-muted-foreground">
          Follow this topic to receive curated content in your inbox
        </p>
      </div>

      {isLoading ? (
        <TopicSkeleton />
      ) : topic ? (
        <div className="space-y-6">
          {/* Topic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{topic.title}</CardTitle>
              {topic.description && <CardDescription>{topic.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Topic metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon icon={UserMultiple02Icon} className="h-4 w-4" />
                  {topic.subscriberCount} subscribers
                </span>
                <span className="flex items-center gap-1">
                  <Icon icon={Calendar01Icon} className="h-4 w-4" />
                  {getCronLabel(topic.cron)}
                </span>
                <span className="flex items-center gap-1">
                  <Icon icon={Time01Icon} className="h-4 w-4" />
                  {topic.timezone}
                </span>
              </div>

              {/* Interests */}
              {topic.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topic.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customize your subscription</CardTitle>
              <CardDescription>Choose when and how you want to receive your digest</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <Select onValueChange={field.onChange} value={field.value}>
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

                  <FormField
                    control={form.control}
                    name="minItems"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum items per digest</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={50} className="w-24" {...field} />
                        </FormControl>
                        <FormDescription>Skip digest if fewer items are available</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/digest/subscriptions')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={followMutation.isPending}>
                      {followMutation.isPending ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
