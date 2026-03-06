/**
 * Welcome Card States
 *
 * [PROVIDES]: welcome page cards state resolvers
 * [POS]: Digest welcome UI state fragment helpers
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type WelcomeConfigCardState = 'loading' | 'error' | 'empty' | 'ready';
export type WelcomePagesCardState = 'loading' | 'error' | 'empty' | 'ready';
export type WelcomePageEditorState = 'idle' | 'loading' | 'ready';

export function resolveWelcomeConfigCardState(params: {
  isLoading: boolean;
  hasError: boolean;
  hasDraft: boolean;
}): WelcomeConfigCardState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (!params.hasDraft) {
    return 'empty';
  }

  return 'ready';
}

export function resolveWelcomePagesCardState(params: {
  isLoading: boolean;
  hasError: boolean;
  pageCount: number;
}): WelcomePagesCardState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (params.pageCount === 0) {
    return 'empty';
  }

  return 'ready';
}

export function resolveWelcomePageEditorState(params: {
  hasSelectedPage: boolean;
  hasPageDraft: boolean;
}): WelcomePageEditorState {
  if (!params.hasSelectedPage) {
    return 'idle';
  }

  if (!params.hasPageDraft) {
    return 'loading';
  }

  return 'ready';
}
