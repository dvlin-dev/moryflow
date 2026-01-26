/**
 * Webhooks 页面
 * 管理 Webhook 通知设置
 */
import { useState } from 'react';
import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit01Icon,
  MoreHorizontalIcon,
  RefreshIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { PageHeader } from '@anyhunt/ui';
import {
  Button,
  Icon,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
} from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import { toast } from 'sonner';
import {
  useWebhooks,
  useUpdateWebhook,
  CreateWebhookDialog,
  EditWebhookDialog,
  DeleteWebhookDialog,
  RegenerateSecretDialog,
  MAX_WEBHOOKS_PER_USER,
} from '@/features/webhooks';
import type { Webhook } from '@/features/webhooks';
import { useApiKeys, maskApiKey } from '@/features/api-keys';

export default function WebhooksPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const activeKeys = apiKeys.filter((key) => key.isActive);
  const effectiveKeyId = selectedKeyId || activeKeys[0]?.id || '';
  const selectedKey = apiKeys.find((key) => key.id === effectiveKeyId);
  const apiKeyValue = selectedKey?.key ?? '';
  const apiKeyDisplay = selectedKey ? maskApiKey(selectedKey.key) : '';
  const hasActiveKey = Boolean(apiKeyValue);

  const { data: webhooks = [], isLoading: isLoadingWebhooks } = useWebhooks(apiKeyValue);
  const { mutate: updateWebhook } = useUpdateWebhook(apiKeyValue);

  const handleCopySecret = async (webhook: Webhook) => {
    try {
      await navigator.clipboard.writeText(webhook.secretPreview);
      setCopiedId(webhook.id);
      toast.success('Secret prefix copied');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Copy failed, please copy manually');
    }
  };

  const handleToggleActive = (webhook: Webhook) => {
    if (!apiKeyValue) {
      toast.error('Select an API key');
      return;
    }
    updateWebhook({
      id: webhook.id,
      data: { isActive: !webhook.isActive },
    });
  };

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setEditDialogOpen(true);
  };

  const handleDelete = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setDeleteDialogOpen(true);
  };

  const handleRegenerate = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setRegenerateDialogOpen(true);
  };

  const canCreate = hasActiveKey && webhooks.length < MAX_WEBHOOKS_PER_USER;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Configure webhooks to receive screenshot event notifications"
        action={
          <Button onClick={() => setCreateDialogOpen(true)} disabled={!canCreate}>
            <Icon icon={Add01Icon} className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>Select the API key used to manage webhooks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Select
                value={effectiveKeyId}
                onValueChange={setSelectedKeyId}
                disabled={isLoadingKeys}
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
                        {key.name} ({maskApiKey(key.key)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Selected Key</Label>
              <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
            </div>
          </div>

          {!hasActiveKey && (
            <p className="text-xs text-muted-foreground mt-3">
              Create an API key in{' '}
              <a href="/api-keys" className="text-primary hover:underline">
                API Keys
              </a>{' '}
              to manage webhooks.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook List</CardTitle>
          <CardDescription>
            We send POST requests to your configured URL when screenshot tasks complete or fail. You
            can create up to {MAX_WEBHOOKS_PER_USER} webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingKeys || (hasActiveKey && isLoadingWebhooks) ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !hasActiveKey ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Select an API key to view and manage webhooks.
              </p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't created any webhooks yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Icon icon={Add01Icon} className="h-4 w-4 mr-2" />
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
                          <Icon icon={Tick02Icon} className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Icon icon={Copy01Icon} className="h-3.5 w-3.5 opacity-50" />
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
                            <Icon icon={MoreHorizontalIcon} className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(webhook)}>
                            <Icon icon={Edit01Icon} className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRegenerate(webhook)}>
                            <Icon icon={RefreshIcon} className="h-4 w-4 mr-2" />
                            Regenerate Secret
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(webhook)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Icon icon={Delete02Icon} className="h-4 w-4 mr-2" />
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
        apiKey={apiKeyValue}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditWebhookDialog
        apiKey={apiKeyValue}
        webhook={selectedWebhook}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <DeleteWebhookDialog
        apiKey={apiKeyValue}
        webhook={selectedWebhook}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      <RegenerateSecretDialog
        apiKey={apiKeyValue}
        webhook={selectedWebhook}
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
      />
    </div>
  );
}
