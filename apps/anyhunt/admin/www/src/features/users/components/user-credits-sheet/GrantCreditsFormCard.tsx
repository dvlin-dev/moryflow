/**
 * [PROPS]: RHF form 实例、提交回调与禁用状态
 * [EMITS]: onSubmit(values)
 * [POS]: user credits 面板充值表单卡片
 */

import { ArrowRight, ArrowUp } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@moryflow/ui';
import type { UseFormReturn } from 'react-hook-form';
import type { GrantCreditsFormValues } from './schemas';

export interface GrantCreditsFormCardProps {
  form: UseFormReturn<GrantCreditsFormValues>;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: (values: GrantCreditsFormValues) => void;
}

export function GrantCreditsFormCard({
  form,
  canSubmit,
  isPending,
  onSubmit,
}: GrantCreditsFormCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUp className="h-4 w-4" />
          Grant credits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Why do you grant credits?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={!canSubmit || isPending}>
              <ArrowRight className="h-4 w-4" />
              {isPending ? 'Granting…' : 'Grant'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
