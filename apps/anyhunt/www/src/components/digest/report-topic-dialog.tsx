/**
 * Report Topic Dialog
 *
 * [PROPS]: topicSlug, open state, onOpenChange callback
 * [POS]: Modal dialog for reporting a public topic (Lucide icons direct render)
 */

import { useEffect, useState } from 'react';
import { z } from 'zod/v3';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  RadioGroup,
  RadioGroupItem,
} from '@moryflow/ui';
import { reportTopic, type ReportReason } from '@/lib/digest-api';

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam', description: 'Promotional or unsolicited content' },
  { value: 'COPYRIGHT', label: 'Copyright', description: 'Content that violates copyright' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate', description: 'Offensive or harmful content' },
  { value: 'MISLEADING', label: 'Misleading', description: 'False or deceptive information' },
  { value: 'OTHER', label: 'Other', description: 'Other issue not listed above' },
];

interface ReportTopicDialogProps {
  topicSlug: string;
  apiUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reportSchema = z.object({
  reason: z.enum(['SPAM', 'COPYRIGHT', 'INAPPROPRIATE', 'MISLEADING', 'OTHER']),
  description: z.string().max(500).optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export function ReportTopicDialog({
  topicSlug,
  apiUrl,
  open,
  onOpenChange,
}: ReportTopicDialogProps) {
  const [success, setSuccess] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: 'OTHER',
      description: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ reason: 'OTHER', description: '' });
      setSuccess(false);
    }
  }, [open, form]);

  const onSubmit = async (values: ReportFormValues) => {
    await reportTopic(apiUrl, topicSlug, {
      reason: values.reason,
      description: values.description?.trim() || undefined,
    });

    setSuccess(true);
    setTimeout(() => onOpenChange(false), 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Report Topic
          </DialogTitle>
          <DialogDescription>Help us maintain community standards.</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Report submitted successfully. Thank you for helping keep our community safe.
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormDescription>
                      Optional. Choose the closest reason to help us review faster.
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {REPORT_REASONS.map((option) => (
                          <FormItem
                            key={option.value}
                            className="flex items-start gap-3 rounded-lg border p-3"
                          >
                            <FormControl>
                              <RadioGroupItem value={option.value} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-medium">{option.label}</FormLabel>
                              <FormDescription className="text-xs">
                                {option.description}
                              </FormDescription>
                            </div>
                          </FormItem>
                        ))}
                      </RadioGroup>
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
                    <FormLabel>Additional details (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide any additional context..."
                        className="resize-none"
                        rows={4}
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="flex justify-end">
                      {field.value?.length ?? 0}/500
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
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
