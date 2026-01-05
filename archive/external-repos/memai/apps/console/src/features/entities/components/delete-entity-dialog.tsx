/**
 * 删除 Entity 确认对话框
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
import { useDeleteEntity } from '../hooks'
import type { Entity } from '../types'

interface DeleteEntityDialogProps {
  entity: Entity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteEntityDialog({
  entity,
  open,
  onOpenChange,
}: DeleteEntityDialogProps) {
  const { mutate: deleteEntity, isPending } = useDeleteEntity()

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!entity) return

    deleteEntity(entity.id, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entity?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete entity{' '}
            <strong>
              {entity?.type}/{entity?.name}
            </strong>
            ? This action cannot be undone. Related relations may also be affected.
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
