import { describe, expect, it } from 'vitest';
import {
  getActiveMobileTab,
  getMobileBackTarget,
  getMobilePane,
  shouldRedirectWelcomeOnMobile,
  shouldShowMobileTabs,
} from '../mobile-reader-state';

describe('mobile-reader-state', () => {
  it('marks tab roots as visible', () => {
    expect(shouldShowMobileTabs('/inbox')).toBe(true);
    expect(shouldShowMobileTabs('/explore')).toBe(true);
    expect(shouldShowMobileTabs('/subscriptions')).toBe(true);
  });

  it('hides tabs on detail routes', () => {
    expect(shouldShowMobileTabs('/inbox/items/123')).toBe(false);
    expect(shouldShowMobileTabs('/topic/ai')).toBe(false);
    expect(shouldShowMobileTabs('/topic/ai/editions/1')).toBe(false);
  });

  it('selects the active tab by pathname prefix', () => {
    expect(getActiveMobileTab('/inbox')).toBe('inbox');
    expect(getActiveMobileTab('/inbox/items/123')).toBe('inbox');
    expect(getActiveMobileTab('/explore')).toBe('explore');
    expect(getActiveMobileTab('/subscriptions')).toBe('subscriptions');
  });

  it('prefers list pane for list routes', () => {
    expect(getMobilePane('/inbox')).toBe('list');
    expect(getMobilePane('/topic/ai')).toBe('list');
  });

  it('prefers detail pane for detail routes', () => {
    expect(getMobilePane('/inbox/items/123')).toBe('detail');
    expect(getMobilePane('/topic/ai/editions/1')).toBe('detail');
    expect(getMobilePane('/explore')).toBe('detail');
  });

  it('redirects welcome on mobile', () => {
    expect(shouldRedirectWelcomeOnMobile('/welcome')).toBe(true);
    expect(shouldRedirectWelcomeOnMobile('/explore')).toBe(false);
  });

  it('returns back targets for detail routes', () => {
    expect(getMobileBackTarget('/inbox/items/123')).toEqual({ label: 'Inbox', to: '/inbox' });
    expect(getMobileBackTarget('/topic/ai')).toEqual({ label: 'Explore', to: '/explore' });
    expect(getMobileBackTarget('/topic/ai/editions/1')).toEqual({
      label: 'Topic',
      to: '/topic/$slug',
      params: { slug: 'ai' },
    });
  });
});
