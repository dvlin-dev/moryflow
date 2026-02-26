/**
 * [PROPS]: form, disabled, submitLabel, onCancel
 * [EMITS]: onSubmit(values)
 * [POS]: Webhook create/edit 共用表单字段（react-hook-form + zod）
 */
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Checkbox } from '@moryflow/ui'
import { Form } from '@moryflow/ui'
import type { UseFormReturn } from 'react-hook-form'
import { WEBHOOK_EVENTS } from '../constants'
import { normalizeWebhookEvents, type WebhookFormValues } from '../schemas'

interface WebhookFormFieldsProps {
  form: UseFormReturn<WebhookFormValues>
  disabled?: boolean
  idPrefix: string
}

export function WebhookFormFields({ form, disabled, idPrefix }: WebhookFormFieldsProps) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor={`${idPrefix}-name`}>Name</FormLabel>
              <FormControl>
                <Input
                  id={`${idPrefix}-name`}
                  placeholder="e.g., Notification Service, Data Sync"
                  maxLength={100}
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor={`${idPrefix}-url`}>Callback URL</FormLabel>
              <FormControl>
                <Input
                  id={`${idPrefix}-url`}
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  maxLength={500}
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Must be an HTTPS URL</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="events"
          render={({ field }) => {
            const selectedEvents = field.value ?? []

            const toggleEvent = (event: (typeof WEBHOOK_EVENTS)[number]['value'], checked: boolean) => {
              if (checked) {
                const nextSelectedEvents = normalizeWebhookEvents([...selectedEvents, event])
                field.onChange(nextSelectedEvents)
                return
              }

              const filteredEvents = selectedEvents.filter((selected) => selected !== event)
              field.onChange(filteredEvents)
            }

            return (
              <FormItem>
                <FormLabel>Subscribe to Events</FormLabel>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${idPrefix}-${event.value}`}
                        checked={selectedEvents.includes(event.value)}
                        onCheckedChange={(checked) => toggleEvent(event.value, checked === true)}
                        disabled={disabled}
                      />
                      <label htmlFor={`${idPrefix}-${event.value}`} className="text-sm cursor-pointer">
                        {event.label}
                        <span className="text-muted-foreground ml-1">({event.value})</span>
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      </div>
    </Form>
  )
}
