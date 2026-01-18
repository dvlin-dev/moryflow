/**
 * Digest Welcome Config Types (Admin)
 *
 * [DEFINES]: DigestWelcomeConfig, UpdateWelcomeConfigInput
 * [USED_BY]: digest-welcome-config/api.ts, digest-welcome-config/hooks.ts
 */

import type { LocaleRecord } from '../digest-welcome/shared';

export type WelcomeAction = {
  labelByLocale: LocaleRecord;
  action: 'openExplore' | 'openSignIn';
};

export interface DigestWelcomeConfig {
  enabled: boolean;
  defaultSlug: string;
  primaryAction: WelcomeAction | null;
  secondaryAction: WelcomeAction | null;
  updatedAt: string;
}

export type UpdateWelcomeConfigInput = Omit<DigestWelcomeConfig, 'updatedAt'>;
