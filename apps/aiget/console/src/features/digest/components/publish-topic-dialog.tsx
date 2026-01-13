/**
 * Publish Topic Dialog
 *
 * [PROPS]: subscription to publish, open state, onOpenChange callback
 * [EMITS]: onPublish when topic is successfully published
 * [POS]: Modal dialog for publishing subscription as public topic
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Alert01Icon } from '@hugeicons/core-free-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Alert,
  AlertDescription,
  Icon,
} from '@aiget/ui';
import { useCreateTopic } from '../hooks';
import type { Subscription, TopicVisibility } from '../types';

const publishFormSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens (e.g., my-topic)'
    ),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED'] as const),
});

type PublishFormValues = z.infer<typeof publishFormSchema>;

interface PublishTopicDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

export function PublishTopicDialog({
  subscription,
  open,
  onOpenChange,
  onPublished,
}: PublishTopicDialogProps) {
  const createTopicMutation = useCreateTopic();

  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishFormSchema),
    defaultValues: {
      slug: '',
      title: '',
      description: '',
      visibility: 'PUBLIC',
    },
  });

  // 当订阅变化时重置表单
  useEffect(() => {
    if (subscription && open) {
      form.reset({
        slug: generateSlug(subscription.name),
        title: subscription.name,
        description: '',
        visibility: 'PUBLIC',
      });
    }
  }, [subscription, open, form]);

  const visibility = form.watch('visibility');
  const isPublic = visibility === 'PUBLIC';

  const onSubmit = async (values: PublishFormValues) => {
    if (!subscription) return;

    try {
      await createTopicMutation.mutateAsync({
        subscriptionId: subscription.id,
        slug: values.slug,
        title: values.title,
        description: values.description || undefined,
        visibility: values.visibility as TopicVisibility,
      });

      onOpenChange(false);
      onPublished?.();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publish Topic</DialogTitle>
          <DialogDescription>
            Share your subscription as a public topic that others can follow.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="my-topic" {...field} />
                  </FormControl>
                  <FormDescription>
                    Public URL: aiget.dev/digest/{field.value || 'my-topic'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Topic title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this topic covers..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public - Listed in topic directory</SelectItem>
                      <SelectItem value="UNLISTED">Unlisted - Accessible via link only</SelectItem>
                      <SelectItem value="PRIVATE">Private - Only you can see</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPublic && (
              <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-800">
                <Icon icon={Alert01Icon} className="h-4 w-4" />
                <AlertDescription>
                  <strong>Public topics are visible to everyone.</strong> Your topic will appear in
                  the public directory and can be reported for spam or copyright issues. Make sure
                  your content complies with our community guidelines.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createTopicMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTopicMutation.isPending}>
                {createTopicMutation.isPending ? 'Publishing...' : 'Publish Topic'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 从名称生成 slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
