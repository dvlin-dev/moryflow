/**
 * Welcome Hooks
 *
 * [PROVIDES]: useWelcomeOverview, useWelcomePage
 * [POS]: /welcome 的 React Query hooks
 */

import { useQuery } from '@tanstack/react-query';
import { usePublicEnv } from '@/lib/public-env-context';
import { getWelcomeOverview, getWelcomePage } from './welcome.api';

export function useWelcomeOverview() {
  const env = usePublicEnv();

  return useQuery({
    queryKey: ['digest', 'welcome', 'overview'],
    queryFn: () => getWelcomeOverview(env.apiUrl),
  });
}

export function useWelcomePage(slug: string | null) {
  const env = usePublicEnv();

  return useQuery({
    queryKey: ['digest', 'welcome', 'page', slug],
    enabled: Boolean(slug),
    queryFn: () => getWelcomePage(env.apiUrl, slug as string),
  });
}
