/**
 * [PROPS]: activeKeys, effectiveKeyId, apiKeyDisplay, hasUsableKey, isLoadingKeys, onKeyChange
 * [EMITS]: onKeyChange(keyId)
 * [POS]: Webhooks 页面 API Key 选择卡片（只允许 active keys）
 */
import {
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
} from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import { getApiKeyDisplay } from '@/features/api-keys';

interface WebhookApiKeyCardProps {
  activeKeys: ApiKey[];
  effectiveKeyId: string;
  apiKeyDisplay: string;
  hasUsableKey: boolean;
  isLoadingKeys: boolean;
  onKeyChange: (keyId: string) => void;
}

type WebhookApiKeyOptionsState = 'empty' | 'ready';

function resolveOptionsState(activeKeys: ApiKey[]): WebhookApiKeyOptionsState {
  if (activeKeys.length === 0) {
    return 'empty';
  }
  return 'ready';
}

function NoActiveApiKeyOption() {
  return (
    <SelectItem value="none" disabled>
      No active API keys
    </SelectItem>
  );
}

function ActiveApiKeyOptions({ activeKeys }: { activeKeys: ApiKey[] }) {
  return (
    <>
      {activeKeys.map((key) => (
        <SelectItem key={key.id} value={key.id}>
          {key.name} ({getApiKeyDisplay(key)})
        </SelectItem>
      ))}
    </>
  );
}

export function WebhookApiKeyCard({
  activeKeys,
  effectiveKeyId,
  apiKeyDisplay,
  hasUsableKey,
  isLoadingKeys,
  onKeyChange,
}: WebhookApiKeyCardProps) {
  const optionsState = resolveOptionsState(activeKeys);

  const renderApiKeyOptionsByState = () => {
    switch (optionsState) {
      case 'empty':
        return <NoActiveApiKeyOption />;
      case 'ready':
        return <ActiveApiKeyOptions activeKeys={activeKeys} />;
      default:
        return null;
    }
  };

  const renderNoActiveKeyHint = () => {
    if (hasUsableKey) {
      return null;
    }

    return (
      <p className="text-xs text-muted-foreground mt-3">
        Use a key with local plaintext in{' '}
        <a href="/api-keys" className="text-primary hover:underline">
          API Keys
        </a>{' '}
        to manage webhooks. If this browser lost the key, rotate it first.
      </p>
    );
  };

  return (
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
              value={effectiveKeyId || 'none'}
              onValueChange={onKeyChange}
              disabled={isLoadingKeys}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select API Key" />
              </SelectTrigger>
              <SelectContent>{renderApiKeyOptionsByState()}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Selected Key</Label>
            <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
          </div>
        </div>

        {renderNoActiveKeyHint()}
      </CardContent>
    </Card>
  );
}
