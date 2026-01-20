/**
 * [PROPS]: LlmModelsCardProps - models list + callbacks
 * [EMITS]: onNew/onEdit/onDelete - Models 变更动作
 * [POS]: Admin LLM 配置页的 Models 区块（modelId → upstreamId）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { formatRelativeTime } from '@anyhunt/ui/lib';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@anyhunt/ui';
import type { LlmModelListItem } from '@/features/llm';

export interface LlmModelsCardProps {
  isLoading: boolean;
  errorMessage?: string | null;
  isMutating: boolean;
  models: LlmModelListItem[];
  onNew: () => void;
  onEdit: (model: LlmModelListItem) => void;
  onDelete: (model: LlmModelListItem) => void;
}

export function LlmModelsCard({
  isLoading,
  errorMessage,
  isMutating,
  models,
  onNew,
  onEdit,
  onDelete,
}: LlmModelsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Models</CardTitle>
        <Button onClick={onNew} disabled={isMutating}>
          New model
        </Button>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        {isLoading ? <Skeleton className="h-40 w-full" /> : null}

        {!isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>modelId</TableHead>
                <TableHead>upstreamId</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No models yet. Create a provider first, then add a mapping.
                  </TableCell>
                </TableRow>
              ) : null}

              {models.map((m) => {
                const updatedAt = m.updatedAt ? formatRelativeTime(new Date(m.updatedAt)) : '';
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.modelId}</TableCell>
                    <TableCell className="font-mono text-xs">{m.upstreamId}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{m.providerName}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {m.providerType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.enabled ? (
                        <Badge variant="secondary">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {updatedAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(m)}
                          disabled={isMutating}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(m)}
                          disabled={isMutating}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
