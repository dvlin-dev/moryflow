/**
 * [PROPS]: form, showAdvanced, submit/cancel handlers
 * [POS]: CreateSubscriptionDialog shared form container
 */

import type { UseFormReturn } from 'react-hook-form';
import { Button, Form } from '@moryflow/ui';
import {
  CreateSubscriptionAdvancedSection,
  CreateSubscriptionBasicFields,
} from './create-subscription-form-sections';
import type { CreateSubscriptionFormValues } from './subscription-form-schema';

interface CreateSubscriptionDialogFormProps {
  form: UseFormReturn<CreateSubscriptionFormValues>;
  showAdvanced: boolean;
  onShowAdvancedChange: (open: boolean) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateSubscriptionFormValues) => void;
}

export function CreateSubscriptionDialogForm({
  form,
  showAdvanced,
  onShowAdvancedChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: CreateSubscriptionDialogFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <CreateSubscriptionBasicFields form={form} />

        <CreateSubscriptionAdvancedSection
          form={form}
          showAdvanced={showAdvanced}
          onShowAdvancedChange={onShowAdvancedChange}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Subscription'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
