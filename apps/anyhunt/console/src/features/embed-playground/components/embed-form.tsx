/**
 * [PROPS]: apiKeys, selectedKeyId, onKeyChange, onSubmit, isLoading
 * [EMITS]: onSubmit(data)
 * [POS]: Embed 参数表单组件（RHF + zod/v3）
 *
 * 测试 URL:
 * - Twitter/X: https://x.com/OpenAI/status/2003594025098785145
 * - YouTube:   https://www.youtube.com/watch?v=gzneGhpXwjU
 * - Vimeo:     https://vimeo.com/962022830
 * - Spotify:   https://open.spotify.com/track/2plbrEY59IikOBgBGLjaoe
 * - SoundCloud: https://soundcloud.com/flume/smoke-and-retribution-feat-vince-staples-kucka
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Loader } from 'lucide-react';
import {
  Button,
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
import type { ApiKey } from '@/features/api-keys';
import { ApiKeySelector } from '@/features/playground-shared';
import type { EmbedFormData } from '../types';
import {
  embedFormSchema,
  embedFormDefaults,
  buildEmbedRequest,
  type EmbedFormInput,
  type EmbedFormValues,
} from '../schemas';

interface EmbedFormProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string) => void;
  onSubmit: (data: EmbedFormData) => void;
  isLoading?: boolean;
}

export function EmbedForm({ apiKeys, selectedKeyId, onKeyChange, onSubmit, isLoading }: EmbedFormProps) {
  const form = useForm<EmbedFormInput, unknown, EmbedFormValues>({
    resolver: zodResolver(embedFormSchema),
    defaultValues: embedFormDefaults,
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(buildEmbedRequest(values));
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <ApiKeySelector
          apiKeys={apiKeys}
          selectedKeyId={selectedKeyId}
          onKeyChange={onKeyChange}
          disabled={isLoading}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://twitter.com/elonmusk/status/..."
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Supports Twitter/X, YouTube, Vimeo, Spotify, SoundCloud
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxWidth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Width</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={4096}
                    placeholder="550"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxHeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Height</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={4096}
                    placeholder="Optional"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Theme (Twitter only)</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Link className="mr-2 h-4 w-4" />
              Fetch Embed
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
