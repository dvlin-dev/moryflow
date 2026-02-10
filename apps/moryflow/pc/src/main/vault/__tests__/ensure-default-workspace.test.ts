/* @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getPathMock = vi.hoisted(() => vi.fn());
const showOpenDialogMock = vi.hoisted(() => vi.fn());
const showErrorBoxMock = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  app: {
    getPath: getPathMock,
  },
  dialog: {
    showOpenDialog: showOpenDialogMock,
    showErrorBox: showErrorBoxMock,
  },
}));

const accessMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: accessMock,
    mkdir: mkdirMock,
  };
});

vi.mock('../const.js', () => ({
  vaultCreateSchema: { parse: (value: unknown) => value },
  vaultOpenSchema: { parse: (value: unknown) => value },
}));

const addVaultMock = vi.hoisted(() => vi.fn());
const getActiveVaultMock = vi.hoisted(() => vi.fn());
const getVaultsMock = vi.hoisted(() => vi.fn());
const setActiveVaultIdMock = vi.hoisted(() => vi.fn());

vi.mock('../store.js', () => ({
  addVault: addVaultMock,
  getActiveVault: getActiveVaultMock,
  getVaultById: vi.fn(),
  getVaultByPath: vi.fn(),
  getVaults: getVaultsMock,
  setActiveVaultId: setActiveVaultIdMock,
}));

import { ensureDefaultWorkspace } from '../context';

describe('ensureDefaultWorkspace', () => {
  beforeEach(() => {
    getPathMock.mockReset();
    showOpenDialogMock.mockReset();
    showErrorBoxMock.mockReset();

    accessMock.mockReset();
    mkdirMock.mockReset();

    addVaultMock.mockReset();
    getActiveVaultMock.mockReset();
    getVaultsMock.mockReset();
    setActiveVaultIdMock.mockReset();
  });

  it('returns active vault when accessible', async () => {
    getActiveVaultMock.mockReturnValue({
      id: 'vault-1',
      path: '/vault/one',
      name: 'one',
    });
    accessMock.mockResolvedValue(undefined);

    const result = await ensureDefaultWorkspace();

    expect(result?.path).toBe('/vault/one');
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(addVaultMock).not.toHaveBeenCalled();
    expect(setActiveVaultIdMock).not.toHaveBeenCalled();
  });

  it('falls back to the first accessible vault in the list', async () => {
    getActiveVaultMock.mockReturnValue(null);
    getVaultsMock.mockReturnValue([
      { id: 'vault-a', path: '/vault/a', name: 'a' },
      { id: 'vault-b', path: '/vault/b', name: 'b' },
    ]);
    accessMock.mockImplementation(async (targetPath: string) => {
      if (targetPath === '/vault/a') {
        throw new Error('denied');
      }
      return undefined;
    });

    const result = await ensureDefaultWorkspace();

    expect(result?.id).toBe('vault-b');
    expect(setActiveVaultIdMock).toHaveBeenCalledWith('vault-b');
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(addVaultMock).not.toHaveBeenCalled();
  });

  it('creates the default workspace when no vault is usable', async () => {
    getActiveVaultMock.mockReturnValue(null);
    getVaultsMock.mockReturnValue([]);
    getPathMock.mockReturnValue('/Documents');
    mkdirMock.mockResolvedValue(undefined);
    accessMock.mockResolvedValue(undefined);
    addVaultMock.mockReturnValue({
      id: 'vault-default',
      path: '/Documents/Moryflow/workspace',
      name: 'workspace',
    });

    const result = await ensureDefaultWorkspace();

    expect(mkdirMock).toHaveBeenCalledWith('/Documents/Moryflow/workspace', { recursive: true });
    expect(addVaultMock).toHaveBeenCalledWith('/Documents/Moryflow/workspace', 'workspace');
    expect(result?.path).toBe('/Documents/Moryflow/workspace');
  });

  it('returns null when creating the default workspace fails', async () => {
    getActiveVaultMock.mockReturnValue(null);
    getVaultsMock.mockReturnValue([]);
    getPathMock.mockReturnValue('/Documents');
    mkdirMock.mockRejectedValue(new Error('boom'));

    const result = await ensureDefaultWorkspace();

    expect(result).toBeNull();
  });
});
