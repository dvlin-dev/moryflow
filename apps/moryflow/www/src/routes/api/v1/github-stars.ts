import { createFileRoute } from '@tanstack/react-router';
import { fetchGitHubStars } from '@/lib/github-api';

export const Route = createFileRoute('/api/v1/github-stars')({
  server: {
    handlers: {
      GET: async () => Response.json(await fetchGitHubStars()),
    },
  },
});
