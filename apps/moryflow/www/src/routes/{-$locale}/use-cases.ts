import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/{-$locale}/use-cases')({
  beforeLoad: ({ params }) => {
    const locale = params.locale;
    throw redirect({ to: locale ? '/' + locale : '/', statusCode: 301 });
  },
});
