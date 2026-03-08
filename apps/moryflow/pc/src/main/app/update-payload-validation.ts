type SkipVersionPayloadParseResult = {
  isValid: boolean;
  version: string | null | undefined;
};

export const parseSkipVersionPayload = (payload: unknown): SkipVersionPayloadParseResult => {
  if (typeof payload === 'undefined') {
    return {
      isValid: true,
      version: undefined,
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      version: undefined,
    };
  }

  if (!('version' in payload)) {
    return {
      isValid: true,
      version: undefined,
    };
  }

  const candidate = (payload as { version?: unknown }).version;
  if (candidate === null) {
    return {
      isValid: true,
      version: null,
    };
  }

  if (typeof candidate === 'string') {
    return {
      isValid: true,
      version: candidate,
    };
  }

  return {
    isValid: false,
    version: undefined,
  };
};
