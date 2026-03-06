/**
 * [PROPS]: WindowsContextLayoutFieldsProps
 * [EMITS]: none
 * [POS]: Windows 上下文布局字段片段（viewport/device/locale/color/geo）
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
} from '@moryflow/ui';
import type { BrowserWindowsValues } from '../../schemas';

type WindowsContextLayoutFieldsProps = {
  form: UseFormReturn<BrowserWindowsValues>;
};

export function WindowsContextLayoutFields({ form }: WindowsContextLayoutFieldsProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="viewportWidth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Viewport Width</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1280" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="viewportHeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Viewport Height</FormLabel>
              <FormControl>
                <Input type="number" placeholder="800" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="device"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device</FormLabel>
              <FormControl>
                <Input placeholder="Desktop Chrome" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="userAgent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Agent</FormLabel>
              <FormControl>
                <Input placeholder="Custom UA" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="locale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Locale</FormLabel>
              <FormControl>
                <Input placeholder="en-US" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timezoneId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input placeholder="America/Los_Angeles" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="colorScheme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color Scheme</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="light">light</SelectItem>
                  <SelectItem value="dark">dark</SelectItem>
                  <SelectItem value="no-preference">no-preference</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reducedMotion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reduced Motion</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="reduce">reduce</SelectItem>
                  <SelectItem value="no-preference">no-preference</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="geolocationLat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geo Latitude</FormLabel>
              <FormControl>
                <Input type="number" placeholder="37.7749" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="geolocationLng"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geo Longitude</FormLabel>
              <FormControl>
                <Input type="number" placeholder="-122.4194" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="geolocationAccuracy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geo Accuracy</FormLabel>
              <FormControl>
                <Input type="number" placeholder="10" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
