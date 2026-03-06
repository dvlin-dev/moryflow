import { describe, expect, it } from 'vitest';
import {
  getNextManualOpenPreference,
  resolveOpenStateFromPreference,
} from '../../../components/ai-elements/open-preference';

describe('open-preference', () => {
  it('uses auto-open when user has no manual preference', () => {
    expect(
      resolveOpenStateFromPreference({
        manualOpenPreference: null,
        autoOpen: true,
      })
    ).toBe(true);
    expect(
      resolveOpenStateFromPreference({
        manualOpenPreference: null,
        autoOpen: false,
      })
    ).toBe(false);
  });

  it('lets manual preference override auto-open state', () => {
    expect(
      resolveOpenStateFromPreference({
        manualOpenPreference: true,
        autoOpen: false,
      })
    ).toBe(true);
    expect(
      resolveOpenStateFromPreference({
        manualOpenPreference: false,
        autoOpen: true,
      })
    ).toBe(false);
  });

  it('toggles preference from effective open state', () => {
    expect(
      getNextManualOpenPreference({
        manualOpenPreference: null,
        autoOpen: true,
      })
    ).toBe(false);
    expect(
      getNextManualOpenPreference({
        manualOpenPreference: null,
        autoOpen: false,
      })
    ).toBe(true);
  });

  it('auto-collapses after runtime ends when user never expanded manually', () => {
    const duringStreaming = resolveOpenStateFromPreference({
      manualOpenPreference: null,
      autoOpen: true,
    });
    const afterStreaming = resolveOpenStateFromPreference({
      manualOpenPreference: null,
      autoOpen: false,
    });

    expect(duringStreaming).toBe(true);
    expect(afterStreaming).toBe(false);
  });
});
