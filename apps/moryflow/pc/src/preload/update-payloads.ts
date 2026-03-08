export const createSkipVersionPayload = (version?: string | null) => {
  if (typeof version === 'undefined') {
    return {};
  }
  return { version };
};
