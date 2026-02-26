/**
 * [PROPS]: 无
 * [EMITS]: route change
 * [POS]: Admin 应用入口（Providers + Router）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { AppProviders } from '@/app/AppProviders';
import { AppRouter } from '@/app/AppRouter';

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
