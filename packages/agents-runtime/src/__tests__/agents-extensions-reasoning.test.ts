import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type ItemsToLanguageV2Messages = (
  model: unknown,
  items: unknown,
  settings: unknown
) => Array<Record<string, unknown>>;

function resolveAgentsExtensionsRequire() {
  const candidatePackageJsonPaths = [
    path.join(process.cwd(), 'package.json'),
    path.join(process.cwd(), 'packages', 'agents-runtime', 'package.json'),
  ];

  for (const packageJsonPath of candidatePackageJsonPaths) {
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const packageRequire = createRequire(packageJsonPath);
    try {
      packageRequire.resolve('@openai/agents-extensions');
      return packageRequire;
    } catch {}
  }

  throw new Error(
    '[agents-extensions] unable to resolve package from current workspace for reasoning compatibility test'
  );
}

function resolveAgentsExtensionsPackageDir(packageEntryPath: string) {
  let currentDir = path.dirname(packageEntryPath);

  while (true) {
    const parentDir = path.dirname(currentDir);
    if (
      path.basename(currentDir) === 'agents-extensions' &&
      path.basename(parentDir) === '@openai'
    ) {
      return currentDir;
    }

    if (parentDir === currentDir) {
      throw new Error(
        `[agents-extensions] unable to resolve package directory from entry path: ${packageEntryPath}`
      );
    }

    currentDir = parentDir;
  }
}

function loadItemsToLanguageV2Messages(): ItemsToLanguageV2Messages {
  const packageRequire = resolveAgentsExtensionsRequire();
  const packageEntryPath = packageRequire.resolve('@openai/agents-extensions');
  const packageDir = resolveAgentsExtensionsPackageDir(packageEntryPath);
  const aiSdkModulePath = path.join(packageDir, 'dist', 'ai-sdk', 'index.js');
  const aiSdkModule = packageRequire(aiSdkModulePath) as {
    itemsToLanguageV2Messages: ItemsToLanguageV2Messages;
  };

  return aiSdkModule.itemsToLanguageV2Messages;
}

const itemsToLanguageV2Messages = loadItemsToLanguageV2Messages();

describe('agents-extensions reasoning/tool-call compatibility', () => {
  const model = {
    provider: 'openai-compatible',
    modelId: 'moonshotai/kimi-k2.5',
    specificationVersion: 'v3',
  } as const;

  const items = [
    {
      type: 'reasoning',
      content: [{ text: 'internal reasoning' }],
      providerData: {},
    },
    {
      type: 'function_call',
      callId: 'call_1',
      name: 'search',
      arguments: '{"q":"hello"}',
      providerData: {},
    },
  ] as const;

  it('keeps reasoning and tool-call split without the explicit override', () => {
    const messages = itemsToLanguageV2Messages(
      model as any,
      items as any,
      {
        providerData: {},
      } as any
    );

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'reasoning', text: 'internal reasoning' }],
    });
    expect(messages[1]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'tool-call', toolCallId: 'call_1', toolName: 'search' }],
    });
  });

  it('merges reasoning into the assistant tool-call message when override is enabled', () => {
    const messages = itemsToLanguageV2Messages(
      model as any,
      items as any,
      {
        providerData: {
          providerOptions: {
            reasoningContentToolCalls: true,
          },
        },
      } as any
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      content: [
        { type: 'reasoning', text: 'internal reasoning' },
        { type: 'tool-call', toolCallId: 'call_1', toolName: 'search' },
      ],
    });
  });
});
