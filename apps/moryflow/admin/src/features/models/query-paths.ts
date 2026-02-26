/**
 * Models API 路径构造
 */

export function buildModelsListPath(providerId?: string): string {
  const searchParams = new URLSearchParams();
  if (providerId) {
    searchParams.set('providerId', providerId);
  }
  const query = searchParams.toString();
  return query ? `/ai/models?${query}` : '/ai/models';
}
