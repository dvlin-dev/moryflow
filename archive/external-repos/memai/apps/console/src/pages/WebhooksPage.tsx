/**
 * Webhooks 页面
 * 管理 Webhook 通知设置
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@memai/ui/primitives'
import { formatRelativeTime } from '@memai/ui/lib'
import { Plus, MoreHorizontal, Pencil, Trash2, RefreshCw, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  useWebhooks,
  useUpdateWebhook,
  CreateWebhookDialog,
  EditWebhookDialog,
  DeleteWebhookDialog,
  RegenerateSecretDialog,
  MAX_WEBHOOKS_PER_USER,
} from '@/features/webhooks'
import type { Webhook } from '@/features/webhooks'

export default function WebhooksPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: webhooks, isLoading } = useWebhooks()
  const { mutate: updateWebhook } = useUpdateWebhook()

  const handleCopySecret = async (webhook: Webhook) => {
    try {
      await navigator.clipboard.writeText(webhook.secretPreview)
      setCopiedId(webhook.id)
      toast.success('Secret prefix copied')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Copy failed, please copy manually')
    }
  }

  const handleToggleActive = (webhook: Webhook) => {
    updateWebhook({
      id: webhook.id,
      data: { isActive: !webhook.isActive },
    })
  }

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setEditDialogOpen(true)
  }

  const handleDelete = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setDeleteDialogOpen(true)
  }

  const handleRegenerate = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setRegenerateDialogOpen(true)
  }

  const canCreate = !webhooks || webhooks.length < MAX_WEBHOOKS_PER_USER

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Configure webhooks to receive screenshot event notifications"
        action={
          <Button onClick={() => setCreateDialogOpen(true)} disabled={!canCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Webhook List</CardTitle>
          <CardDescription>
            We send POST requests to your configured URL when screenshot tasks complete or fail.
            You can create up to {MAX_WEBHOOKS_PER_USER} webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !webhooks?.length ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven't created any webhooks yet
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first Webhook
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Secret</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm truncate max-w-[200px] block">
                        {webhook.url}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleCopySecret(webhook)}
                        className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors"
                      >
                        {webhook.secretPreview}
                        {copiedId === webhook.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.isActive}
                          onCheckedChange={() => handleToggleActive(webhook)}
                        />
                        {webhook.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(webhook.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(webhook)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRegenerate(webhook)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate Secret
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(webhook)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateWebhookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditWebhookDialog
        webhook={selectedWebhook}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <DeleteWebhookDialog
        webhook={selectedWebhook}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      <RegenerateSecretDialog
        webhook={selectedWebhook}
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
      />
    </div>
  )
}
