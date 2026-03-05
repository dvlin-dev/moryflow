/**
 * [PROVIDES]: Tool 命令摘要解析（脚本类型 + 命令行摘要）
 * [DEPENDS]: Tool part type/input/output 基础协议
 * [POS]: Chat Tool Bash Card 二行 Header 的共享事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

type UnknownRecord = Record<string, unknown>;

export type ToolCommandSummaryInput = {
  type: string;
  input?: UnknownRecord | null;
  output?: unknown;
};

export type ToolCommandSummary = {
  scriptType: string;
  command: string;
};

const SCRIPT_TYPE_LABELS: Record<string, string> = {
  bash: 'Bash',
  web_fetch: 'Web Fetch',
  web_search: 'Web Search',
  read: 'Read File',
  write: 'Write File',
  edit: 'Edit File',
  move: 'Move File',
  delete: 'Delete File',
  ls: 'List Files',
  glob: 'Glob Search',
  grep: 'Grep Search',
  search_in_file: 'Search In File',
  tasks_update: 'Update Plan',
  update_plan: 'Update Plan',
  todo: 'Update Plan',
};

const PATH_KEYS = ['path', 'targetPath', 'file', 'filePath', 'target_file'];

const QUERY_KEYS = ['query', 'q', 'keyword', 'keywords'];

const URL_KEYS = ['url', 'href', 'targetUrl', 'target_url'];

const COMMAND_KEYS = ['command', 'cmd'];

export function resolveToolCommandSummary({
  type,
  input,
  output,
}: ToolCommandSummaryInput): ToolCommandSummary {
  const toolName = normalizeToolName(type);
  const scriptType = SCRIPT_TYPE_LABELS[toolName] ?? toTitleWords(toolName);
  const command = resolveCommand(toolName, input, output);
  return { scriptType, command };
}

function resolveCommand(toolName: string, input?: UnknownRecord | null, output?: unknown): string {
  const outputCommand = readCommandFromOutput(output);
  if (outputCommand) {
    return `$ ${outputCommand}`;
  }

  if (toolName === 'bash') {
    const bashCommand = readString(input, COMMAND_KEYS);
    if (bashCommand) {
      return `$ ${bashCommand}`;
    }
    const summary = readSummary(input);
    if (summary) {
      return `$ ${summary}`;
    }
    return '$ bash';
  }

  if (toolName === 'web_search') {
    const query = readString(input, QUERY_KEYS);
    return query ? `$ search "${query}"` : '$ search';
  }

  if (toolName === 'web_fetch') {
    const targetUrl = readString(input, URL_KEYS);
    return targetUrl ? `$ fetch ${targetUrl}` : '$ fetch';
  }

  if (toolName === 'read') {
    return buildPathCommand('read', input);
  }

  if (toolName === 'write') {
    return buildPathCommand('write', input);
  }

  if (toolName === 'edit') {
    return buildPathCommand('edit', input);
  }

  if (toolName === 'move') {
    const sourcePath = readString(input, ['sourcePath', 'from', 'src', 'path']);
    const targetPath = readString(input, ['targetPath', 'to', 'dest', 'destination']);
    if (sourcePath && targetPath) {
      return `$ move ${sourcePath} ${targetPath}`;
    }
    return buildPathCommand('move', input);
  }

  if (toolName === 'delete') {
    return buildPathCommand('delete', input);
  }

  if (toolName === 'ls') {
    return buildPathCommand('ls', input, '.');
  }

  if (toolName === 'glob') {
    const pattern = readString(input, ['pattern', 'glob']);
    return pattern ? `$ glob "${pattern}"` : '$ glob';
  }

  if (toolName === 'grep') {
    const pattern = readString(input, ['pattern', 'query', 'search']);
    return pattern ? `$ grep "${pattern}"` : '$ grep';
  }

  if (toolName === 'search_in_file') {
    const pattern = readString(input, ['query', 'pattern', 'search']);
    const path = readString(input, PATH_KEYS);
    if (pattern && path) {
      return `$ search-in-file "${pattern}" ${path}`;
    }
    if (pattern) {
      return `$ search-in-file "${pattern}"`;
    }
    return '$ search-in-file';
  }

  if (toolName === 'update_plan' || toolName === 'tasks_update' || toolName === 'todo') {
    const tasks = readTasksCount(input);
    return typeof tasks === 'number' ? `$ update_plan (${tasks} tasks)` : '$ update_plan';
  }

  const summary = readSummary(input);
  if (summary) {
    return `$ ${summary}`;
  }

  return `$ run ${toolName}`;
}

function buildPathCommand(prefix: string, input?: UnknownRecord | null, fallback = ''): string {
  const path = readString(input, PATH_KEYS);
  if (path) {
    return `$ ${prefix} ${path}`;
  }
  return fallback ? `$ ${prefix} ${fallback}` : `$ ${prefix}`;
}

function readSummary(input?: UnknownRecord | null): string | null {
  return readString(input, ['summary', ...COMMAND_KEYS]);
}

function readCommandFromOutput(output: unknown): string | null {
  if (!output || typeof output !== 'object') {
    return null;
  }

  const record = output as UnknownRecord;
  const command = readString(record, COMMAND_KEYS);
  if (!command) {
    return null;
  }

  const args = Array.isArray(record.args)
    ? record.args.filter((item): item is string => typeof item === 'string')
    : [];
  return args.length > 0 ? `${command} ${args.join(' ')}` : command;
}

function readTasksCount(input?: UnknownRecord | null): number | null {
  if (!input) {
    return null;
  }

  const tasks = input.tasks;
  if (Array.isArray(tasks)) {
    return tasks.length;
  }

  return null;
}

function readString(record: UnknownRecord | null | undefined, keys: string[]): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function normalizeToolName(type: string): string {
  if (!type) {
    return 'tool';
  }

  const normalized = type.startsWith('tool-') ? type.slice(5) : type;
  return normalized.trim().replace(/-/g, '_').toLowerCase();
}

function toTitleWords(raw: string): string {
  return raw
    .split('_')
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');
}
