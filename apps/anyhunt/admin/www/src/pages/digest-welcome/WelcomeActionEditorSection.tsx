/**
 * Welcome Action Editor Section
 *
 * [PROPS]: action draft + locale label + callbacks
 * [POS]: Digest Welcome Config Card action editor fragment
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@moryflow/ui';
import type { WelcomeAction } from '@/features/digest-welcome';

export interface WelcomeActionEditorSectionProps {
  title: string;
  description: string;
  action: WelcomeAction | null;
  fallbackAction: WelcomeAction;
  locale: string;
  labelValue: string;
  onActionChange: (action: WelcomeAction | null) => void;
}

export function WelcomeActionEditorSection({
  title,
  description,
  action,
  fallbackAction,
  locale,
  labelValue,
  onActionChange,
}: WelcomeActionEditorSectionProps) {
  const handleEnabledChange = (enabled: boolean) => {
    onActionChange(enabled ? fallbackAction : null);
  };

  const handleTypeChange = (nextAction: WelcomeAction['action']) => {
    if (!action) {
      return;
    }

    onActionChange({
      ...action,
      action: nextAction,
    });
  };

  const handleLabelChange = (nextLabel: string) => {
    if (!action) {
      return;
    }

    onActionChange({
      ...action,
      labelByLocale: {
        ...action.labelByLocale,
        [locale]: nextLabel,
      },
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="text-sm font-medium">{title}</div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">{description}</div>
        <Switch checked={Boolean(action)} onCheckedChange={handleEnabledChange} />
      </div>

      {action ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={action.action}
              onValueChange={(value) => handleTypeChange(value as WelcomeAction['action'])}
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
            <Label>Label ({locale})</Label>
            <Input value={labelValue} onChange={(event) => handleLabelChange(event.target.value)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
