import { createFileRoute, notFound, Outlet, redirect } from '@tanstack/react-router';
import { isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n';
import { getInvalidLocaleRedirectPath, getLocaleRedirectPath } from '@/lib/site-pages';

export { useLocale } from '@/lib/locale-context';

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params, location }) => {
    const locale = params.locale;
    const qs = location.searchStr + location.hash;

    // 无参数视为默认语言（英文）
    if (!locale) {
      return { locale: DEFAULT_LOCALE };
    }

    // 合法 locale 直接通过
    if (isValidLocale(locale)) {
      if (locale === DEFAULT_LOCALE) {
        const canonicalPath = location.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
        throw redirect({ to: canonicalPath + qs });
      }

      const redirectPath = getLocaleRedirectPath(location.pathname, locale);
      if (redirectPath) {
        throw redirect({ to: redirectPath + qs });
      }

      return { locale };
    }

    // 非法 locale 仅在存在深链时剥掉错误前缀；未知单段路径保持 404
    const invalidLocaleRedirectPath = getInvalidLocaleRedirectPath(location.pathname);
    if (invalidLocaleRedirectPath) {
      throw redirect({ to: invalidLocaleRedirectPath + qs });
    }

    throw notFound();
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  return <Outlet />;
}
