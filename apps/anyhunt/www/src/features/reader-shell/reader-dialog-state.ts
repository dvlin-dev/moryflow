/**
 * [DEFINES]: ReaderDialogState and tab types
 * [USED_BY]: ReaderShell, ReaderDialogs
 * [POS]: Reader dialog discriminated state model
 */

import type { Subscription } from '@/features/digest/types';

export type ReaderSettingsDialogTab = 'basic' | 'history' | 'suggestions' | 'notifications';

export type ReaderDialogState =
  | { type: 'closed' }
  | { type: 'create'; initialTopic?: string }
  | { type: 'settings'; subscription: Subscription; tab: ReaderSettingsDialogTab }
  | { type: 'publish'; subscription: Subscription | null };

export function getClosedReaderDialogState(): ReaderDialogState {
  return { type: 'closed' };
}

export function getDialogSubscription(dialogState: ReaderDialogState): Subscription | null {
  if (dialogState.type === 'settings' || dialogState.type === 'publish') {
    return dialogState.subscription;
  }

  return null;
}
