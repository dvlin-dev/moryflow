/**
 * [INPUT]  entities, relations, onQueryGraph, entityCount, relationCount
 * [OUTPUT] Inline graph section with entity detail below
 * [POS]    Dashboard section — replaces ConnectionsOverlay
 */
import { useState, useCallback, useMemo, useRef, useEffect, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
import { ReactFlow, Background, Controls, type NodeTypes } from '@xyflow/react';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { useTranslation } from '@/lib/i18n';
import type { MemoryGraphEntity, MemoryGraphRelation, MemoryEntityDetail } from '@shared/ipc';
import { EntityNode } from './graph-entity-node';
import { useForceLayout, getEntityColor } from './use-force-layout';
import { MEMORY_GRAPH_QUERY_DEBOUNCE_MS } from './const';

import '@xyflow/react/dist/style.css';

const nodeTypes: NodeTypes = { entityNode: EntityNode };

interface ConnectionsCardProps {
  entityCount: number;
  relationCount: number;
  entities: MemoryGraphEntity[];
  relations: MemoryGraphRelation[];
  onQueryGraph: (query?: string) => void;
}

export function ConnectionsCard({
  entityCount,
  relationCount,
  entities,
  relations,
  onQueryGraph,
}: ConnectionsCardProps) {
  const { t } = useTranslation('workspace');
  const [query, setQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entityDetail, setEntityDetail] = useState<MemoryEntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEntityClick = useCallback((entityId: string) => {
    setSelectedEntityId(entityId);
  }, []);

  const { nodes, edges } = useForceLayout({
    entities,
    relations,
    onEntityClick: handleEntityClick,
  });

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
    if (e.key === 'Escape' && query.length > 0) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setQuery('');
      onQueryGraph();
    }
  };

  // Load entity detail
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

  // Reset selection when the entity set changes underneath (workspace switch, search)
  useEffect(() => {
    if (selectedEntityId && !entities.some((e) => e.id === selectedEntityId)) {
      setSelectedEntityId(null);
      setEntityDetail(null);
    }
  }, [entities, selectedEntityId]);

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

  if (entityCount <= 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('connectionsTitle')}</h2>
          <span className="text-xs text-muted-foreground">
            {t(entityCount === 1 ? 'connectionsEntityOne' : 'connectionsEntityOther', {
              count: entityCount,
            })}{' '}
            &middot;{' '}
            {t(relationCount === 1 ? 'connectionsRelationOne' : 'connectionsRelationOther', {
              count: relationCount,
            })}
          </span>
        </div>
      </div>

      {/* Graph area */}
      <div className="relative h-80 border-t border-border/60 bg-background">
        {/* Search overlay */}
        <div className="absolute left-3 top-3 z-10 w-48">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('connectionsSearchPlaceholder')}
              className="h-7 rounded-lg border-border/60 bg-card pl-7 text-xs shadow-xs"
            />
          </div>
        </div>

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
          <Controls
            showInteractive={false}
            className="!rounded-lg !border-border/60 !bg-card !shadow-xs [&>button]:!border-border/60 [&>button]:!bg-card [&>button]:!fill-muted-foreground [&>button:hover]:!bg-accent"
          />
        </ReactFlow>
      </div>

      {/* Entity detail (inline below graph) */}
      {selectedEntityId && (
        <div className="border-t border-border/60">
          {/* Detail header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div
                className="h-6 w-0.5 rounded-full"
                style={{
                  backgroundColor: selectedEntity
                    ? getEntityColor(selectedEntity.entityType)
                    : undefined,
                }}
              />
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedEntity?.canonicalName ?? t('connectionsLoading')}
                </h3>
                {selectedEntity && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                    {selectedEntity.entityType}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {entityDetail && (
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span>
                    {t('connectionsObservations', {
                      count: entityDetail.evidenceSummary.observationCount,
                    })}
                  </span>
                  <span>
                    {t('connectionsSources', { count: entityDetail.evidenceSummary.sourceCount })}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedEntityId(null)}
                className="flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Detail body */}
          {detailLoading ? (
            <p className="px-4 py-4 text-xs text-muted-foreground">
              {t('connectionsLoadingDetails')}
            </p>
          ) : entityDetail ? (
            <div className="flex min-h-0">
              {/* Relations column */}
              <div className="flex-1 border-r border-border/60 p-4">
                <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('connectionsRelationsTitle')}
                </h4>

                {entityDetail.entity.outgoingRelations.length > 0 && (
                  <div className="mb-3">
                    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      {t('connectionsOutgoing')}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {entityDetail.entity.outgoingRelations.map((rel) => (
                        <div key={rel.id} className="flex items-center gap-0">
                          <span className="shrink-0 rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {rel.relationType}
                          </span>
                          <div className="mx-1 h-px w-4 bg-border" />
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 transition-colors hover:bg-accent"
                            onClick={() => setSelectedEntityId(rel.to.id)}
                          >
                            <div
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: getEntityColor(rel.to.entityType) }}
                            />
                            <span className="text-xs font-medium text-foreground">
                              {rel.to.canonicalName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {rel.to.entityType}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entityDetail.entity.incomingRelations.length > 0 && (
                  <div>
                    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      {t('connectionsIncoming')}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {entityDetail.entity.incomingRelations.map((rel) => (
                        <div key={rel.id} className="flex items-center gap-0">
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 transition-colors hover:bg-accent"
                            onClick={() => setSelectedEntityId(rel.from.id)}
                          >
                            <div
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: getEntityColor(rel.from.entityType) }}
                            />
                            <span className="text-xs font-medium text-foreground">
                              {rel.from.canonicalName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {rel.from.entityType}
                            </span>
                          </button>
                          <div className="mx-1 h-px w-4 bg-border" />
                          <span className="shrink-0 rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {rel.relationType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Observations column */}
              <ScrollArea className="max-h-48 flex-1">
                <div className="p-4">
                  <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('connectionsRecentObservations')}
                  </h4>
                  {entityDetail.recentObservations.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {entityDetail.recentObservations.map((obs) => (
                        <div
                          key={obs.id}
                          className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-1.5"
                        >
                          <span className="text-xs font-medium text-muted-foreground">
                            {obs.observationType}
                          </span>
                          {obs.confidence !== null && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                              {Math.round(obs.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
