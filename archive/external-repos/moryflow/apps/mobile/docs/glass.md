# Expo 项目索引：`expo-glass-effect` 与 `@expo/ui/swift-ui`

这份文档只做**通用索引**：每个库能做什么、有哪些组件/能力、什么时候该用，以及你后续要查哪些官方文档（含入口链接）。

---

## 0) 快速对比

### `expo-glass-effect`
- 作用：提供 React 组件，渲染 **iOS 原生 Liquid Glass（液态玻璃）**（基于 `UIVisualEffectView`）。 
- 平台：**iOS**；`GlassView` 仅 iOS 26+ 生效，其他平台/不支持时会 fallback 为普通 `View`。 
- 适合：你想在 RN 里直接把某个容器换成“玻璃材质”，侵入性很低。

### `@expo/ui/swift-ui`
- 作用：把 **SwiftUI 组件**带进 React Native（通过 `Host` 跨 UIKit → SwiftUI），用于构建“完全原生的 iOS 界面”。 
- 状态：**Beta**，且**不支持 Expo Go**（需 development build）。 
- 适合：你要系统级原生控件/交互（BottomSheet、List、Picker、Toggle 等），并接受 SwiftUI 边界与 Beta 迭代。

---

## 1) `expo-glass-effect`

### 1.1 能做什么
- 渲染 iOS 26 的 “Liquid Glass” 视图材质（原生 `UIVisualEffectView`）。 
- 支持：
  - 不同玻璃风格（`regular` / `clear`） 
  - tint 叠色（`tintColor`） 
  - 交互玻璃（`isInteractive`） 
  - 多玻璃元素“融合/互相影响”的组合容器（`GlassContainer` + `spacing`） 

### 1.2 安装
- 安装命令：`npx expo install expo-glass-effect` 

### 1.3 组件与方法清单

#### `GlassView`
- 单个玻璃视图。 
- 关键 props（索引用）：
  - `glassEffectStyle: 'regular' | 'clear'`（默认 `'regular'`） 
  - `tintColor: string`（叠色） 
  - `isInteractive: boolean`（默认 `false`） 
- 已知限制：
  - `isInteractive` **只能在首次 mount 时设置**；要切换必须更换 `key` 触发 remount。 

#### `GlassContainer`
- 让多个 `GlassView` 组合成“融合/联动”的效果。 
- 关键 props：
  - `spacing: number`：控制玻璃元素开始互相影响/融合的距离。 

#### `isLiquidGlassAvailable()`
- 判断“**当前编译产物**是否具备 Liquid Glass 能力”（校验系统、编译器、以及 `Info.plist` 设置）。 
- 注意：它只检查“组件可用性”；如果用户开启了降低透明度等无障碍设置，仍可能返回 true，但效果会被限制。官方建议配合 `AccessibilityInfo.isReduceTransparencyEnabled()` 判断。 

### 1.4 什么时候应该使用
- 你需要在 RN 中快速引入 iOS 26 的玻璃材质（浮层、卡片、工具条、底栏容器等）。
- 你希望保持跨端结构不变，仅在 iOS 26+ 设备上“自然升级”材质；其他平台自动降级为普通 View。 

### 1.5 文档索引（建议阅读顺序）
- Expo 官方参考（组件/props/示例）  
  https://docs.expo.dev/versions/latest/sdk/glass-effect/
- Apple UIKit 背景（了解 `UIVisualEffectView`）  
  https://developer.apple.com/documentation/uikit/uivisualeffectview

---

## 2) `@expo/ui/swift-ui`

### 2.1 能做什么
- 在 React Native 里直接使用 SwiftUI 组件，构建**完全原生 iOS 界面**。 
- 需要用 `Host` 作为容器跨越 RN（UIKit）→ SwiftUI；底层使用 `UIHostingController`。 
- Expo 官方指南强调它是 SwiftUI 视图的 **1-to-1 映射**，可以混用 RN 组件与 Expo UI 组件。 

### 2.2 重要限制/注意事项
- **Beta**（可能有 breaking changes）。 
- **不支持 Expo Go**，需要 **development builds**。 
- “完整文档尚未完全提供”，建议用 TypeScript 类型探索 API。 

### 2.3 安装
- 安装命令：`npx expo install @expo/ui` 
- 使用时从 `@expo/ui/swift-ui` 导入组件，并用 `Host` 包裹。 

### 2.4 组件清单（官方参考页里的 “Components”）
> 下面是索引级描述；每个组件的详细 props/示例以官方页对应标题为准。

#### 容器/桥接
- `Host`：SwiftUI 容器边界（必须用）。 

#### 交互与弹层
- `BottomSheet`：SwiftUI 底部抽屉。 
- `ContextMenu`：上下文菜单（文档注释“也叫 DropdownMenu”）。 

#### 按钮与表单输入
- `Button`：SwiftUI 按钮（文档注释：borderless 变体在 Apple TV 不可用）。 
- `TextField`：单行输入。 
- `Switch`：
  - `variant="switch"`（Toggle） 
  - `variant="checkbox"` 
- `Slider`：滑杆。 
- `Picker`：
  - `variant="segmented"` 
  - `variant="wheel"` 
  - `variant="menu"`（在 ContextMenu 示例中出现） 
- `DateTimePicker`：
  - date（`displayedComponents='date'`） 
  - time（`displayedComponents='hourAndMinute'`） 
- `ColorPicker`：颜色选择器。 

#### 列表与进度/状态
- `List`：列表（支持 selection/move/delete 等能力示例）。 
- `LinearProgress`：线性进度条。 
- `CircularProgress`：环形进度。 
- `Gauge`：仪表盘/刻度。 

#### SwiftUI primitives（示例中出现，作为索引用）
- `Text`、`VStack`：在 Host 示例里直接使用（用于布局/文本）。 

### 2.5 什么时候应该使用
- 你要做“系统级 iOS 原生 UI”的一整块界面（设置页、表单页、带系统交互的弹层/列表等）。
- 你愿意：
  - 使用 dev build（而不是 Expo Go） 
  - 接受 Beta 可能的 API 变化 
  - 在 SwiftUI 边界（Host）内组织 UI 与布局 

### 2.6 文档索引（建议阅读顺序）
- Expo UI 总览（`@expo/ui` 入口）  
  https://docs.expo.dev/versions/latest/sdk/ui/
- SwiftUI 参考页（组件清单、每个组件的示例/说明）  
  https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/
- Expo 官方指南：Expo UI + SwiftUI（概念、Host 边界、使用方式，SDK 54+）  
  https://docs.expo.dev/guides/expo-ui-swift-ui/

---

## 3) 把这份索引怎么用（建议）
- 查组件怎么用 / 有哪些 props：优先看各自 *Reference* 页面。 
- 搞清楚 SwiftUI 的 Host 边界、项目集成思路：看 SwiftUI Guide。 
- 组件更细的行为/概念：跟随 Expo 文档页中的 “See also / official SwiftUI documentation” 跳转到 Apple 官方 SwiftUI 文档。 
