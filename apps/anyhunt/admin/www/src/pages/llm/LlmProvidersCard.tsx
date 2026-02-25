/**
 * [PROPS]: LlmProvidersCardProps - providers list + callbacks
 * [EMITS]: onNew/onEdit/onDelete - Providers 变更动作
 * [POS]: Admin LLM 配置页的 Providers 区块（表格）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { formatRelativeTime } from '@moryflow/ui/lib';
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
} from '@moryflow/ui';
import type { LlmProviderListItem } from '@/features/llm';

export interface LlmProvidersCardProps {
  isLoading: boolean;
  errorMessage?: string | null;
  isMutating: boolean;
  providers: LlmProviderListItem[];
  onNew: () => void;
  onEdit: (provider: LlmProviderListItem) => void;
  onDelete: (provider: LlmProviderListItem) => void;
}

export function LlmProvidersCard({
  isLoading,
  errorMessage,
  isMutating,
  providers,
  onNew,
  onEdit,
  onDelete,
}: LlmProvidersCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Providers</CardTitle>
        <Button onClick={onNew} disabled={isMutating}>
          New provider
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
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sort</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No providers yet.
                  </TableCell>
                </TableRow>
              ) : null}

              {providers.map((p) => {
                const updatedAt = p.updatedAt ? formatRelativeTime(new Date(p.updatedAt)) : '';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.providerType}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {p.baseUrl ?? '(default)'}
                    </TableCell>
                    <TableCell>
                      {p.enabled ? (
                        <Badge variant="secondary">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.sortOrder}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {updatedAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(p)}
                          disabled={isMutating}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(p)}
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
