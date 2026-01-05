/**
 * Memories 页面
 * 查看和导出所有 Memories
 */
import { useState } from 'react'
import { PageHeader } from '@memai/ui/composed'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@memai/ui/primitives'
import { formatRelativeTime } from '@memai/ui/lib'
import { ChevronLeft, ChevronRight, Brain, Download, FileJson, FileSpreadsheet } from 'lucide-react'
import { useMemories, useExportMemories } from '@/features/memories'
import { useApiKeys } from '@/features/api-keys'

const PAGE_SIZE = 20

export default function MemoriesPage() {
  const [apiKeyFilter, setApiKeyFilter] = useState<string>('')
  const [page, setPage] = useState(0)

  const { data: apiKeys } = useApiKeys()
  const { data, isLoading } = useMemories({
    apiKeyId: apiKeyFilter || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })
  const { mutate: exportMemories, isPending: isExporting } = useExportMemories()

  const memories = data?.memories ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handlePrevPage = () => {
    setPage((p) => Math.max(0, p - 1))
  }

  const handleNextPage = () => {
    setPage((p) => Math.min(totalPages - 1, p + 1))
  }

  const handleFilterChange = () => {
    setPage(0)
  }

  const handleExport = (format: 'json' | 'csv') => {
    exportMemories({
      apiKeyId: apiKeyFilter || undefined,
      format,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memories"
        description="View and export all memories stored via your API keys"
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting || total === 0}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Memory List</CardTitle>
          <CardDescription>
            All memories stored through your API keys. Total: {total} memories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select
              value={apiKeyFilter}
              onValueChange={(value) => {
                setApiKeyFilter(value === 'all' ? '' : value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by API Key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All API Keys</SelectItem>
                {apiKeys?.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !memories.length ? (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No memories yet</p>
              <p className="text-sm text-muted-foreground">
                Memories will appear here once you start storing them via the API.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Importance</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memories.map((memory) => (
                    <TableRow key={memory.id}>
                      <TableCell className="max-w-[300px]">
                        <span className="line-clamp-2 text-sm">{memory.content}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm font-mono">
                          {memory.userId.length > 15
                            ? `${memory.userId.slice(0, 15)}...`
                            : memory.userId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {memory.apiKeyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                          {memory.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {memory.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{memory.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {memory.importance !== null && (
                          <span className="text-sm">
                            {Math.round(memory.importance * 100)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(memory.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1} -{' '}
                    {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
