/**
 * Welcome Config Card
 *
 * [PROPS]: viewModel/actions（配置草稿 + locale + 保存动作）
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
import { WelcomeActionEditorSection } from './WelcomeActionEditorSection';
import { resolveWelcomeConfigCardState } from './welcome-card-states';

interface WelcomeConfigCardProps {
  viewModel: WelcomeConfigCardViewModel;
  actions: WelcomeConfigCardActions;
}

export interface WelcomeConfigCardViewModel {
  isLoading: boolean;
  isError: boolean;
  pages: DigestWelcomePage[];
  configDraft: UpdateWelcomeConfigInput | null;
  configActionLocale: string;
  configActionNewLocale: string;
  actionLocales: string[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  isSaving: boolean;
}

export interface WelcomeConfigCardActions {
  setConfigDraft: Dispatch<SetStateAction<UpdateWelcomeConfigInput | null>>;
  onApplyActionLocale: (locale: string) => void;
  onActionNewLocaleChange: (value: string) => void;
  onAddActionLocale: () => void;
  onReset: () => void;
  onSave: () => void;
}

export function WelcomeConfigCard({ viewModel, actions }: WelcomeConfigCardProps) {
  const {
    isLoading,
    isError,
    pages,
    configDraft,
    configActionLocale,
    configActionNewLocale,
    actionLocales,
    primaryActionLabel,
    secondaryActionLabel,
    isSaving,
  } = viewModel;
  const {
    setConfigDraft,
    onApplyActionLocale,
    onActionNewLocaleChange,
    onAddActionLocale,
    onReset,
    onSave,
  } = actions;
  const state = resolveWelcomeConfigCardState({
    isLoading,
    hasError: isError,
    hasDraft: Boolean(configDraft),
  });

  const renderContentByState = () => {
    switch (state) {
      case 'loading':
        return <Skeleton className="h-24 w-full" />;
      case 'error':
        return <div className="text-sm text-destructive">Failed to load welcome config.</div>;
      case 'empty':
        return <div className="text-sm text-muted-foreground">Welcome config is unavailable.</div>;
      case 'ready':
        if (!configDraft) {
          return null;
        }

        return renderReadyContent(configDraft);
      default:
        return null;
    }
  };

  const renderReadyContent = (draft: UpdateWelcomeConfigInput) => {
    const selectablePages = pages.filter((page) => page.enabled);

    const applyPrimaryAction = (action: WelcomeAction | null) => {
      setConfigDraft({
        ...draft,
        primaryAction: action,
      });
    };

    const applySecondaryAction = (action: WelcomeAction | null) => {
      setConfigDraft({
        ...draft,
        secondaryAction: action,
      });
    };

    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Enabled</div>
            <div className="text-xs text-muted-foreground">
              When disabled, /welcome will still render but can be treated as empty state.
            </div>
          </div>
          <Switch
            checked={draft.enabled}
            onCheckedChange={(checked) => setConfigDraft({ ...draft, enabled: checked })}
          />
        </div>

        <div className="space-y-1">
          <Label>Default page</Label>
          <Select
            value={draft.defaultSlug}
            onValueChange={(value) => setConfigDraft({ ...draft, defaultSlug: value })}
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

        <WelcomeActionEditorSection
          title="Primary Action"
          description="Shown as the main CTA on /welcome right pane."
          action={draft.primaryAction}
          fallbackAction={{ action: 'openExplore', labelByLocale: { en: 'Explore topics' } }}
          locale={configActionLocale}
          labelValue={primaryActionLabel}
          onActionChange={applyPrimaryAction}
        />

        <WelcomeActionEditorSection
          title="Secondary Action"
          description="Optional secondary CTA."
          action={draft.secondaryAction}
          fallbackAction={{ action: 'openSignIn', labelByLocale: { en: 'Sign in' } }}
          locale={configActionLocale}
          labelValue={secondaryActionLabel}
          onActionChange={applySecondaryAction}
        />

        <div className="space-y-2 pt-2">
          <Label>Action locale</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select value={configActionLocale} onValueChange={onApplyActionLocale}>
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
                  onChange={(event) => onActionNewLocaleChange(event.target.value)}
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
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Config</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{renderContentByState()}</CardContent>
    </Card>
  );
}
