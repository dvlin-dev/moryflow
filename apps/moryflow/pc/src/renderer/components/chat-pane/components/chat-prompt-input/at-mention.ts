/**
 * [PROVIDES]: detectAtTrigger/removeAtTrigger - @ 触发检测与移除工具
 * [DEPENDS]: none
 * [POS]: Chat Prompt 输入框 @ 引用辅助函数
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

type AtTriggerInput = {
  previousValue: string;
  nextValue: string;
  caretIndex: number;
  insertedData?: string | null;
};

export const detectAtTrigger = ({
  previousValue,
  nextValue,
  caretIndex,
  insertedData,
}: AtTriggerInput): number | null => {
  const insertedIndex = Math.max(0, caretIndex - 1);
  const didInsert = nextValue.length > previousValue.length;
  const insertedChar = nextValue.charAt(insertedIndex);

  if (insertedData === '@' || (didInsert && insertedChar === '@')) {
    return insertedIndex;
  }

  return null;
};

export const removeAtTrigger = (value: string, index: number | null) => {
  if (index === null || index < 0 || index >= value.length) {
    return value;
  }
  return value.slice(0, index) + value.slice(index + 1);
};
