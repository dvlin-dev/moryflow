import { useState, useCallback, useMemo, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { ReactFlow, Background, Controls, type NodeTypes } from '@xyflow/react';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import type { MemoryGraphEntity, MemoryGraphRelation, MemoryEntityDetail } from '@shared/ipc';
import { EntityNode } from './graph-entity-node';
import { useForceLayout, getEntityColor } from './use-force-layout';
import { MEMORY_GRAPH_QUERY_DEBOUNCE_MS } from './const';

import '@xyflow/react/dist/style.css';

const nodeTypes: NodeTypes = { entityNode: EntityNode };

interface ConnectionsOverlayProps {
  open: boolean;
  onClose: () => void;
  entities: MemoryGraphEntity[];
  relations: MemoryGraphRelation[];
  onQueryGraph: (query?: string) => void;
}

export function ConnectionsOverlay({
  open,
  onClose,
  entities,
  relations,
  onQueryGraph,
}: ConnectionsOverlayProps) {
  const [query, setQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entityDetail, setEntityDetail] = useState<MemoryEntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEntityClick = useCallback((entityId: string) => {
    setSelectedEntityId(entityId);
  }, []);

  const { nodes, edges } = useForceLayout({
    entities: open ? entities : [],
    relations: open ? relations : [],
    onEntityClick: handleEntityClick,
  });

  useEffect(() => {
    if (!open) {
      // Cancel any pending debounced query before resetting
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setQuery('');
      setSelectedEntityId(null);
      setEntityDetail(null);
      // Reset any active graph filter so next open shows the full graph
      onQueryGraph();
    }
  }, [open, onQueryGraph]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length === 0) {
      onQueryGraph();
      return;
    }
    debounceRef.current = setTimeout(() => {
      onQueryGraph(value.trim());
    }, MEMORY_GRAPH_QUERY_DEBOUNCE_MS);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (query.length > 0) {
        setQuery('');
        onQueryGraph();
      } else {
        onClose();
      }
    }
  };

  // Load entity detail when selected
  useEffect(() => {
    if (!selectedEntityId) {
      setEntityDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    window.desktopAPI.memory
      .getEntityDetail({ entityId: selectedEntityId })
      .then((detail) => {
        if (!cancelled) setEntityDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setEntityDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEntityId]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectedEntity = useMemo(
    () => (selectedEntityId ? (entities.find((e) => e.id === selectedEntityId) ?? null) : null),
    [entities, selectedEntityId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">Connections</h2>
          <div className="relative ml-auto w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search connections..."
              className="h-8 rounded-lg pl-8 text-sm"
            />
          </div>
        </div>

        {/* Graph canvas */}
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* Entity detail panel */}
        {selectedEntityId && (
          <div className="border-t border-border/60 bg-background">
            <div className="mx-auto max-w-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {selectedEntity && (
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: getEntityColor(selectedEntity.entityType) }}
                    />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {selectedEntity?.canonicalName ?? 'Loading...'}
                    </h3>
                    {selectedEntity && (
                      <p className="text-xs text-muted-foreground">{selectedEntity.entityType}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntityId(null)}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {detailLoading ? (
                <p className="mt-3 text-xs text-muted-foreground">Loading details...</p>
              ) : entityDetail ? (
                <ScrollArea className="mt-3 max-h-48">
                  <div className="flex flex-col gap-3">
                    {/* Relations */}
                    {(entityDetail.entity.outgoingRelations.length > 0 ||
                      entityDetail.entity.incomingRelations.length > 0) && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Relations
                        </h4>
                        <div className="flex flex-col gap-0.5">
                          {entityDetail.entity.outgoingRelations.map((rel) => (
                            <p key={rel.id} className="text-xs text-foreground">
                              <span className="text-muted-foreground">{rel.relationType}</span>{' '}
                              <button
                                type="button"
                                className="font-medium underline-offset-2 hover:underline"
                                onClick={() => setSelectedEntityId(rel.to.id)}
                              >
                                {rel.to.canonicalName}
                              </button>
                            </p>
                          ))}
                          {entityDetail.entity.incomingRelations.map((rel) => (
                            <p key={rel.id} className="text-xs text-foreground">
                              <button
                                type="button"
                                className="font-medium underline-offset-2 hover:underline"
                                onClick={() => setSelectedEntityId(rel.from.id)}
                              >
                                {rel.from.canonicalName}
                              </button>{' '}
                              <span className="text-muted-foreground">{rel.relationType}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observations */}
                    {entityDetail.recentObservations.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Recent observations
                        </h4>
                        <div className="flex flex-col gap-0.5">
                          {entityDetail.recentObservations.map((obs) => (
                            <p key={obs.id} className="text-xs text-muted-foreground">
                              {obs.observationType}
                              {obs.confidence !== null
                                ? ` (${Math.round(obs.confidence * 100)}%)`
                                : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence summary */}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{entityDetail.evidenceSummary.observationCount} observations</span>
                      <span>{entityDetail.evidenceSummary.sourceCount} sources</span>
                    </div>
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
