import { describe, it, expect } from 'vitest';
import { normalizeAgentSettings } from '../normalize';
import { defaultAgentSettings } from '../const';

describe('agent-settings normalize', () => {
  it('uses empty MCP defaults for fresh settings', () => {
    expect(defaultAgentSettings.mcp.stdio).toEqual([]);
    expect(defaultAgentSettings.mcp.streamableHttp).toEqual([]);
  });

  it('returns defaults for invalid input', () => {
    const normalized = normalizeAgentSettings(null);
    expect(normalized.personalization).toEqual(defaultAgentSettings.personalization);
  });

  it('preserves personalization.customInstructions', () => {
    const normalized = normalizeAgentSettings({
      personalization: { customInstructions: 'Answer with concise bullet points.' },
    });

    expect(normalized.personalization.customInstructions).toBe(
      'Answer with concise bullet points.'
    );
  });

  it('falls back to empty string when personalization is invalid', () => {
    const normalized = normalizeAgentSettings({
      personalization: { customInstructions: 123 as unknown as string },
    });

    expect(normalized.personalization.customInstructions).toBe('');
  });

  it('falls back to defaults when schema validation fails', () => {
    // customProviders.models[0].customName is required by schema (new user best practice)
    const normalized = normalizeAgentSettings({
      customProviders: [
        {
          providerId: 'custom-abc',
          name: 'Custom provider',
          enabled: true,
          apiKey: 'test',
          baseUrl: null,
          models: [{ id: 'gpt-4o', enabled: true }],
          defaultModelId: null,
        },
      ],
    });

    expect(normalized).toEqual(defaultAgentSettings);
  });

  it('accepts custom provider ids without relying on custom- prefix', () => {
    const normalized = normalizeAgentSettings({
      customProviders: [
        {
          providerId: 'my-provider',
          name: 'My Provider',
          enabled: true,
          apiKey: 'test',
          baseUrl: null,
          models: [
            {
              id: 'gpt-4o',
              enabled: true,
              isCustom: true,
              customName: 'GPT-4o',
            },
          ],
          defaultModelId: 'gpt-4o',
        },
      ],
    });

    expect(normalized.customProviders).toHaveLength(1);
    expect(normalized.customProviders[0]?.providerId).toBe('my-provider');
  });

  it('keeps managed stdio server fields when MCP settings are valid', () => {
    const normalized = normalizeAgentSettings({
      mcp: {
        stdio: [
          {
            id: 's1',
            enabled: true,
            name: 'Managed MCP',
            packageName: '@scope/mcp',
            binName: 'mcp-cli',
            args: ['--safe'],
          },
        ],
        streamableHttp: [],
      },
    });

    expect(normalized.mcp.stdio).toHaveLength(1);
    expect(normalized.mcp.stdio[0]).toMatchObject({
      id: 's1',
      autoUpdate: 'startup-latest',
      packageName: '@scope/mcp',
      binName: 'mcp-cli',
      args: ['--safe'],
    });
  });
});
