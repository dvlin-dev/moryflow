/**
 * Digest Welcome Types (Admin)
 *
 * [DEFINES]: DigestWelcomeConfig, UpdateWelcomeInput
 * [USED_BY]: digest-welcome/api.ts, digest-welcome/hooks.ts
 */

export type LocaleRecord = Record<string, string>;

export type WelcomeAction = {
  labelByLocale: LocaleRecord;
  action: 'openExplore' | 'openSignIn';
};

export interface DigestWelcomeConfig {
  enabled: boolean;
  titleByLocale: LocaleRecord;
  contentMarkdownByLocale: LocaleRecord;
  primaryAction: WelcomeAction | null;
  secondaryAction: WelcomeAction | null;
  updatedAt: string;
}

export type UpdateWelcomeInput = Omit<DigestWelcomeConfig, 'updatedAt'>;
