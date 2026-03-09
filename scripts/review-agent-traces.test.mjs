import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const run = (args = [], options = {}) =>
  spawnSync('node', ['scripts/review-agent-traces.mjs', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    ...options,
  });

const defaultRun = run();
assert.equal(defaultRun.status, 0, defaultRun.stderr);
assert.match(defaultRun.stdout, /Agent Trace Review/);
assert.match(defaultRun.stdout, /trace_review_sample_1/);

const stdinRun = run([], {
  input: JSON.stringify([
    {
      traceId: 'stdin_trace',
      agentName: 'stdin-agent',
      status: 'completed',
      totalTokens: 120,
      duration: 800,
      startedAt: '2026-03-09T00:10:00.000Z',
      metadata: {
        approval: { requested: false },
        compaction: { triggered: false },
        doomLoop: { triggered: false },
      },
      spans: [],
    },
  ]),
});
assert.equal(stdinRun.status, 0, stdinRun.stderr);
assert.match(stdinRun.stdout, /- traces: 1/);
assert.doesNotMatch(stdinRun.stdout, /trace_review_sample_1/);

console.log('[review-agent-traces.test] ok');
