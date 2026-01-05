/**
 * [PROVIDES]: iOS 风格 Settings 组件集
 * [DEPENDS]: const.ts, components/*
 * [POS]: Settings 模块统一导出入口
 */

// 组件
export { SettingsGroup } from './components/settings-group'
export { SettingsRow } from './components/settings-row'
export { SettingsSeparator } from './components/settings-separator'
export { SectionHeader } from './components/section-header'
export { LanguageSelector } from './language-selector'

// 类型
export type {
  SettingsRowProps,
  SettingsGroupProps,
  SettingsSeparatorProps,
  SectionHeaderProps,
} from './const'
