import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPACTION_CONFIG } from '../compaction';

describe('DEFAULT_COMPACTION_CONFIG', () => {
  it('does not protect removed task workflow tools', () => {
    expect(DEFAULT_COMPACTION_CONFIG.protectedToolNames).not.toContain('manage_plan');
    expect(DEFAULT_COMPACTION_CONFIG.protectedToolNames).not.toContain('task');
  });
});
