/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Memox Playground 页面（创建记忆/语义搜索，Lucide icons direct render）
 */

import { useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3'; // 使用 v3 兼容层，解决 @hookform/resolvers 类型兼容问题
import { toast } from 'sonner';
import { Brain, Plus, Search, Loader, CircleCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Switch,
} from '@moryflow/ui';
import { useApiKeys, maskApiKey } from '@/features/api-keys';
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
  user_id: z.string().min(1, 'User ID is required'),
  message: z.string().min(1, 'Message is required').max(10000, 'Message too long'),
  agent_id: z.string().optional(),
  app_id: z.string().optional(),
  run_id: z.string().optional(),
  metadata: z.string().optional(),
  includes: z.string().optional(),
  excludes: z.string().optional(),
  custom_instructions: z.string().optional(),
  custom_categories: z.string().optional(),
  infer: z.boolean().default(true),
  async_mode: z.boolean().default(true),
  output_format: z.enum(['v1.0', 'v1.1']).default('v1.1'),
  enable_graph: z.boolean().default(false),
});

type CreateMemoryFormInput = z.input<typeof createMemorySchema>;
type CreateMemoryFormValues = z.infer<typeof createMemorySchema>;

// 搜索记忆表单 Schema
const searchMemorySchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  query: z.string().min(1, 'Query is required'),
  top_k: z.coerce.number().min(1).max(100).default(10),
  threshold: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().min(0).max(1).optional()
  ),
  output_format: z.enum(['v1.0', 'v1.1']).default('v1.1'),
  keyword_search: z.boolean().default(false),
  rerank: z.boolean().default(false),
  filter_memories: z.boolean().default(false),
  only_metadata_based_search: z.boolean().default(false),
  metadata: z.string().optional(),
  filters: z.string().optional(),
  categories: z.string().optional(),
});

type SearchMemoryFormInput = z.input<typeof searchMemorySchema>;
type SearchMemoryFormValues = z.infer<typeof searchMemorySchema>;

