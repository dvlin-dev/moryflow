import { describe, expect, it } from 'vitest';
import { telegramFormSchema } from './telegram-section';

const buildInput = () => ({
  accountId: 'default',
  enabled: false,
  mode: 'polling' as const,
  hasStoredBotToken: false,
  hasStoredWebhookSecret: false,
  botToken: '',
  webhookUrl: '',
  webhookSecret: '',
  webhookListenHost: '127.0.0.1',
  webhookListenPort: 8787,
  dmPolicy: 'pairing' as const,
  allowFromText: '',
  groupPolicy: 'allowlist' as const,
  groupAllowFromText: '',
  requireMentionByDefault: true,
  pollingTimeoutSeconds: 25,
  pollingIdleDelayMs: 600,
  pollingMaxBatchSize: 100,
  pairingCodeTtlSeconds: 900,
  maxSendRetries: 3,
});

describe('telegramFormSchema', () => {
  it('webhook 模式缺少 URL 时前置失败', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      mode: 'webhook',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'webhookUrl')).toBe(true);
  });

  it('webhook 模式且无已存 secret 时要求输入 secret', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      mode: 'webhook',
      webhookUrl: 'https://example.com/telegram/webhook/default',
      webhookSecret: '',
      hasStoredWebhookSecret: false,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'webhookSecret')).toBe(true);
  });

  it('启用渠道且无已存 token 时要求输入 token', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      enabled: true,
      botToken: '',
      hasStoredBotToken: false,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'botToken')).toBe(true);
  });

  it('已有已存 token/secret 时允许空输入保持不变', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      enabled: true,
      mode: 'webhook',
      webhookUrl: 'https://example.com/telegram/webhook/default',
      hasStoredBotToken: true,
      hasStoredWebhookSecret: true,
      botToken: '',
      webhookSecret: '',
    });
    expect(result.success).toBe(true);
  });
});
