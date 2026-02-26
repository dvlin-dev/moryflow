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
import { toSlug } from './digest-welcome.utils';
import { resolveWelcomePageEditorState } from './welcome-card-states';

interface WelcomePageEditorCardProps {
  selectedPage: DigestWelcomePage | null;
  pageDraft: UpdateWelcomePageInput | null;
  setPageDraft: Dispatch<SetStateAction<UpdateWelcomePageInput | null>>;
  locales: string[];
  activeLocale: string;
  onApplyLocale: (locale: string) => void;
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
  onApplyLocale,
  newLocale,
  setNewLocale,
  onAddLocale,
  onReset,
  onSave,
  isSaving,
}: WelcomePageEditorCardProps) {
  const state = resolveWelcomePageEditorState({
    hasSelectedPage: Boolean(selectedPage),
    hasPageDraft: Boolean(pageDraft),
  });

  const renderContentByState = () => {
    switch (state) {
      case 'idle':
        return <div className="text-sm text-muted-foreground">Select a page to edit.</div>;
      case 'loading':
        return <div className="text-sm text-muted-foreground">Loading page draft...</div>;
      case 'ready':
        if (!pageDraft) {
          return null;
        }

        return renderEditor(pageDraft);
      default:
        return null;
    }
  };

  const renderEditor = (draft: UpdateWelcomePageInput) => {
    const currentTitle = draft.titleByLocale?.[activeLocale] ?? '';
    const currentMarkdown = draft.contentMarkdownByLocale?.[activeLocale] ?? '';

    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input
              value={draft.slug}
              onChange={(event) => setPageDraft({ ...draft, slug: toSlug(event.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Enabled</div>
              <div className="text-xs text-muted-foreground">Visible in /welcome list</div>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(checked) => setPageDraft({ ...draft, enabled: checked })}
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
              <Select value={activeLocale} onValueChange={onApplyLocale}>
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
                  onChange={(event) => setNewLocale(event.target.value)}
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
            onChange={(event) =>
              setPageDraft({
                ...draft,
                titleByLocale: {
                  ...draft.titleByLocale,
                  [activeLocale]: event.target.value,
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
                ...draft,
                contentMarkdownByLocale: {
                  ...draft.contentMarkdownByLocale,
                  [activeLocale]: markdown,
                },
              })
            }
            placeholder="Write a welcome page..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">{renderContentByState()}</CardContent>
    </Card>
  );
}
