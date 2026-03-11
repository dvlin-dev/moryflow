import { Prisma } from '../../../generated/prisma-vector/client';

export type UnifiedScope = {
  user_id?: string;
  agent_id?: string;
  app_id?: string;
  run_id?: string;
  org_id?: string;
  project_id?: string;
  metadata?: Record<string, unknown> | null;
};

type QueryablePrisma = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
};

function column(alias: string, name: string) {
  return Prisma.raw(`${alias}."${name}"`);
}

function metadataColumn(alias: string) {
  return Prisma.raw(`${alias}.metadata`);
}

export function hasScopeConstraint(scope: UnifiedScope) {
  return Boolean(
    scope.user_id ||
    scope.agent_id ||
    scope.app_id ||
    scope.run_id ||
    scope.org_id ||
    scope.project_id ||
    hasMetadataScope(scope),
  );
}

export function hasMetadataScope(scope: UnifiedScope) {
  return Boolean(scope.metadata && Object.keys(scope.metadata).length > 0);
}

export function buildScopedSourceWhere(
  apiKeyId: string,
  scope: UnifiedScope,
): Record<string, unknown> {
  return {
    apiKeyId,
    status: { not: 'DELETED' as const },
    ...(scope.user_id ? { userId: scope.user_id } : {}),
    ...(scope.agent_id ? { agentId: scope.agent_id } : {}),
    ...(scope.app_id ? { appId: scope.app_id } : {}),
    ...(scope.run_id ? { runId: scope.run_id } : {}),
    ...(scope.org_id ? { orgId: scope.org_id } : {}),
    ...(scope.project_id ? { projectId: scope.project_id } : {}),
  };
}

export function buildScopedActiveMemoryWhere(
  apiKeyId: string,
  scope: UnifiedScope,
): Record<string, unknown> {
  return {
    apiKeyId,
    ...(scope.user_id ? { userId: scope.user_id } : {}),
    ...(scope.agent_id ? { agentId: scope.agent_id } : {}),
    ...(scope.app_id ? { appId: scope.app_id } : {}),
    ...(scope.run_id ? { runId: scope.run_id } : {}),
    ...(scope.org_id ? { orgId: scope.org_id } : {}),
    ...(scope.project_id ? { projectId: scope.project_id } : {}),
    OR: [{ expirationDate: null }, { expirationDate: { gt: new Date() } }],
  };
}

export function buildScopedSourceSql(
  apiKeyId: string,
  scope: UnifiedScope,
  alias = 's',
  extraConditions: Prisma.Sql[] = [],
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`${column(alias, 'apiKeyId')} = ${apiKeyId}`,
    Prisma.sql`${column(alias, 'status')} <> 'DELETED'`,
  ];

  if (scope.user_id) {
    conditions.push(Prisma.sql`${column(alias, 'userId')} = ${scope.user_id}`);
  }
  if (scope.agent_id) {
    conditions.push(
      Prisma.sql`${column(alias, 'agentId')} = ${scope.agent_id}`,
    );
  }
  if (scope.app_id) {
    conditions.push(Prisma.sql`${column(alias, 'appId')} = ${scope.app_id}`);
  }
  if (scope.run_id) {
    conditions.push(Prisma.sql`${column(alias, 'runId')} = ${scope.run_id}`);
  }
  if (scope.org_id) {
    conditions.push(Prisma.sql`${column(alias, 'orgId')} = ${scope.org_id}`);
  }
  if (scope.project_id) {
    conditions.push(
      Prisma.sql`${column(alias, 'projectId')} = ${scope.project_id}`,
    );
  }
  if (hasMetadataScope(scope)) {
    conditions.push(
      Prisma.sql`${metadataColumn(alias)} @> ${JSON.stringify(scope.metadata)}::jsonb`,
    );
  }

  conditions.push(...extraConditions);
  return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
}

export function buildScopedActiveMemorySql(
  apiKeyId: string,
  scope: UnifiedScope,
  alias = 'm',
  extraConditions: Prisma.Sql[] = [],
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`${column(alias, 'apiKeyId')} = ${apiKeyId}`,
    Prisma.sql`(${column(alias, 'expirationDate')} IS NULL OR ${column(alias, 'expirationDate')} > NOW())`,
  ];

  if (scope.user_id) {
    conditions.push(Prisma.sql`${column(alias, 'userId')} = ${scope.user_id}`);
  }
  if (scope.agent_id) {
    conditions.push(
      Prisma.sql`${column(alias, 'agentId')} = ${scope.agent_id}`,
    );
  }
  if (scope.app_id) {
    conditions.push(Prisma.sql`${column(alias, 'appId')} = ${scope.app_id}`);
  }
  if (scope.run_id) {
    conditions.push(Prisma.sql`${column(alias, 'runId')} = ${scope.run_id}`);
  }
  if (scope.org_id) {
    conditions.push(Prisma.sql`${column(alias, 'orgId')} = ${scope.org_id}`);
  }
  if (scope.project_id) {
    conditions.push(
      Prisma.sql`${column(alias, 'projectId')} = ${scope.project_id}`,
    );
  }
  if (hasMetadataScope(scope)) {
    conditions.push(
      Prisma.sql`${metadataColumn(alias)} @> ${JSON.stringify(scope.metadata)}::jsonb`,
    );
  }

  conditions.push(...extraConditions);
  return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
}

export async function loadMetadataScopedEvidenceIds(
  prisma: QueryablePrisma,
  apiKeyId: string,
  scope: UnifiedScope,
): Promise<{ sourceIds: string[]; memoryIds: string[] }> {
  const [sourceRows, memoryRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT s.id::text AS id
      FROM "KnowledgeSource" s
      WHERE ${buildScopedSourceSql(apiKeyId, scope, 's')}
    `),
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT m.id::text AS id
      FROM "MemoryFact" m
      WHERE ${buildScopedActiveMemorySql(apiKeyId, scope, 'm')}
    `),
  ]);

  return {
    sourceIds: sourceRows.map((row) => row.id),
    memoryIds: memoryRows.map((row) => row.id),
  };
}

export function toNumberCount(value: bigint | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return typeof value === 'bigint' ? Number(value) : value;
}

export function toIsoStringOrNull(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
