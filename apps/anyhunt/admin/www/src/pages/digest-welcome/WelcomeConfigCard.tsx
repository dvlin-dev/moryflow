/**
 * Welcome Config Card
 *
 * [PROPS]: configDraft, pages, callbacks/state setters
 * [POS]: Digest Welcome - 全局配置卡片（enabled/defaultSlug/actions）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { Dispatch, SetStateAction } from 'react';
import {
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
} from '@moryflow/ui';
import type {
  DigestWelcomePage,
  UpdateWelcomeConfigInput,
  WelcomeAction,
} from '@/features/digest-welcome';

interface WelcomeConfigCardProps {
  isLoading: boolean;
  isError: boolean;
  pages: DigestWelcomePage[];
  configDraft: UpdateWelcomeConfigInput | null;
  setConfigDraft: Dispatch<SetStateAction<UpdateWelcomeConfigInput | null>>;
  configActionLocale: string;
  configActionNewLocale: string;
  setConfigActionNewLocale: Dispatch<SetStateAction<string>>;
  actionLocales: string[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onApplyActionLocale: (locale: string) => void;
  onAddActionLocale: () => void;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function WelcomeConfigCard({
  isLoading,
  isError,
  pages,
  configDraft,
  setConfigDraft,
  configActionLocale,
  configActionNewLocale,
  setConfigActionNewLocale,
  actionLocales,
  primaryActionLabel,
  secondaryActionLabel,
  onApplyActionLocale,
  onAddActionLocale,
  onReset,
  onSave,
  isSaving,
}: WelcomeConfigCardProps) {
  const selectablePages = pages.filter((p) => p.enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Config</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <div className="text-sm text-destructive">Failed to load welcome config.</div>
        ) : configDraft ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Enabled</div>
                <div className="text-xs text-muted-foreground">
                  When disabled, /welcome will still render but can be treated as empty state.
                </div>
              </div>
              <Switch
                checked={configDraft.enabled}
                onCheckedChange={(checked) => setConfigDraft({ ...configDraft, enabled: checked })}
              />
            </div>

            <div className="space-y-1">
              <Label>Default page</Label>
              <Select
                value={configDraft.defaultSlug}
                onValueChange={(v) => setConfigDraft({ ...configDraft, defaultSlug: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {selectablePages.map((page) => (
                    <SelectItem key={page.slug} value={page.slug}>
                      {page.titleByLocale?.en || page.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="text-sm font-medium">Primary Action</div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Shown as the main CTA on /welcome right pane.
                </div>
                <Switch
                  checked={Boolean(configDraft.primaryAction)}
                  onCheckedChange={(checked) => {
                    setConfigDraft({
                      ...configDraft,
                      primaryAction: checked
                        ? {
                            action: 'openExplore',
                            labelByLocale: { en: 'Explore topics' },
                          }
                        : null,
                    });
                  }}
                />
              </div>

              {configDraft.primaryAction ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select
                      value={configDraft.primaryAction.action}
                      onValueChange={(v) =>
                        setConfigDraft({
                          ...configDraft,
                          primaryAction: {
                            ...configDraft.primaryAction!,
                            action: v as WelcomeAction['action'],
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openExplore">Open explore</SelectItem>
                        <SelectItem value="openSignIn">Open sign in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Label ({configActionLocale})</Label>
                    <Input
                      value={primaryActionLabel}
                      onChange={(e) =>
                        setConfigDraft({
                          ...configDraft,
                          primaryAction: {
                            ...configDraft.primaryAction!,
                            labelByLocale: {
                              ...configDraft.primaryAction!.labelByLocale,
                              [configActionLocale]: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="text-sm font-medium">Secondary Action</div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">Optional secondary CTA.</div>
                <Switch
                  checked={Boolean(configDraft.secondaryAction)}
                  onCheckedChange={(checked) => {
                    setConfigDraft({
                      ...configDraft,
                      secondaryAction: checked
                        ? {
                            action: 'openSignIn',
                            labelByLocale: { en: 'Sign in' },
                          }
                        : null,
                    });
                  }}
                />
              </div>

              {configDraft.secondaryAction ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select
                      value={configDraft.secondaryAction.action}
                      onValueChange={(v) =>
                        setConfigDraft({
                          ...configDraft,
                          secondaryAction: {
                            ...configDraft.secondaryAction!,
                            action: v as WelcomeAction['action'],
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openExplore">Open explore</SelectItem>
                        <SelectItem value="openSignIn">Open sign in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Label ({configActionLocale})</Label>
                    <Input
                      value={secondaryActionLabel}
                      onChange={(e) =>
                        setConfigDraft({
                          ...configDraft,
                          secondaryAction: {
                            ...configDraft.secondaryAction!,
                            labelByLocale: {
                              ...configDraft.secondaryAction!.labelByLocale,
                              [configActionLocale]: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 pt-2">
              <Label>Action locale</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Select value={configActionLocale} onValueChange={(v) => onApplyActionLocale(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionLocales.map((locale) => (
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
                      value={configActionNewLocale}
                      placeholder="e.g. zh-CN"
                      onChange={(e) => setConfigActionNewLocale(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onAddActionLocale}
                    disabled={!configActionNewLocale.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onReset}>
                Reset
              </Button>
              <Button onClick={onSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
