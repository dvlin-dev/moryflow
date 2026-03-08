/**
 * [INPUT]: 本地 Moryflow/Anyhunt base URL + 已启动服务 + ANYHUNT_API_KEY
 * [OUTPUT]: Memox 二期本地 rehearsal JSON report
 * [POS]: Step 7 本地 cutover/backfill/replay/dogfooding 执行脚本
 */

import { createHash, randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthTokensService } from '../src/auth/auth.tokens.service';
import { MemoxCutoverService } from '../src/memox/memox-cutover.service';
import { PrismaService } from '../src/prisma';

interface LocalFileState {
  fileId: string;
  path: string;
  title: string;
  content: string;
  vectorClock: Record<string, number>;
  deleted?: boolean;
}

interface JsonApiResponse<T> {
  status: number;
  payload: T;
}

const MORYFLOW_BASE_URL =
  process.env.MORYFLOW_BASE_URL?.trim() || 'http://127.0.0.1:3200/api/v1';
const ANYHUNT_BASE_URL =
  process.env.ANYHUNT_BASE_URL?.trim() || 'http://127.0.0.1:3100/api/v1';
const USER_EMAIL =
  process.env.ANYHUNT_REHEARSAL_USER_EMAIL?.trim() || 'free.user@example.com';

function sha256Hex(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function toLocalFileDto(file: LocalFileState) {
  const content = file.deleted ? '' : file.content;
  return {
    fileId: file.fileId,
    path: file.path,
    title: file.title,
    size: Buffer.byteLength(content, 'utf8'),
    contentHash: file.deleted ? '' : sha256Hex(content),
    vectorClock: file.vectorClock,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(
      `Invalid JSON response (${response.status}): ${raw.slice(0, 500)}`,
    );
  }
}

function assertExpectedStatus(
  operation: string,
  actual: number,
  expected: number,
): void {
  if (actual !== expected) {
    throw new Error(`${operation} returned ${actual}, expected ${expected}`);
  }
}

async function moryflowJson<T>(
  token: string,
  path: string,
  options: RequestInit,
): Promise<JsonApiResponse<T>> {
  const response = await fetch(`${MORYFLOW_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = (await readJson(response)) as T;
  if (!response.ok) {
    throw new Error(
      `Moryflow ${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return { status: response.status, payload };
}

async function anyhuntSourceSearch(
  query: string,
  userId: string,
  projectId: string,
): Promise<JsonApiResponse<{ results: Array<Record<string, unknown>> }>> {
  const response = await fetch(`${ANYHUNT_BASE_URL}/sources/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ANYHUNT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      user_id: userId,
      project_id: projectId,
    }),
  });
  const payload = (await readJson(response)) as {
    results: Array<Record<string, unknown>>;
  };
  if (!response.ok) {
    throw new Error(
      `Anyhunt source search failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return { status: response.status, payload };
}

async function waitForExternalId(
  query: string,
  userId: string,
  projectId: string,
  expectedExternalId: string | null,
) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await anyhuntSourceSearch(query, userId, projectId);
    const externalIds = result.payload.results
      .map((item) =>
        typeof item.external_id === 'string' ? item.external_id : null,
      )
      .filter((value): value is string => Boolean(value));

    const matched =
      expectedExternalId === null
        ? externalIds.length === 0
        : externalIds.includes(expectedExternalId);
    if (matched) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Search expectation not met for query="${query}" expectedExternalId=${expectedExternalId ?? 'none'}`,
  );
}

function assertSearchVerificationMetrics(
  label: string,
  report: {
    expectedHitRate: number;
    deletedLeakCount: number;
    pathMismatchCount: number;
  },
): void {
  if (report.expectedHitRate !== 1) {
    throw new Error(
      `${label} expectedHitRate must be 1, got ${report.expectedHitRate}`,
    );
  }
  if (report.deletedLeakCount !== 0) {
    throw new Error(
      `${label} deletedLeakCount must be 0, got ${report.deletedLeakCount}`,
    );
  }
  if (report.pathMismatchCount !== 0) {
    throw new Error(
      `${label} pathMismatchCount must be 0, got ${report.pathMismatchCount}`,
    );
  }
}

async function main(): Promise<void> {
  if (!process.env.ANYHUNT_API_KEY?.trim()) {
    throw new Error('ANYHUNT_API_KEY is required');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const prisma = app.get(PrismaService);
    const tokens = app.get(AuthTokensService);
    const cutover = app.get(MemoxCutoverService);

    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new Error(`seed user not found: ${USER_EMAIL}`);
    }

    const accessToken = await tokens.createAccessToken(user.id);
    const token = accessToken.token;
    const deviceId = randomUUID();
    const vaultName = `Memox Phase2 Local ${new Date().toISOString()}`;

    const createVault = await moryflowJson<{ id: string; name: string }>(
      token,
      '/vaults',
      {
        method: 'POST',
        body: JSON.stringify({ name: vaultName }),
      },
    );
    const vaultId = createVault.payload.id;

    const files = new Map<string, LocalFileState>();
    const alphaId = randomUUID();
    const betaId = randomUUID();
    const gammaId = randomUUID();
    const deltaId = randomUUID();

    files.set(alphaId, {
      fileId: alphaId,
      path: 'notes/alpha.md',
      title: 'Alpha Note',
      content: 'alpha memory rehearsal phase2 unique zebra',
      vectorClock: { [deviceId]: 1 },
    });
    files.set(betaId, {
      fileId: betaId,
      path: 'projects/beta.md',
      title: 'Beta Note',
      content: 'beta planning rollback unique comet',
      vectorClock: { [deviceId]: 1 },
    });
    files.set(gammaId, {
      fileId: gammaId,
      path: 'journal/gamma.md',
      title: 'Gamma Note',
      content: 'gamma delete check unique aurora',
      vectorClock: { [deviceId]: 1 },
    });

    async function syncSnapshot(label: string) {
      const localFiles = [...files.values()].map(toLocalFileDto);
      const diff = await moryflowJson<{ actions: Array<Record<string, any>> }>(
        token,
        '/sync/diff',
        {
          method: 'POST',
          body: JSON.stringify({
            vaultId,
            deviceId,
            localFiles,
          }),
        },
      );
      const actions = diff.payload.actions;

      for (const action of actions) {
        if (action.action !== 'upload') {
          continue;
        }
        const file = files.get(action.fileId);
        if (!file || file.deleted) {
          throw new Error(`upload state missing for file ${action.fileId}`);
        }

        const body = Buffer.from(file.content, 'utf8');
        const uploadUrl =
          typeof action.uploadUrl === 'string' ? action.uploadUrl : action.url;
        if (typeof uploadUrl !== 'string' || uploadUrl.length === 0) {
          throw new Error(`upload URL missing for file ${action.fileId}`);
        }

        const upload = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Length': String(body.length),
          },
          body,
        });
        if (!upload.ok) {
          const uploadBody = await upload.text();
          throw new Error(
            `upload failed for ${action.fileId}: ${upload.status} ${uploadBody}`,
          );
        }
      }

      const commit = await moryflowJson<{
        success: boolean;
        syncedAt: string;
      }>(token, '/sync/commit', {
        method: 'POST',
        body: JSON.stringify({
          vaultId,
          deviceId,
          receipts: actions.map((action) => ({
            actionId: action.actionId,
            receiptToken: action.receiptToken,
          })),
        }),
      });

      if (!commit.payload.success) {
        throw new Error(`${label} commit did not succeed`);
      }

      return {
        diffStatus: diff.status,
        commitStatus: commit.status,
        actionCount: actions.length,
        actions: actions.map((action) => ({
          action: action.action,
          fileId: action.fileId,
          path: action.path,
        })),
      };
    }

    const firstSync = await syncSnapshot('initial');

    const backfillBatches = [];
    while (true) {
      const batch = await cutover.backfillBatch({
        batchSize: 10,
        reset: backfillBatches.length === 0,
      });
      backfillBatches.push(batch);
      if (batch.done) {
        break;
      }
    }

    const replayAfterBackfill = await cutover.replayOutbox({
      batchSize: 20,
      maxBatches: 20,
      leaseMs: 60_000,
      consumerId: 'memox-phase2-local-replay-1',
    });
    if (
      replayAfterBackfill.failedIds.length > 0 ||
      replayAfterBackfill.deadLetteredIds.length > 0
    ) {
      throw new Error(
        `replayAfterBackfill failed: ${JSON.stringify(replayAfterBackfill)}`,
      );
    }

    const initialVerification = await cutover.verifySearchProjection({
      userId: user.id,
      topK: 5,
      queries: [
        { query: 'zebra alpha phase2', vaultId, expectedFileIds: [alphaId] },
        { query: 'rollback comet beta', vaultId, expectedFileIds: [betaId] },
        { query: 'aurora gamma delete', vaultId, expectedFileIds: [gammaId] },
      ],
    });
    assertSearchVerificationMetrics('initialVerification', initialVerification);

    files.set(betaId, {
      fileId: betaId,
      path: 'projects/beta-renamed.md',
      title: 'Beta Note',
      content: 'beta planning rollback unique comet',
      vectorClock: { [deviceId]: 2 },
    });
    files.set(gammaId, {
      fileId: gammaId,
      path: 'journal/gamma.md',
      title: 'Gamma Note',
      content: '',
      deleted: true,
      vectorClock: { [deviceId]: 2 },
    });
    files.set(deltaId, {
      fileId: deltaId,
      path: 'archive/delta.md',
      title: 'Delta Note',
      content: 'delta cutover dogfood unique nebula',
      vectorClock: { [deviceId]: 1 },
    });

    const secondSync = await syncSnapshot('rename-delete-add');
    const replayAfterMutation = await cutover.replayOutbox({
      batchSize: 20,
      maxBatches: 20,
      leaseMs: 60_000,
      consumerId: 'memox-phase2-local-replay-2',
    });
    if (
      replayAfterMutation.failedIds.length > 0 ||
      replayAfterMutation.deadLetteredIds.length > 0
    ) {
      throw new Error(
        `replayAfterMutation failed: ${JSON.stringify(replayAfterMutation)}`,
      );
    }

    const postMutationVerification = await cutover.verifySearchProjection({
      userId: user.id,
      topK: 5,
      queries: [
        { query: 'zebra alpha phase2', vaultId, expectedFileIds: [alphaId] },
        {
          query: 'rollback comet beta renamed',
          vaultId,
          expectedFileIds: [betaId],
        },
        { query: 'delta nebula dogfood', vaultId, expectedFileIds: [deltaId] },
      ],
    });
    assertSearchVerificationMetrics(
      'postMutationVerification',
      postMutationVerification,
    );

    const moryflowDelta = await moryflowJson<{
      results: Array<Record<string, unknown>>;
      count: number;
    }>(token, '/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'delta nebula dogfood',
        vaultId,
        topK: 5,
      }),
    });
    const moryflowBeta = await moryflowJson<{
      results: Array<Record<string, unknown>>;
      count: number;
    }>(token, '/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'rollback comet beta',
        vaultId,
        topK: 5,
      }),
    });
    const moryflowGamma = await moryflowJson<{
      results: Array<Record<string, unknown>>;
      count: number;
    }>(token, '/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'gamma aurora delete',
        vaultId,
        topK: 5,
      }),
    });

    assertExpectedStatus('moryflow.search.delta', moryflowDelta.status, 200);
    assertExpectedStatus('moryflow.search.beta', moryflowBeta.status, 200);
    assertExpectedStatus('moryflow.search.gamma', moryflowGamma.status, 200);

    const anyhuntDelta = await waitForExternalId(
      'delta nebula dogfood',
      user.id,
      vaultId,
      deltaId,
    );
    const anyhuntBeta = await waitForExternalId(
      'rollback comet beta',
      user.id,
      vaultId,
      betaId,
    );
    const anyhuntGamma = await waitForExternalId(
      'gamma aurora delete',
      user.id,
      vaultId,
      null,
    );

    assertExpectedStatus(
      'anyhunt.sources.search.delta',
      anyhuntDelta.status,
      200,
    );
    assertExpectedStatus(
      'anyhunt.sources.search.beta',
      anyhuntBeta.status,
      200,
    );
    assertExpectedStatus(
      'anyhunt.sources.search.gamma',
      anyhuntGamma.status,
      200,
    );

    const outboxState = await prisma.fileLifecycleOutbox.findMany({
      where: { vaultId },
      orderBy: { createdAt: 'asc' },
      select: {
        eventType: true,
        attemptCount: true,
        processedAt: true,
        deadLetteredAt: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          userId: user.id,
          userEmail: user.email,
          accessToken: token,
          vaultId,
          vaultName,
          deviceId,
          firstSync,
          backfillBatches,
          replayAfterBackfill,
          initialVerification,
          secondSync,
          replayAfterMutation,
          postMutationVerification,
          moryflowSearch: {
            delta: moryflowDelta,
            beta: moryflowBeta,
            gamma: moryflowGamma,
          },
          anyhuntSearch: {
            delta: anyhuntDelta,
            beta: anyhuntBeta,
            gamma: anyhuntGamma,
          },
          outboxState,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