// 搜索记忆表单默认值
const searchMemoryDefaults: SearchMemoryFormInput = {
  user_id: '',
  query: '',
  top_k: 10,
  threshold: undefined,
  output_format: 'v1.1',
  keyword_search: false,
  rerank: false,
  filter_memories: false,
  only_metadata_based_search: false,
  metadata: '',
  filters: '',
  categories: '',
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
  const activeKeys = apiKeys.filter((k) => k.isActive);
  const selectedKey = apiKeys.find((key) => key.id === effectiveKeyId);
  const apiKeyValue = selectedKey?.key ?? '';
  const apiKeyDisplay = selectedKey ? maskApiKey(selectedKey.key) : '';

  // Mutations
  const createMemoryMutation = useCreateMemory();
  const searchMemoriesMutation = useSearchMemories();

  // 创建记忆表单
  const createForm = useForm<CreateMemoryFormInput, unknown, CreateMemoryFormValues>({
    resolver: zodResolver(createMemorySchema),
    defaultValues: {
      user_id: '',
      message: '',
      agent_id: '',
      app_id: '',
      run_id: '',
      metadata: '',
      includes: '',
      excludes: '',
      custom_instructions: '',
      custom_categories: '',
      infer: true,
      async_mode: true,
      output_format: 'v1.1',
      enable_graph: false,
    },
  });

  // 搜索记忆表单
  const searchForm = useForm<SearchMemoryFormInput, unknown, SearchMemoryFormValues>({
    resolver: zodResolver(searchMemorySchema),
    defaultValues: searchMemoryDefaults,
  });

  // 创建记忆提交
  const handleCreate = async (values: CreateMemoryFormValues) => {
    if (!apiKeyValue) {
      toast.error('Select an API key');
      return;
    }

    setLastCreateRequest(values);
    setCreatedMemory(null);

    let metadata: Record<string, unknown> | undefined;
    if (values.metadata) {
      try {
        metadata = JSON.parse(values.metadata) as Record<string, unknown>;
      } catch (_error) {
        toast.error('Metadata must be valid JSON');
        return;
      }
    }

    let customCategories: Record<string, unknown> | undefined;
    if (values.custom_categories) {
      try {
        customCategories = JSON.parse(values.custom_categories) as Record<string, unknown>;
      } catch (_error) {
        toast.error('Custom categories must be valid JSON');
        return;
      }
    }

    const requestData = {
      messages: [{ role: 'user', content: values.message }],
      user_id: values.user_id,
      ...(values.agent_id && { agent_id: values.agent_id }),
      ...(values.app_id && { app_id: values.app_id }),
      ...(values.run_id && { run_id: values.run_id }),
      ...(metadata && { metadata }),
      ...(values.includes && { includes: values.includes }),
      ...(values.excludes && { excludes: values.excludes }),
      ...(values.custom_instructions && { custom_instructions: values.custom_instructions }),
      ...(customCategories && { custom_categories: customCategories }),
      infer: values.infer,
      async_mode: values.async_mode,
      output_format: values.output_format,
      enable_graph: values.enable_graph,
    };

    try {
      const result = await createMemoryMutation.mutateAsync({
        apiKey: apiKeyValue,
        data: requestData,
      });
      const created = Array.isArray(result.results) ? result.results[0]?.data?.memory : null;
      setCreatedMemory(
        created
          ? {
              id: result.results?.[0]?.id ?? '',
              memory: created,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : null
      );
      toast.success('Memory created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create memory');
    }
  };

  // 搜索记忆提交
  const handleSearch = async (values: SearchMemoryFormValues) => {
    if (!apiKeyValue) {
      toast.error('Select an API key');
      return;
    }

    setLastSearchRequest(values);
    setSearchResults(null);

    let metadata: Record<string, unknown> | undefined;
    if (values.metadata) {
      try {
        metadata = JSON.parse(values.metadata) as Record<string, unknown>;
      } catch (_error) {
        toast.error('Metadata must be valid JSON');
        return;
      }
    }

    let filters: unknown | undefined;
    if (values.filters) {
      try {
        filters = JSON.parse(values.filters) as unknown;
      } catch (_error) {
        toast.error('Filters must be valid JSON');
        return;
      }
    }

    const categories = values.categories
      ? values.categories
          .split(',')
          .map((category) => category.trim())
          .filter(Boolean)
      : [];

    try {
      const results = await searchMemoriesMutation.mutateAsync({
        apiKey: apiKeyValue,
        data: {
          user_id: values.user_id,
          query: values.query,
          top_k: values.top_k,
          ...(values.threshold !== undefined && { threshold: values.threshold }),
          output_format: values.output_format,
          keyword_search: values.keyword_search,
          rerank: values.rerank,
          filter_memories: values.filter_memories,
          only_metadata_based_search: values.only_metadata_based_search,
          ...(metadata && { metadata }),
          ...(filters !== undefined && { filters }),
          ...(categories.length > 0 && { categories }),
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
          <Brain className="h-6 w-6" />
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
                              {maskApiKey(key.key)}
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

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'search')}>
                <TabsList className="w-full">
                  <TabsTrigger value="create" className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex-1">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </TabsTrigger>
                </TabsList>

                {/* 创建记忆表单 */}
                <TabsContent value="create" className="mt-4">
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="user_id"
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
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter the user message..."
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
                          name="agent_id"
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
                          name="app_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>App ID</FormLabel>
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
                          name="run_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Run ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="output_format"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Output Format</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="v1.0">v1.0</SelectItem>
                                    <SelectItem value="v1.1">v1.1</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={createForm.control}
                        name="metadata"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Metadata (JSON)</FormLabel>
                            <FormControl>
                              <Textarea placeholder='{"source":"playground"}' rows={3} {...field} />
                            </FormControl>
                            <FormDescription>JSON object for memory metadata</FormDescription>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="includes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Includes</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="excludes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Excludes</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={createForm.control}
                        name="custom_instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Instructions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Optional" rows={3} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="custom_categories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Categories (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='{"topic": "Description"}'
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              JSON object mapping category to description
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="infer"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="space-y-1">
                              <FormLabel>Infer Memory</FormLabel>
                              <FormDescription>Use LLM to infer memory</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="async_mode"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="space-y-1">
                              <FormLabel>Async Mode</FormLabel>
                              <FormDescription>
                                Process multiple memories in parallel
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="enable_graph"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="space-y-1">
                              <FormLabel>Enable Graph</FormLabel>
                              <FormDescription>Extract entities and relations</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createMemoryMutation.isPending || !apiKeyValue}
                      >
                        {createMemoryMutation.isPending ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
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
                        name="user_id"
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
                          name="top_k"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Top K</FormLabel>
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
                              <FormLabel>Threshold</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  placeholder="0.3"
                                  name={field.name}
                                  ref={field.ref}
                                  onBlur={field.onBlur}
                                  value={
                                    typeof field.value === 'number' && !Number.isNaN(field.value)
                                      ? field.value
                                      : ''
                                  }
                                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                    const nextValue = event.target.value;
                                    if (nextValue === '') {
                                      field.onChange(undefined);
                                      return;
                                    }
                                    const parsed = Number(nextValue);
                                    field.onChange(Number.isNaN(parsed) ? undefined : parsed);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={searchForm.control}
                          name="output_format"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Output Format</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="v1.0">v1.0</SelectItem>
                                    <SelectItem value="v1.1">v1.1</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={searchForm.control}
                        name="metadata"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Metadata (JSON)</FormLabel>
                            <FormControl>
                              <Textarea placeholder='{"source":"playground"}' rows={3} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={searchForm.control}
                        name="filters"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Filters (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='{"AND":[{"user_id":"user-1"}]}'
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={searchForm.control}
                        name="categories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categories</FormLabel>
                            <FormControl>
                              <Input placeholder="comma separated" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={searchForm.control}
                        name="keyword_search"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="space-y-1">
                              <FormLabel>Keyword Search</FormLabel>
                              <FormDescription>
                                Use keyword search instead of embeddings
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={searchForm.control}
                        name="rerank"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="space-y-1">
                              <FormLabel>Rerank</FormLabel>
                              <FormDescription>
                                Rerank results using query relevance
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={searchForm.control}
                        name="filter_memories"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="space-y-1">
                              <FormLabel>ListFilter Memories</FormLabel>
                              <FormDescription>
                                Apply filters and metadata constraints
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={searchForm.control}
                        name="only_metadata_based_search"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div className="space-y-1">
                              <FormLabel>Metadata Only</FormLabel>
                              <FormDescription>
                                Search only using metadata and filters
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={searchMemoriesMutation.isPending || !apiKeyValue}
                      >
                        {searchMemoriesMutation.isPending ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
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
                  apiKey={apiKeyDisplay}
                  apiKeyValue={apiKeyValue}
                  body={{
                    messages: [{ role: 'user', content: lastCreateRequest.message }],
                    user_id: lastCreateRequest.user_id,
                    ...(lastCreateRequest.agent_id && { agent_id: lastCreateRequest.agent_id }),
                    ...(lastCreateRequest.app_id && { app_id: lastCreateRequest.app_id }),
                    ...(lastCreateRequest.run_id && { run_id: lastCreateRequest.run_id }),
                    ...(lastCreateRequest.metadata && {
                      metadata: (() => {
                        try {
                          return JSON.parse(lastCreateRequest.metadata);
                        } catch {
                          return lastCreateRequest.metadata;
                        }
                      })(),
                    }),
                    ...(lastCreateRequest.includes && { includes: lastCreateRequest.includes }),
                    ...(lastCreateRequest.excludes && { excludes: lastCreateRequest.excludes }),
                    ...(lastCreateRequest.custom_instructions && {
                      custom_instructions: lastCreateRequest.custom_instructions,
                    }),
                    ...(lastCreateRequest.custom_categories && {
                      custom_categories: (() => {
                        try {
                          return JSON.parse(lastCreateRequest.custom_categories);
                        } catch {
                          return lastCreateRequest.custom_categories;
                        }
                      })(),
                    }),
                    infer: lastCreateRequest.infer,
                    async_mode: lastCreateRequest.async_mode,
                    output_format: lastCreateRequest.output_format,
                    enable_graph: lastCreateRequest.enable_graph,
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
                  apiKey={apiKeyDisplay}
                  apiKeyValue={apiKeyValue}
                  body={{
                    user_id: lastSearchRequest.user_id,
                    query: lastSearchRequest.query,
                    top_k: lastSearchRequest.top_k,
                    ...(lastSearchRequest.threshold !== undefined && {
                      threshold: lastSearchRequest.threshold,
                    }),
                    output_format: lastSearchRequest.output_format,
                    keyword_search: lastSearchRequest.keyword_search,
                    rerank: lastSearchRequest.rerank,
                    filter_memories: lastSearchRequest.filter_memories,
                    only_metadata_based_search: lastSearchRequest.only_metadata_based_search,
                    ...(lastSearchRequest.metadata && {
                      metadata: (() => {
                        try {
                          return JSON.parse(lastSearchRequest.metadata);
                        } catch {
                          return lastSearchRequest.metadata;
                        }
                      })(),
                    }),
                    ...(lastSearchRequest.filters && {
                      filters: (() => {
                        try {
                          return JSON.parse(lastSearchRequest.filters);
                        } catch {
                          return lastSearchRequest.filters;
                        }
                      })(),
                    }),
                    ...(lastSearchRequest.categories && {
                      categories: lastSearchRequest.categories
                        .split(',')
                        .map((category) => category.trim())
                        .filter(Boolean),
                    }),
                  }}
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
                  <CircleCheck className="h-5 w-5 text-green-500" />
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
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
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
                <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  Fill out the form and click "Create Memory" to store a new memory.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'search' && !searchResults && (
            <Card>
              <CardContent className="py-16 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
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
  const categories = memory.categories ?? [];
  const keywords = memory.keywords ?? [];

  return (
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
  );
}

// 搜索结果卡片组件
function MemorySearchResultCard({ result }: { result: MemorySearchResult }) {
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
