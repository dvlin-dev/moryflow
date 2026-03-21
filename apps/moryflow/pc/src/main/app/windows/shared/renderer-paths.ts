import path from 'node:path';

export const resolveRendererRootFrom = (baseDir: string): string =>
  path.resolve(baseDir, '../renderer');

export const resolveRendererRoot = (): string => resolveRendererRootFrom(__dirname);

export const resolveRendererIndexPathFrom = (baseDir: string): string =>
  path.join(resolveRendererRootFrom(baseDir), 'index.html');

export const resolveRendererIndexPath = (): string => resolveRendererIndexPathFrom(__dirname);
