/**
 * Memox Playground 页面
 *
 * 测试 Memox Memory API：创建记忆和语义搜索。
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3'; // 使用 v3 兼容层，解决 @hookform/resolvers 类型兼容问题
import { toast } from 'sonner';
import {
  Brain02Icon,
  Add01Icon,
  Search01Icon,
  Loading03Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Button,
  Input,
  Textarea,
  Label,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  ScrollArea,
} from '@anyhunt/ui';
import { useApiKeys } from '@/features/api-keys';
import {
  useCreateMemory,
  useSearchMemories,
  type Memory,
  type MemorySearchResult,
} from '@/features/memox';
import { CodeExample } from '@/features/playground-shared';
import { MEMOX_API } from '@/lib/api-paths';

// 创建记忆表单 Schema
const createMemorySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  source: z.string().optional(),
  importance: z.number().min(0).max(1).optional(),
  tags: z.string().optional(),
});

type CreateMemoryFormValues = z.infer<typeof createMemorySchema>;

// 搜索记忆表单 Schema
const searchMemorySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  query: z.string().min(1, 'Query is required'),
  limit: z.number().min(1).max(100),
  threshold: z.number().min(0).max(1),
});

type SearchMemoryFormValues = z.infer<typeof searchMemorySchema>;

// 搜索记忆表单默认值
const searchMemoryDefaults: SearchMemoryFormValues = {
  userId: '',
  query: '',
  limit: 10,
  threshold: 0.5,
};

export default function MemoxPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'search'>('create');

  // 结果状态
  const [createdMemory, setCreatedMemory] = useState<Memory | null>(null);
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);

  // 最后请求（用于代码示例）
  const [lastCreateRequest, setLastCreateRequest] = useState<CreateMemoryFormValues | null>(null);
  const [lastSearchRequest, setLastSearchRequest] = useState<SearchMemoryFormValues | null>(null);

  // 计算 effective API key
  const effectiveKeyId = selectedKeyId ?? apiKeys.find((k) => k.isActive)?.id ?? '';
  const selectedKey = apiKeys.find((k) => k.id === effectiveKeyId);
  const activeKeys = apiKeys.filter((k) => k.isActive);
  const apiKeyValue = selectedKey?.keyPrefix ? `${selectedKey.keyPrefix}...` : '';

  // Mutations
  const createMemoryMutation = useCreateMemory();
  const searchMemoriesMutation = useSearchMemories();

  // 创建记忆表单
  const createForm = useForm<CreateMemoryFormValues>({
    resolver: zodResolver(createMemorySchema),
    defaultValues: {
      userId: '',
      content: '',
      agentId: '',
      sessionId: '',
      source: '',
      importance: undefined,
      tags: '',
    },
  });

  // 搜索记忆表单
  const searchForm = useForm<SearchMemoryFormValues>({
    resolver: zodResolver(searchMemorySchema),
    defaultValues: searchMemoryDefaults,
  });

  // 创建记忆提交
  const handleCreate = async (values: CreateMemoryFormValues) => {
    if (!selectedKey?.keyPrefix) {
      toast.error('Please select an API key');
      return;
    }

    setLastCreateRequest(values);
    setCreatedMemory(null);

    const requestData = {
      userId: values.userId,
      content: values.content,
      ...(values.agentId && { agentId: values.agentId }),
      ...(values.sessionId && { sessionId: values.sessionId }),
      ...(values.source && { source: values.source }),
      ...(values.importance !== undefined && { importance: values.importance }),
      ...(values.tags && {
        tags: values.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    };

    try {
      const result = await createMemoryMutation.mutateAsync({
        apiKey: selectedKey.keyPrefix,
        data: requestData,
      });
      setCreatedMemory(result);
      toast.success('Memory created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create memory');
    }
  };

  // 搜索记忆提交
  const handleSearch = async (values: SearchMemoryFormValues) => {
    if (!selectedKey?.keyPrefix) {
      toast.error('Please select an API key');
      return;
    }

    setLastSearchRequest(values);
    setSearchResults(null);

    try {
      const results = await searchMemoriesMutation.mutateAsync({
        apiKey: selectedKey.keyPrefix,
        data: {
          userId: values.userId,
          query: values.query,
          limit: values.limit,
          threshold: values.threshold,
        },
      });
      setSearchResults(results);
      toast.success(`Found ${results.length} memories`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    }
  };

  // 加载状态
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Icon icon={Brain02Icon} className="h-6 w-6" />
          Memox Playground
        </h1>
        <p className="text-muted-foreground mt-1">
          Test the Memory API: create memories and search semantically.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：表单 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
              <CardDescription>Create or search memories using the Memox API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key 选择 */}
              <div className="space-y-2">
                <Label>API Key</Label>
                <Select
                  value={effectiveKeyId}
                  onValueChange={setSelectedKeyId}
                  disabled={createMemoryMutation.isPending || searchMemoriesMutation.isPending}
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
                          <span className="flex items-center gap-2">
                            <span>{key.name}</span>
                            <span className="text-muted-foreground font-mono text-xs">
                              {key.keyPrefix}...
                            </span>
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {activeKeys.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Create an API key in{' '}
                    <a href="/api-keys" className="text-primary hover:underline">
                      API Keys
                    </a>{' '}
                    to use the playground.
                  </p>
                )}
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'search')}>
                <TabsList className="w-full">
                  <TabsTrigger value="create" className="flex-1">
                    <Icon icon={Add01Icon} className="h-4 w-4 mr-2" />
                    Create
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex-1">
                    <Icon icon={Search01Icon} className="h-4 w-4 mr-2" />
                    Search
                  </TabsTrigger>
                </TabsList>

                {/* 创建记忆表单 */}
                <TabsContent value="create" className="mt-4">
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="user-123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter the memory content..."
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="agentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agent ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="sessionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Session ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., chat, api" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="importance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Importance (0-1)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  placeholder="0.5"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={createForm.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <FormControl>
                              <Input placeholder="tag1, tag2, tag3" {...field} />
                            </FormControl>
                            <FormDescription>Comma-separated list of tags</FormDescription>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createMemoryMutation.isPending || !effectiveKeyId}
                      >
                        {createMemoryMutation.isPending ? (
                          <>
                            <Icon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Icon icon={Add01Icon} className="h-4 w-4 mr-2" />
                            Create Memory
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* 搜索记忆表单 */}
                <TabsContent value="search" className="mt-4">
                  <Form {...searchForm}>
                    <form onSubmit={searchForm.handleSubmit(handleSearch)} className="space-y-4">
                      <FormField
                        control={searchForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="user-123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={searchForm.control}
                        name="query"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Search Query *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What are you looking for?"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Semantic search - describe what you're looking for
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={searchForm.control}
                          name="limit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Limit</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" max="100" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={searchForm.control}
                          name="threshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Threshold (0-1)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" min="0" max="1" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={searchMemoriesMutation.isPending || !effectiveKeyId}
                      >
                        {searchMemoriesMutation.isPending ? (
                          <>
                            <Icon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Icon icon={Search01Icon} className="h-4 w-4 mr-2" />
                            Search Memories
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 代码示例 */}
          {activeTab === 'create' && lastCreateRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Code Example</CardTitle>
                <CardDescription>Copy and use this code in your application</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeExample
                  endpoint={MEMOX_API.MEMORIES}
                  method="POST"
                  apiKey={apiKeyValue}
                  body={{
                    userId: lastCreateRequest.userId,
                    content: lastCreateRequest.content,
                    ...(lastCreateRequest.agentId && { agentId: lastCreateRequest.agentId }),
                    ...(lastCreateRequest.sessionId && { sessionId: lastCreateRequest.sessionId }),
                    ...(lastCreateRequest.source && { source: lastCreateRequest.source }),
                    ...(lastCreateRequest.importance !== undefined && {
                      importance: lastCreateRequest.importance,
                    }),
                    ...(lastCreateRequest.tags && {
                      tags: lastCreateRequest.tags
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }),
                  }}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'search' && lastSearchRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Code Example</CardTitle>
                <CardDescription>Copy and use this code in your application</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeExample
                  endpoint={MEMOX_API.MEMORIES_SEARCH}
                  method="POST"
                  apiKey={apiKeyValue}
                  body={lastSearchRequest}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：结果 */}
        <div className="space-y-6">
          {/* 创建结果 */}
          {activeTab === 'create' && createdMemory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-green-500" />
                  Memory Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MemoryCard memory={createdMemory} />
              </CardContent>
            </Card>
          )}

          {/* 搜索结果 */}
          {activeTab === 'search' && searchResults && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {searchResults.length} {searchResults.length === 1 ? 'memory' : 'memories'} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon icon={Search01Icon} className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No memories found matching your query.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <MemorySearchResultCard key={result.id} result={result} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* 空状态 */}
          {activeTab === 'create' && !createdMemory && (
            <Card>
              <CardContent className="py-16 text-center">
                <Icon
                  icon={Add01Icon}
                  className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30"
                />
                <p className="text-muted-foreground">
                  Fill out the form and click "Create Memory" to store a new memory.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'search' && !searchResults && (
            <Card>
              <CardContent className="py-16 text-center">
                <Icon
                  icon={Search01Icon}
                  className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30"
                />
                <p className="text-muted-foreground">
                  Enter a query and click "Search Memories" to find relevant memories.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// 记忆卡片组件
function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-muted-foreground text-xs">Content</p>
        <p className="whitespace-pre-wrap">{memory.content}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-muted-foreground text-xs">User ID</p>
          <p className="font-mono text-xs">{memory.userId}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">ID</p>
          <p className="font-mono text-xs truncate">{memory.id}</p>
        </div>
      </div>

      {memory.tags.length > 0 && (
        <div>
          <p className="text-muted-foreground text-xs mb-1">Tags</p>
          <div className="flex flex-wrap gap-1">
            {memory.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-xs">
        {memory.source && (
          <div>
            <p className="text-muted-foreground">Source</p>
            <p>{memory.source}</p>
          </div>
        )}
        {memory.importance !== null && (
          <div>
            <p className="text-muted-foreground">Importance</p>
            <p>{memory.importance}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Created</p>
          <p>{new Date(memory.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// 搜索结果卡片组件
function MemorySearchResultCard({ result }: { result: MemorySearchResult }) {
  const similarityPercent = Math.round(result.similarity * 100);

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm whitespace-pre-wrap flex-1">{result.content}</p>
          <Badge
            variant={
              similarityPercent >= 80
                ? 'default'
                : similarityPercent >= 50
                  ? 'secondary'
                  : 'outline'
            }
            className="shrink-0"
          >
            {similarityPercent}%
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>ID: {result.id.slice(0, 8)}...</span>
          {result.source && <span>Source: {result.source}</span>}
          <span>{new Date(result.createdAt).toLocaleDateString()}</span>
        </div>

        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
