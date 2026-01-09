import { Loading01Icon } from '@hugeicons/core-free-icons';

import { cn } from '../lib/utils';
import { Icon } from './icon';

function Spinner({ className, ...props }: Omit<React.ComponentProps<typeof Icon>, 'icon'>) {
  return (
    <Icon
      icon={Loading01Icon}
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
