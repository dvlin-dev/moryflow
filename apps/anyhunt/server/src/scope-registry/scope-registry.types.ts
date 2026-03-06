/**
 * [DEFINES]: ScopeRegistry 内部输入类型
 * [USED_BY]: scope-registry.service.ts
 * [POS]: ScopeRegistry 内部类型事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type ScopeRegistryBaseInput = {
  metadata?: Record<string, unknown>;
  org_id?: string;
  project_id?: string;
};

export type CreateUserInput = ScopeRegistryBaseInput & {
  user_id: string;
};

export type CreateAgentInput = ScopeRegistryBaseInput & {
  agent_id: string;
  name?: string;
};

export type CreateAppInput = ScopeRegistryBaseInput & {
  app_id: string;
  name?: string;
};

export type CreateRunInput = ScopeRegistryBaseInput & {
  run_id: string;
  name?: string;
};

export type ListEntitiesQuery = {
  org_id?: string;
  project_id?: string;
};
