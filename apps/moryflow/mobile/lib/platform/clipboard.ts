/**
 * [PROVIDES]: copyTextToClipboard - Mobile 端跨平台复制能力（web/native）
 * [DEPENDS]: react-native Platform, expo-clipboard（动态加载）
 * [POS]: ToolContent 等交互组件复制行为的统一能力入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Platform } from 'react-native';

type WebClipboard = {
  writeText: (text: string) => Promise<void>;
};

export type ClipboardDeps = {
  platformOS: string;
  webClipboard?: WebClipboard;
  writeNativeText: (text: string) => Promise<void>;
};

const getDefaultClipboardDeps = (): ClipboardDeps => ({
  platformOS: Platform.OS,
  webClipboard:
    typeof navigator !== 'undefined' && navigator.clipboard
      ? {
          writeText: (text: string) => navigator.clipboard.writeText(text),
        }
      : undefined,
  writeNativeText: async (text: string) => {
    const module = await import('expo-clipboard');
    await module.setStringAsync(text);
  },
});

export async function copyTextToClipboard(
  text: string,
  deps: ClipboardDeps = getDefaultClipboardDeps()
): Promise<boolean> {
  if (!text) {
    return false;
  }

  try {
    if (deps.platformOS === 'web' && deps.webClipboard?.writeText) {
      await deps.webClipboard.writeText(text);
      return true;
    }

    await deps.writeNativeText(text);
    return true;
  } catch {
    return false;
  }
}
