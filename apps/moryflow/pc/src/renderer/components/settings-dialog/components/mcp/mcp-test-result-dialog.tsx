import { useTranslation } from '@/lib/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@moryflow/ui/components/alert-dialog';
import { CircleCheck, CircleX } from 'lucide-react';
import type { McpTestResult } from '@shared/ipc';
import { McpToolList } from './mcp-tool-list';

type McpTestResultDialogProps = {
  result: McpTestResult | null;
  onClose: () => void;
};

export const McpTestResultDialog = ({ result, onClose }: McpTestResultDialogProps) => {
  const { t } = useTranslation('settings');

  return (
    <AlertDialog
      open={!!result}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {result?.success ? (
              <>
                <CircleCheck className="size-5 text-green-600" />
                {t('mcpTestSucceeded')}
              </>
            ) : (
              <>
                <CircleX className="size-5 text-red-600" />
                {t('mcpTestFailed')}
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {result?.success ? (
                <>
                  <p>{t('mcpTestConnected')}</p>
                  {result.toolNames && result.toolNames.length > 0 && (
                    <McpToolList toolNames={result.toolNames} />
                  )}
                </>
              ) : (
                <p className="whitespace-pre-wrap text-destructive">{result?.error}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
