'use client';

import {
  Alert01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
  Loading01Icon,
} from '@hugeicons/core-free-icons';
import { Toaster as Sonner } from 'sonner';

import { Icon } from './icon';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ theme = 'system', ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <Icon icon={CheckmarkCircle01Icon} className="h-4 w-4" />,
        info: <Icon icon={InformationCircleIcon} className="h-4 w-4" />,
        warning: <Icon icon={Alert01Icon} className="h-4 w-4" />,
        error: <Icon icon={CancelCircleIcon} className="h-4 w-4" />,
        loading: <Icon icon={Loading01Icon} className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border-muted group-[.toaster]:shadow-float group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
