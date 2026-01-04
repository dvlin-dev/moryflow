/**
 * [PROPS]: VaultRemoveDialogProps
 * [EMITS]: onConfirm, onCancel
 * [POS]: Vault 移除确认对话框
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
} from '@aiget/ui/components/alert-dialog'
import { useTranslation } from '@/lib/i18n'
import type { VaultRemoveDialogProps } from '../const'

export const VaultRemoveDialog = ({
  vault,
  onConfirm,
  onCancel,
}: VaultRemoveDialogProps) => {
  const { t } = useTranslation('workspace')
  const { t: tCommon } = useTranslation('common')

  return (
    <AlertDialog open={!!vault} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmRemove')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('confirmRemoveDescription', { name: vault?.name ?? '' })}
            <br />
            <span className="text-muted-foreground">{t('removeNote')}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {tCommon('remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
