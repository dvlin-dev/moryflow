import { describe, expect, it } from 'vitest';

import { mergeRuntimeConfig, parseRuntimeConfig } from '../runtime-config';

describe('runtime-config', () => {
  it('returns empty config for blank content without parse errors', () => {
    const result = parseRuntimeConfig('   \n\t  ');
    expect(result.config).toEqual({});
    expect(result.errors).toEqual([]);
  });

  it('parses runtime config from JSONC', () => {
    const content = `\n{\n  // runtime\n  "agents": {\n    "runtime": {\n      "mode": { "default": "agent" },\n      "truncation": { "maxLines": 10, "maxBytes": 100, "ttlDays": 3 },\n      "doomLoop": { "maxAttempts": 2 },\n      "agent": { "id": "writer" },\n      "tools": { "external": { "enabled": true } },\n      "hooks": {\n        "chat": { "system": { "mode": "append", "text": "hello" } }\n      }\n    }\n  }\n}\n`;
    const result = parseRuntimeConfig(content);
    expect(result.errors.length).toBe(0);
    expect(result.config.mode?.default).toBe('agent');
    expect(result.config.truncation?.maxLines).toBe(10);
    expect(result.config.doomLoop?.maxAttempts).toBe(2);
    expect(result.config.agent?.id).toBe('writer');
    expect(result.config.tools?.external?.enabled).toBe(true);
    expect(result.config.hooks?.chat?.system?.text).toBe('hello');
  });

  it('merges runtime config with overrides', () => {
    const base = parseRuntimeConfig(
      '{ "agents": { "runtime": { "truncation": { "maxLines": 100 } } } }'
    ).config;
    const override = parseRuntimeConfig(
      '{ "agents": { "runtime": { "truncation": { "maxBytes": 50 }, "agent": { "id": "a" } } } }'
    ).config;
    const merged = mergeRuntimeConfig(base, override);
    expect(merged.truncation?.maxLines).toBe(100);
    expect(merged.truncation?.maxBytes).toBe(50);
    expect(merged.agent?.id).toBe('a');
  });
});
