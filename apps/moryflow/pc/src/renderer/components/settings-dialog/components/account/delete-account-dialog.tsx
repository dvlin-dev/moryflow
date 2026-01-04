/**
 * 删除账户对话框
 */

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@aiget/ui/components/alert-dialog'
import { Button } from '@aiget/ui/components/button'
import { Input } from '@aiget/ui/components/input'
import { Label } from '@aiget/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@aiget/ui/components/radio-group'
import { Textarea } from '@aiget/ui/components/textarea'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAccount } from '@/lib/server/api'
import { DELETION_REASONS, type DeletionReasonCode } from '@aiget/api'
import { useTranslation } from '@/lib/i18n'
import type { UserInfo } from '@/lib/server/types'

type DeleteAccountDialogProps = {
  user: UserInfo
  onDeleted: () => void
}

export const DeleteAccountDialog = ({ user, onDeleted }: DeleteAccountDialogProps) => {
  const { t } = useTranslation('settings')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<DeletionReasonCode | ''>('')
  const [feedback, setFeedback] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isValid = reason !== '' && confirmation === user.email

  const handleDelete = async () => {
    if (!reason || confirmation !== user.email) return

    setIsDeleting(true)
    try {
      await deleteAccount({
        reason,
        feedback: feedback.trim() || undefined,
        confirmation,
      })
      toast.success(t('deleteAccountSuccess'))
      setOpen(false)
      onDeleted()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('deleteAccountError'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      // 重置表单
      setReason('')
      setFeedback('')
      setConfirmation('')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('deleteAccount')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('deleteAccountTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteAccountWarning')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* 删除原因选择 */}
          <div className="space-y-2">
            <Label>{t('selectDeleteReason')}</Label>
            <RadioGroup
              value={reason}
              onValueChange={(value) => setReason(value as DeletionReasonCode)}
            >
              {DELETION_REASONS.map((r) => (
                <div key={r.code} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.code} id={r.code} />
                  <Label htmlFor={r.code} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 详细反馈 */}
          <div className="space-y-2">
            <Label htmlFor="feedback">{t('detailedFeedbackOptional')}</Label>
            <Textarea
              id="feedback"
              placeholder={t('deleteFeedbackPlaceholder')}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {feedback.length}/500
            </p>
          </div>

          {/* 确认输入 */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">{t('deleteConfirmationHint')}</Label>
            <Input
              id="confirmation"
              placeholder={user.email}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
            {confirmation && confirmation !== user.email && (
              <p className="text-xs text-destructive">{t('emailMismatch')}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isValid || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? t('deleting') : t('confirmDeleteAccount')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
