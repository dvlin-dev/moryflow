# Zeego / React Native iOS Context Menu 集成交接文档

## 1. 项目背景
- **环境**: Monorepo (pnpm), Expo SDK 54, React Native 0.81 (新架构环境，但运行在兼容模式)。
- **目标**: 启用 `zeego` 以实现带有毛玻璃效果的原生 iOS 上下文菜单。
- **当前状态**: App 可以运行，但在触发菜单时崩溃。

## 2. 已完成工作
- **依赖版本更新**: 已更新至兼容 Expo 54 / RN 0.81 的版本：
  - `react-native-ios-context-menu`: **v3.2.1** (修复了 RCT-Folly 问题)
  - `react-native-ios-utilities`: **v5.2.0**
  - `zeego`: **v3.0.6**
- **Metro 修复**: 修复了由多个 React 实例引起的 "Invalid hook call" 错误。
  - **已应用修复**: 更新了 `apps/mobile/metro.config.js`，添加了 `resolveRequest` 以强制所有 `react` 和 `react-native` 导入解析到 `apps/mobile/node_modules`。

## 3. 当前问题：原生模块未链接
**错误**:
```
Invariant Violation: View config getter callback for component `RNIContextMenuView` must be a function (received `undefined`).
```

**诊断**:
- 运行时找不到原生模块 `RNIContextMenuView`。
- **证据**:
  - `apps/mobile/ios/Podfile.lock` 中**不包含** `react-native-ios-context-menu`。
  - `npx expo-modules-autolinking resolve` **未列出** 该包。
- **根本原因**: `react-native-ios-context-menu` 包被 pnpm 提升（hoist）到了 **Monorepo 根目录** (`/node_modules/`)，导致 `apps/mobile` 中的 Expo Autolinking 无法检测到它。

## 4. 下一步行动计划
目标是强制 Expo/CocoaPods 链接该原生模块。

### 尝试 1: 强制本地安装（禁止提升）- **推荐**
配置 pnpm 将 `react-native-ios-context-menu` 安装在 `apps/mobile/node_modules` 内部，而不是提升到根目录。这通常能解决自动链接问题。

1.  编辑根目录 `.npmrc` (如果不存在则创建):
    ```ini
    public-hoist-pattern[]=!react-native-ios-context-menu
    public-hoist-pattern[]=!react-native-ios-utilities
    ```
2.  运行 `pnpm install` (验证这些包是否显式存在于 `apps/mobile/node_modules` 中)。
3.  清理并生成原生项目: `npx expo prebuild --clean`。
4.  验证链接: 检查 `apps/mobile/ios/Podfile.lock` 确保 `react-native-ios-context-menu` 存在。
5.  重新构建开发客户端: `pnpm eas:build:dev:simulator:ios:local`。

### 尝试 2: 在 Podfile 中手动链接
如果尝试 1 失败，请在 `apps/mobile/ios/Podfile` 中手动添加 pod 路径:
```ruby
pod 'react-native-ios-context-menu', :path => '../../node_modules/react-native-ios-context-menu'
pod 'react-native-ios-utilities', :path => '../../node_modules/react-native-ios-utilities'
```
*(注意: 根据 Podfile 的位置调整相对路径)*

## 5. 常用命令
- 检查 Podfile.lock 是否包含: `grep "context-menu" apps/mobile/ios/Podfile.lock`
- 重建开发客户端: `pnpm eas:build:dev:simulator:ios:local`
