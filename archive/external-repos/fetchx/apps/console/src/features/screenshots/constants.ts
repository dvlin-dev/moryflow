/**
 * Screenshots 常量定义
 */

export const SCREENSHOT_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: 'Pending', variant: 'outline' },
  PROCESSING: { label: 'Processing', variant: 'secondary' },
  COMPLETED: { label: 'Completed', variant: 'default' },
  FAILED: { label: 'Failed', variant: 'destructive' },
}
