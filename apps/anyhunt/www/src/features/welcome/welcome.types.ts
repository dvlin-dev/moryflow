/**
 * Welcome Types (Public)
 *
 * [DEFINES]: WelcomeOverviewPublic, WelcomePageSummary, WelcomePagePublic
 * [USED_BY]: welcome.api.ts, welcome.hooks.ts, welcome panes
 */

export type WelcomeAction = { label: string; action: 'openExplore' | 'openSignIn' };

export type WelcomePageSummary = {
  slug: string;
  title: string;
  excerpt: string;
  updatedAt: string;
};

export type WelcomeOverviewPublic = {
  enabled: boolean;
  defaultSlug: string;
  primaryAction: WelcomeAction | null;
  secondaryAction: WelcomeAction | null;
  pages: WelcomePageSummary[];
};

export type WelcomePagePublic = {
  slug: string;
  title: string;
  contentMarkdown: string;
  updatedAt: string;
};
