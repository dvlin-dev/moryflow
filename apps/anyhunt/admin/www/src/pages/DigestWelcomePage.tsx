/**
 * Digest Welcome Page
 *
 * [PROPS]: None
 * [POS]: Admin - Welcome 配置与 Welcome Pages 管理（i18n-ready + Markdown 编辑）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatRelativeTime } from '@moryflow/ui/lib';
import { Badge, Button, PageHeader } from '@moryflow/ui';
import {
  useAdminWelcomeConfig,
  useAdminWelcomePages,
  useCreateAdminWelcomePage,
  useDeleteAdminWelcomePage,
  useReorderAdminWelcomePages,
  useUpdateAdminWelcomeConfig,
  useUpdateAdminWelcomePage,
  type UpdateWelcomeConfigInput,
  type UpdateWelcomePageInput,
} from '@/features/digest-welcome';
import {
  cloneConfigDraft,
  clonePageDraft,
  collectActionLocales,
  collectLocales,
  ensureActionLocaleValue,
  ensureLocaleRecordValue,
} from './digest-welcome/digest-welcome.utils';
import { WelcomeConfigCard } from './digest-welcome/WelcomeConfigCard';
import { WelcomePagesCard } from './digest-welcome/WelcomePagesCard';
import { WelcomePageEditorCard } from './digest-welcome/WelcomePageEditorCard';

export default function DigestWelcomePage() {
  const configQuery = useAdminWelcomeConfig();
  const pagesQuery = useAdminWelcomePages();

  const updateConfigMutation = useUpdateAdminWelcomeConfig();
  const createPageMutation = useCreateAdminWelcomePage();
  const updatePageMutation = useUpdateAdminWelcomePage();
  const deletePageMutation = useDeleteAdminWelcomePage();
  const reorderPagesMutation = useReorderAdminWelcomePages();

  const [configDraft, setConfigDraft] = useState<UpdateWelcomeConfigInput | null>(null);
  const [configActionLocale, setConfigActionLocale] = useState('en');
  const [configActionNewLocale, setConfigActionNewLocale] = useState('');

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState<UpdateWelcomePageInput | null>(null);
  const [activeLocale, setActiveLocale] = useState('en');
  const [newLocale, setNewLocale] = useState('');

  const pages = pagesQuery.data ?? [];

  useEffect(() => {
    if (!configQuery.data) return;
    setConfigDraft(cloneConfigDraft(configQuery.data));
  }, [configQuery.data]);

  useEffect(() => {
    if (pages.length === 0) return;
    if (selectedPageId && pages.some((p) => p.id === selectedPageId)) return;

    const defaultSlug = configQuery.data?.defaultSlug;
    const fromDefault = defaultSlug ? pages.find((p) => p.slug === defaultSlug) : null;
    setSelectedPageId(fromDefault?.id ?? pages[0]?.id ?? null);
  }, [pages, selectedPageId, configQuery.data?.defaultSlug]);

  useEffect(() => {
    if (!selectedPageId) {
      setPageDraft(null);
      return;
    }
    const selected = pages.find((p) => p.id === selectedPageId);
    if (!selected) {
      setPageDraft(null);
      return;
    }
    setPageDraft(clonePageDraft(selected));
  }, [selectedPageId, pages]);

  const locales = useMemo(() => collectLocales(pageDraft), [pageDraft]);
  const actionLocales = useMemo(() => collectActionLocales(configDraft), [configDraft]);

  useEffect(() => {
    if (!locales.includes(activeLocale)) {
      setActiveLocale(locales[0] ?? 'en');
    }
  }, [locales, activeLocale]);

  useEffect(() => {
    if (!actionLocales.includes(configActionLocale)) {
      setConfigActionLocale(actionLocales[0] ?? 'en');
    }
  }, [actionLocales, configActionLocale]);

  const updatedAtLabel = configQuery.data?.updatedAt
    ? formatRelativeTime(new Date(configQuery.data.updatedAt))
    : null;

  const applyLocale = (nextLocale: string) => {
    if (!pageDraft) return;
    setPageDraft({
      ...pageDraft,
      titleByLocale: ensureLocaleRecordValue(pageDraft.titleByLocale, nextLocale),
      contentMarkdownByLocale: ensureLocaleRecordValue(
        pageDraft.contentMarkdownByLocale,
        nextLocale
      ),
    });
    setActiveLocale(nextLocale);
  };

  const applyActionLocale = (nextLocale: string) => {
    if (!configDraft) return;
    setConfigDraft({
      ...configDraft,
      primaryAction: ensureActionLocaleValue(configDraft.primaryAction, nextLocale),
      secondaryAction: ensureActionLocaleValue(configDraft.secondaryAction, nextLocale),
    });
    setConfigActionLocale(nextLocale);
  };

  const handleAddLocale = () => {
    const locale = newLocale.trim();
    if (!locale) return;
    setNewLocale('');
    applyLocale(locale);
  };

  const handleAddActionLocale = () => {
    const locale = configActionNewLocale.trim();
    if (!locale) return;
    setConfigActionNewLocale('');
    applyActionLocale(locale);
  };

  const handleSaveConfig = async () => {
    if (!configDraft) return;
    try {
      await updateConfigMutation.mutateAsync(configDraft);
      toast.success('Saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleResetConfig = () => {
    if (!configQuery.data) return;
    setConfigDraft(cloneConfigDraft(configQuery.data));
    toast.message('Reset to server state');
  };

  const handleCreatePage = async () => {
    const now = Date.now();
    const slug = `welcome-${now}`;
    try {
      const created = await createPageMutation.mutateAsync({
        slug,
        enabled: true,
        titleByLocale: { en: `Welcome ${now}` },
        contentMarkdownByLocale: { en: '# Welcome\n\nEdit this content…' },
      });
      toast.success('Created');
      setSelectedPageId(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create');
    }
  };

  const handleSavePage = async () => {
    if (!selectedPageId || !pageDraft) return;
    try {
      await updatePageMutation.mutateAsync({ id: selectedPageId, input: pageDraft });
      toast.success('Saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleResetPage = () => {
    if (!selectedPageId) return;
    const selected = pages.find((p) => p.id === selectedPageId);
    if (!selected) return;
    setPageDraft(clonePageDraft(selected));
    toast.message('Reset to server state');
  };

  const handleDeletePage = async () => {
    if (!selectedPageId) return;
    const selected = pages.find((p) => p.id === selectedPageId);
    if (!selected) return;

    try {
      await deletePageMutation.mutateAsync(selectedPageId);
      toast.success('Deleted');
      setSelectedPageId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleMovePage = async (direction: 'up' | 'down') => {
    if (!selectedPageId) return;
    const index = pages.findIndex((p) => p.id === selectedPageId);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const ids = pages.map((p) => p.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, moved);

    try {
      await reorderPagesMutation.mutateAsync({ ids });
      toast.success('Reordered');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder');
    }
  };

  const selectedPage = selectedPageId ? (pages.find((p) => p.id === selectedPageId) ?? null) : null;

  const primaryActionLabel = configDraft?.primaryAction?.labelByLocale?.[configActionLocale] ?? '';
  const secondaryActionLabel =
    configDraft?.secondaryAction?.labelByLocale?.[configActionLocale] ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digest Welcome"
        description="Configure /welcome global behavior and manage welcome pages (server-driven, i18n-ready)."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {updatedAtLabel ? <Badge variant="secondary">Updated {updatedAtLabel}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCreatePage}
            disabled={createPageMutation.isPending}
          >
            New page
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <WelcomeConfigCard
            isLoading={configQuery.isLoading}
            isError={configQuery.isError}
            pages={pages}
            configDraft={configDraft}
            setConfigDraft={setConfigDraft}
            configActionLocale={configActionLocale}
            configActionNewLocale={configActionNewLocale}
            setConfigActionNewLocale={setConfigActionNewLocale}
            actionLocales={actionLocales}
            primaryActionLabel={primaryActionLabel}
            secondaryActionLabel={secondaryActionLabel}
            onApplyActionLocale={applyActionLocale}
            onAddActionLocale={handleAddActionLocale}
            onReset={handleResetConfig}
            onSave={handleSaveConfig}
            isSaving={updateConfigMutation.isPending}
          />

          <WelcomePagesCard
            isLoading={pagesQuery.isLoading}
            isError={pagesQuery.isError}
            pages={pages}
            selectedPageId={selectedPageId}
            onSelect={setSelectedPageId}
            onMove={handleMovePage}
            onDelete={handleDeletePage}
            isReordering={reorderPagesMutation.isPending}
            isDeleting={deletePageMutation.isPending}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <WelcomePageEditorCard
            selectedPage={selectedPage}
            pageDraft={pageDraft}
            setPageDraft={setPageDraft}
            locales={locales}
            activeLocale={activeLocale}
            setActiveLocale={setActiveLocale}
            newLocale={newLocale}
            setNewLocale={setNewLocale}
            onAddLocale={handleAddLocale}
            onReset={handleResetPage}
            onSave={handleSavePage}
            isSaving={updatePageMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
