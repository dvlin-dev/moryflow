/**
 * [PROPS]: SessionContextToggleFieldsProps
 * [EMITS]: none
 * [POS]: Session 上下文开关字段片段
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Switch,
} from '@moryflow/ui';
import type { BrowserSessionValues } from '../../schemas';

type SessionContextToggleFieldsProps = {
  form: UseFormReturn<BrowserSessionValues>;
};

export function SessionContextToggleFields({ form }: SessionContextToggleFieldsProps) {
  return (
    <div className="flex flex-wrap gap-6">
      <FormField
        control={form.control}
        name="javaScriptEnabled"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormLabel>JavaScript</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ignoreHTTPSErrors"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormLabel>Ignore HTTPS Errors</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
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
