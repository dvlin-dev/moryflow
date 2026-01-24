import { Add01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { Button } from '@anyhunt/ui/components/button';
import { Icon } from '@anyhunt/ui/components/icon';

export const LoadingHint = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
    <Icon icon={Loading03Icon} className="size-5 animate-spin" />
    <span>{text}</span>
  </div>
);

export const EmptyHint = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground">{text}</p>
);

export const SectionHeader = ({ title, onAdd }: { title: string; onAdd: () => void }) => (
  <div className="flex items-center justify-between">
    <h4 className="text-sm font-semibold">{title}</h4>
    <Button type="button" size="sm" variant="outline" onClick={onAdd}>
      <Icon icon={Add01Icon} className="mr-2 size-4" />
      Add
    </Button>
  </div>
);

export const ErrorText = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null;
