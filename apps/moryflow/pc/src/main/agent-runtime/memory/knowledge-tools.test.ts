/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FunctionTool } from '@openai/agents-core';
import { createKnowledgeTools, type KnowledgeToolDeps } from './knowledge-tools.js';

const mockApi = {
  search: vi.fn(),
};

const mockReadWorkspaceFile = vi.fn();
const mockGetWorkspaceId = vi.fn();

const deps: KnowledgeToolDeps = {
  getWorkspaceId: mockGetWorkspaceId,
  api: mockApi as any,
  readWorkspaceFile: mockReadWorkspaceFile,
};

const makeRunContext = (chatId: string) => ({ context: { chatId, vaultRoot: '/tmp' } }) as any;

function findTool(name: string, overrides: Partial<KnowledgeToolDeps> = {}): FunctionTool<any> {
  const tools = createKnowledgeTools({
    ...deps,
    ...overrides,
  });
  const found = tools.find((t) => t.name === name);
  if (!found) {
    throw new Error(`Tool "${name}" not found`);
  }
  return found as FunctionTool<any>;
}

async function invokeTool(
  name: string,
  input: Record<string, unknown>,
  chatId: string,
  overrides: Partial<KnowledgeToolDeps> = {}
) {
  const tool = findTool(name, overrides);
  return tool.invoke(makeRunContext(chatId), JSON.stringify(input));
}

describe('createKnowledgeTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkspaceId.mockResolvedValue('ws-123');
  });

  it('knowledge_search uses workspace-bound memory search and returns document ids', async () => {
    mockApi.search.mockResolvedValue({
      groups: {
        files: {
          items: [
            {
              documentId: 'doc-1',
              title: 'Alpha',
              path: 'Docs/Alpha.md',
              snippet: 'alpha snippet',
              score: 0.9,
            },
          ],
        },
      },
    });

    const result = await invokeTool('knowledge_search', { query: 'alpha' }, 'chat-1');

    expect(mockGetWorkspaceId).toHaveBeenCalledWith('chat-1');
    expect(mockApi.search).toHaveBeenCalledWith({
      workspaceId: 'ws-123',
      query: 'alpha',
      limitPerGroup: 10,
    });

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    expect(parsed).toEqual({
      items: [
        {
          documentId: 'doc-1',
          title: 'Alpha',
          path: 'Docs/Alpha.md',
          snippet: 'alpha snippet',
          score: 0.9,
        },
      ],
    });
  });

  it('knowledge_read delegates to readWorkspaceFile with chat-bound scope', async () => {
    mockReadWorkspaceFile.mockResolvedValue({
      content: '# Alpha',
      truncated: false,
      nextOffset: null,
      relativePath: 'Docs/Alpha.md',
      totalBytes: 7,
    });

    const result = await invokeTool(
      'knowledge_read',
      {
        documentId: 'doc-1',
        offsetChars: 10,
        maxChars: 100,
      },
      'chat-2'
    );

    expect(mockReadWorkspaceFile).toHaveBeenCalledWith(
      {
        documentId: 'doc-1',
        path: undefined,
        offsetChars: 10,
        maxChars: 100,
      },
      'chat-2'
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    expect(parsed).toEqual({
      content: '# Alpha',
      truncated: false,
      nextOffset: null,
      relativePath: 'Docs/Alpha.md',
      totalBytes: 7,
    });
  });

  it('knowledge_read is omitted when readWorkspaceFile is unavailable', () => {
    const tools = createKnowledgeTools({
      getWorkspaceId: mockGetWorkspaceId,
      api: mockApi as any,
    });

    expect(tools.map((tool) => tool.name)).toEqual(['knowledge_search']);
  });

  it('returns an error object when knowledge_read fails', async () => {
    mockReadWorkspaceFile.mockRejectedValue(new Error('boom'));

    const result = await invokeTool(
      'knowledge_read',
      {
        documentId: 'doc-1',
      },
      'chat-3'
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    expect(parsed).toEqual({
      error: 'File reading is currently unavailable.',
    });
  });
});
