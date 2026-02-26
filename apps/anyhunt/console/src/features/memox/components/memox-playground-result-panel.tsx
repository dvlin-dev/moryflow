/**
 * [PROPS]: activeTab, createdMemory, searchResults
 * [EMITS]: none
 * [POS]: Memox Playground 结果区（创建结果 / 搜索结果 / 空状态）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { CircleCheck, Plus, Search } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ScrollArea } from '@moryflow/ui';
import type { Memory, MemorySearchResult } from '../types';
import type { MemoxPlaygroundTab } from '../playground-schemas';

interface MemoxPlaygroundResultPanelProps {
  activeTab: MemoxPlaygroundTab;
  createdMemory: Memory | null;
  searchResults: MemorySearchResult[] | null;
}

type MemoxResultViewState =
  | 'create_ready'
  | 'create_empty'
  | 'search_ready'
  | 'search_empty'
  | 'search_no_result';

function resolveResultViewState({
  activeTab,
  createdMemory,
  searchResults,
}: MemoxPlaygroundResultPanelProps): MemoxResultViewState {
  if (activeTab === 'create') {
    return createdMemory ? 'create_ready' : 'create_empty';
  }

  if (!searchResults) {
    return 'search_empty';
  }

  if (searchResults.length === 0) {
    return 'search_no_result';
  }

  return 'search_ready';
}

function CreatedMemoryCard({ memory }: { memory: Memory }) {
  const categories = memory.categories ?? [];
  const keywords = memory.keywords ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleCheck className="h-5 w-5 text-green-500" />
          Memory Created
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Memory</p>
            <p className="whitespace-pre-wrap">{memory.memory}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-xs">User ID</p>
              <p className="font-mono text-xs">{memory.user_id ?? '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ID</p>
              <p className="font-mono text-xs truncate">{memory.id}</p>
            </div>
          </div>

          {(categories.length > 0 || keywords.length > 0) && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Categories & Keywords</p>
              <div className="flex flex-wrap gap-1">
                {categories.map((category) => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                ))}
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{new Date(memory.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Updated</p>
              <p>{new Date(memory.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchResultCard({ result }: { result: MemorySearchResult }) {
  const categories = result.categories ?? [];
  const keywords = result.keywords ?? [];

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm whitespace-pre-wrap flex-1">{result.memory}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>ID: {result.id.slice(0, 8)}...</span>
          {result.user_id && <span>User: {result.user_id}</span>}
          <span>{new Date(result.created_at).toLocaleDateString()}</span>
        </div>

        {(categories.length > 0 || keywords.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <Badge key={category} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
            {keywords.map((keyword) => (
              <Badge key={keyword} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SearchResultList({ results }: { results: MemorySearchResult[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>
          {results.length} {results.length === 1 ? 'memory' : 'memories'} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {results.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CreateEmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">
          Fill out the form and click "Create Memory" to store a new memory.
        </p>
      </CardContent>
    </Card>
  );
}

function SearchEmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">
          Enter a query and click "Search Memories" to find relevant memories.
        </p>
      </CardContent>
    </Card>
  );
}

function SearchNoResultState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>0 memories found</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No memories found matching your query.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MemoxPlaygroundResultPanel({
  activeTab,
  createdMemory,
  searchResults,
}: MemoxPlaygroundResultPanelProps) {
  const viewState = resolveResultViewState({ activeTab, createdMemory, searchResults });

  const renderByState = () => {
    switch (viewState) {
      case 'create_ready':
        if (createdMemory) {
          return <CreatedMemoryCard memory={createdMemory} />;
        }
        return null;
      case 'create_empty':
        return <CreateEmptyState />;
      case 'search_ready':
        if (searchResults) {
          return <SearchResultList results={searchResults} />;
        }
        return null;
      case 'search_no_result':
        return <SearchNoResultState />;
      case 'search_empty':
        return <SearchEmptyState />;
      default:
        return null;
    }
  };

  return <div className="space-y-6">{renderByState()}</div>;
}
