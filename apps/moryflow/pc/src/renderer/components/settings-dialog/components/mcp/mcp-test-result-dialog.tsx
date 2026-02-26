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
                Test succeeded
              </>
            ) : (
              <>
                <CircleX className="size-5 text-red-600" />
                Test failed
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {result?.success ? (
                <>
                  <p>Connected to the MCP server</p>
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
