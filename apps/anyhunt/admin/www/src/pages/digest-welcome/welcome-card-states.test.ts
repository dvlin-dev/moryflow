import { describe, expect, it } from 'vitest';
import {
  resolveWelcomeConfigCardState,
  resolveWelcomePageEditorState,
  resolveWelcomePagesCardState,
} from './welcome-card-states';

describe('welcome card states', () => {
  it('should resolve config card state with correct priority', () => {
    expect(
      resolveWelcomeConfigCardState({
        isLoading: true,
        hasError: true,
        hasDraft: false,
      })
    ).toBe('loading');
    expect(
      resolveWelcomeConfigCardState({
        isLoading: false,
        hasError: true,
        hasDraft: true,
      })
    ).toBe('error');
    expect(
      resolveWelcomeConfigCardState({
        isLoading: false,
        hasError: false,
        hasDraft: false,
      })
    ).toBe('empty');
    expect(
      resolveWelcomeConfigCardState({
        isLoading: false,
        hasError: false,
        hasDraft: true,
      })
    ).toBe('ready');
  });

  it('should resolve pages card state with correct priority', () => {
    expect(
      resolveWelcomePagesCardState({
        isLoading: true,
        hasError: false,
        pageCount: 0,
      })
    ).toBe('loading');
    expect(
      resolveWelcomePagesCardState({
        isLoading: false,
        hasError: true,
        pageCount: 2,
      })
    ).toBe('error');
    expect(
      resolveWelcomePagesCardState({
        isLoading: false,
        hasError: false,
        pageCount: 0,
      })
    ).toBe('empty');
    expect(
      resolveWelcomePagesCardState({
        isLoading: false,
        hasError: false,
        pageCount: 1,
      })
    ).toBe('ready');
  });

  it('should resolve editor card state', () => {
    expect(
      resolveWelcomePageEditorState({
        hasSelectedPage: false,
        hasPageDraft: false,
      })
    ).toBe('idle');
    expect(
      resolveWelcomePageEditorState({
        hasSelectedPage: true,
        hasPageDraft: false,
      })
    ).toBe('loading');
    expect(
      resolveWelcomePageEditorState({
        hasSelectedPage: true,
        hasPageDraft: true,
      })
    ).toBe('ready');
  });
});
