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

const missingInputValueRun = run(['--input']);
assert.equal(missingInputValueRun.status, 1);
assert.match(missingInputValueRun.stderr, /Flag --input requires a value/);

const flagAsInputValueRun = run(['--input', '--top', '10']);
assert.equal(flagAsInputValueRun.status, 1);
assert.match(flagAsInputValueRun.stderr, /Flag --input requires a value/);

const invalidTopRun = run(['--top', 'nope']);
assert.equal(invalidTopRun.status, 1);
assert.match(invalidTopRun.stderr, /Flag --top must be a positive integer/);

const invalidTokenThresholdRun = run(['--token-threshold', 'bad']);
assert.equal(invalidTokenThresholdRun.status, 1);
assert.match(
  invalidTokenThresholdRun.stderr,
  /Flag --token-threshold must be a non-negative integer/
);

const invalidDurationThresholdRun = run(['--duration-threshold-ms', '-1']);
assert.equal(invalidDurationThresholdRun.status, 1);
assert.match(
  invalidDurationThresholdRun.stderr,
  /Flag --duration-threshold-ms must be a non-negative integer/
);

console.log('[review-agent-traces.test] ok');
