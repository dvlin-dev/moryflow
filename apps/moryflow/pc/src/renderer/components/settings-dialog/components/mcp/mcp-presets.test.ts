import { describe, expect, it } from 'vitest';
import { MCP_PRESETS } from './mcp-presets';

describe('MCP_PRESETS', () => {
  it('includes macOS Kit preset with managed npm package metadata', () => {
    expect(MCP_PRESETS).toContainEqual({
      id: 'macos-kit',
      name: 'macOS Kit',
      description: 'macOS automation with AppleScript/JXA',
      type: 'stdio',
      packageName: '@moryflow/macos-kit',
      binName: 'macos-kit-mcp',
    });
  });

  it('keeps preset ids unique', () => {
    const ids = MCP_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
