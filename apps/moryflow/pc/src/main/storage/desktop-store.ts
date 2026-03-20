import path from 'node:path';
import Store from 'electron-store';

const resolveDesktopStoreDir = (): string | undefined => {
  const e2eUserData = process.env['MORYFLOW_E2E_USER_DATA']?.trim();
  if (!e2eUserData) {
    return undefined;
  }
  return path.join(e2eUserData, 'stores');
};

export const createDesktopStore = <T extends Record<string, unknown>>(input: {
  name: string;
  defaults?: T;
}) => {
  const cwd = resolveDesktopStoreDir();

  return new Store<T>({
    name: input.name,
    ...(cwd ? { cwd } : {}),
    ...(input.defaults ? { defaults: input.defaults } : {}),
  });
};
