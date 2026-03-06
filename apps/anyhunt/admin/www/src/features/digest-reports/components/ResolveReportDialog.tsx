/**
 * [PROPS]: dialog open/report/submit callbacks
 * [EMITS]: onOpenChange/onSubmit
 * [POS]: Digest report resolve dialog
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SquareCheck, X } from 'lucide-react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@moryflow/ui';
import { reportReasonLabels } from '../constants';
import {
  resolveReportFormDefaultValues,
  resolveReportFormSchema,
  toResolveReportInput,
  type ResolveReportFormValues,
} from '../forms/resolveReportForm';
import type { Report, ResolveReportInput } from '../types';

export interface ResolveReportDialogProps {
  open: boolean;
  report: Report | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ResolveReportInput) => Promise<void>;
}

export function ResolveReportDialog({
  open,
  report,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ResolveReportDialogProps) {
  const form = useForm<ResolveReportFormValues>({
    resolver: zodResolver(resolveReportFormSchema),
    defaultValues: resolveReportFormDefaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(resolveReportFormDefaultValues);
  }, [form, open, report?.id]);

  const handleSubmit = async (values: ResolveReportFormValues) => {
    await onSubmit(toResolveReportInput(values));
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(resolveReportFormDefaultValues);
    }

    onOpenChange(nextOpen);
  };

  const showPauseTopicField = form.watch('status') === 'RESOLVED_VALID';

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Report</DialogTitle>
          <DialogDescription>
            Review and resolve the report for &quot;{report?.topic?.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium">
                Reason: {report ? reportReasonLabels[report.reason] : '-'}
              </p>
              {report?.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              ) : null}
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="RESOLVED_VALID">Valid - Report is legitimate</SelectItem>
                      <SelectItem value="RESOLVED_INVALID">
                        Invalid - Report is not legitimate
                      </SelectItem>
                      <SelectItem value="DISMISSED">Dismissed - No action needed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showPauseTopicField ? (
              <FormField
                control={form.control}
                name="pauseTopic"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">Pause Topic</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Temporarily hide this topic from public view
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="resolveNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note about this resolution..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isSubmitting}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !report}>
                <SquareCheck className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Resolving...' : 'Resolve'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
