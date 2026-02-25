/**
 * Explore Create Dialog
 *
 * [PROPS]: open, onOpenChange, initialQuery, onCreated
 * [POS]: Explore 中“创建订阅/发布话题”的统一入口
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  RadioGroup,
  RadioGroupItem,
  Label,
} from '@moryflow/ui';
import { ResponsiveDialog } from '@/components/reader/ResponsiveDialog';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { ApiClientError } from '@/lib/api-client';
import { toast } from 'sonner';
import { createSubscriptionForQuery, publishSubscriptionAsTopic } from './explore.actions';
import type { TopicVisibility } from '@/features/digest/types';
import { useAuthStore } from '@/stores/auth-store';

const formSchema = z.object({
  query: z.string().min(1, 'Please enter a topic or keyword'),
  visibility: z.enum(['PUBLIC', 'UNLISTED'] as const),
});

type FormValues = z.infer<typeof formSchema>;

interface ExploreCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery: string;
  onCreated: (topicSlug: string) => void;
}

export function ExploreCreateDialog({
  open,
  onOpenChange,
  initialQuery,
  onCreated,
}: ExploreCreateDialogProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      query: initialQuery,
      visibility: 'PUBLIC',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setValue('query', initialQuery || '');
    form.setFocus('query');
  }, [open, initialQuery, form]);

  const onSubmit = async (values: FormValues) => {
    const query = values.query.trim();
    if (!query) return;

    if (!isAuthenticated) {
      onOpenChange(false);
      await navigate({ to: '/login', search: { redirect: pathname + searchStr } });
      return;
    }

    try {
      const { subscriptionId } = await createSubscriptionForQuery(query);
      const { slug } = await publishSubscriptionAsTopic(
        subscriptionId,
        query,
        values.visibility as TopicVisibility
      );

      toast.success('Created');
      onOpenChange(false);
      onCreated(slug);
    } catch (error) {
      if (error instanceof ApiClientError && error.isUnauthorized) {
        onOpenChange(false);
        await navigate({ to: '/login', search: { redirect: pathname + searchStr } });
        return;
      }

      toast.error(error instanceof Error ? error.message : 'Failed to create');
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create subscription"
      description="Create a new subscription and publish it as a topic."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="explore-create-form">
            Create
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="explore-create-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Topic or keyword</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. AI agents" {...field} />
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
                      <RadioGroupItem value="PUBLIC" id="explore-public" className="mt-1" />
                      <div>
                        <Label htmlFor="explore-public" className="font-normal">
                          Public
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Discoverable in Explore and followable by anyone.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="UNLISTED" id="explore-unlisted" className="mt-1" />
                      <div>
                        <Label htmlFor="explore-unlisted" className="font-normal">
                          Unlisted
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Only accessible via a direct link.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ResponsiveDialog>
  );
}
