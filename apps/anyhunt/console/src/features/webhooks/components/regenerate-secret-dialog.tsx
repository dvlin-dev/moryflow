/**
 * 重新生成 Secret 确认对话框
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
} from '@moryflow/ui';
import { useRegenerateWebhookSecret } from '../hooks';
import type { Webhook } from '../types';

interface RegenerateSecretDialogProps {
  apiKey: string;
  webhook: Webhook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegenerateSecretDialog({
  apiKey,
  webhook,
  open,
  onOpenChange,
}: RegenerateSecretDialogProps) {
  const { mutate: regenerate, isPending } = useRegenerateWebhookSecret(apiKey);

  const handleRegenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!apiKey || !webhook) return;

    regenerate(webhook.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate Secret?</AlertDialogTitle>
          <AlertDialogDescription>
            Once regenerated, the old secret will immediately become invalid. You'll need to update
            the secret on your receiving end to continue verifying signatures.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRegenerate} disabled={isPending}>
            {isPending ? 'Regenerating...' : 'Regenerate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
