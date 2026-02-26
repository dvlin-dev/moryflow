export function getCreditsCycleSuffix(cycle?: string): string {
  if (cycle === 'monthly' || cycle === 'yearly') {
    return '/月';
  }
  return '';
}
