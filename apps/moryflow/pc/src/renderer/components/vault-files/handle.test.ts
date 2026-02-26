import { describe, expect, it } from 'vitest';
import type { VaultTreeNode } from '@shared/ipc';

import { parseDragData, sortNodes, validateDrop } from './handle';

const createNode = (overrides: Partial<VaultTreeNode>): VaultTreeNode => ({
  id: 'node-id',
  name: 'node',
  path: '/vault/node',
  type: 'file',
  ...overrides,
});

describe('vault-files/handle', () => {
  it('sortNodes puts folders first then sorts by name', () => {
    const nodes = [
      createNode({ id: 'f2', type: 'folder', name: 'z-folder', path: '/z-folder' }),
      createNode({ id: 'file2', type: 'file', name: 'b.md', path: '/b.md' }),
      createNode({ id: 'f1', type: 'folder', name: 'a-folder', path: '/a-folder' }),
      createNode({ id: 'file1', type: 'file', name: 'a.md', path: '/a.md' }),
    ];

    const sorted = sortNodes(nodes);
    expect(sorted.map((node) => node.id)).toEqual(['f1', 'f2', 'file1', 'file2']);
  });

  it('parseDragData returns null for invalid payload', () => {
    const dataTransfer = {
      getData: () => '{bad-json',
      types: ['application/json'],
    } as unknown as DataTransfer;

    expect(parseDragData(dataTransfer)).toBeNull();
  });

  it('parseDragData parses valid json payload', () => {
    const dataTransfer = {
      getData: () =>
        JSON.stringify({
          nodeId: 'n1',
          nodePath: '/vault/a.md',
          nodeType: 'file',
          nodeName: 'a.md',
        }),
      types: ['application/json'],
    } as unknown as DataTransfer;

    expect(parseDragData(dataTransfer)).toEqual({
      nodeId: 'n1',
      nodePath: '/vault/a.md',
      nodeType: 'file',
      nodeName: 'a.md',
    });
  });

  it('validateDrop blocks invalid targets and allows valid folder targets', () => {
    const fileTarget = createNode({ id: 'file-target', type: 'file', path: '/vault/file.md' });
    const folderTarget = createNode({ id: 'folder-target', type: 'folder', path: '/vault/folder' });
    const dragData = {
      nodeId: 'drag-id',
      nodePath: '/vault/drag',
      nodeType: 'folder' as const,
      nodeName: 'drag',
    };

    expect(validateDrop(dragData, fileTarget)).toEqual({
      canDrop: false,
      reasonKey: 'onlyMoveToFolder',
    });

    expect(
      validateDrop(
        {
          ...dragData,
          nodeId: 'folder-target',
        },
        folderTarget
      )
    ).toEqual({
      canDrop: false,
      reasonKey: 'cannotMoveToSelf',
    });

    expect(
      validateDrop(
        {
          ...dragData,
          nodePath: '/vault/folder',
        },
        createNode({ id: 'sub', type: 'folder', path: '/vault/folder/sub' })
      )
    ).toEqual({
      canDrop: false,
      reasonKey: 'cannotMoveToSubfolder',
    });

    expect(validateDrop(dragData, folderTarget)).toEqual({ canDrop: true });
  });
});
