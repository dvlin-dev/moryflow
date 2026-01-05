/**
 * Memory Playground Page
 * Interactive Memory API testing interface
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { PageHeader } from '@memai/ui/composed'
import { API_BASE_URL } from '@/lib/api-client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Alert,
  AlertDescription,
  Button,
  Textarea,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memai/ui/primitives'
import { AlertTriangle, Send, Search, Plus, Key, List, Trash2, Copy, Check, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { useApiKeys, getStoredApiKeys, syncStoredApiKeys } from '@/features/api-keys'

interface Memory {
  id: string
  content: string
  userId: string
  agentId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  createdAt: string
}

interface SearchResult extends Memory {
  similarity: number
}

/** Custom hook for API request state management */
function useApiRequest<T>() {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = useCallback(async (request: () => Promise<T>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await request()
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, error, loading, execute, reset, setData }
}

/** cURL display component */
function CurlDisplay({
  curl,
  label = 'cURL Command',
}: {
  curl: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('cURL copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="text-xs p-3 rounded-lg bg-muted overflow-auto max-h-[120px] font-mono">
        {curl}
      </pre>
    </div>
  )
}

export default function MemoryPlaygroundPage() {
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys()
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')

  // Add Memory state
  const [addContent, setAddContent] = useState('')
  const [addUserId, setAddUserId] = useState('test-user')
  const [addAgentId, setAddAgentId] = useState('')
  const [addTags, setAddTags] = useState('')
  const addRequest = useApiRequest<Memory>()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchUserId, setSearchUserId] = useState('test-user')
  const [searchLimit, setSearchLimit] = useState('10')
  const searchRequest = useApiRequest<SearchResult[]>()

  // List state
  const [listUserId, setListUserId] = useState('test-user')
  const [listLimit, setListLimit] = useState('10')
  const [listOffset, setListOffset] = useState('0')
  const listRequest = useApiRequest<Memory[]>()

  // Get/Delete state
  const [memoryId, setMemoryId] = useState('')
  const getRequest = useApiRequest<Memory>()
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 获取本地存储的 API Keys，并与服务器列表同步
  const storedKeys = useMemo(() => {
    if (apiKeys?.length) {
      // 清理已删除的 keys
      syncStoredApiKeys(apiKeys.map((k) => k.id))
    }
    return getStoredApiKeys()
  }, [apiKeys])

  // 可用的 API Keys（只显示本地存储了完整 key 的）
  const availableKeys = useMemo(() => {
    if (!apiKeys) return []
    return apiKeys.filter((apiKey) =>
      apiKey.isActive && storedKeys.some((stored) => stored.id === apiKey.id)
    )
  }, [apiKeys, storedKeys])

  // Auto-select first available API key
  useEffect(() => {
    if (availableKeys.length && !selectedKeyId) {
      setSelectedKeyId(availableKeys[0].id)
    }
  }, [availableKeys, selectedKeyId])

  const getApiKey = () => {
    const stored = storedKeys.find((k) => k.id === selectedKeyId)
    return stored?.key || ''
  }

  const handleAddMemory = async () => {
    if (!addContent.trim() || !getApiKey()) return

    try {
      await addRequest.execute(async () => {
        const response = await fetch(`${API_BASE_URL}/api/v1/memories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getApiKey()}`,
          },
          body: JSON.stringify({
            content: addContent,
            userId: addUserId,
            agentId: addAgentId || undefined,
            tags: addTags ? addTags.split(',').map(t => t.trim()) : undefined,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Failed to add memory')
        }
        return data.data
      })
      setAddContent('')
    } catch {
      // Error already handled by useApiRequest
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !getApiKey()) return

    try {
      await searchRequest.execute(async () => {
        const response = await fetch(`${API_BASE_URL}/api/v1/memories/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getApiKey()}`,
          },
          body: JSON.stringify({
            query: searchQuery,
            userId: searchUserId,
            limit: parseInt(searchLimit),
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Failed to search memories')
        }
        return data.data || []
      })
    } catch {
      // Error already handled by useApiRequest
    }
  }

  const handleList = async () => {
    if (!getApiKey()) return

    try {
      await listRequest.execute(async () => {
        const params = new URLSearchParams({
          userId: listUserId,
          limit: listLimit,
          offset: listOffset,
        })

        const response = await fetch(`${API_BASE_URL}/api/v1/memories?${params}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
          },
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Failed to list memories')
        }
        return data.data || []
      })
    } catch {
      // Error already handled by useApiRequest
    }
  }

  const handleGetMemory = async () => {
    if (!memoryId.trim() || !getApiKey()) return

    try {
      await getRequest.execute(async () => {
        const response = await fetch(`${API_BASE_URL}/api/v1/memories/${memoryId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
          },
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Failed to get memory')
        }
        return data.data
      })
    } catch {
      // Error already handled by useApiRequest
    }
  }

  const handleDeleteMemory = async () => {
    if (!memoryId.trim() || !getApiKey()) return

    setDeleteLoading(true)
    getRequest.reset()

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/memories/${memoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete memory')
      }

      getRequest.setData(null)
      setMemoryId('')
      toast.success('Memory deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete memory')
    } finally {
      setDeleteLoading(false)
    }
  }

  const generateCurl = (method: string, endpoint: string, body?: object) => {
    const apiKey = getApiKey()
    const baseUrl = API_BASE_URL || window.location.origin
    const headers = [
      `-H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}"`,
      body ? `-H "Content-Type: application/json"` : '',
    ].filter(Boolean).join(' \\\n  ')

    const bodyStr = body ? `\\\n  -d '${JSON.stringify(body)}'` : ''

    return `curl -X ${method} "${baseUrl}${endpoint}" \\\n  ${headers}${bodyStr}`
  }

  if (keysLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!apiKeys?.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You haven't created any API Keys yet. Please create one on the{' '}
            <a
              href="/api-keys"
              className="underline font-medium text-primary"
            >
              API Keys page
            </a>{' '}
            first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!availableKeys.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No available API Keys. API Keys are only shown once when created. Please create a new key on the{' '}
            <a
              href="/api-keys"
              className="underline font-medium text-primary"
            >
              API Keys page
            </a>
            , then you can select it here.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Playground"
        description="Test the Memory API interactively - add, search, and manage semantic memories"
      />

      {/* API Key Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">
                <Key className="h-4 w-4 inline mr-2" />
                API Key
              </Label>
              <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select API Key" />
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      <span className="font-medium">{key.name}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        {key.keyPrefix}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Need a new key? Create one on the{' '}
              <a href="/api-keys" className="underline text-primary">API Keys page</a>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="add" className="space-y-4">
        <TabsList>
          <TabsTrigger value="add">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List
          </TabsTrigger>
          <TabsTrigger value="get-delete">
            <Terminal className="h-4 w-4 mr-2" />
            Get/Delete
          </TabsTrigger>
        </TabsList>

        {/* Add Memory Tab */}
        <TabsContent value="add">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Memory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Memory Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter the memory content..."
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      placeholder="user-123"
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentId">Agent ID (optional)</Label>
                    <Input
                      id="agentId"
                      placeholder="agent-1"
                      value={addAgentId}
                      onChange={(e) => setAddAgentId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="work, project, idea"
                    value={addTags}
                    onChange={(e) => setAddTags(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddMemory}
                  disabled={addRequest.loading || !addContent.trim() || !selectedKeyId}
                  className="w-full"
                >
                  {addRequest.loading ? 'Adding...' : 'Add Memory'}
                  <Send className="h-4 w-4 ml-2" />
                </Button>

                {/* cURL */}
                <CurlDisplay
                  curl={generateCurl('POST', '/api/v1/memories', {
                    content: addContent || 'Your memory content',
                    userId: addUserId,
                    ...(addAgentId && { agentId: addAgentId }),
                    ...(addTags && { tags: addTags.split(',').map(t => t.trim()) }),
                  })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {addRequest.error ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{addRequest.error}</AlertDescription>
                  </Alert>
                ) : addRequest.data ? (
                  <div className="space-y-2">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium mb-2">Memory Created</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        ID: {addRequest.data.id}
                      </p>
                      <p className="text-sm">{addRequest.data.content}</p>
                      {addRequest.data.tags && addRequest.data.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {addRequest.data.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <pre className="text-xs p-4 rounded-lg bg-muted overflow-auto max-h-[300px]">
                      {JSON.stringify(addRequest.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Add a memory to see the result here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Memories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="searchQuery">Search Query</Label>
                  <Textarea
                    id="searchQuery"
                    placeholder="What are you looking for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="searchUserId">User ID</Label>
                    <Input
                      id="searchUserId"
                      placeholder="user-123"
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="searchLimit">Limit</Label>
                    <Input
                      id="searchLimit"
                      type="number"
                      placeholder="10"
                      value={searchLimit}
                      onChange={(e) => setSearchLimit(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searchRequest.loading || !searchQuery.trim() || !selectedKeyId}
                  className="w-full"
                >
                  {searchRequest.loading ? 'Searching...' : 'Search'}
                  <Search className="h-4 w-4 ml-2" />
                </Button>

                {/* cURL */}
                <CurlDisplay
                  curl={generateCurl('POST', '/api/v1/memories/search', {
                    query: searchQuery || 'Your search query',
                    userId: searchUserId,
                    limit: parseInt(searchLimit),
                  })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Results ({searchRequest.data?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {searchRequest.error ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{searchRequest.error}</AlertDescription>
                  </Alert>
                ) : searchRequest.data && searchRequest.data.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-auto">
                    {searchRequest.data.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-muted-foreground">
                            {result.id.slice(0, 8)}...
                          </span>
                          <span className="text-xs font-medium text-primary">
                            {(result.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <p className="text-sm">{result.content}</p>
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {result.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Search for memories to see results here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>List Memories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="listUserId">User ID</Label>
                  <Input
                    id="listUserId"
                    placeholder="user-123"
                    value={listUserId}
                    onChange={(e) => setListUserId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listLimit">Limit</Label>
                    <Input
                      id="listLimit"
                      type="number"
                      placeholder="10"
                      value={listLimit}
                      onChange={(e) => setListLimit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listOffset">Offset</Label>
                    <Input
                      id="listOffset"
                      type="number"
                      placeholder="0"
                      value={listOffset}
                      onChange={(e) => setListOffset(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleList}
                  disabled={listRequest.loading || !selectedKeyId}
                  className="w-full"
                >
                  {listRequest.loading ? 'Loading...' : 'List Memories'}
                  <List className="h-4 w-4 ml-2" />
                </Button>

                {/* cURL */}
                <CurlDisplay
                  curl={generateCurl('GET', `/api/v1/memories?userId=${listUserId}&limit=${listLimit}&offset=${listOffset}`)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Results ({listRequest.data?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {listRequest.error ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{listRequest.error}</AlertDescription>
                  </Alert>
                ) : listRequest.data && listRequest.data.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-auto">
                    {listRequest.data.map((memory) => (
                      <div
                        key={memory.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {memory.id.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(memory.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{memory.content}</p>
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {memory.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Click "List Memories" to see results
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Get/Delete Tab */}
        <TabsContent value="get-delete">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Get or Delete Memory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="memoryId">Memory ID</Label>
                  <Input
                    id="memoryId"
                    placeholder="Enter memory ID (UUID)"
                    value={memoryId}
                    onChange={(e) => setMemoryId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleGetMemory}
                    disabled={getRequest.loading || !memoryId.trim() || !selectedKeyId}
                    className="w-full"
                  >
                    {getRequest.loading ? 'Loading...' : 'Get Memory'}
                    <Search className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteMemory}
                    disabled={deleteLoading || !memoryId.trim() || !selectedKeyId}
                    className="w-full"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                    <Trash2 className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* cURL for GET */}
                <CurlDisplay
                  label="cURL - GET"
                  curl={generateCurl('GET', `/api/v1/memories/${memoryId || '{id}'}`)}
                />

                {/* cURL for DELETE */}
                <CurlDisplay
                  label="cURL - DELETE"
                  curl={generateCurl('DELETE', `/api/v1/memories/${memoryId || '{id}'}`)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {getRequest.error ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{getRequest.error}</AlertDescription>
                  </Alert>
                ) : getRequest.data ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {getRequest.data.id}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{getRequest.data.content}</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>User: {getRequest.data.userId}</p>
                        {getRequest.data.agentId && <p>Agent: {getRequest.data.agentId}</p>}
                        <p>Created: {new Date(getRequest.data.createdAt).toLocaleString()}</p>
                      </div>
                      {getRequest.data.tags && getRequest.data.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {getRequest.data.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <pre className="text-xs p-4 rounded-lg bg-muted overflow-auto max-h-[200px] font-mono">
                      {JSON.stringify(getRequest.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Enter a memory ID and click "Get Memory" to view details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
