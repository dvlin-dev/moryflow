/**
 * Entities 页面
 * 查看和管理所有 Entities
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
} from '@memai/ui/primitives'
import { formatRelativeTime } from '@memai/ui/lib'
import { Trash2, ChevronLeft, ChevronRight, Database } from 'lucide-react'
import {
  useEntities,
  useEntityTypes,
  DeleteEntityDialog,
} from '@/features/entities'
import { useApiKeys } from '@/features/api-keys'
import type { Entity } from '@/features/entities'

const PAGE_SIZE = 20

export default function EntitiesPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [apiKeyFilter, setApiKeyFilter] = useState<string>('')
  const [page, setPage] = useState(0)

  const { data: entityTypes } = useEntityTypes()
  const { data: apiKeys } = useApiKeys()
  const { data, isLoading } = useEntities({
    type: typeFilter || undefined,
    apiKeyId: apiKeyFilter || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const entities = data?.entities ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleDelete = (entity: Entity) => {
    setSelectedEntity(entity)
    setDeleteDialogOpen(true)
  }

  const handlePrevPage = () => {
    setPage((p) => Math.max(0, p - 1))
  }

  const handleNextPage = () => {
    setPage((p) => Math.min(totalPages - 1, p + 1))
  }

  const handleFilterChange = () => {
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entities"
        description="View and manage entities extracted from your memories"
      />

      <Card>
        <CardHeader>
          <CardTitle>Entity List</CardTitle>
          <CardDescription>
            Entities are extracted from memory content and used to build knowledge graphs.
            Total: {total} entities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value === 'all' ? '' : value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {entityTypes?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          ) : !entities.length ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No entities found</p>
              <p className="text-sm text-muted-foreground">
                Entities will appear here once they are extracted from your memories.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((entity) => (
                    <TableRow key={entity.id}>
                      <TableCell>
                        <Badge variant="outline">{entity.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {entity.name}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {entity.apiKeyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm font-mono">
                          {entity.userId.length > 20
                            ? `${entity.userId.slice(0, 20)}...`
                            : entity.userId}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entity.confidence !== null && (
                          <span className="text-sm">
                            {Math.round(entity.confidence * 100)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(entity.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entity)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <DeleteEntityDialog
        entity={selectedEntity}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  )
}
