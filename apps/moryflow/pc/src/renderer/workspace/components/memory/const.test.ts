import { describe, expect, it } from 'vitest';
import { extractMemoryErrorMessage } from './const';

describe('extractMemoryErrorMessage', () => {
  it('returns string errors without replacing them with the fallback copy', () => {
    expect(extractMemoryErrorMessage('Actual message')).toBe('Actual message');
  });

  it('falls back when the input is empty or unknown', () => {
    expect(extractMemoryErrorMessage('')).toBe('Failed to load memory overview');
    expect(extractMemoryErrorMessage(null)).toBe('Failed to load memory overview');
  });

  it('supports a custom fallback copy for section-specific errors', () => {
    expect(extractMemoryErrorMessage('', 'Failed to load searchable files.')).toBe(
      'Failed to load searchable files.'
    );
  });
});
