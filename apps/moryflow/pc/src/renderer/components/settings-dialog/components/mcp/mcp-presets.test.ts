import { describe, expect, it } from 'vitest';
import { MCP_PRESETS } from './mcp-presets';

describe('MCP_PRESETS', () => {
  it('does not include macOS Kit as builtin preset', () => {
    expect(MCP_PRESETS.some((preset) => preset.id === 'macos-kit')).toBe(false);
  });

  it('keeps preset ids unique', () => {
    const ids = MCP_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
