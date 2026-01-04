import { describe, test, expect } from 'vitest';
import { MCPServerStdio } from '../src';

describe('MCPServerStdio', () => {
  test('should be available', () => {
    const server = new MCPServerStdio({
      name: 'test',
      fullCommand: 'test',
      cacheToolsList: true,
    });
    expect(server).toBeDefined();
    expect(server.name).toBe('test');
    expect(server.cacheToolsList).toBe(true);
  });
});
