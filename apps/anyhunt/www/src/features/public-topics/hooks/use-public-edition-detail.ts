/**
 * [PROVIDES]: Public edition detail state
 * [DEPENDS]: public-topics.api, public-env-context, request-guard
 * [POS]: Public edition detail route orchestration
 */

import { useEffect, useRef, useState } from 'react';
import { usePublicEnv } from '@/lib/public-env-context';
import { fetchEditionDetail, type DigestEditionDetail } from '../public-topics.api';
import { createRequestGenerationGuard, isAbortRequestError } from '../public-topics.request-guard';
import { resolvePublicTopicsErrorMessage } from './error-message';

export interface PublicEditionDetailState {
  edition: DigestEditionDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function usePublicEditionDetail(slug: string, editionId: string): PublicEditionDetailState {
  const env = usePublicEnv();

  const [edition, setEdition] = useState<DigestEditionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generationRef = useRef(createRequestGenerationGuard());
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const generation = generationRef.current.next();

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setEdition(null);

    const loadEditionDetail = async () => {
      try {
        const editionDetail = await fetchEditionDetail(env.apiUrl, slug, editionId, controller.signal);

        if (!generationRef.current.isCurrent(generation) || controller.signal.aborted) {
          return;
        }

        setEdition(editionDetail);
      } catch (requestError) {
        if (isAbortRequestError(requestError)) {
          return;
        }

        if (!generationRef.current.isCurrent(generation)) {
          return;
        }

        setEdition(null);
        setError(resolvePublicTopicsErrorMessage(requestError, 'Failed to load edition'));
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }

        if (generationRef.current.isCurrent(generation) && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadEditionDetail();

    return () => {
      controller.abort();
    };
  }, [editionId, env.apiUrl, slug]);

  return {
    edition,
    isLoading,
    error,
  };
}
