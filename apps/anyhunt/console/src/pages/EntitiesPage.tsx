/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Entities 页面 - 实体列表与管理（Lucide icons direct render）
 */

import { useMemo, useState } from 'react';
import { Group, Calendar } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Input,
  Label,
} from '@moryflow/ui';
import { useApiKeys, maskApiKey } from '@/features/api-keys';
import { useEntities, useEntityTypes, type Entity } from '@/features/memox';

function EntityCard({ entity }: { entity: Entity }) {
  const createdAt = new Date(entity.created_at).toLocaleString();

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {/* Name & Type */}
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{entity.name}</h3>
            <Badge variant="outline" className="shrink-0">
              {entity.type}
            </Badge>
          </div>

          {/* Metadata */}
          {entity.metadata && Object.keys(entity.metadata).length > 0 && (
            <div className="text-xs text-muted-foreground">
              <pre className="bg-muted rounded p-2 overflow-auto max-h-24">
                {JSON.stringify(entity.metadata, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{createdAt}</span>
            </div>
            <span>Total memories: {entity.total_memories}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EntitiesPage() {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const activeKeys = apiKeys.filter((key) => key.isActive);
  const effectiveKeyId = selectedApiKeyId || activeKeys[0]?.id || '';
  const selectedKey = apiKeys.find((key) => key.id === effectiveKeyId);
  const apiKeyValue = selectedKey?.key ?? '';
  const apiKeyDisplay = selectedKey ? maskApiKey(selectedKey.key) : '';

  const { data: entities = [], isLoading, error } = useEntities(apiKeyValue);
  const { data: entityTypes = [] } = useEntityTypes(apiKeyValue);

  const filteredEntities = useMemo(() => {
    if (selectedType === 'all') return entities;
    return entities.filter((entity) => entity.type === selectedType);
  }, [entities, selectedType]);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Group className="h-6 w-6" />
          Entities
        </h1>
        <p className="text-muted-foreground mt-1">View Mem0-style entities for your API key.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Select
                value={effectiveKeyId}
                onValueChange={setSelectedApiKeyId}
                disabled={isLoadingKeys}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select API Key" />
                </SelectTrigger>
                <SelectContent>
                  {activeKeys.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No active API keys
                    </SelectItem>
                  ) : (
                    activeKeys.map((key) => (
                      <SelectItem key={key.id} value={key.id}>
                        {key.name} ({maskApiKey(key.key)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType} disabled={!apiKeyValue}>
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
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!apiKeyValue ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select an API key to load entities.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>Failed to load entities.</CardContent>
        </Card>
      ) : filteredEntities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No entities found for the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEntities.map((entity) => (
            <EntityCard key={`${entity.type}-${entity.id}`} entity={entity} />
          ))}
        </div>
      )}

      {apiKeyValue && filteredEntities.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {filteredEntities.length} entities loaded
        </div>
      )}
    </div>
  );
}
