import { Loader, type LucideProps } from 'lucide-react';

import { cn } from '../lib/utils';

function Spinner({ className, ...props }: Omit<LucideProps, 'ref'>) {
  return (
    <Loader
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
