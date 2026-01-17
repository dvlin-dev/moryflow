/**
 * Digest Welcome Page
 *
 * [PROPS]: None
 * [POS]: Admin - Welcome 配置编辑（支持多语言 map + Markdown 编辑）
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@anyhunt/ui';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
} from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import { NotionMarkdownEditor } from '@/components/markdown/NotionMarkdownEditor';
import {
  useAdminWelcomeConfig,
  useUpdateAdminWelcomeConfig,
  type DigestWelcomeConfig,
  type UpdateWelcomeInput,
} from '@/features/digest-welcome';

type ActionType = 'openExplore' | 'openSignIn';
type LocaleRecord = Record<string, string>;

function cloneDraft(config: DigestWelcomeConfig): UpdateWelcomeInput {
  return {
    enabled: config.enabled,
    titleByLocale: { ...(config.titleByLocale as LocaleRecord) },
    contentMarkdownByLocale: { ...(config.contentMarkdownByLocale as LocaleRecord) },
    primaryAction: config.primaryAction ? { ...config.primaryAction } : null,
    secondaryAction: config.secondaryAction ? { ...config.secondaryAction } : null,
  };
}

function collectLocales(config: UpdateWelcomeInput | null): string[] {
  if (!config) return ['en'];
  const keys = new Set<string>();
  Object.keys(config.titleByLocale ?? {}).forEach((k) => keys.add(k));
  Object.keys(config.contentMarkdownByLocale ?? {}).forEach((k) => keys.add(k));
  Object.keys(config.primaryAction?.labelByLocale ?? {}).forEach((k) => keys.add(k));
  Object.keys(config.secondaryAction?.labelByLocale ?? {}).forEach((k) => keys.add(k));
  keys.add('en');
  return Array.from(keys);
}

function ensureLocaleRecordValue(record: LocaleRecord, locale: string): LocaleRecord {
  if (record[locale] !== undefined) return record;
  return { ...record, [locale]: '' };
}

export default function DigestWelcomePage() {
  const welcomeQuery = useAdminWelcomeConfig();
  const updateMutation = useUpdateAdminWelcomeConfig();

  const [draft, setDraft] = useState<UpdateWelcomeInput | null>(null);
  const [activeLocale, setActiveLocale] = useState('en');
  const [newLocale, setNewLocale] = useState('');

  useEffect(() => {
    if (!welcomeQuery.data) return;
    setDraft(cloneDraft(welcomeQuery.data));
  }, [welcomeQuery.data]);

  const locales = useMemo(() => collectLocales(draft), [draft]);

  useEffect(() => {
    if (!locales.includes(activeLocale)) {
      setActiveLocale(locales[0] ?? 'en');
    }
  }, [locales, activeLocale]);

  const updatedAtLabel = welcomeQuery.data?.updatedAt
    ? formatRelativeTime(new Date(welcomeQuery.data.updatedAt))
    : null;

  const applyLocale = (nextLocale: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      titleByLocale: ensureLocaleRecordValue(draft.titleByLocale, nextLocale),
      contentMarkdownByLocale: ensureLocaleRecordValue(draft.contentMarkdownByLocale, nextLocale),
      primaryAction: draft.primaryAction
        ? {
            ...draft.primaryAction,
            labelByLocale: ensureLocaleRecordValue(draft.primaryAction.labelByLocale, nextLocale),
          }
        : null,
      secondaryAction: draft.secondaryAction
        ? {
            ...draft.secondaryAction,
            labelByLocale: ensureLocaleRecordValue(draft.secondaryAction.labelByLocale, nextLocale),
          }
        : null,
    });
    setActiveLocale(nextLocale);
  };

  const handleAddLocale = () => {
    const locale = newLocale.trim();
    if (!locale) return;
    setNewLocale('');
    applyLocale(locale);
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateMutation.mutateAsync(draft);
      toast.success('Saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleReset = () => {
    if (!welcomeQuery.data) return;
    setDraft(cloneDraft(welcomeQuery.data));
    toast.message('Reset to server state');
  };

  const hasDraft = Boolean(draft);

  const currentTitle = draft?.titleByLocale?.[activeLocale] ?? '';
  const currentMarkdown = draft?.contentMarkdownByLocale?.[activeLocale] ?? '';

  const primaryActionType = draft?.primaryAction?.action ?? null;
  const primaryLabel = draft?.primaryAction?.labelByLocale?.[activeLocale] ?? '';

  const secondaryActionType = draft?.secondaryAction?.action ?? null;
  const secondaryLabel = draft?.secondaryAction?.labelByLocale?.[activeLocale] ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digest Welcome"
        description="Configure the /welcome page content (server-driven, i18n-ready)."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {updatedAtLabel ? <Badge variant="secondary">Updated {updatedAtLabel}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!welcomeQuery.data}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasDraft || updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {welcomeQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : welcomeQuery.isError ? (
            <div className="text-sm text-destructive">Failed to load config.</div>
          ) : draft ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Enabled</div>
                <div className="text-xs text-muted-foreground">
                  When disabled, /welcome can render as empty state in the reader.
                </div>
              </div>
              <Switch
                checked={draft.enabled}
                onCheckedChange={(checked) => setDraft({ ...draft, enabled: checked })}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locale</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>Active locale</Label>
            <Select value={activeLocale} onValueChange={(v) => applyLocale(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {locale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-1 gap-2">
            <div className="flex-1 space-y-1">
              <Label>Add locale</Label>
              <Input
                value={newLocale}
                placeholder="e.g. zh-CN"
                onChange={(e) => setNewLocale(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddLocale}
              disabled={!draft || !newLocale.trim()}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!draft ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="space-y-1">
                <Label>Title ({activeLocale})</Label>
                <Input
                  value={currentTitle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      titleByLocale: { ...draft.titleByLocale, [activeLocale]: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Markdown ({activeLocale})</Label>
                <NotionMarkdownEditor
                  value={currentMarkdown}
                  onChange={(nextMarkdown) =>
                    setDraft({
                      ...draft,
                      contentMarkdownByLocale: {
                        ...draft.contentMarkdownByLocale,
                        [activeLocale]: nextMarkdown,
                      },
                    })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!draft ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="space-y-3">
                <div className="text-sm font-medium">Primary action</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Action</Label>
                    <Select
                      value={primaryActionType ?? 'none'}
                      onValueChange={(v) => {
                        if (v === 'none') {
                          setDraft({ ...draft, primaryAction: null });
                          return;
                        }
                        const nextAction: ActionType = v as ActionType;
                        const next = draft.primaryAction ?? {
                          action: nextAction,
                          labelByLocale: {},
                        };
                        setDraft({
                          ...draft,
                          primaryAction: {
                            ...next,
                            action: nextAction,
                            labelByLocale: ensureLocaleRecordValue(
                              next.labelByLocale,
                              activeLocale
                            ),
                          },
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="openExplore">Open Explore</SelectItem>
                        <SelectItem value="openSignIn">Open Sign in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Label ({activeLocale})</Label>
                    <Input
                      value={primaryLabel}
                      disabled={!draft.primaryAction}
                      onChange={(e) => {
                        if (!draft.primaryAction) return;
                        setDraft({
                          ...draft,
                          primaryAction: {
                            ...draft.primaryAction,
                            labelByLocale: {
                              ...draft.primaryAction.labelByLocale,
                              [activeLocale]: e.target.value,
                            },
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Secondary action</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Action</Label>
                    <Select
                      value={secondaryActionType ?? 'none'}
                      onValueChange={(v) => {
                        if (v === 'none') {
                          setDraft({ ...draft, secondaryAction: null });
                          return;
                        }
                        const nextAction: ActionType = v as ActionType;
                        const next = draft.secondaryAction ?? {
                          action: nextAction,
                          labelByLocale: {},
                        };
                        setDraft({
                          ...draft,
                          secondaryAction: {
                            ...next,
                            action: nextAction,
                            labelByLocale: ensureLocaleRecordValue(
                              next.labelByLocale,
                              activeLocale
                            ),
                          },
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="openExplore">Open Explore</SelectItem>
                        <SelectItem value="openSignIn">Open Sign in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Label ({activeLocale})</Label>
                    <Input
                      value={secondaryLabel}
                      disabled={!draft.secondaryAction}
                      onChange={(e) => {
                        if (!draft.secondaryAction) return;
                        setDraft({
                          ...draft,
                          secondaryAction: {
                            ...draft.secondaryAction,
                            labelByLocale: {
                              ...draft.secondaryAction.labelByLocale,
                              [activeLocale]: e.target.value,
                            },
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
