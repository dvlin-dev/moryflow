import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/{-$locale}/features')({
  beforeLoad: ({ params }) => {
    const locale = params.locale;
    throw redirect({ to: locale ? '/' + locale : '/', statusCode: 301 });
  },
});
