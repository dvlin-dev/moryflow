import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_TOP_N = 5;
const DEFAULT_TOKEN_THRESHOLD = 2000;
const DEFAULT_DURATION_THRESHOLD_MS = 10_000;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT_PATH = path.join(SCRIPT_DIR, 'fixtures', 'agent-traces.sample.json');

const toRate = (value, total) => (total === 0 ? 0 : Math.round((value / total) * 10_000) / 100);

const asRecord = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null;

const getNestedRecord = (value, key) => asRecord(value?.[key]);
const getBoolean = (value, key) => value?.[key] === true;
const getString = (value, key) => {
  const candidate = value?.[key];
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
};

const normalizeApprovalTarget = (metadata) => {
  const approval = getNestedRecord(metadata, 'approval');
  if (approval && getBoolean(approval, 'requested')) {
    return (
      getString(approval, 'target') ??
      getString(approval, 'path') ??
      (getString(approval, 'toolName') ? `tool:${getString(approval, 'toolName')}` : null) ??
      'approval:unknown'
    );
  }

  const permission = getNestedRecord(metadata, 'permission');
  if (!permission || getString(permission, 'decision') !== 'ask') {
    return null;
  }

  return (
    getString(permission, 'target') ??
    getString(permission, 'path') ??
    (getString(permission, 'toolName') ? `tool:${getString(permission, 'toolName')}` : null) ??
    'approval:unknown'
  );
};

const hasMarker = (metadata, key) => {
  const section = getNestedRecord(metadata, key);
  return getBoolean(section, 'triggered');
};

const compareHotspot = (a, b) => {
  if (b.totalTokens !== a.totalTokens) {
    return b.totalTokens - a.totalTokens;
  }
  return (b.duration ?? 0) - (a.duration ?? 0);
};

const buildSummary = (traces, options = {}) => {
  const topN = Number(options.topN ?? DEFAULT_TOP_N);
  const tokenThreshold = Number(options.tokenThreshold ?? DEFAULT_TOKEN_THRESHOLD);
  const durationThresholdMs = Number(options.durationThresholdMs ?? DEFAULT_DURATION_THRESHOLD_MS);

  const failedToolCounts = new Map();
  const approvalHotspots = new Map();
  let failedTraces = 0;
  let interruptedTraces = 0;
  let highTokenTraceCount = 0;
  let longTraceCount = 0;
  let compactionTriggeredCount = 0;
  let doomLoopTriggeredCount = 0;

  const traceHotspots = traces
    .filter(
      (trace) =>
        Number(trace.totalTokens ?? 0) >= tokenThreshold ||
        Number(trace.duration ?? 0) >= durationThresholdMs ||
        trace.status === 'interrupted'
    )
    .map((trace) => ({
      traceId: trace.traceId,
      agentName: trace.agentName,
      status: trace.status,
      totalTokens: Number(trace.totalTokens ?? 0),
      duration: trace.duration == null ? null : Number(trace.duration),
      startedAt: String(trace.startedAt),
    }))
    .sort(compareHotspot)
    .slice(0, topN);

  for (const trace of traces) {
    if (trace.status === 'failed') {
      failedTraces += 1;
    }
    if (trace.status === 'interrupted') {
      interruptedTraces += 1;
    }
    if (Number(trace.totalTokens ?? 0) >= tokenThreshold) {
      highTokenTraceCount += 1;
    }
    if (Number(trace.duration ?? 0) >= durationThresholdMs) {
      longTraceCount += 1;
    }

    const metadata = asRecord(trace.metadata);
    const approvalTarget = normalizeApprovalTarget(metadata);
    if (approvalTarget) {
      approvalHotspots.set(approvalTarget, (approvalHotspots.get(approvalTarget) ?? 0) + 1);
    }
    if (hasMarker(metadata, 'compaction')) {
      compactionTriggeredCount += 1;
    }
    if (hasMarker(metadata, 'doomLoop')) {
      doomLoopTriggeredCount += 1;
    }

    for (const span of Array.isArray(trace.spans) ? trace.spans : []) {
      if (span.type !== 'function') {
        continue;
      }
      const current = failedToolCounts.get(span.name) ?? { failedCount: 0, totalCalls: 0 };
      current.totalCalls += 1;
      if (span.status === 'failed') {
        current.failedCount += 1;
      }
      failedToolCounts.set(span.name, current);
    }
  }

  return {
    overview: {
      totalTraces: traces.length,
      failedTraces,
      interruptedTraces,
      highTokenTraceCount,
      longTraceCount,
    },
    failedTools: [...failedToolCounts.entries()]
      .filter(([, value]) => value.failedCount > 0)
      .map(([toolName, value]) => ({
        toolName,
        failedCount: value.failedCount,
        totalCalls: value.totalCalls,
        failureRate: toRate(value.failedCount, value.totalCalls),
      }))
      .sort((a, b) => b.failedCount - a.failedCount || b.totalCalls - a.totalCalls)
      .slice(0, topN),
    approvalHotspots: [...approvalHotspots.entries()]
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count || a.target.localeCompare(b.target))
      .slice(0, topN),
    compaction: {
      triggeredCount: compactionTriggeredCount,
      triggerRate: toRate(compactionTriggeredCount, traces.length),
    },
    doomLoop: {
      triggeredCount: doomLoopTriggeredCount,
      triggerRate: toRate(doomLoopTriggeredCount, traces.length),
    },
    traceHotspots,
  };
};

