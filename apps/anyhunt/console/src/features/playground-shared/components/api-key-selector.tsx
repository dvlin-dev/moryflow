/**
 * API Key 选择器组件
 */
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import { maskApiKey } from '@/features/api-keys';

interface ApiKeySelectorProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string) => void;
  disabled?: boolean;
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
          <span className="flex items-center gap-2">
            <span>{key.name}</span>
            <span className="text-muted-foreground font-mono text-xs">{maskApiKey(key.key)}</span>
          </span>
        </SelectItem>
      ))}
    </>
  );
}

function NoActiveApiKeyHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Create an API key in{' '}
      <a href="/api-keys" className="text-primary hover:underline">
        API Keys
      </a>{' '}
      to use the playground.
    </p>
  );
}

export function ApiKeySelector({
  apiKeys,
  selectedKeyId,
  onKeyChange,
  disabled,
}: ApiKeySelectorProps) {
  const activeKeys = apiKeys.filter((k) => k.isActive);
  const hasActiveKeys = activeKeys.length > 0;

  const renderKeyOptions = () => {
    if (!hasActiveKeys) {
      return <NoActiveApiKeyOption />;
    }

    return <ActiveApiKeyOptions activeKeys={activeKeys} />;
  };

  return (
    <div className="space-y-2">
      <Label>API Key</Label>
      <Select value={selectedKeyId} onValueChange={onKeyChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select API Key" />
        </SelectTrigger>
        <SelectContent>{renderKeyOptions()}</SelectContent>
      </Select>
      {!hasActiveKeys && <NoActiveApiKeyHint />}
    </div>
  );
}
