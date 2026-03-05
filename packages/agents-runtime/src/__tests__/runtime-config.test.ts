import { describe, expect, it } from 'vitest';

import { mergeRuntimeConfig, parseRuntimeConfig } from '../runtime-config';

describe('runtime-config', () => {
  it('returns empty config for blank content without parse errors', () => {
    const result = parseRuntimeConfig('   \n\t  ');
    expect(result.config).toEqual({});
    expect(result.errors).toEqual([]);
  });

  it('parses runtime config from JSONC', () => {
    const content = `\n{\n  // runtime\n  "agents": {\n    "runtime": {\n      "mode": { "global": "ask" },\n      "truncation": { "maxLines": 10, "maxBytes": 100, "ttlDays": 3 },\n      "doomLoop": { "maxAttempts": 2 },\n      "agent": { "id": "writer" },\n      "permission": {\n        "toolPolicy": {\n          "allow": [\n            { "tool": "Read" },\n            { "tool": "Bash", "commandPattern": "git:*" }\n          ]\n        }\n      },\n      "tools": {\n        "external": { "enabled": true },\n        "budgetWarnThreshold": 16,\n        "bashAudit": { "persistCommandPreview": true, "previewMaxChars": 96 }\n      },\n      "hooks": {\n        "chat": { "system": { "mode": "append", "text": "hello" } }\n      }\n    }\n  }\n}\n`;
    const result = parseRuntimeConfig(content);
    expect(result.errors.length).toBe(0);
    expect(result.config.mode?.global).toBe('ask');
    expect(result.config.truncation?.maxLines).toBe(10);
    expect(result.config.doomLoop?.maxAttempts).toBe(2);
    expect(result.config.agent?.id).toBe('writer');
    expect(result.config.permission?.toolPolicy?.allow).toEqual([
      { tool: 'Read' },
      { tool: 'Bash', commandPattern: 'git:*' },
    ]);
    expect(result.config.tools?.external?.enabled).toBe(true);
    expect(result.config.tools?.budgetWarnThreshold).toBe(16);
    expect(result.config.tools?.bashAudit?.persistCommandPreview).toBe(true);
    expect(result.config.tools?.bashAudit?.previewMaxChars).toBe(96);
    expect(result.config.hooks?.chat?.system?.text).toBe('hello');
  });

  it('falls back to mode.default when mode.global is absent', () => {
    const content = '{ "agents": { "runtime": { "mode": { "default": "full_access" } } } }';
    const result = parseRuntimeConfig(content);
    expect(result.errors.length).toBe(0);
    expect(result.config.mode?.global).toBe('full_access');
  });

  it('merges runtime config with overrides', () => {
    const base = parseRuntimeConfig(
      '{ "agents": { "runtime": { "truncation": { "maxLines": 100 }, "tools": { "budgetWarnThreshold": 24 } } } }'
    ).config;
    const override = parseRuntimeConfig(
      '{ "agents": { "runtime": { "truncation": { "maxBytes": 50 }, "agent": { "id": "a" }, "permission": { "toolPolicy": { "allow": [ { "tool": "Read" } ] } }, "tools": { "external": { "enabled": true }, "bashAudit": { "persistCommandPreview": true } } } } }'
    ).config;
    const merged = mergeRuntimeConfig(base, override);
    expect(merged.truncation?.maxLines).toBe(100);
    expect(merged.truncation?.maxBytes).toBe(50);
    expect(merged.agent?.id).toBe('a');
    expect(merged.tools?.external?.enabled).toBe(true);
    expect(merged.tools?.budgetWarnThreshold).toBe(24);
    expect(merged.tools?.bashAudit?.persistCommandPreview).toBe(true);
    expect(merged.permission?.toolPolicy?.allow).toEqual([{ tool: 'Read' }]);
  });
});
