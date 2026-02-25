/**
 * Welcome Page Editor Card
 *
 * [PROPS]: selectedPage, pageDraft, locale state, callbacks
 * [POS]: Digest Welcome - 单页编辑器（slug/enabled/i18n title + markdown）
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
  Switch,
} from '@moryflow/ui';
import { NotionMarkdownEditor } from '@/components/markdown/NotionMarkdownEditor';
import type { DigestWelcomePage, UpdateWelcomePageInput } from '@/features/digest-welcome';
import { ensureLocaleRecordValue, toSlug } from './digest-welcome.utils';

interface WelcomePageEditorCardProps {
  selectedPage: DigestWelcomePage | null;
  pageDraft: UpdateWelcomePageInput | null;
  setPageDraft: Dispatch<SetStateAction<UpdateWelcomePageInput | null>>;
  locales: string[];
  activeLocale: string;
  setActiveLocale: Dispatch<SetStateAction<string>>;
  newLocale: string;
  setNewLocale: Dispatch<SetStateAction<string>>;
  onAddLocale: () => void;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function WelcomePageEditorCard({
  selectedPage,
  pageDraft,
  setPageDraft,
  locales,
  activeLocale,
  setActiveLocale,
  newLocale,
  setNewLocale,
  onAddLocale,
  onReset,
  onSave,
  isSaving,
}: WelcomePageEditorCardProps) {
  const currentTitle = pageDraft?.titleByLocale?.[activeLocale] ?? '';
  const currentMarkdown = pageDraft?.contentMarkdownByLocale?.[activeLocale] ?? '';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!selectedPage ? (
          <div className="text-sm text-muted-foreground">Select a page to edit.</div>
        ) : pageDraft ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input
                  value={pageDraft.slug}
                  onChange={(e) => setPageDraft({ ...pageDraft, slug: toSlug(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Enabled</div>
                  <div className="text-xs text-muted-foreground">Visible in /welcome list</div>
                </div>
                <Switch
                  checked={pageDraft.enabled}
                  onCheckedChange={(checked) => setPageDraft({ ...pageDraft, enabled: checked })}
                />
              </div>
            </div>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Locale</CardTitle>
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
                    onClick={onAddLocale}
                    disabled={!newLocale.trim()}
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-1">
              <Label>Title ({activeLocale})</Label>
              <Input
                value={currentTitle}
                onChange={(e) =>
                  setPageDraft({
                    ...pageDraft,
                    titleByLocale: {
                      ...pageDraft.titleByLocale,
                      [activeLocale]: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Markdown ({activeLocale})</Label>
              <NotionMarkdownEditor
                value={currentMarkdown}
                onChange={(markdown) =>
                  setPageDraft({
                    ...pageDraft,
                    contentMarkdownByLocale: {
                      ...pageDraft.contentMarkdownByLocale,
                      [activeLocale]: markdown,
                    },
                  })
                }
                placeholder="Write a welcome page…"
              />
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
