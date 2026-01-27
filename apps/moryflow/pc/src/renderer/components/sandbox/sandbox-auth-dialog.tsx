/**
 * [PROPS]: open, path, onResponse
 * [EMITS]: onResponse(choice) - 用户选择授权选项时触发
 * [POS]: 沙盒授权弹窗组件，当 Agent 需要访问 Vault 外路径时弹出（Lucide 图标）
 */

import { FolderOpen } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@anyhunt/ui/components/alert-dialog';
import { Button } from '@anyhunt/ui/components/button';
import type { AuthChoice } from '@anyhunt/agents-sandbox';

interface SandboxAuthDialogProps {
  open: boolean;
  path: string;
  onResponse: (choice: AuthChoice) => void;
}

export function SandboxAuthDialog({ open, path, onResponse }: SandboxAuthDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <AlertDialogTitle>Access External File</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Agent needs to access a file outside your Vault:</p>
              <code className="block rounded-lg bg-muted px-3 py-2 text-sm font-mono break-all">
                {path}
              </code>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onResponse('deny')}>
            Deny
          </Button>
          <Button variant="secondary" onClick={() => onResponse('allow_once')}>
            Allow Once
          </Button>
          <Button variant="default" onClick={() => onResponse('allow_always')}>
            Always Allow
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
