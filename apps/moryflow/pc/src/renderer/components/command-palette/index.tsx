import { Fragment } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@moryflow/ui/components/command';
import { useTranslation } from '@/lib/i18n';
import type { CommandPaletteProps } from './const';
import { groupActions } from './handle';

export const CommandPalette = ({ open, onOpenChange, actions }: CommandPaletteProps) => {
  const { t } = useTranslation('workspace');
  const groupedActions = groupActions(actions);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('searchPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('noResultsFound')}</CommandEmpty>
        {groupedActions.map(([group, items], index) => (
          <Fragment key={group}>
            <CommandGroup heading={group}>
              {items.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.label}
                  disabled={action.disabled}
                  onSelect={() => {
                    if (action.disabled) {
                      return;
                    }
                    void action.handler();
                    onOpenChange(false);
                  }}
                >
                  <div className="flex flex-1 flex-col">
                    <span>{action.label}</span>
                    {action.description && (
                      <span className="text-xs text-muted-foreground">{action.description}</span>
                    )}
                  </div>
                  {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
            {index < groupedActions.length - 1 && <CommandSeparator />}
          </Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
};
