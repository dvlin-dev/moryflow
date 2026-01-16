/**
 * Reader Page (Homepage)
 *
 * [INPUT]: None
 * [OUTPUT]: Reader 三栏布局（Discover Feed / Topic 浏览 / Inbox）
 * [POS]: Reader 模块唯一入口；所有 C 端操作应在该壳层内完成（弹窗优先）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { SidePanel } from '@/components/reader/SidePanel';
import { ReaderDialogs } from './components/ReaderDialogs';
import { ReaderDetailPane } from './components/ReaderDetailPane';
import { ReaderErrorBoundary, ReaderPaneErrorState } from './components/ReaderErrorBoundary';
import { ReaderListPane } from './components/ReaderListPane';
import { ReaderScaffold } from './components/ReaderScaffold';
import { useReaderController } from './useReaderController';

export function ReaderPage() {
  const controller = useReaderController();

  const listComponent = (
    <ReaderErrorBoundary
      resetKeys={controller.listResetKeys}
      fallback={({ reset }) => (
        <ReaderPaneErrorState onRetry={reset} onBackToDiscover={controller.onBackToDiscover} />
      )}
    >
      <ReaderListPane model={controller.listModel} />
    </ReaderErrorBoundary>
  );

  const detailComponent = (
    <ReaderErrorBoundary
      resetKeys={controller.detailResetKeys}
      onReset={controller.onBack}
      fallback={({ reset }) => (
        <ReaderPaneErrorState
          title="Unable to render this pane"
          description="Try again, or go back and pick another item."
          onRetry={reset}
          secondaryAction={{
            label: 'Back',
            onClick: () => {
              controller.onBack();
              reset();
            },
          }}
          onBackToDiscover={controller.onBackToDiscover}
        />
      )}
    >
      <ReaderDetailPane model={controller.detailModel} />
    </ReaderErrorBoundary>
  );

  return (
    <>
      <ReaderScaffold
        isMobile={controller.isMobile}
        sidebar={<SidePanel {...controller.sidebarProps} />}
        list={listComponent}
        detail={detailComponent}
        hasSelectedItem={controller.hasSelectedItem}
        onBack={controller.onBack}
      />
      <ReaderDialogs {...controller.dialogs} />
    </>
  );
}
