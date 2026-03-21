const MAX_RECENT_FILES = 3;

export const buildRecentFilesList = (current: string[], nextPath: string): string[] => {
  const filtered = current.filter((path) => path !== nextPath);
  return [nextPath, ...filtered].slice(0, MAX_RECENT_FILES);
};
