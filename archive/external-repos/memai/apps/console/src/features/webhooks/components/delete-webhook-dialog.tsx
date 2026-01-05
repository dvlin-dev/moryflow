/**
 * 删除 Webhook 确认对话框
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@memai/ui/primitives'
import { useDeleteWebhook } from '../hooks'
import type { Webhook } from '../types'

interface DeleteWebhookDialogProps {
  webhook: Webhook | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWebhookDialog({
  webhook,
  open,
  onOpenChange,
}: DeleteWebhookDialogProps) {
  const { mutate: deleteWebhook, isPending } = useDeleteWebhook()

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!webhook) return

    deleteWebhook(webhook.id, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{webhook?.name}</strong>?
            This action cannot be undone. Notifications will no longer be sent to this URL.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
