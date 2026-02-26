/**
 * [PROPS]: WindowsContextToggleFieldsProps
 * [EMITS]: none
 * [POS]: Windows 上下文开关字段片段
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Switch,
} from '@moryflow/ui';
import type { BrowserWindowsValues } from '../../schemas';

type WindowsContextToggleFieldsProps = {
  form: UseFormReturn<BrowserWindowsValues>;
};

export function WindowsContextToggleFields({ form }: WindowsContextToggleFieldsProps) {
  return (
    <div className="flex flex-wrap gap-6">
      <FormField
        control={form.control}
        name="offline"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormLabel>Offline</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="acceptDownloads"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormLabel>Accept Downloads</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="recordVideoEnabled"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormLabel>Record Video</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
