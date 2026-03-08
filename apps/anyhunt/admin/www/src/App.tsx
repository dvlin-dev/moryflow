/**
 * [PROPS]: 无
 * [EMITS]: route change
 * [POS]: Admin 应用入口（Providers + Router）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
