/**
 * [PROPS]: isAuthenticated, onCreateSubscription, onBrowseTopics, onSignIn
 * [POS]: Reader 右栏 - Welcome 引导（纯渲染）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { WelcomeGuide } from '@/components/reader/WelcomeGuide';

interface WelcomePaneProps {
  isAuthenticated: boolean;
  onCreateSubscription: (initialQuery?: string) => void;
  onCreateSubscriptionHover?: () => void;
  onBrowseTopics: () => void;
  onBrowseTopicsHover?: () => void;
  onSignIn: () => void;
}

export function WelcomePane({
  isAuthenticated,
  onCreateSubscription,
  onCreateSubscriptionHover,
  onBrowseTopics,
  onBrowseTopicsHover,
  onSignIn,
}: WelcomePaneProps) {
  return (
    <WelcomeGuide
      onCreateSubscription={() => onCreateSubscription()}
      onCreateSubscriptionHover={onCreateSubscriptionHover}
      onBrowseTopics={onBrowseTopics}
      onBrowseTopicsHover={onBrowseTopicsHover}
      onSignIn={onSignIn}
      isAuthenticated={isAuthenticated}
    />
  );
}
