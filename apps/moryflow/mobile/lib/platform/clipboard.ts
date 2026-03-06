/**
 * [PROVIDES]: copyTextToClipboard - Mobile 端跨平台复制能力（web/native）
 * [DEPENDS]: react-native Platform, expo-clipboard（动态加载）
 * [POS]: ToolContent 等交互组件复制行为的统一能力入口
 * [UPDATE]: 2026-03-05 - native clipboard 改为动态导入，避免 Node/Vitest 环境执行 RN 模块初始化
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
