import { describe, expect, it } from 'vitest';
import {
  resolveReportFormDefaultValues,
  resolveReportFormSchema,
  toResolveReportInput,
} from './resolveReportForm';

describe('resolveReportForm', () => {
  it('should expose stable default values', () => {
    expect(resolveReportFormDefaultValues).toEqual({
      status: 'RESOLVED_VALID',
      resolveNote: '',
      pauseTopic: false,
    });
  });

  it('should map blank resolve note to undefined', () => {
    const input = toResolveReportInput({
      status: 'DISMISSED',
      resolveNote: '',
      pauseTopic: false,
    });

    expect(input).toEqual({
      status: 'DISMISSED',
      resolveNote: undefined,
      pauseTopic: false,
    });
  });

  it('should reject invalid status', () => {
    const result = resolveReportFormSchema.safeParse({
      status: 'PENDING',
      resolveNote: '',
      pauseTopic: false,
    });

    expect(result.success).toBe(false);
  });
});
