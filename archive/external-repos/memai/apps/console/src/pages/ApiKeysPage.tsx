/**
 * API Keys 页面
 * P0 MVP 核心功能 - 管理 API 密钥
 */
import { useState } from 'react'
import { PageHeader } from '@memai/ui/composed'
import {
  Button,
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
  Switch,
} from '@memai/ui/primitives'
import {
  formatRelativeTime,
  isExpiringSoon,
  isExpired,
} from '@memai/ui/lib'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  useApiKeys,
  useUpdateApiKey,
  CreateApiKeyDialog,
  DeleteApiKeyDialog,
} from '@/features/api-keys'
import type { ApiKey } from '@/features/api-keys'

export default function ApiKeysPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: apiKeys, isLoading } = useApiKeys()
  const { mutate: updateKey } = useUpdateApiKey()

  const handleCopyPrefix = async (apiKey: ApiKey) => {
    try {
      await navigator.clipboard.writeText(apiKey.keyPrefix)
      setCopiedId(apiKey.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Copy failed, please copy manually')
    }
  }

  const handleToggleActive = (apiKey: ApiKey) => {
    updateKey({
      id: apiKey.id,
      data: { isActive: !apiKey.isActive },
    })
  }

  const handleDelete = (apiKey: ApiKey) => {
    setSelectedKey(apiKey)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Manage your API keys for calling the Memory Screenshot API"
        action={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>API Key List</CardTitle>
          <CardDescription>
            Save your key immediately after creation. The key is only shown once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !apiKeys?.length ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven't created any API Keys yet
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleCopyPrefix(apiKey)}
                        className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors"
                      >
                        {apiKey.keyPrefix}...
                        {copiedId === apiKey.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={apiKey.isActive}
                          onCheckedChange={() => handleToggleActive(apiKey)}
                          disabled={isExpired(apiKey.expiresAt)}
                        />
                        {apiKey.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(apiKey.lastUsedAt)}
                    </TableCell>
                    <TableCell>
                      {apiKey.expiresAt ? (
                        <span
                          className={
                            isExpired(apiKey.expiresAt)
                              ? 'text-destructive'
                              : isExpiringSoon(apiKey.expiresAt)
                                ? 'text-amber-600'
                                : 'text-muted-foreground'
                          }
                        >
                          {isExpired(apiKey.expiresAt)
                            ? 'Expired'
                            : formatRelativeTime(apiKey.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never expires</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(apiKey)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <DeleteApiKeyDialog
        apiKey={selectedKey}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  )
}
