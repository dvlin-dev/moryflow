/**
 * [PROPS]: form
 * [POS]: Basic tab form for subscription settings dialog
 */

import type { UseFormReturn } from 'react-hook-form';
import {
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
  Separator,
  Switch,
  Textarea,
} from '@moryflow/ui';
import { CRON_PRESETS, TIMEZONES } from '@/features/digest/constants';
import type { UpdateSubscriptionFormValues } from '../subscription-form-schema';

interface SubscriptionSettingsBasicTabProps {
  form: UseFormReturn<UpdateSubscriptionFormValues>;
}

export function SubscriptionSettingsBasicTab({ form }: SubscriptionSettingsBasicTabProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="topic"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Topic Keywords</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interests"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Interest Tags</FormLabel>
            <FormControl>
              <Textarea className="resize-none" rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
                    <SelectValue />
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
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="minScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Min Score</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={100} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="minItems"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Min Items</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={50} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="searchLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search Limit</FormLabel>
              <FormControl>
                <Input type="number" min={10} max={100} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      <FormField
        control={form.control}
        name="enabled"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <FormLabel className="font-normal">Subscription Enabled</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
