/**
 * [PROVIDES]: Tool 命令摘要解析（脚本类型 + 命令行摘要）
 * [DEPENDS]: Tool part type/input/output 基础协议
 * [POS]: Chat Tool Bash Card 二行 Header 的共享事实源
 * [UPDATE]: 2026-03-07 - 删除旧 plan/todo 专用摘要分支，工具摘要仅反映当前真实工具输入
 * [UPDATE]: 2026-03-05 - 新增 resolveToolOuterSummary（input.summary 优先，状态+命令 fallback）
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

export type ToolSummaryState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export type ToolOuterSummaryLabels = {
  running: (input: { tool: string; command: string }) => string;
  success: (input: { tool: string; command: string }) => string;
  error: (input: { tool: string; command: string }) => string;
  skipped: (input: { tool: string; command: string }) => string;
};

export type ToolOuterSummaryInput = ToolCommandSummaryInput & {
  state: ToolSummaryState;
  labels?: Partial<ToolOuterSummaryLabels>;
};

export type ToolOuterSummary = ToolCommandSummary & {
  outerSummary: string;
  summarySource: 'input' | 'fallback';
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
};

const PATH_KEYS = ['path', 'targetPath', 'file', 'filePath', 'target_file'];

const QUERY_KEYS = ['query', 'q', 'keyword', 'keywords'];

const URL_KEYS = ['url', 'href', 'targetUrl', 'target_url'];

const COMMAND_KEYS = ['command', 'cmd'];

const OUTER_SUMMARY_KEYS = ['summary', 'description', 'title'];

const DEFAULT_OUTER_SUMMARY_LABELS: ToolOuterSummaryLabels = {
  running: ({ tool, command }) => `${tool} is running ${command}`,
  success: ({ tool, command }) => `${tool} completed ${command}`,
  error: ({ tool, command }) => `${tool} failed ${command}`,
  skipped: ({ tool, command }) => `${tool} skipped ${command}`,
};

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

export function resolveToolOuterSummary({
  type,
  input,
  output,
  state,
  labels,
}: ToolOuterSummaryInput): ToolOuterSummary {
  const summary = resolveToolCommandSummary({ type, input, output });
  const inputSummary = readString(input, OUTER_SUMMARY_KEYS);
  if (inputSummary) {
    return {
      ...summary,
      outerSummary: inputSummary,
      summarySource: 'input',
    };
  }

  const mergedLabels: ToolOuterSummaryLabels = {
    ...DEFAULT_OUTER_SUMMARY_LABELS,
    ...labels,
  };
  const commandText = stripCommandPrefix(summary.command);
  const labelKey = mapStateToOuterSummaryLabel(state);
  const outerSummary = mergedLabels[labelKey]({
    tool: summary.scriptType,
    command: commandText,
  });

  return {
    ...summary,
    outerSummary,
    summarySource: 'fallback',
  };
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

function mapStateToOuterSummaryLabel(state: ToolSummaryState): keyof ToolOuterSummaryLabels {
  if (state === 'output-available') {
    return 'success';
  }
  if (state === 'output-error') {
    return 'error';
  }
  if (state === 'output-denied') {
    return 'skipped';
  }
  return 'running';
}

function stripCommandPrefix(command: string): string {
  if (command.startsWith('$ ')) {
    return command.slice(2);
  }
  if (command.startsWith('$')) {
    return command.slice(1).trimStart();
  }
  return command;
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
