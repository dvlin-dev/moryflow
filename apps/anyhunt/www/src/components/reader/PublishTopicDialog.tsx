/**
 * [PROPS]: subscription, open, onOpenChange
 * [POS]: Dialog for publishing a subscription as a public topic
 * Renders as Dialog on desktop, Drawer on mobile
 */

import { useEffect } from 'react';
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
  RadioGroup,
  RadioGroupItem,
  Label,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@anyhunt/ui';
import { useCreateTopic } from '@/features/digest/hooks';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Subscription } from '@/features/digest/types';

const formSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const),
});

type FormValues = z.infer<typeof formSchema>;

interface PublishTopicDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

export function PublishTopicDialog({ subscription, open, onOpenChange }: PublishTopicDialogProps) {
  const createTopic = useCreateTopic();
  const isMobile = useIsMobile();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: '',
      title: '',
      description: '',
      visibility: 'PUBLIC',
    },
  });

  // Reset form when subscription changes
  useEffect(() => {
    if (subscription) {
      form.reset({
        slug: generateSlug(subscription.name),
        title: subscription.name,
        description: '',
        visibility: 'PUBLIC',
      });
    }
  }, [subscription?.id, form.reset]);

  const onSubmit = (values: FormValues) => {
    if (!subscription) return;

    createTopic.mutate(
      {
        subscriptionId: subscription.id,
        slug: values.slug,
        title: values.title,
        description: values.description,
        visibility: values.visibility,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  if (!subscription) return null;

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <Input placeholder="ai-industry-news" {...field} />
              </FormControl>
              <FormDescription>anyhunt.app/topics/{field.value || 'your-slug'}</FormDescription>
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
                <Input {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Daily curated AI news covering OpenAI, Google, Anthropic and more..."
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
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="space-y-2"
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="PUBLIC" id="public" className="mt-1" />
                    <div>
                      <Label htmlFor="public" className="font-normal">
                        Public
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Anyone can discover and subscribe
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="UNLISTED" id="unlisted" className="mt-1" />
                    <div>
                      <Label htmlFor="unlisted" className="font-normal">
                        Unlisted
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Only accessible via direct link
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="PRIVATE" id="private" className="mt-1" />
                    <div>
                      <Label htmlFor="private" className="font-normal">
                        Private
                      </Label>
                      <p className="text-xs text-muted-foreground">Only visible to you</p>
                    </div>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTopic.isPending}>
            {createTopic.isPending ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </form>
    </Form>
  );

  // Mobile: Drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Publish as Topic</DrawerTitle>
            <DrawerDescription>
              Publish "{subscription.name}" as a public topic that others can subscribe to.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish as Topic</DialogTitle>
          <DialogDescription>
            Publish "{subscription.name}" as a public topic that others can subscribe to.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
