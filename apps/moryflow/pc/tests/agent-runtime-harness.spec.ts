import { test, expect, type Page } from '@playwright/test';
import type { FakeLlmServerRequest, FakeLlmScriptedResponse } from './helpers/fake-llm-server.js';
import type { PCHarnessSession } from './helpers/pc-harness.js';
import { createPCHarnessSession } from './helpers/pc-harness.js';
import { createRootNoteFromEmptyState } from './helpers/workspace-actions.js';

const configureFakeAgentModel = async (page: Page, baseUrl: string | undefined) => {
  await page.waitForFunction(() => Boolean(window.desktopAPI?.agent?.updateSettings));
  await page.evaluate(async (resolvedBaseUrl) => {
    await window.desktopAPI.agent.updateSettings({
      model: {
        defaultModel: 'e2e-provider/e2e-model',
      },
      providers: [],
      customProviders: [
        {
          providerId: 'e2e-provider',
          name: 'E2E Provider',
          enabled: true,
          apiKey: 'e2e-key',
          baseUrl: resolvedBaseUrl,
          models: [
            {
              id: 'e2e-model',
              enabled: true,
              isCustom: true,
              customName: 'E2E Model',
            },
          ],
          defaultModelId: 'e2e-model',
        },
      ],
    });
    await window.desktopAPI.chat.setGlobalMode({ mode: 'full_access' });
  }, baseUrl);
};

const createChatCompletionChunk = ({
  id,
  model,
  delta,
  finishReason,
  usage,
}: {
  id: string;
  model: string;
  delta?: Record<string, unknown>;
  finishReason?: 'stop' | 'tool_calls';
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}) => ({
  id,
  object: 'chat.completion.chunk',
  created: 1_711_234_567,
  model,
  choices: [
    {
      index: 0,
      delta: delta ?? {},
      ...(finishReason ? { finish_reason: finishReason } : {}),
    },
  ],
  ...(usage ? { usage } : {}),
});

const STREAMING_BASH_COMMAND = 'for i in 1 2 3 4 5; do echo "step $i"; sleep 1; done';

const TITLE_RESPONSE: FakeLlmScriptedResponse = {
  status: 200,
  body: {
    id: 'chatcmpl-title-0',
    object: 'chat.completion',
    created: 1_711_234_560,
    model: 'e2e-model',
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: 'Streaming Harness',
        },
      },
    ],
    usage: {
      prompt_tokens: 4,
      completion_tokens: 2,
      total_tokens: 6,
    },
  },
};

const TOOL_CALL_RESPONSE: FakeLlmScriptedResponse = {
  status: 200,
  sse: [
    {
      data: createChatCompletionChunk({
        id: 'chatcmpl-tool-1',
        model: 'e2e-model',
        delta: {
          tool_calls: [
            {
              index: 0,
              id: 'call-stream-1',
              type: 'function',
              function: {
                name: 'bash',
                arguments: JSON.stringify({
                  command: STREAMING_BASH_COMMAND,
                }),
              },
            },
          ],
        },
      }),
    },
    {
      data: createChatCompletionChunk({
        id: 'chatcmpl-tool-1',
        model: 'e2e-model',
        finishReason: 'tool_calls',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }),
    },
    { data: '[DONE]' },
  ],
};

const FINAL_TEXT_RESPONSE: FakeLlmScriptedResponse = {
  status: 200,
  delayMs: 1_200,
  sse: [
    {
      data: createChatCompletionChunk({
        id: 'chatcmpl-text-2',
        model: 'e2e-model',
        delta: {
          content: 'Streaming harness complete.',
        },
      }),
    },
    {
      data: createChatCompletionChunk({
        id: 'chatcmpl-text-2',
        model: 'e2e-model',
        finishReason: 'stop',
        usage: {
          prompt_tokens: 12,
          completion_tokens: 6,
          total_tokens: 18,
        },
      }),
    },
    { data: '[DONE]' },
  ],
};

const isStreamingRequest = (request: FakeLlmServerRequest) =>
  Boolean(
    request.bodyJson &&
    typeof request.bodyJson === 'object' &&
    'stream' in request.bodyJson &&
    (request.bodyJson as { stream?: boolean }).stream
  );

test.describe('Moryflow PC agent runtime harness', () => {
  let session: PCHarnessSession | null = null;

  test.beforeEach(async () => {
    let streamingRequestCount = 0;
    session = await createPCHarnessSession({
      tempPrefix: 'moryflow-pc-e2e-agent-runtime-',
      fakeLlm: {
        resolveResponse: (request) => {
          if (!isStreamingRequest(request)) {
            return TITLE_RESPONSE;
          }

          streamingRequestCount += 1;
          return streamingRequestCount === 1 ? TOOL_CALL_RESPONSE : FINAL_TEXT_RESPONSE;
        },
      },
      pageTimeoutMs: 60_000,
    });
  });

  test.afterEach(async (_fixture, testInfo) => {
    if (!session) {
      return;
    }
    if (testInfo.status !== testInfo.expectedStatus) {
      session.printFailureDiagnostics();
    }
    await session.dispose();
    session = null;
  });

  test('streams bash tool output progressively instead of dumping the full result at the end', async () => {
    if (!session) {
      throw new Error('Harness session not initialized.');
    }
    const { page, fakeLlm } = session;

    await configureFakeAgentModel(page, fakeLlm?.baseUrl);

    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await expect(page.getByText('E2E Model')).toBeVisible();
    await page.getByRole('tab', { name: 'Home' }).click();
    const { fileLabel: noteFileLabel } = await createRootNoteFromEmptyState(page);
    const editor = page.locator('.notion-like-editor');
    await editor.click();
    await page.keyboard.type('Harness content for current file chip.');

    const removeReferenceButtons = page.getByRole('button', { name: /remove reference/i });
    await expect(removeReferenceButtons).toHaveCount(1);

    const chatTextarea = page.locator('textarea[name="message"]');
    await chatTextarea.fill('Run the streaming bash verification.');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(
      page
        .locator('[data-message-id]')
        .filter({ hasText: 'Run the streaming bash verification.' })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('[data-message-id]')
        .filter({ hasText: 'Run the streaming bash verification.' })
        .first()
        .getByText(noteFileLabel)
    ).toBeVisible();
    await expect(removeReferenceButtons).toHaveCount(1);

    const toolOutput = page.getByTestId('tool-output-scroll').first();
    await expect(toolOutput).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await toolOutput.textContent()) ?? '').toContain('step 1');
    await expect.poll(async () => (await toolOutput.textContent()) ?? '').toContain('step 2');
    await expect.poll(async () => (await toolOutput.textContent()) ?? '').toContain('step 3');

    await expect
      .poll(() => fakeLlm?.getRequestCount() ?? 0, { timeout: 30_000 })
      .toBeGreaterThan(0);
    await expect(page.getByText('Streaming harness complete.')).toBeVisible();
  });
});
