import { describe, expect, it } from 'vitest';
import { telegramFormSchema } from './telegram-form-schema';

const buildInput = () => ({
  accountId: 'default',
  enabled: false,
  mode: 'polling' as const,
  hasStoredBotToken: false,
  hasStoredWebhookSecret: false,
  hasStoredProxyUrl: false,
  botToken: '',
  webhookUrl: '',
  webhookSecret: '',
  proxyEnabled: false,
  proxyUrl: '',
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
  enableDraftStreaming: true,
  draftFlushIntervalMs: 350,
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

  it('draft flush interval 超出范围时失败', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      draftFlushIntervalMs: 100,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'draftFlushIntervalMs')).toBe(
      true
    );
  });

  it('启用 proxy 且无已存配置时要求输入 proxy URL', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      proxyEnabled: true,
      proxyUrl: '',
      hasStoredProxyUrl: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'proxyUrl')).toBe(true);
  });

  it('启用 proxy 且已有已存配置时允许空输入保持不变', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      proxyEnabled: true,
      proxyUrl: '',
      hasStoredProxyUrl: true,
    });

    expect(result.success).toBe(true);
  });

  it('proxy URL 非 http/https/socks5 协议时失败', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      proxyEnabled: true,
      proxyUrl: 'ftp://127.0.0.1:21',
      hasStoredProxyUrl: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'proxyUrl')).toBe(true);
  });

  it('proxy 关闭时若填写了非法 URL 也应失败，避免保存时主进程校验报错', () => {
    const result = telegramFormSchema.safeParse({
      ...buildInput(),
      proxyEnabled: false,
      proxyUrl: 'ftp://127.0.0.1:21',
      hasStoredProxyUrl: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'proxyUrl')).toBe(true);
  });
});
