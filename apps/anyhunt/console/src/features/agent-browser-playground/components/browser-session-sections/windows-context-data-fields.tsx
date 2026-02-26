/**
 * [PROPS]: WindowsContextDataFieldsProps
 * [EMITS]: none
 * [POS]: Windows 上下文数据字段片段（permissions/headers/http/video）
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@moryflow/ui';
import type { BrowserWindowsValues } from '../../schemas';

type WindowsContextDataFieldsProps = {
  form: UseFormReturn<BrowserWindowsValues>;
};

export function WindowsContextDataFields({ form }: WindowsContextDataFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="permissionsJson"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Permissions JSON</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder='["geolocation"]' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="headersJson"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Global Headers JSON</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder='{"x-debug":"1"}' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="httpUsername"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTTP Username</FormLabel>
              <FormControl>
                <Input placeholder="user" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="httpPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTTP Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="recordVideoWidth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video Width</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1280" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="recordVideoHeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video Height</FormLabel>
              <FormControl>
                <Input type="number" placeholder="720" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
