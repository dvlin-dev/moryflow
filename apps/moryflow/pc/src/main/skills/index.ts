/**
 * [PROVIDES]: Desktop Skills 注册中心（扫描/导入/启停/卸载/详情与 runtime 注入）
 * [DEPENDS]: node:fs/node:path/node:os, shared/ipc/skills
 * [POS]: PC 主进程 Skills 单一事实来源（供 IPC 与 Agent Runtime 复用）
 * [UPDATE]: 2026-02-11 - 预设技能路径支持 dev/build/package 多候选并在预安装失败时降级，避免阻断聊天链路
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RecommendedSkill, SkillDetail, SkillSummary } from '../../shared/ipc/skills.js';

const MORYFLOW_DIR = path.join(os.homedir(), '.moryflow');
const SKILLS_DIR = path.join(MORYFLOW_DIR, 'skills');
const STATE_FILE = path.join(MORYFLOW_DIR, 'skills-state.json');
const SKILLS_MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPAT_SKILL_ROOTS = [
  path.join(os.homedir(), '.agents', 'skills'),
  path.join(os.homedir(), '.claude', 'skills'),
  path.join(os.homedir(), '.codex', 'skills'),
  path.join(os.homedir(), '.clawdbot', 'skills'),
] as const;

const MAX_SKILL_FILE_LIST = 200;
const SKILLS_LOG_PREFIX = '[skills-registry]';

type SkillStateFile = {
  disabled: string[];
  curatedPreinstalled: boolean;
};

type ParsedSkill = {
  name: string;
  title: string;
  description: string;
  content: string;
  location: string;
  updatedAt: number;
  files: string[];
};

type CuratedSkill = {
  name: string;
  fallbackTitle: string;
  fallbackDescription: string;
  preinstall: boolean;
};

const CURATED_SKILLS: CuratedSkill[] = [
  {
    name: 'skill-creator',
    fallbackTitle: 'Skill Creator',
    fallbackDescription:
      'Guide for creating effective skills with structured workflows and reusable resources.',
    preinstall: true,
  },
  {
    name: 'find-skills',
    fallbackTitle: 'Find Skills',
    fallbackDescription:
      'Discover and install agent skills from the open skills ecosystem based on user intent.',
    preinstall: true,
  },
  {
    name: 'baoyu-article-illustrator',
    fallbackTitle: 'Article Illustrator',
    fallbackDescription:
      'Analyze article structure and generate consistent illustrations with Type × Style controls.',
    preinstall: false,
  },
];

const CURATED_SKILL_MAP = new Map(CURATED_SKILLS.map((item) => [item.name, item]));

const defaultSkillState = (): SkillStateFile => ({ disabled: [], curatedPreinstalled: false });

const toKebabCase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

const xmlEscape = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const resolveCuratedSkillRoots = (): string[] => {
  const roots = new Set<string>();
  const add = (candidate: string | null | undefined) => {
    if (!candidate || candidate.trim().length === 0) {
      return;
    }
    roots.add(path.resolve(candidate));
  };

  // 开发态：直接读取仓库内置 skill。
  add(path.join(process.cwd(), 'apps/moryflow/pc/src/main/skills/builtin'));
  // 构建态：electron-vite 将内置 skill 复制到 dist/main/builtin。
  add(path.join(SKILLS_MODULE_DIR, 'builtin'));
  // 兼容少数输出结构（保留历史构建路径容错）。
  add(path.join(SKILLS_MODULE_DIR, 'skills', 'builtin'));

  const processWithResourcesPath = process as NodeJS.Process & { resourcesPath?: string };
  const resourcesPath =
    typeof processWithResourcesPath.resourcesPath === 'string' &&
    processWithResourcesPath.resourcesPath.trim().length > 0
      ? processWithResourcesPath.resourcesPath
      : null;
  if (resourcesPath) {
    // 打包态主路径（app.asar 内资源可直接读取）。
    add(path.join(resourcesPath, 'app.asar', 'dist', 'main', 'builtin'));
    // 打包态非 asar 资源兜底。
    add(path.join(resourcesPath, 'app.asar.unpacked', 'dist', 'main', 'builtin'));
    // 预留 extraResources 方案兜底。
    add(path.join(resourcesPath, 'skills', 'builtin'));
  }

  return Array.from(roots);
};

const isInsidePath = (baseDir: string, targetPath: string): boolean => {
  const rel = path.relative(baseDir, targetPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

const readIfExists = async (targetPath: string): Promise<string | null> => {
  try {
    return await fs.readFile(targetPath, 'utf-8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const directoryExists = async (targetPath: string): Promise<boolean> => {
  const stat = await fs.stat(targetPath).catch(() => null);
  return Boolean(stat?.isDirectory());
};

const parseFrontmatter = (raw: string): { attrs: Record<string, string>; body: string } => {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { attrs: {}, body: raw };
  }

  const attrs: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) continue;
    attrs[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return { attrs, body: raw.slice(match[0].length) };
};

const resolveTitleFromBody = (body: string): string | null => {
  const heading = body.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || null;
};

const resolveDescriptionFromBody = (body: string): string | null => {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length === 0) {
    return null;
  }
  return lines[0];
};

const collectFiles = async (baseDir: string): Promise<string[]> => {
  const files: string[] = [];

  const walk = async (dir: string) => {
    if (files.length >= MAX_SKILL_FILE_LIST) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_SKILL_FILE_LIST) {
        break;
      }
      if (entry.isSymbolicLink()) {
        continue;
      }
      const abs = path.join(dir, entry.name);
      if (!isInsidePath(baseDir, abs)) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (entry.isFile()) {
        files.push(abs);
      }
    }
  };

  await walk(baseDir);
  return files;
};

const parseSkillFromDirectory = async (skillDir: string): Promise<ParsedSkill | null> => {
  const stat = await fs.lstat(skillDir).catch(() => null);
  if (!stat || !stat.isDirectory()) return null;
  if (stat.isSymbolicLink()) return null;

  const realBase = await fs.realpath(skillDir).catch(() => null);
  if (!realBase) return null;

  const skillFile = path.join(realBase, 'SKILL.md');
  const raw = await readIfExists(skillFile);
  if (!raw) return null;

  const { attrs, body } = parseFrontmatter(raw);
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;

  const inferredName = attrs['name'] || toKebabCase(path.basename(realBase));
  const name = toKebabCase(inferredName);
  if (!name) return null;

  const title = attrs['title'] || resolveTitleFromBody(trimmedBody) || name;
  const description =
    attrs['description'] || resolveDescriptionFromBody(trimmedBody) || 'No description provided.';
  const files = await collectFiles(realBase);
  const mtime = (await fs.stat(skillFile)).mtimeMs;

  return {
    name,
    title,
    description,
    content: trimmedBody,
    location: realBase,
    updatedAt: Math.floor(mtime),
    files,
  };
};

const copyDirectorySafely = async (sourceDir: string, targetDir: string): Promise<void> => {
  const resolvedTarget = path.resolve(targetDir);
  if (!isInsidePath(SKILLS_DIR, resolvedTarget)) {
    throw new Error('Invalid target path for skill import.');
  }

  await fs.mkdir(resolvedTarget, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }
    const sourceEntry = path.join(sourceDir, entry.name);
    const targetEntry = path.join(resolvedTarget, entry.name);
    if (!isInsidePath(resolvedTarget, targetEntry)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectorySafely(sourceEntry, targetEntry);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourceEntry, targetEntry);
    }
  }
};

class DesktopSkillsRegistry {
  private initialized = false;

  private summaries: SkillSummary[] = [];

  private detailMap = new Map<string, SkillDetail>();

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
  }

  private async readState(): Promise<SkillStateFile> {
    const raw = await readIfExists(STATE_FILE);
    if (!raw) return defaultSkillState();
    try {
      const data = JSON.parse(raw) as Partial<SkillStateFile>;
      const disabled = Array.isArray(data.disabled)
        ? data.disabled.filter(
            (item): item is string => typeof item === 'string' && item.length > 0
          )
        : [];
      return {
        disabled,
        curatedPreinstalled: data.curatedPreinstalled === true,
      };
    } catch {
      return defaultSkillState();
    }
  }

  private async writeState(state: SkillStateFile): Promise<void> {
    await this.ensureStorage();
    await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
  }

  private async importFromRoot(rootPath: string): Promise<void> {
    const rootStat = await fs.stat(rootPath).catch(() => null);
    if (!rootStat || !rootStat.isDirectory()) {
      return;
    }

    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        continue;
      }

      const candidateDir = path.join(rootPath, entry.name);
      const parsed = await parseSkillFromDirectory(candidateDir);
      if (!parsed) {
        continue;
      }
      await this.installParsedSkill(candidateDir, parsed);
    }
  }

  private async installParsedSkill(sourceDir: string, parsed: ParsedSkill): Promise<void> {
    const targetDir = path.join(SKILLS_DIR, parsed.name);
    if (await directoryExists(targetDir)) {
      return;
    }
    await copyDirectorySafely(sourceDir, targetDir);
  }

  private async locateCuratedSkill(
    name: string
  ): Promise<{ sourceDir: string; parsed: ParsedSkill } | null> {
    const normalizedName = toKebabCase(name);
    if (!normalizedName) {
      return null;
    }

    for (const rootPath of resolveCuratedSkillRoots()) {
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

  private async ensureCuratedSkillInstalled(name: string): Promise<void> {
    const normalizedName = toKebabCase(name);
    if (!normalizedName) {
      throw new Error('Skill name is required.');
    }

    const targetDir = path.join(SKILLS_DIR, normalizedName);
    if (await directoryExists(targetDir)) {
      return;
    }

    const located = await this.locateCuratedSkill(normalizedName);
    if (!located) {
      throw new Error(`Skill preset "${normalizedName}" is not available.`);
    }

    await this.installParsedSkill(located.sourceDir, located.parsed);
  }

  private async ensurePreinstalledSkills(): Promise<void> {
    const preinstallList = CURATED_SKILLS.filter((item) => item.preinstall);
    for (const item of preinstallList) {
      try {
        await this.ensureCuratedSkillInstalled(item.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`${SKILLS_LOG_PREFIX} preinstall skipped for "${item.name}": ${message}`);
      }
    }
  }

  private async importCompatibilitySkills(): Promise<void> {
    for (const root of COMPAT_SKILL_ROOTS) {
      await this.importFromRoot(root);
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

  async refresh(): Promise<SkillSummary[]> {
    await this.ensureStorage();
    const state = await this.readState();
    let nextState = state;
    if (!state.curatedPreinstalled) {
      await this.ensurePreinstalledSkills();
      nextState = { ...state, curatedPreinstalled: true };
    }
    await this.importCompatibilitySkills();
    const parsedSkills = await this.scanInstalledSkills();
    const installedNames = new Set(parsedSkills.map((skill) => skill.name));
    const nextDisabled = nextState.disabled.filter((name) => installedNames.has(name));
    const stateChanged =
      nextDisabled.length !== nextState.disabled.length ||
      nextState.curatedPreinstalled !== state.curatedPreinstalled;
    if (stateChanged) {
      nextState = {
        disabled: nextDisabled,
        curatedPreinstalled: nextState.curatedPreinstalled,
      };
      await this.writeState(nextState);
    }
    const summaries = this.hydrateCache(parsedSkills, {
      disabled: nextDisabled,
      curatedPreinstalled: nextState.curatedPreinstalled,
    });
    this.initialized = true;
    return summaries;
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
    const installed = await this.list();
    const installedNames = new Set(installed.map((item) => item.name));
    const available = CURATED_SKILLS.filter((item) => !installedNames.has(item.name));
    const resolved = await Promise.all(
      available.map(async (item) => {
        const located = await this.locateCuratedSkill(item.name);
        if (!located) {
          return null;
        }
        return {
          name: item.name,
          title: located.parsed.title ?? item.fallbackTitle,
          description: located.parsed.description ?? item.fallbackDescription,
        } satisfies RecommendedSkill;
      })
    );
    return resolved.filter((item): item is RecommendedSkill => item !== null);
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

    const state = await this.readState();
    const disabled = new Set(state.disabled);
    if (enabled) {
      disabled.delete(normalized);
    } else {
      disabled.add(normalized);
    }
    await this.writeState({
      disabled: Array.from(disabled).sort(),
      curatedPreinstalled: state.curatedPreinstalled,
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
    const state = await this.readState();
    if (state.disabled.includes(normalized)) {
      await this.writeState({
        disabled: state.disabled.filter((item) => item !== normalized),
        curatedPreinstalled: state.curatedPreinstalled,
      });
    }
    await this.refresh();
  }

  async install(name: string): Promise<SkillSummary> {
    await this.ensureReady();
    const normalized = toKebabCase(name);
    if (!normalized) {
      throw new Error('Skill name is required.');
    }
    if (!CURATED_SKILL_MAP.has(normalized)) {
      throw new Error('Skill is not in curated recommendations.');
    }
    await this.ensureCuratedSkillInstalled(normalized);
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
}

let singleton: DesktopSkillsRegistry | null = null;

export const getSkillsRegistry = (): DesktopSkillsRegistry => {
  if (!singleton) {
    singleton = new DesktopSkillsRegistry();
  }
  return singleton;
};

export { SKILLS_DIR };
