export interface RawConfigParseResult {
  hasError: boolean;
  value?: Record<string, unknown>;
}

export function parseRawConfigText(text: string): RawConfigParseResult {
  if (!text.trim()) {
    return { hasError: false, value: undefined };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { hasError: true };
    }
    return { hasError: false, value: parsed as Record<string, unknown> };
  } catch {
    return { hasError: true };
  }
}
