import path from 'node:path';

export const resolveRendererRoot = (): string => path.resolve(__dirname, '../../../../renderer');

export const resolveRendererIndexPath = (): string =>
  path.join(resolveRendererRoot(), 'index.html');
