/**
 * [PROPS]: subscription, form
 * [POS]: Notifications settings tab for subscription delivery preferences
 */

import { UseFormReturn } from 'react-hook-form';
import {
  ScrollArea,
  Switch,
  Input,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  Icon,
} from '@aiget/ui';
import { InboxIcon, Mail01Icon, WebhookIcon } from '@hugeicons/core-free-icons';

interface NotificationsTabProps {
  form: UseFormReturn<any>;
}

export function NotificationsTab({ form }: NotificationsTabProps) {
  const emailEnabled = form.watch('emailEnabled');
  const webhookEnabled = form.watch('webhookEnabled');

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-6 p-6">
        <div>
          <h3 className="mb-1 text-sm font-medium">Delivery Channels</h3>
          <p className="text-xs text-muted-foreground">
            Choose how you want to receive digest updates
          </p>
        </div>

        {/* Inbox Notifications */}
        <div className="rounded-md border p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Icon icon={InboxIcon} className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <FormField
                control={form.control}
                name="inboxEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-sm font-medium">Inbox</FormLabel>
                      <FormDescription className="text-xs">
                        Receive updates in your inbox within the app
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="rounded-md border p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Icon icon={Mail01Icon} className="size-5 text-blue-500" />
            </div>
            <div className="flex-1 space-y-3">
              <FormField
                control={form.control}
                name="emailEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormDescription className="text-xs">
                        Receive digest updates via email
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {emailEnabled && (
                <FormField
                  control={form.control}
                  name="emailTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        </div>

        {/* Webhook Notifications */}
        <div className="rounded-md border p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-orange-500/10 p-2">
              <Icon icon={WebhookIcon} className="size-5 text-orange-500" />
            </div>
            <div className="flex-1 space-y-3">
              <FormField
                control={form.control}
                name="webhookEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-sm font-medium">Webhook</FormLabel>
                      <FormDescription className="text-xs">
                        Send digest data to a custom endpoint
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {webhookEnabled && (
                <FormField
                  control={form.control}
                  name="webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Webhook URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://your-webhook.com/endpoint"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        We&apos;ll send a POST request with HMAC signature
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            At least one delivery channel must be enabled. Changes will take effect from the next
            scheduled run.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
