/**
 * [PROPS]: open, vaultName, onChoice
 * [EMITS]: onChoice(choice) - 用户选择时触发
 * [POS]: 绑定冲突弹窗组件，当用户登录不同账号时弹出
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { CloudOff, CloudUpload } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@anyhunt/ui/components/alert-dialog'
import { Button } from '@anyhunt/ui/components/button'
import type { BindingConflictChoice } from '@shared/ipc'

interface BindingConflictDialogProps {
  open: boolean
  vaultName: string
  onChoice: (choice: BindingConflictChoice) => void
}

export function BindingConflictDialog({ open, vaultName, onChoice }: BindingConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CloudOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>Workspace Sync Conflict</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                The workspace <strong className="text-foreground">{vaultName}</strong> was synced
                with a different account.
              </p>
              <p className="text-muted-foreground">
                Choose how to proceed with the current account:
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onChoice('stay_offline')} className="gap-2">
            <CloudOff className="h-4 w-4" />
            Stay Offline
          </Button>
          <Button variant="default" onClick={() => onChoice('sync_to_current')} className="gap-2">
            <CloudUpload className="h-4 w-4" />
            Sync to Current Account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
