/**
 * [PROPS]: message
 * [EMITS]: none
 * [POS]: 列表 empty 状态片段
 */

export interface ListEmptyStateProps {
  message: string;
  className?: string;
  messageClassName?: string;
}

export function ListEmptyState({
  message,
  className = 'text-center py-12',
  messageClassName = 'text-muted-foreground',
}: ListEmptyStateProps) {
  return (
    <div className={className}>
      <p className={messageClassName}>{message}</p>
    </div>
  );
}
