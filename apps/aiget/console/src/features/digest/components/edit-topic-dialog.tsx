/**
 * Edit Topic Dialog
 *
 * [PROPS]: topic to edit, open state, onOpenChange callback
 * [EMITS]: onUpdated when topic is successfully updated
 * [POS]: Modal dialog for editing topic visibility and metadata
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from '@aiget/ui';
import { useUpdateTopic } from '../hooks';
import type { Topic, TopicVisibility } from '../types';

const editFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED'] as const),
});

type EditFormValues = z.infer<typeof editFormSchema>;

interface EditTopicDialogProps {
  topic: Topic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditTopicDialog({ topic, open, onOpenChange, onUpdated }: EditTopicDialogProps) {
  const updateMutation = useUpdateTopic();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: '',
      description: '',
      visibility: 'PUBLIC',
    },
  });

  // 当话题变化时重置表单
  useEffect(() => {
    if (topic && open) {
      form.reset({
        title: topic.title,
        description: topic.description || '',
        visibility: topic.visibility,
      });
    }
  }, [topic, open, form]);

  const onSubmit = async (values: EditFormValues) => {
    if (!topic) return;

    try {
      await updateMutation.mutateAsync({
        id: topic.id,
        data: {
          title: values.title,
          description: values.description || undefined,
          visibility: values.visibility as TopicVisibility,
        },
      });

      onOpenChange(false);
      onUpdated?.();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
          <DialogDescription>Update your topic settings and visibility.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormDescription>
                    {field.value === 'PUBLIC' && 'Your topic will appear in the public directory.'}
                    {field.value === 'UNLISTED' &&
                      'Only people with the link can access this topic.'}
                    {field.value === 'PRIVATE' && 'This topic is only visible to you.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
