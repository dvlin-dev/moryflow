/**
 * 分页组件
 */

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Button, Icon } from '@aiget/ui';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({ currentPage, totalPages, onPrevious, onNext }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="sm" onClick={onPrevious} disabled={currentPage <= 1}>
        <Icon icon={ArrowLeft01Icon} className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={currentPage >= totalPages}>
        Next
        <Icon icon={ArrowRight01Icon} className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