const formatList = (items, render) => {
  if (items.length === 0) {
    return ['- none'];
  }
  return items.map(render);
};

const formatSummary = (summary) =>
  [
    'Agent Trace Review',
    '',
    'Overview',
    `- traces: ${summary.overview.totalTraces}`,
    `- failed: ${summary.overview.failedTraces}`,
    `- interrupted: ${summary.overview.interruptedTraces}`,
    `- high token traces: ${summary.overview.highTokenTraceCount}`,
    `- long traces: ${summary.overview.longTraceCount}`,
    '',
    'Failed Tools',
    ...formatList(
      summary.failedTools,
      (item) =>
        `- ${item.toolName}: failed=${item.failedCount}, total=${item.totalCalls}, rate=${item.failureRate}%`
    ),
    '',
    'Approval Hotspots',
    ...formatList(summary.approvalHotspots, (item) => `- ${item.target}: ${item.count}`),
    '',
    'Compaction',
    `- triggered: ${summary.compaction.triggeredCount}`,
    `- trigger rate: ${summary.compaction.triggerRate}%`,
    '',
    'Doom Loop',
    `- triggered: ${summary.doomLoop.triggeredCount}`,
    `- trigger rate: ${summary.doomLoop.triggerRate}%`,
    '',
    'Trace Hotspots',
    ...formatList(
      summary.traceHotspots,
      (item) =>
        `- ${item.traceId}: agent=${item.agentName}, status=${item.status}, tokens=${item.totalTokens}, duration=${item.duration ?? 'n/a'}`
    ),
    '',
    'Suggested Follow-ups',
    ...formatList(buildSuggestions(summary), (item) => `- ${item}`),
  ].join('\n');

const buildSuggestions = (summary) => {
  const suggestions = [];

  if (summary.failedTools.length > 0) {
    suggestions.push(
      `为失败最频繁的工具 ${summary.failedTools[0].toolName} 补回归测试，并检查工具摘要与错误分类。`
    );
  }
  if (summary.approvalHotspots.length > 0) {
    suggestions.push(`复核审批热点 ${summary.approvalHotspots[0].target} 的权限策略与默认规则。`);
  }
  if (summary.compaction.triggeredCount > 0) {
    suggestions.push('抽样检查 compaction 触发前后的消息体积与摘要质量。');
  }
  if (summary.doomLoop.triggeredCount > 0) {
    suggestions.push('复核 doom loop 场景下的工具调用序列，补齐重复调用防回归用例。');
  }
  if (summary.traceHotspots.length > 0) {
    suggestions.push(
      `优先排查最重 Trace ${summary.traceHotspots[0].traceId} 的模型选择、工具路径与中断原因。`
    );
  }

  return suggestions.length > 0 ? suggestions : ['当前窗口内未发现明显回写项。'];
};

const readStdin = async () => {
  if (process.stdin.isTTY) {
    return null;
  }
  let content = '';
  for await (const chunk of process.stdin) {
    content += chunk;
  }
  return content.trim().length > 0 ? content : null;
};

const hasFlag = (flag) => process.argv.includes(flag);

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return null;
  }
  const candidate = process.argv[index + 1];
  if (!candidate || candidate.startsWith('--')) {
    throw new Error(`Flag ${flag} requires a value.`);
  }
  return candidate;
};

const parseIntegerFlag = (flag, fallback, { min = 0, label = 'a non-negative integer' } = {}) => {
  if (!hasFlag(flag)) {
    return fallback;
  }
  const value = Number(getArgValue(flag));
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`Flag ${flag} must be ${label}.`);
  }
  return value;
};

const parseInputPayload = (raw) => {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed?.traces)) {
    return parsed.traces;
  }
  throw new Error('Input JSON must be an array or an object with a traces array.');
};

const main = async () => {
  const inputPath = hasFlag('--input')
    ? getArgValue('--input')
    : (process.env.AGENT_TRACE_REVIEW_INPUT ?? null);
  const stdinPayload = await readStdin();

  let raw = stdinPayload;
  if (!raw && inputPath) {
    raw = await readFile(inputPath, 'utf8');
  }
  if (!raw) {
    raw = await readFile(DEFAULT_INPUT_PATH, 'utf8');
  }

  if (!raw) {
    console.error(
      'Usage: node scripts/review-agent-traces.mjs --input <traces.json>\n' +
        '   or: cat traces.json | node scripts/review-agent-traces.mjs'
    );
    process.exit(1);
  }

  const traces = parseInputPayload(raw);
  const summary = buildSummary(traces, {
    topN: parseIntegerFlag('--top', DEFAULT_TOP_N, {
      min: 1,
      label: 'a positive integer',
    }),
    tokenThreshold: parseIntegerFlag('--token-threshold', DEFAULT_TOKEN_THRESHOLD),
    durationThresholdMs: parseIntegerFlag('--duration-threshold-ms', DEFAULT_DURATION_THRESHOLD_MS),
  });

  process.stdout.write(formatSummary(summary) + '\n');
};

main().catch((error) => {
  console.error('[review-agent-traces] FAIL', error instanceof Error ? error.message : error);
  process.exit(1);
});
