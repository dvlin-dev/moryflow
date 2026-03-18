import { createFileRoute } from '@tanstack/react-router';
import { fetchLatestRelease } from '@/lib/github-api';

export const Route = createFileRoute('/api/v1/latest-release')({
  server: {
    handlers: {
      GET: async () => Response.json(await fetchLatestRelease()),
      HEAD: async () => new Response(null, { headers: { 'Content-Type': 'application/json' } }),
    },
  },
});
