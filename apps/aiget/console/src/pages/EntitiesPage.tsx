/**
 * Entities 页面 - 实体列表与管理
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Group01Icon, Delete01Icon, Calendar03Icon } from '@hugeicons/core-free-icons';
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
  Badge,
} from '@aiget/ui';
import { useApiKeys } from '@/features/api-keys';
import {
  useEntities,
  useEntityTypes,
  useDeleteEntity,
  Pagination,
  type Entity,
} from '@/features/memox';

const PAGE_SIZE = 20;

function EntityCard({ entity, onDelete }: { entity: Entity; onDelete: (id: string) => void }) {
  const createdAt = new Date(entity.createdAt).toLocaleString();

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Name & Type */}
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{entity.name}</h3>
              <Badge variant="outline" className="shrink-0">
                {entity.type}
              </Badge>
            </div>

            {/* Properties */}
            {entity.properties && Object.keys(entity.properties).length > 0 && (
              <div className="text-xs text-muted-foreground">
                <pre className="bg-muted rounded p-2 overflow-auto max-h-24">
                  {JSON.stringify(entity.properties, null, 2)}
                </pre>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Icon icon={Calendar03Icon} className="h-3.5 w-3.5" />
                <span>{createdAt}</span>
              </div>
              {entity.confidence !== null && (
                <span>Confidence: {(entity.confidence * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-destructive">
                <Icon icon={Delete01Icon} className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Entity</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{entity.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(entity.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EntitiesPage() {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [offset, setOffset] = useState(0);

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const { data: entityTypes = [], isLoading: isLoadingTypes } = useEntityTypes();
  const { data, isLoading, error } = useEntities({
    apiKeyId: selectedApiKeyId === 'all' ? undefined : selectedApiKeyId,
    type: selectedType === 'all' ? undefined : selectedType,
    limit: PAGE_SIZE,
    offset,
  });
  const deleteMutation = useDeleteEntity();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Entity deleted');
    } catch {
      toast.error('Failed to delete entity');
    }
  };

  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Icon icon={Group01Icon} className="h-6 w-6" />
          Entities
        </h1>
        <p className="text-muted-foreground mt-1">View and manage your knowledge graph entities.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
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

            <div className="w-48">
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value);
                  setOffset(0);
                }}
                disabled={isLoadingTypes}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {entityTypes.map((t) => (
                    <SelectItem key={t.type} value={t.type}>
                      {t.type} ({t.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {data && (
              <span className="text-sm text-muted-foreground">
                {data.pagination.total} entities found
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
            <Icon icon={Group01Icon} className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <CardDescription>No entities found.</CardDescription>
            <p className="text-sm text-muted-foreground mt-2">
              Entities are extracted from memories via the Memox API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {data?.items.map((entity) => (
              <EntityCard key={entity.id} entity={entity} onDelete={handleDelete} />
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
