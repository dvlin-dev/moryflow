# 实现计划

## 0. 创建实验性 Mobile 项目副本

- [x] 0.1 复制 mobile 项目
  - 复制 `apps/mobile` 到 `apps/mobile`
  - 更新 `apps/mobile/package.json` 中的 name 为 `@moryflow/mobile`
  - 更新 `apps/mobile/app.json` 中的应用名称
  - _说明：在新项目上实验，保护原有代码_

- [x] 0.2 更新 monorepo 配置
  - 更新根目录 `pnpm-workspace.yaml` 包含新项目
  - 运行 `pnpm install` 安装依赖
  - 验证新项目可以独立运行
  - _说明：确保新项目正确集成到 monorepo_

## 1. 项目初始化与基础设施

- [x] 1.1 创建编辑器 bundle 构建配置
  - 在 `apps/pc` 中创建独立的 Vite 配置用于打包编辑器 bundle
  - 配置 Tree Shaking 移除未使用的扩展
  - 输出到 `apps/mobile/assets/editor-bundle/`
  - _需求：8.1_

- [x] 1.2 创建 Mobile 端编辑器目录结构
  - 创建 `apps/mobile/lib/editor/` 目录
  - 创建 `apps/mobile/components/editor/` 目录
  - _需求：8.1_

- [x] 1.3 安装必要依赖
  - 安装 `react-native-webview`
  - 安装 `expo-image-picker`（图片选择）- 已存在
  - 更新 `app.json` 配置
  - _需求：4.1_

## 2. Bridge 通信层实现

- [x] 2.1 实现 EditorBridge 类
  - 创建 `apps/mobile/lib/editor/EditorBridge.ts`
  - 实现 `sendCommand` 方法
  - 实现 `onMessage` 消息处理
  - 实现消息类型定义
  - _需求：8.4, 9.2_

- [ ]* 2.2 编写 Bridge 消息协议属性测试
  - **属性 8：Bridge 消息协议一致性**
  - **验证：需求 8.4**

- [x] 2.3 实现 WebView 端 BridgeClient
  - 创建 `apps/pc/src/editor-bundle/bridge-client.ts`
  - 实现 `handleCommand` 命令处理
  - 实现 `sendMessage` 消息发送
  - 实现编辑器事件监听
  - _需求：9.2, 9.3_

- [ ]* 2.4 编写 Bridge 命令执行属性测试
  - **属性 7：Bridge 命令执行正确性**
  - **验证：需求 9.2, 9.3**

- [ ]* 2.5 编写错误传播属性测试
  - **属性 9：错误传播正确性**
  - **验证：需求 9.4**

## 3. 内容转换层实现

- [x] 3.1 实现 Markdown 转换工具
  - 复用 PC 端 `markdownToHtml` 和 `htmlToMarkdown`
  - 创建 `apps/mobile/lib/editor/content-converter.ts`
  - 处理移动端特殊情况（图片路径等）
  - _需求：6.4, 6.5_

- [ ]* 3.2 编写 Markdown 往返属性测试
  - **属性 2：Markdown 往返一致性**
  - **验证：需求 6.4, 6.5**

## 4. 检查点 - 确保所有测试通过

- [ ] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 5. WebView 容器组件实现

- [x] 5.1 实现 EditorWebView 组件
  - 创建 `apps/mobile/components/editor/EditorWebView.tsx`
  - 加载编辑器 bundle
  - 集成 EditorBridge
  - 处理 WebView 生命周期
  - _需求：9.1_

- [x] 5.2 实现编辑器状态管理
  - 创建 `apps/mobile/lib/editor/editor-state.ts`
  - 实现 EditorState 类型
  - 实现状态同步逻辑
  - _需求：1.2, 7.2_

- [ ]* 5.3 编写格式化命令属性测试
  - **属性 1：格式化命令正确性**
  - **验证：需求 1.2, 7.2**

## 6. 编辑器工具栏实现

- [x] 6.1 实现 EditorToolbar 组件
  - 创建 `apps/mobile/components/editor/EditorToolbar.tsx`
  - 实现格式化按钮（加粗、斜体、下划线等）
  - 实现标题选择器
  - 实现列表按钮
  - _需求：7.1, 7.2_

