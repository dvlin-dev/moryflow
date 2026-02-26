/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Webhooks 页面 - 管理 Webhook 通知设置（Lucide icons direct render）
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import { Button } from '@moryflow/ui';
import { toast } from 'sonner';
import {
  MAX_WEBHOOKS_PER_USER,
  useWebhooks,
  useUpdateWebhook,
  CreateWebhookDialog,
  EditWebhookDialog,
  DeleteWebhookDialog,
  RegenerateSecretDialog,
  WebhookApiKeyCard,
  WebhookListCard,
  resolveActiveApiKeySelection,
} from '@/features/webhooks';
import type { Webhook } from '@/features/webhooks';
import { useApiKeys, maskApiKey } from '@/features/api-keys';

type WebhookDialogState =
  | { type: 'create' }
  | { type: 'edit'; webhook: Webhook }
  | { type: 'delete'; webhook: Webhook }
  | { type: 'regenerate'; webhook: Webhook }
  | null;

interface WebhookDialogBindings {
  create: { open: boolean };
  edit: { open: boolean; webhook: Webhook | null };
  delete: { open: boolean; webhook: Webhook | null };
  regenerate: { open: boolean; webhook: Webhook | null };
}

function normalizeApiKeySelection(keyId: string): string {
  if (keyId === 'none') {
    return '';
  }
  return keyId;
}

function getApiKeyDisplay(apiKey: string | null): string {
  if (!apiKey) {
    return '';
  }
  return maskApiKey(apiKey);
}

function resolveDialogBindings(dialog: WebhookDialogState): WebhookDialogBindings {
  const emptyBindings: WebhookDialogBindings = {
    create: { open: false },
    edit: { open: false, webhook: null },
    delete: { open: false, webhook: null },
    regenerate: { open: false, webhook: null },
  };

  if (!dialog) {
    return emptyBindings;
  }

  switch (dialog.type) {
    case 'create':
      return {
        ...emptyBindings,
        create: { open: true },
      };
    case 'edit':
      return {
        ...emptyBindings,
        edit: { open: true, webhook: dialog.webhook },
      };
    case 'delete':
      return {
        ...emptyBindings,
        delete: { open: true, webhook: dialog.webhook },
      };
    case 'regenerate':
      return {
        ...emptyBindings,
        regenerate: { open: true, webhook: dialog.webhook },
      };
    default:
      return emptyBindings;
  }
}

export default function WebhooksPage() {
  const [dialog, setDialog] = useState<WebhookDialogState>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const { activeKeys, selectedKey, effectiveKeyId } = resolveActiveApiKeySelection(apiKeys, selectedKeyId);
  const apiKeyValue = selectedKey?.key ?? '';
  const apiKeyDisplay = getApiKeyDisplay(selectedKey?.key ?? null);
  const hasActiveKey = Boolean(selectedKey);

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

  const closeDialog = () => {
    setDialog(null);
  };

  const openCreateDialog = () => {
    setDialog({ type: 'create' });
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
    setDialog({ type: 'edit', webhook });
  };

  const handleDelete = (webhook: Webhook) => {
    setDialog({ type: 'delete', webhook });
  };

  const handleRegenerate = (webhook: Webhook) => {
    setDialog({ type: 'regenerate', webhook });
  };

  const canCreate = hasActiveKey && webhooks.length < MAX_WEBHOOKS_PER_USER;
  const isLoadingList = isLoadingKeys || (hasActiveKey && isLoadingWebhooks);
  const dialogBindings = resolveDialogBindings(dialog);

  const handleApiKeyChange = (keyId: string) => {
    setSelectedKeyId(normalizeApiKeySelection(keyId));
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Configure webhooks to receive screenshot event notifications"
        action={
          <Button onClick={openCreateDialog} disabled={!canCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        }
      />

      <WebhookApiKeyCard
        activeKeys={activeKeys}
        effectiveKeyId={effectiveKeyId}
        apiKeyDisplay={apiKeyDisplay}
        hasActiveKey={hasActiveKey}
        isLoadingKeys={isLoadingKeys}
        onKeyChange={handleApiKeyChange}
      />

      <WebhookListCard
        webhooks={webhooks}
        hasActiveKey={hasActiveKey}
        isLoading={isLoadingList}
        copiedId={copiedId}
        onCreate={openCreateDialog}
        onCopySecret={handleCopySecret}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRegenerate={handleRegenerate}
      />

      <CreateWebhookDialog
        apiKey={apiKeyValue}
        open={dialogBindings.create.open}
        onOpenChange={handleDialogOpenChange}
      />

      <EditWebhookDialog
        apiKey={apiKeyValue}
        webhook={dialogBindings.edit.webhook}
        open={dialogBindings.edit.open}
        onOpenChange={handleDialogOpenChange}
      />

      <DeleteWebhookDialog
        apiKey={apiKeyValue}
        webhook={dialogBindings.delete.webhook}
        open={dialogBindings.delete.open}
        onOpenChange={handleDialogOpenChange}
      />

      <RegenerateSecretDialog
        apiKey={apiKeyValue}
        webhook={dialogBindings.regenerate.webhook}
        open={dialogBindings.regenerate.open}
        onOpenChange={handleDialogOpenChange}
      />
    </div>
  );
}
