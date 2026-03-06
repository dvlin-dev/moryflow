/**
 * [PROVIDES]: edition detail view state resolver
 * [DEPENDS]: none
 * [POS]: shared UI state mapping for public edition detail route
 */

export type EditionDetailViewState = 'loading' | 'error' | 'ready';

interface ResolveEditionDetailViewStateParams {
  isLoading: boolean;
  hasEdition: boolean;
  hasError: boolean;
}

export function resolveEditionDetailViewState(
  params: ResolveEditionDetailViewStateParams
): EditionDetailViewState {
  if (params.isLoading) {
    return 'loading';
  }

  if (!params.hasEdition || params.hasError) {
    return 'error';
  }

  return 'ready';
}
