/**
 * [POS]: Root route
 *
 * Reader does not expose a "Home" concept. `/` always redirects to `/welcome`.
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/welcome', replace: true });
  },
});
