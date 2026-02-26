/**
 * [PROVIDES]: digest mutation error message helper
 * [POS]: normalize unknown mutation errors for user-friendly toasts
 */

export function resolveMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