- [x] 6.2 实现工具栏键盘适配
  - iOS：使用 InputAccessoryView
  - Android：监听键盘高度调整位置
  - _需求：7.3_

- [x] 6.3 实现浮动工具栏
  - 选中文本时显示
  - 滚动时隐藏
  - _需求：7.1, 7.4_

## 7. 图片功能实现

- [ ] 7.1 实现图片选择器集成
  - 创建 `apps/mobile/lib/editor/image-picker.ts`
  - 集成 expo-image-picker
  - 实现拍照和相册选择
  - _需求：4.1_

- [ ] 7.2 实现图片插入功能
  - 图片压缩处理
  - 保存到本地文件系统
  - 通过 Bridge 插入到编辑器
  - _需求：4.2_

- [ ]* 7.3 编写图片插入属性测试
  - **属性 4：图片插入正确性**
  - **验证：需求 4.2**

## 8. 表格功能实现

- [ ] 8.1 实现表格插入功能
  - 创建表格插入对话框
  - 通过 Bridge 发送插入命令
  - _需求：5.1_

- [ ]* 8.2 编写表格创建属性测试
  - **属性 5：表格创建正确性**
  - **验证：需求 5.1**

- [ ] 8.3 实现表格行列操作
  - 添加/删除行
  - 添加/删除列
  - _需求：5.3, 5.4_

- [ ]* 8.4 编写表格行列操作属性测试
  - **属性 6：表格行列操作正确性**
  - **验证：需求 5.3, 5.4**

## 9. 检查点 - 确保所有测试通过

- [ ] 9. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 10. 内容持久化实现

- [ ] 10.1 实现内容自动保存
  - 创建 `apps/mobile/lib/editor/auto-save.ts`
  - 实现防抖保存逻辑
  - 集成到 EditorWebView
  - _需求：6.1, 6.2_

- [ ] 10.2 实现内容加载恢复
  - 从本地存储加载内容
  - 通过 Bridge 设置到编辑器
  - _需求：6.3_

- [ ]* 10.3 编写内容持久化属性测试
  - **属性 3：内容持久化往返**
  - **验证：需求 6.3**

## 11. 编辑器页面集成

- [ ] 11.1 创建 NoteEditorScreen 页面
  - 创建 `apps/mobile/app/note/editor.tsx`
  - 集成 EditorWebView
  - 集成 EditorToolbar
  - _需求：1.1_

- [ ] 11.2 实现编辑器导航
  - 从笔记列表跳转到编辑器
  - 返回时保存内容
  - _需求：6.2_

- [ ] 11.3 替换旧编辑器
  - 更新 `apps/mobile/components/note/editor/` 导出
  - 保持 API 兼容
  - _需求：8.2_

## 12. 性能优化

- [ ] 12.1 实现 WebView 预加载
  - 应用启动时预加载 WebView
  - 减少首次打开编辑器的加载时间
  - _需求：2.1_

- [ ] 12.2 优化 Bundle 大小
  - 分析 bundle 组成
  - 移除未使用的扩展
  - 启用压缩
  - _需求：2.1_

- [ ] 12.3 优化通信性能
  - 实现状态更新批处理
  - 实现内容变化防抖
  - _需求：2.2_

## 13. 验证与迁移

- [ ] 13.1 功能验证
  - 在 mobile 上完整测试所有功能
  - 对比 PC 端编辑器体验
  - 修复发现的问题
  - _说明：确保新编辑器稳定可用_

- [ ] 13.2 迁移到主项目（可选）
  - 将 mobile 的编辑器代码合并回 mobile
  - 删除旧编辑器代码
  - 删除 mobile 项目
  - _说明：验证通过后再迁移_

## 14. 清理与文档

- [ ] 14.1 删除旧编辑器代码
  - 删除 `@expensify/react-native-live-markdown` 相关代码
  - 清理未使用的依赖
  - _需求：8.1_

- [ ] 14.2 更新文档
  - 更新 README
  - 添加编辑器架构说明
  - _需求：8.1_

## 15. 最终检查点 - 确保所有测试通过

- [ ] 15. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

