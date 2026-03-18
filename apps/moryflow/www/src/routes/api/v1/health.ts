import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/v1/health')({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, status: 'ok' }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    },
  },
});
