import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { createContext, useContext } from 'react';
import { isValidLocale, DEFAULT_LOCALE, type Locale } from '@/lib/i18n';
import { getInvalidLocaleRedirectPath, getLocaleRedirectPath } from '@/lib/site-pages';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export const useLocale = () => useContext(LocaleContext);

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params, location }) => {
    const locale = params.locale;

    // 无参数视为默认语言（英文）
    if (!locale) {
      return { locale: DEFAULT_LOCALE };
    }

    // 合法 locale 直接通过
    if (isValidLocale(locale)) {
      if (locale === DEFAULT_LOCALE) {
        const canonicalPath = location.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
        throw redirect({ to: canonicalPath });
      }

      const redirectPath = getLocaleRedirectPath(location.pathname, locale);
      if (redirectPath) {
        throw redirect({ to: redirectPath });
      }

      return { locale };
    }

    // 非法 locale 去掉错误前缀，保留原始深链路径
    throw redirect({ to: getInvalidLocaleRedirectPath(location.pathname) });
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  const { locale } = Route.useRouteContext();
  return (
    <LocaleContext value={locale}>
      <Outlet />
    </LocaleContext>
  );
}
