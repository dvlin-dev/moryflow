/**
 * 创建 Webhook 对话框
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@moryflow/ui'
import { useCreateWebhook } from '../hooks'
import { getWebhookFormDefaults, webhookFormSchema, type WebhookFormValues } from '../schemas'
import { WebhookFormFields } from './webhook-form-fields'

interface CreateWebhookDialogProps {
  apiKey: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getCreateWebhookSubmitLabel(isPending: boolean): string {
  if (isPending) {
    return 'Creating...'
  }
  return 'Create'
}

export function CreateWebhookDialog({ apiKey, open, onOpenChange }: CreateWebhookDialogProps) {
  const { mutate: create, isPending } = useCreateWebhook(apiKey)

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: getWebhookFormDefaults(),
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(getWebhookFormDefaults())
    }
    onOpenChange(nextOpen)
  }

  const handleCreate = form.handleSubmit((values) => {
    if (!apiKey) return

    create(values, {
      onSuccess: () => {
        handleOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            We'll send POST requests to your URL when specified events occur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4">
          <WebhookFormFields form={form} disabled={isPending} idPrefix="create-webhook" />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {getCreateWebhookSubmitLabel(isPending)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
