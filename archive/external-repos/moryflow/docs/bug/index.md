1. pc 编辑的工程中，如果停留触发名字修改，就失焦了
2. 暗黑模式下的 mobile title 和正文 pla 看不清
3. 从搜索页面进去文件详情页，无法返回
4. 文件详情页加载太慢，
5. 注册验证码，删除账号验证码
6. 向量化失败，找不到文件在 r2
7. pc 切换没有动画
8. mobile 左上角应该显示当前工作区的名字，现在一直显示 My Vault
9. No API key provided for OpenAI tracing exporter. Exports will be skipped
10. [Site Publish 移动端菜单按钮无响应](./site-publish-mobile-menu-not-working.md) - 发布的站点在移动端点击菜单按钮无反应
11. 邮件发送后收不到 - 服务器日志显示邮件已发送成功（如 `[EmailService] OTP email sent to xxx@gmail.com`），但用户邮箱收不到邮件。在 https://a.moryflow.com/email-test 测试页面同样无法收到邮件。需排查：邮件服务商配置、SPF/DKIM 记录、邮件被标记为垃圾邮件等。**可考虑更换为阿里云邮件推送服务**
12. PC 端预注册验证后闪退 - 输入验证码点击确认后，弹窗闪一下就消失，但用户未注册成功（数据库无记录）。已尝试修复 token 提取方式（从 `result.response.token` 获取），但问题仍存在。需进一步排查：服务器端 `signUpEmail` 是否成功创建用户、token 是否正确返回、前端 `refresh()` 是否正确处理

## todo

1. 云同步的多工作区，同步是否有问题
2. 向量查询和同步是否分离了工作区
3. 让 codex review 一下现在的流程是否合理

4. mobile 的 ai chat 页面的配色和 UI 我很喜欢，我希望整个 mobile 都按照这个页面的配合和 ui 是一个系列的，有点类似 notion/arc，我的 css 框架使用的 uniwind,请你阅读相关的代码，给我整理一套基于 uniwind 的适配明暗的设计系统，然后给我一个改造计划，我希望整个 mobile 都是用这套设计系统，特别是之前很多在使用原生的样式来写的，除了一些原生组件不支持 uniwind，其他都要使用这套设计系统

然后更新 apps/mobile/AGENTS.md
