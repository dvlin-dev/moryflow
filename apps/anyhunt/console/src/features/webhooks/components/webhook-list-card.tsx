/**
 * [PROPS]: webhooks, hasActiveKey, isLoading, copiedId, onCreate, onCopySecret, onToggleActive, onEdit, onDelete, onRegenerate
 * [EMITS]: callbacks for row actions
 * [POS]: Webhooks 页面列表卡片与行操作
 */
import { Copy, Delete, Pencil, Ellipsis, RefreshCw, Plus, Check } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@moryflow/ui'
import { formatRelativeTime } from '@moryflow/ui/lib'
import type { Webhook } from '../types'
import { MAX_WEBHOOKS_PER_USER } from '../constants'

interface WebhookListCardProps {
  webhooks: Webhook[]
  hasActiveKey: boolean
  isLoading: boolean
  copiedId: string | null
  onCreate: () => void
  onCopySecret: (webhook: Webhook) => void
  onToggleActive: (webhook: Webhook) => void
  onEdit: (webhook: Webhook) => void
  onDelete: (webhook: Webhook) => void
  onRegenerate: (webhook: Webhook) => void
}

type WebhookListViewState = 'loading' | 'missing_key' | 'empty' | 'ready'

interface WebhookTableProps {
  webhooks: Webhook[]
  copiedId: string | null
  onCopySecret: (webhook: Webhook) => void
  onToggleActive: (webhook: Webhook) => void
  onEdit: (webhook: Webhook) => void
  onDelete: (webhook: Webhook) => void
  onRegenerate: (webhook: Webhook) => void
}

function resolveViewState({
  isLoading,
  hasActiveKey,
  webhooks,
}: {
  isLoading: boolean
  hasActiveKey: boolean
  webhooks: Webhook[]
}): WebhookListViewState {
  if (isLoading) return 'loading'
  if (!hasActiveKey) return 'missing_key'
  if (webhooks.length === 0) return 'empty'
  return 'ready'
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function MissingKeyState() {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Select an API key to view and manage webhooks.</p>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">You haven't created any webhooks yet</p>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4 mr-2" />
        Create your first Webhook
      </Button>
    </div>
  )
}

function SecretCopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return <Check className="h-3.5 w-3.5 text-green-600" />
  }
  return <Copy className="h-3.5 w-3.5 opacity-50" />
}

function WebhookStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Badge variant="default">Active</Badge>
  }
  return <Badge variant="secondary">Inactive</Badge>
}

function WebhookTable({
  webhooks,
  copiedId,
  onCopySecret,
  onToggleActive,
  onEdit,
  onDelete,
  onRegenerate,
}: WebhookTableProps) {
  return (
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
                onClick={() => onCopySecret(webhook)}
                className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors"
              >
                {webhook.secretPreview}
                <SecretCopyIcon copied={copiedId === webhook.id} />
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
                <Switch checked={webhook.isActive} onCheckedChange={() => onToggleActive(webhook)} />
                <WebhookStatusBadge isActive={webhook.isActive} />
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatRelativeTime(webhook.createdAt)}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Ellipsis className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(webhook)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegenerate(webhook)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Secret
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(webhook)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Delete className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function WebhookListCard({
  webhooks,
  hasActiveKey,
  isLoading,
  copiedId,
  onCreate,
  onCopySecret,
  onToggleActive,
  onEdit,
  onDelete,
  onRegenerate,
}: WebhookListCardProps) {
  const viewState = resolveViewState({
    isLoading,
    hasActiveKey,
    webhooks,
  })

  const renderContentByState = () => {
    switch (viewState) {
      case 'loading':
        return <LoadingState />
      case 'missing_key':
        return <MissingKeyState />
      case 'empty':
        return <EmptyState onCreate={onCreate} />
      case 'ready':
        return (
          <WebhookTable
            webhooks={webhooks}
            copiedId={copiedId}
            onCopySecret={onCopySecret}
            onToggleActive={onToggleActive}
            onEdit={onEdit}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
          />
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook List</CardTitle>
        <CardDescription>
          We send POST requests to your configured URL when screenshot tasks complete or fail. You can
          create up to {MAX_WEBHOOKS_PER_USER} webhooks.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContentByState()}</CardContent>
    </Card>
  )
}
