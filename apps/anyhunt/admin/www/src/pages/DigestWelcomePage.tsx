/**
 * Digest Welcome Page
 *
 * [PROPS]: none
 * [POS]: Admin welcome configuration/page management assembly page
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Badge, Button, PageHeader } from '@moryflow/ui';
import { useDigestWelcomePageController } from './digest-welcome/useDigestWelcomePageController';
import { WelcomeConfigCard } from './digest-welcome/WelcomeConfigCard';
import { WelcomePagesCard } from './digest-welcome/WelcomePagesCard';
import { WelcomePageEditorCard } from './digest-welcome/WelcomePageEditorCard';

export default function DigestWelcomePage() {
  const controller = useDigestWelcomePageController();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digest Welcome"
        description="Configure /welcome global behavior and manage welcome pages (server-driven, i18n-ready)."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {controller.updatedAtLabel ? (
            <Badge variant="secondary">Updated {controller.updatedAtLabel}</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={controller.handleCreatePage}
            disabled={controller.isCreatingPage}
          >
            New page
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <WelcomeConfigCard
            isLoading={controller.configQuery.isLoading}
            isError={controller.configQuery.isError}
            pages={controller.pages}
            configDraft={controller.configDraft}
            setConfigDraft={controller.setConfigDraft}
            configActionLocale={controller.configActionLocale}
            configActionNewLocale={controller.configActionNewLocale}
            setConfigActionNewLocale={controller.setConfigActionNewLocale}
            actionLocales={controller.actionLocales}
            primaryActionLabel={controller.primaryActionLabel}
            secondaryActionLabel={controller.secondaryActionLabel}
            onApplyActionLocale={controller.applyActionLocale}
            onAddActionLocale={controller.handleAddActionLocale}
            onReset={controller.handleResetConfig}
            onSave={controller.handleSaveConfig}
            isSaving={controller.isSavingConfig}
          />

          <WelcomePagesCard
            isLoading={controller.pagesQuery.isLoading}
            isError={controller.pagesQuery.isError}
            pages={controller.pages}
            selectedPageId={controller.selectedPageId}
            onSelect={controller.setSelectedPageId}
            onMove={controller.handleMovePage}
            onDelete={controller.handleDeletePage}
            isReordering={controller.isReorderingPages}
            isDeleting={controller.isDeletingPage}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <WelcomePageEditorCard
            selectedPage={controller.selectedPage}
            pageDraft={controller.pageDraft}
            setPageDraft={controller.setPageDraft}
            locales={controller.locales}
            activeLocale={controller.activeLocale}
            onApplyLocale={controller.applyLocale}
            newLocale={controller.newLocale}
            setNewLocale={controller.setNewLocale}
            onAddLocale={controller.handleAddLocale}
            onReset={controller.handleResetPage}
            onSave={controller.handleSavePage}
            isSaving={controller.isSavingPage}
          />
        </div>
      </div>
    </div>
  );
}
