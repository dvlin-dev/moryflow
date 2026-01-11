/**
 * Memories 页面 - 记忆列表与管理
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Brain02Icon, Download01Icon } from '@hugeicons/core-free-icons';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aiget/ui';
import { useApiKeys } from '@/features/api-keys';
import { useMemories, useExportMemories, MemoryListCard, Pagination } from '@/features/memox';

const PAGE_SIZE = 20;

export default function MemoriesPage() {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>('all');
  const [offset, setOffset] = useState(0);

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const { data, isLoading, error } = useMemories({
    apiKeyId: selectedApiKeyId === 'all' ? undefined : selectedApiKeyId,
    limit: PAGE_SIZE,
    offset,
  });
  const exportMutation = useExportMemories();

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const blob = await exportMutation.mutateAsync({
        apiKeyId: selectedApiKeyId === 'all' ? undefined : selectedApiKeyId,
        format,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memories-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Icon icon={Brain02Icon} className="h-6 w-6" />
            Memories
          </h1>
          <p className="text-muted-foreground mt-1">View and export your semantic memories.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={exportMutation.isPending || !data?.items.length}
          >
            <Icon icon={Download01Icon} className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exportMutation.isPending || !data?.items.length}
          >
            <Icon icon={Download01Icon} className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Select
                value={selectedApiKeyId}
                onValueChange={(value) => {
                  setSelectedApiKeyId(value);
                  setOffset(0);
                }}
                disabled={isLoadingKeys}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select API Key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All API Keys</SelectItem>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.name} ({key.keyPrefix}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data && (
              <span className="text-sm text-muted-foreground">
                {data.pagination.total} memories found
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error.message}</p>
          </CardContent>
        </Card>
      ) : data?.items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Icon icon={Brain02Icon} className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <CardDescription>No memories found.</CardDescription>
            <p className="text-sm text-muted-foreground mt-2">
              Memories are created via the Memox API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {data?.items.map((memory) => (
              <MemoryListCard key={memory.id} memory={memory} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            onNext={() => setOffset(offset + PAGE_SIZE)}
          />
        </>
      )}
    </div>
  );
}
