/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Graph 页面 - 知识图谱可视化（容器编排层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Workflow } from 'lucide-react';
import { Card, CardContent } from '@moryflow/ui';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import {
  useGraph,
  type GraphQueryParams,
  graphFormSchema,
  graphFormDefaults,
  buildGraphQueryParams,
  type GraphFormInput,
  type GraphFormValues,
  MemoxGraphQueryCard,
  MemoxGraphVisualizationCard,
} from '@/features/memox';

export default function GraphPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [queryParams, setQueryParams] = useState<GraphQueryParams | null>(null);

  const { activeKeys, effectiveKeyId, apiKeyValue, apiKeyDisplay, hasActiveKey } =
    resolveActiveApiKeySelection(apiKeys, selectedKeyId);

  const {
    data: graphData,
    isLoading: isLoadingGraph,
    error: graphError,
  } = useGraph(apiKeyValue, queryParams ?? {}, Boolean(apiKeyValue && queryParams));

  const form = useForm<GraphFormInput, unknown, GraphFormValues>({
    resolver: zodResolver(graphFormSchema),
    defaultValues: graphFormDefaults,
  });

  const handleSubmit = (values: GraphFormValues) => {
    const params = buildGraphQueryParams(values);
    setQueryParams(params);
  };

  if (isLoadingKeys) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Workflow className="h-6 w-6" />
          Knowledge Graph
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize entities and relations from memories.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <MemoxGraphQueryCard
          activeKeys={activeKeys}
          effectiveKeyId={effectiveKeyId}
          apiKeyDisplay={apiKeyDisplay}
          hasActiveKey={hasActiveKey}
          isLoading={isLoadingGraph}
          form={form}
          onKeyChange={setSelectedKeyId}
          onSubmit={handleSubmit}
        />

        <MemoxGraphVisualizationCard
          graphData={graphData ?? null}
          isLoading={isLoadingGraph}
          error={graphError instanceof Error ? graphError : null}
        />
      </div>
    </div>
  );
}
