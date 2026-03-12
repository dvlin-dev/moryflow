/**
 * [PROVIDES]: Desktop Skills 注册中心（扫描/导入/启停/卸载/详情与在线同步）
 * [DEPENDS]: node:fs/node:path, shared/ipc/skills, skills/{catalog,remote,installer,state,file-utils}
 * [POS]: PC 主进程 Skills 单一事实来源（供 IPC 与 Agent Runtime 复用）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { RecommendedSkill, SkillDetail, SkillSummary } from '../../shared/ipc/skills.js';
import { CURATED_SKILLS, CURATED_SKILL_MAP } from './catalog.js';
import {
  CURATED_SKILLS_DIR,
  MAX_REMOTE_SYNC_CONCURRENCY,
  MAX_SKILL_FILE_LIST,
  MORYFLOW_DIR,
  REMOTE_SYNC_FAILURE_TTL_MS,
  REMOTE_SYNC_SUCCESS_TTL_MS,
  SKILLS_DIR,
  SKILLS_LOG_PREFIX,
  STATE_FILE,
  resolveBundledSkillRoots,
} from './constants.js';
import {
  directoryExists,
  parseSkillFromDirectory,
  readIfExists,
  toKebabCase,
  xmlEscape,
} from './file-utils.js';
import {
  installSkillIfMissing,
  overwriteSkillFromDirectory,
  overwriteSkillFromRemote,
} from './installer.js';
import { fetchLatestRevision } from './remote.js';
import { readSkillState, writeSkillState } from './state.js';
import type { CuratedSkill, ParsedSkill, SkillStateFile } from './types.js';
import type { RemoteSyncHttpError } from './remote.js';

type RemoteSyncFailure = {
  skillName: string;
  sourceUrl: string;
  error: unknown;
};

const isRemoteSyncHttpError = (error: unknown): error is RemoteSyncHttpError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Partial<RemoteSyncHttpError>;
  return candidate.kind === 'http' && typeof candidate.status === 'number';
};

const getRemoteSyncCooldownMs = (
  state: {
    checkedAt: number;
    lastSyncStatus?: 'success' | 'failed';
  } | null | undefined,
  now: number
): number | null => {
  if (!state || state.checkedAt <= 0) {
    return null;
  }

  const elapsed = now - state.checkedAt;
  if (elapsed < 0) {
    return 0;
  }

  const ttl =
    state.lastSyncStatus === 'failed' ? REMOTE_SYNC_FAILURE_TTL_MS : REMOTE_SYNC_SUCCESS_TTL_MS;
  return elapsed < ttl ? ttl - elapsed : null;
};

const formatFailureDiagnostics = (error: unknown): string[] => {
  if (!isRemoteSyncHttpError(error)) {
    const message = error instanceof Error ? error.message : String(error);
    return [`message=${message}`];
  }

  return [
    `status=${error.status}`,
    error.rateLimitLimit !== null ? `rateLimitLimit=${error.rateLimitLimit}` : null,
    error.rateLimitRemaining !== null ? `rateLimitRemaining=${error.rateLimitRemaining}` : null,
    error.rateLimitResetAt !== null
      ? `rateLimitResetAt=${new Date(error.rateLimitResetAt).toISOString()}`
      : null,
    error.retryAfterSeconds !== null ? `retryAfter=${error.retryAfterSeconds}s` : null,
    error.githubRequestId ? `requestId=${error.githubRequestId}` : null,
    error.responseBody ? `response=${JSON.stringify(error.responseBody)}` : null,
  ].filter((item): item is string => Boolean(item));
};

const createFailureGroupKey = (error: unknown): string => {
  if (!isRemoteSyncHttpError(error)) {
    return `generic:${error instanceof Error ? error.message : String(error)}`;
  }

  return [
    'http',
    error.status,
    error.rateLimitLimit ?? '',
    error.rateLimitRemaining ?? '',
    error.rateLimitResetAt ?? '',
    error.retryAfterSeconds ?? '',
    error.githubRequestId ?? '',
    error.responseBody ?? '',
  ].join(':');
};

const logRemoteSyncFailures = (failures: RemoteSyncFailure[]): void => {
  if (failures.length === 0) {
    return;
  }

  const groups = new Map<string, RemoteSyncFailure[]>();
  for (const failure of failures) {
    const key = createFailureGroupKey(failure.error);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(failure);
      continue;
    }
    groups.set(key, [failure]);
  }

  for (const group of groups.values()) {
    const skillNames = group.map((item) => item.skillName).sort((a, b) => a.localeCompare(b));
    const requests = group
      .slice()
      .sort((a, b) => a.skillName.localeCompare(b.skillName))
      .map((item) => `${item.skillName}:${item.sourceUrl}`);
    const diagnostics = formatFailureDiagnostics(group[0]?.error).join(' ');
    console.warn(
      `${SKILLS_LOG_PREFIX} remote sync skipped for ${group.length} skills: ${diagnostics} skills=${skillNames.join(',')} requests=${requests.join(';')}`
    );
  }
};

const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> => {
  if (items.length === 0) {
    return;
  }

  const concurrency = Math.max(1, Math.min(limit, items.length));
  let index = 0;

  const runner = async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => runner()));
};

class DesktopSkillsRegistry {
  private initialized = false;

  private summaries: SkillSummary[] = [];

  private detailMap = new Map<string, SkillDetail>();

  private remoteSyncPromise: Promise<void> | null = null;

  private stateWriteChain: Promise<void> = Promise.resolve();

  private normalizeSummary(skill: ParsedSkill, enabled: boolean): SkillSummary {
    return {
      name: skill.name,
      title: skill.title,
      description: skill.description,
      enabled,
      location: skill.location,
      updatedAt: skill.updatedAt,
    };
  }

  private async ensureStorage(): Promise<void> {
    await fs.mkdir(MORYFLOW_DIR, { recursive: true });
    await fs.mkdir(SKILLS_DIR, { recursive: true });
    await fs.mkdir(CURATED_SKILLS_DIR, { recursive: true });
  }

  private async readState(): Promise<SkillStateFile> {
    return readSkillState(STATE_FILE);
  }

  private async writeState(state: SkillStateFile): Promise<void> {
    await this.ensureStorage();
    await writeSkillState(STATE_FILE, state);
  }

  private async withStateWriteLock<T>(action: () => Promise<T>): Promise<T> {
    const previous = this.stateWriteChain;
    let release: () => void = () => {};
    this.stateWriteChain = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await action();
    } finally {
      release();
    }
  }

  private async mutateState(
    updater: (current: SkillStateFile) => SkillStateFile | Promise<SkillStateFile>
  ): Promise<SkillStateFile> {
    return this.withStateWriteLock(async () => {
      const current = await this.readState();
      const next = await updater(current);
      await this.writeState(next);
      return next;
    });
  }

  private async locateBundledSkill(
    name: string
  ): Promise<{ sourceDir: string; parsed: ParsedSkill } | null> {
    const normalizedName = toKebabCase(name);
    if (!normalizedName) {
      return null;
    }

    for (const rootPath of resolveBundledSkillRoots()) {
      const rootStat = await fs.stat(rootPath).catch(() => null);
      if (!rootStat?.isDirectory()) {
        continue;
      }

      const directDir = path.join(rootPath, normalizedName);
      const directParsed = await parseSkillFromDirectory(directDir);
      if (directParsed?.name === normalizedName) {
        return { sourceDir: directDir, parsed: directParsed };
      }

      const entries = await fs.readdir(rootPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.isSymbolicLink()) {
          continue;
        }

        const candidateDir = path.join(rootPath, entry.name);
        const parsed = await parseSkillFromDirectory(candidateDir);
        if (!parsed || parsed.name !== normalizedName) {
          continue;
        }

        return { sourceDir: candidateDir, parsed };
      }
    }

    return null;
  }

  private async ensureCuratedSkillBaseline(skill: CuratedSkill): Promise<void> {
    const curatedDir = path.join(CURATED_SKILLS_DIR, skill.name);
    const curatedParsed = await parseSkillFromDirectory(curatedDir);
    if (curatedParsed?.name === skill.name) {
      return;
    }

    const bundled = await this.locateBundledSkill(skill.name);
    if (!bundled) {
      throw new Error(`Bundled skill "${skill.name}" is not available.`);
    }

    if (await directoryExists(curatedDir)) {
      await overwriteSkillFromDirectory(bundled.sourceDir, curatedDir);
    } else {
      await installSkillIfMissing(bundled.sourceDir, curatedDir);
    }

    const parsed = await parseSkillFromDirectory(curatedDir);
    if (!parsed || parsed.name !== skill.name) {
      throw new Error(`Failed to initialize curated skill "${skill.name}".`);
    }
  }

  private async ensureCuratedBaselines(): Promise<void> {
    for (const skill of CURATED_SKILLS) {
      await this.ensureCuratedSkillBaseline(skill);
    }
  }

  private async ensurePreinstalledSkills(state: SkillStateFile): Promise<void> {
    const skippedPreinstall = new Set(state.skippedPreinstall);

    for (const skill of CURATED_SKILLS) {
      if (!skill.preinstall || skippedPreinstall.has(skill.name)) {
        continue;
      }

      const sourceDir = path.join(CURATED_SKILLS_DIR, skill.name);
      const targetDir = path.join(SKILLS_DIR, skill.name);
      await installSkillIfMissing(sourceDir, targetDir);
    }
  }

  private async scanInstalledSkills(): Promise<ParsedSkill[]> {
    await this.ensureStorage();
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const parsedSkills: ParsedSkill[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        continue;
      }

      const skillDir = path.join(SKILLS_DIR, entry.name);
      const parsed = await parseSkillFromDirectory(skillDir);
      if (!parsed) {
        continue;
      }

      parsedSkills.push(parsed);
    }

    parsedSkills.sort((a, b) => a.title.localeCompare(b.title));
    return parsedSkills;
  }

  private hydrateCache(skills: ParsedSkill[], state: SkillStateFile): SkillSummary[] {
    const disabledSet = new Set(state.disabled);
    this.detailMap.clear();

    const summaries = skills.map((skill) => {
      const enabled = !disabledSet.has(skill.name);
      this.detailMap.set(skill.name, {
        ...this.normalizeSummary(skill, enabled),
        content: skill.content,
        files: skill.files,
      });
      return this.normalizeSummary(skill, enabled);
    });

    this.summaries = summaries;
    return summaries;
  }

  private async refreshCacheFromDisk(): Promise<void> {
    const parsedSkills = await this.scanInstalledSkills();
    const installedNames = new Set(parsedSkills.map((item) => item.name));
    let state = await this.readState();
    const nextDisabled = state.disabled.filter((name) => installedNames.has(name));

    const disabledChanged =
      nextDisabled.length !== state.disabled.length ||
      nextDisabled.some((item, index) => item !== state.disabled[index]);

    if (disabledChanged) {
      state = await this.mutateState((current) => ({
        ...current,
        disabled: current.disabled.filter((name) => installedNames.has(name)),
      }));
    } else {
      state = {
        ...state,
        disabled: nextDisabled,
      };
    }

    this.hydrateCache(parsedSkills, state);
  }

  private startRemoteSync(): void {
    if (this.remoteSyncPromise) {
      return;
    }

    this.remoteSyncPromise = this.syncManagedSkills()
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`${SKILLS_LOG_PREFIX} remote sync failed: ${message}`);
      })
      .finally(() => {
        this.remoteSyncPromise = null;
      });
  }

  private async syncManagedSkills(): Promise<void> {
    await this.ensureStorage();
    const state = await this.readState();
    const nextManagedSkills = { ...state.managedSkills };
    const syncFailures: RemoteSyncFailure[] = [];

    let installedChanged = false;

    await runWithConcurrency(CURATED_SKILLS, MAX_REMOTE_SYNC_CONCURRENCY, async (skill) => {
      const checkedAt = Date.now();
      const existingManaged = nextManagedSkills[skill.name];
      const remainingCooldownMs = getRemoteSyncCooldownMs(existingManaged, checkedAt);

      if (remainingCooldownMs !== null) {
        return;
      }

      try {
        const revision = await fetchLatestRevision(skill);
        const hasRevisionChanged = existingManaged?.revision !== revision;

        if (hasRevisionChanged) {
          const curatedTarget = path.join(CURATED_SKILLS_DIR, skill.name);
          await overwriteSkillFromRemote(skill, revision, curatedTarget);

          const installedTarget = path.join(SKILLS_DIR, skill.name);
          const didOverwriteInstalled = await overwriteSkillFromDirectory(
            curatedTarget,
            installedTarget,
            {
              requireExistingTarget: true,
            }
          );
          if (didOverwriteInstalled) {
            installedChanged = true;
          }

          nextManagedSkills[skill.name] = {
            sourceUrl: skill.source.sourceUrl,
            revision,
            checkedAt,
            updatedAt: checkedAt,
            lastSyncStatus: 'success',
            lastErrorStatus: null,
          };
          return;
        }

        nextManagedSkills[skill.name] = {
          sourceUrl: skill.source.sourceUrl,
          revision,
          checkedAt,
          updatedAt: existingManaged?.updatedAt ?? checkedAt,
          lastSyncStatus: 'success',
          lastErrorStatus: null,
        };
      } catch (error) {
        syncFailures.push({
          skillName: skill.name,
          sourceUrl: skill.source.sourceUrl,
          error,
        });

        nextManagedSkills[skill.name] = {
          sourceUrl: skill.source.sourceUrl,
          revision: existingManaged?.revision ?? null,
          checkedAt,
          updatedAt: existingManaged?.updatedAt ?? 0,
          lastSyncStatus: 'failed',
          lastErrorStatus: isRemoteSyncHttpError(error) ? error.status : null,
        };
      }
    });

    await this.mutateState((current) => ({
      ...current,
      managedSkills: nextManagedSkills,
    }));

    logRemoteSyncFailures(syncFailures);

    if (installedChanged && this.initialized) {
      await this.refreshCacheFromDisk();
    }
  }

  async refresh(): Promise<SkillSummary[]> {
    await this.ensureStorage();
    await this.ensureCuratedBaselines();
    const state = await this.readState();
    await this.ensurePreinstalledSkills(state);
    await this.refreshCacheFromDisk();

    this.initialized = true;
    this.startRemoteSync();
    return this.summaries;
  }

  async ensureReady(): Promise<void> {
    if (!this.initialized) {
      await this.refresh();
    }
  }

  async list(): Promise<SkillSummary[]> {
    await this.ensureReady();
    return this.summaries.map((item) => ({ ...item }));
  }

  async listEnabled(): Promise<SkillSummary[]> {
    const list = await this.list();
    return list.filter((item) => item.enabled);
  }

  async listRecommended(): Promise<RecommendedSkill[]> {
    await this.ensureReady();

    const installedNames = new Set(this.summaries.map((item) => item.name));
    const available = CURATED_SKILLS.filter(
      (item) => item.recommended && !installedNames.has(item.name)
    );

    const resolved = await Promise.all(
      available.map(async (item) => {
        const curatedPath = path.join(CURATED_SKILLS_DIR, item.name);
        const parsed = await parseSkillFromDirectory(curatedPath);

        return {
          name: item.name,
          title: parsed?.title ?? item.fallbackTitle,
          description: parsed?.description ?? item.fallbackDescription,
        } satisfies RecommendedSkill;
      })
    );

    return resolved;
  }

  async getDetail(name: string): Promise<SkillDetail> {
    await this.ensureReady();
    const normalized = toKebabCase(name);
    const detail = this.detailMap.get(normalized);
    if (!detail) {
      throw new Error('Skill not found.');
    }
    return { ...detail, files: [...detail.files] };
  }

  async setEnabled(name: string, enabled: boolean): Promise<SkillSummary> {
    await this.ensureReady();

    const normalized = toKebabCase(name);
    const detail = this.detailMap.get(normalized);
    if (!detail) {
      throw new Error('Skill not found.');
    }

    await this.mutateState((current) => {
      const disabled = new Set(current.disabled);
      if (enabled) {
        disabled.delete(normalized);
      } else {
        disabled.add(normalized);
      }

      return {
        ...current,
        disabled: Array.from(disabled).sort(),
      };
    });

    await this.refresh();

    const updated = this.summaries.find((item) => item.name === normalized);
    if (!updated) {
      throw new Error('Skill not found after update.');
    }

    return { ...updated };
  }

  async uninstall(name: string): Promise<void> {
    await this.ensureReady();

    const normalized = toKebabCase(name);
    const targetDir = path.join(SKILLS_DIR, normalized);
    const exists = await fs.stat(targetDir).then(
      () => true,
      () => false
    );

    if (!exists) {
      throw new Error('Skill not found.');
    }

    await fs.rm(targetDir, { recursive: true, force: true });

    const curated = CURATED_SKILL_MAP.get(normalized);
    await this.mutateState((current) => {
      const skippedPreinstall = new Set(current.skippedPreinstall);
      if (curated?.preinstall) {
        skippedPreinstall.add(normalized);
      }

      return {
        ...current,
        disabled: current.disabled.filter((item) => item !== normalized),
        skippedPreinstall: Array.from(skippedPreinstall).sort(),
      };
    });

    await this.refresh();
  }

  async install(name: string): Promise<SkillSummary> {
    await this.ensureReady();

    const normalized = toKebabCase(name);
    if (!normalized) {
      throw new Error('Skill name is required.');
    }

    const curated = CURATED_SKILL_MAP.get(normalized);
    if (!curated) {
      throw new Error('Skill is not in curated recommendations.');
    }

    await this.ensureCuratedSkillBaseline(curated);

    const sourceDir = path.join(CURATED_SKILLS_DIR, normalized);
    const targetDir = path.join(SKILLS_DIR, normalized);
    await installSkillIfMissing(sourceDir, targetDir);

    await this.mutateState((current) => ({
      ...current,
      skippedPreinstall: current.skippedPreinstall.filter((item) => item !== normalized),
    }));

    await this.refresh();

    const installed = this.summaries.find((item) => item.name === normalized);
    if (!installed) {
      throw new Error('Skill installed but failed to refresh cache.');
    }

    return { ...installed };
  }

  getAvailableSkillsPrompt(): string {
    const enabled = this.summaries.filter((item) => item.enabled);
    if (enabled.length === 0) {
      return '';
    }

    const rows = enabled.map(
      (skill) =>
        `<skill><name>${xmlEscape(skill.name)}</name><title>${xmlEscape(skill.title)}</title><description>${xmlEscape(
          skill.description
        )}</description></skill>`
    );

    return `<available_skills>${rows.join('')}</available_skills>`;
  }

  async resolveSelectedSkillInjection(name: string): Promise<string | null> {
    await this.ensureReady();

    const detail = this.detailMap.get(toKebabCase(name));
    if (!detail || !detail.enabled) {
      return null;
    }

    const files = detail.files
      .slice(0, MAX_SKILL_FILE_LIST)
      .map((file) => `<file>${xmlEscape(file)}</file>`);

    return [
      `<selected_skill name="${xmlEscape(detail.name)}">`,
      `<skill_content name="${xmlEscape(detail.name)}">`,
      detail.content,
      '</skill_content>',
      '<skill_meta>',
      `<name>${xmlEscape(detail.name)}</name>`,
      `<base_dir>${xmlEscape(detail.location)}</base_dir>`,
      '</skill_meta>',
      `<skill_files>${files.join('')}</skill_files>`,
      '</selected_skill>',
    ].join('\n');
  }

  async loadSkillForTool(name: string): Promise<SkillDetail | null> {
    await this.ensureReady();

    const detail = this.detailMap.get(toKebabCase(name));
    if (!detail || !detail.enabled) {
      return null;
    }

    return { ...detail, files: [...detail.files] };
  }

  async clearLocalStorage(): Promise<void> {
    await fs.rm(SKILLS_DIR, { recursive: true, force: true });
    await fs.rm(CURATED_SKILLS_DIR, { recursive: true, force: true });
    await fs.rm(STATE_FILE, { force: true });
    this.initialized = false;
    this.summaries = [];
    this.detailMap.clear();
  }

  async waitForIdleForTests(): Promise<void> {
    const pendingRemoteSync = this.remoteSyncPromise;
    if (pendingRemoteSync) {
      await pendingRemoteSync;
    }
    await this.stateWriteChain;
  }

  async debugReadRawState(): Promise<string | null> {
    return readIfExists(STATE_FILE);
  }
}

let singleton: DesktopSkillsRegistry | null = null;

export const getSkillsRegistry = (): DesktopSkillsRegistry => {
  if (!singleton) {
    singleton = new DesktopSkillsRegistry();
  }
  return singleton;
};

export const resetSkillsRegistryForTests = async (): Promise<void> => {
  const current = singleton;
  singleton = null;
  if (current) {
    await current.waitForIdleForTests();
  }
};

export { SKILLS_DIR };
