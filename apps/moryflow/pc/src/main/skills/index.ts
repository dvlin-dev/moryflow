/**
 * [PROVIDES]: Desktop Skills 注册中心（扫描/导入/启停/卸载/详情与 runtime 注入）
 * [DEPENDS]: node:fs/node:path/node:os, shared/ipc/skills
 * [POS]: PC 主进程 Skills 单一事实来源（供 IPC 与 Agent Runtime 复用）
 * [UPDATE]: 2026-02-11 - 内置 skill 导入支持 dev/package 双路径候选；create 时 title/description 规范为单行，避免 frontmatter 污染
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
const BUILTIN_SKILL_ROOTS = [
  path.resolve(process.cwd(), 'apps/moryflow/pc/src/main/skills/builtin'),
  path.resolve(SKILLS_MODULE_DIR, 'builtin'),
] as const;
const COMPAT_SKILL_ROOTS = [
  path.join(os.homedir(), '.agents', 'skills'),
  path.join(os.homedir(), '.claude', 'skills'),
  path.join(os.homedir(), '.codex', 'skills'),
  path.join(os.homedir(), '.clawdbot', 'skills'),
] as const;

const MAX_SKILL_FILE_LIST = 200;

type SkillStateFile = {
  disabled: string[];
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

const RECOMMENDED_SKILLS: RecommendedSkill[] = [
  {
    name: 'doc',
    title: 'Doc',
    description: 'Edit and review docx files.',
  },
  {
    name: 'figma',
    title: 'Figma',
    description: 'Use Figma MCP for design-to-code workflows.',
  },
  {
    name: 'gh-fix-ci',
    title: 'GH Fix CI',
    description: 'Debug failing GitHub Actions CI quickly.',
  },
  {
    name: 'cloudflare-deploy',
    title: 'Cloudflare Deploy',
    description: 'Deploy Workers/Pages and related platform services.',
  },
];

const defaultSkillState = (): SkillStateFile => ({ disabled: [] });

const toKebabCase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

const toSingleLine = (value: string): string =>
  value
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const xmlEscape = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

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
  const realBase = await fs.realpath(skillDir).catch(() => null);
  if (!realBase) return null;
  const stat = await fs.lstat(realBase).catch(() => null);
  if (!stat || !stat.isDirectory()) return null;
  if (stat.isSymbolicLink()) return null;

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
      return { disabled };
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
      const targetDir = path.join(SKILLS_DIR, parsed.name);
      const exists = await fs.stat(targetDir).then(
        () => true,
        () => false
      );
      if (exists) {
        continue;
      }
      await copyDirectorySafely(candidateDir, targetDir);
    }
  }

  private async importCompatibilitySkills(): Promise<void> {
    const roots = Array.from(new Set([...BUILTIN_SKILL_ROOTS, ...COMPAT_SKILL_ROOTS]));
    for (const root of roots) {
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
    await this.importCompatibilitySkills();
    const parsedSkills = await this.scanInstalledSkills();
    const state = await this.readState();
    const installedNames = new Set(parsedSkills.map((skill) => skill.name));
    const nextDisabled = state.disabled.filter((name) => installedNames.has(name));
    if (nextDisabled.length !== state.disabled.length) {
      await this.writeState({ disabled: nextDisabled });
    }
    const summaries = this.hydrateCache(parsedSkills, { disabled: nextDisabled });
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
    return RECOMMENDED_SKILLS.filter((item) => !installedNames.has(item.name));
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
    await this.writeState({ disabled: Array.from(disabled).sort() });
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
      await this.writeState({ disabled: state.disabled.filter((item) => item !== normalized) });
    }
    await this.refresh();
  }

  async create(input?: {
    name?: string;
    title?: string;
    description?: string;
  }): Promise<SkillSummary> {
    await this.ensureReady();
    const rawName = input?.name?.trim();
    const baseName = toKebabCase(rawName || `skill-${Date.now()}`);
    if (!baseName) {
      throw new Error('Invalid skill name.');
    }

    let finalName = baseName;
    let seq = 2;
    while (true) {
      const exists = await fs
        .stat(path.join(SKILLS_DIR, finalName))
        .then(() => true)
        .catch(() => false);
      if (!exists) break;
      finalName = `${baseName}-${seq++}`;
    }

    const title = toSingleLine(input?.title?.trim() || finalName) || finalName;
    const description =
      toSingleLine(input?.description?.trim() || 'Describe when to use this skill.') ||
      'Describe when to use this skill.';
    const targetDir = path.join(SKILLS_DIR, finalName);
    await fs.mkdir(targetDir, { recursive: true });
    const skillContent = [
      '---',
      `name: ${finalName}`,
      `title: ${title}`,
      `description: ${description}`,
      '---',
      '',
      `# ${title}`,
      '',
      description,
      '',
      '## Instructions',
      '',
      '- Add concrete steps and guardrails for the agent.',
      '- Keep examples short and executable.',
      '',
    ].join('\n');
    await fs.writeFile(path.join(targetDir, 'SKILL.md'), skillContent, 'utf-8');

    await this.refresh();
    const created = this.summaries.find((item) => item.name === finalName);
    if (!created) {
      throw new Error('Failed to create skill.');
    }
    return { ...created };
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
