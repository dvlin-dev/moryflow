/**
 * [PROPS]: message / className / messageClassName
 * [EMITS]: none
 * [POS]: 列表 error 状态片段
 */

export interface ListErrorStateProps {
  message: string;
  className?: string;
  messageClassName?: string;
}

export function ListErrorState({
  message,
  className = 'text-center py-12',
  messageClassName = 'text-destructive',
}: ListErrorStateProps) {
  return (
    <div className={className}>
      <p className={messageClassName}>{message}</p>
    </div>
  );
}
