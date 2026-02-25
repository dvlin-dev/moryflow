/**
 * 编辑 Webhook 对话框
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@moryflow/ui'
import { useUpdateWebhook } from '../hooks'
import { getWebhookFormDefaults, webhookFormSchema, type WebhookFormValues } from '../schemas'
import type { Webhook } from '../types'
import { WebhookFormFields } from './webhook-form-fields'

interface EditWebhookDialogProps {
  apiKey: string
  webhook: Webhook | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getEditWebhookSubmitLabel(isPending: boolean): string {
  if (isPending) {
    return 'Saving...'
  }
  return 'Save'
}

export function EditWebhookDialog({ apiKey, webhook, open, onOpenChange }: EditWebhookDialogProps) {
  const { mutate: update, isPending } = useUpdateWebhook(apiKey)

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: getWebhookFormDefaults(webhook ?? undefined),
  })

  useEffect(() => {
    form.reset(getWebhookFormDefaults(webhook ?? undefined))
  }, [form, webhook])

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleUpdate = form.handleSubmit((values) => {
    if (!apiKey || !webhook) return

    update(
      { id: webhook.id, data: values },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  })

  if (!webhook) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>No webhook selected.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
          <DialogDescription>Modify webhook configuration.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4">
          <WebhookFormFields form={form} disabled={isPending} idPrefix="edit-webhook" />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {getEditWebhookSubmitLabel(isPending)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
