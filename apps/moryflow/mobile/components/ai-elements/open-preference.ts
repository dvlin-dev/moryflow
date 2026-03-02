/**
 * Chat 可折叠段落开合偏好（移动端适配层）
 *
 * 约束：
 * - manualOpenPreference 仅表示用户手动操作（null 表示未手动干预）
 * - autoOpen 仅表示运行态自动展开策略
 */

export type ManualOpenPreference = boolean | null;

export function resolveOpenStateFromPreference({
  manualOpenPreference,
  autoOpen,
}: {
  manualOpenPreference: ManualOpenPreference;
  autoOpen: boolean;
}): boolean {
  return manualOpenPreference ?? autoOpen;
}

export function getNextManualOpenPreference({
  manualOpenPreference,
  autoOpen,
}: {
  manualOpenPreference: ManualOpenPreference;
  autoOpen: boolean;
}): boolean {
  return !resolveOpenStateFromPreference({ manualOpenPreference, autoOpen });
}
