/**
 * [PROPS]: open, onOpenChange, isPending, onSubmit
 * [EMITS]: onOpenChange(open), onSubmit(values)
 * [POS]: Dialog for creating redemption codes (RHF + zod/v3)
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import { createRedemptionCodeSchema, type CreateRedemptionCodeFormValues } from '../schemas';
import { CODE_TYPE_OPTIONS } from '../constants';
import { useRedemptionCodeConfig } from '../hooks';

const DEFAULT_FORM_VALUES: Partial<CreateRedemptionCodeFormValues> = {
  type: 'CREDITS',
  maxRedemptions: 1,
  code: '',
  expiresAt: '',
  note: '',
};

export interface CreateRedemptionCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (values: CreateRedemptionCodeFormValues) => void;
}

export function CreateRedemptionCodeDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: CreateRedemptionCodeDialogProps) {
  const form = useForm<CreateRedemptionCodeFormValues>({
    resolver: zodResolver(createRedemptionCodeSchema) as any,
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { data: config } = useRedemptionCodeConfig();
  const selectedType = form.watch('type');

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(DEFAULT_FORM_VALUES);
  }, [form, open]);

  const handleSubmit = (values: CreateRedemptionCodeFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Redemption Code</DialogTitle>
          <DialogDescription>
            Create a new redemption code for credits or membership.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CODE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'CREDITS' && (
              <FormField
                control={form.control}
                name="creditsAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 100"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedType === 'MEMBERSHIP' && (
              <>
                <FormField
                  control={form.control}
                  name="membershipTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(config?.tiers ?? []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  name="membershipDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 30"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="maxRedemptions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Redemptions</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1" {...field} value={field.value ?? 1} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Code (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Auto-generated if empty"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Internal note" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
