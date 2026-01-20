import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LlmSecretService } from '../llm-secret.service';
import { ANYHUNT_LLM_SECRET_KEY_ENV } from '../llm.constants';
import { randomBytes } from 'crypto';

describe('LlmSecretService', () => {
  const previous = process.env[ANYHUNT_LLM_SECRET_KEY_ENV];

  beforeEach(() => {
    process.env[ANYHUNT_LLM_SECRET_KEY_ENV] =
      randomBytes(32).toString('base64');
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[ANYHUNT_LLM_SECRET_KEY_ENV];
    } else {
      process.env[ANYHUNT_LLM_SECRET_KEY_ENV] = previous;
    }
  });

  it('encrypts and decrypts apiKey', () => {
    const service = new LlmSecretService();
    const encrypted = service.encryptApiKey('sk-test-123');
    expect(encrypted).toMatch(/^v1:/);
    expect(service.decryptApiKey(encrypted)).toBe('sk-test-123');
  });

  it('throws when secret key is missing', () => {
    delete process.env[ANYHUNT_LLM_SECRET_KEY_ENV];
    const service = new LlmSecretService();
    expect(() => service.encryptApiKey('sk-test-123')).toThrow(
      ANYHUNT_LLM_SECRET_KEY_ENV,
    );
  });
});
