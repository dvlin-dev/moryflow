# Site Publish 移动端菜单按钮无响应

## 状态
- **状态**: 未解决
- **发现日期**: 2024-12-29
- **影响范围**: 发布的站点在移动端无法打开侧边栏

## 问题描述

用户发布的站点在移动端（<768px）时，左上角的菜单按钮（hamburger icon）点击无响应，无法展开侧边栏导航。

## 复现步骤

1. 使用 PC 应用发布一个多页面站点
2. 在移动端或使用浏览器开发者工具模拟移动设备访问
3. 点击左上角的菜单按钮
4. **预期**: 侧边栏从左侧滑出
5. **实际**: 无任何响应

## 技术分析

### HTML 结构（已确认正确）

```html
<body class="has-sidebar">
  <aside class="sidebar">...</aside>
  <div class="main-area">
    <header class="site-header">
      <div class="site-header-inner">
        <button id="menu-toggle" class="menu-toggle">...</button>
        <button id="theme-toggle" class="theme-toggle">...</button>
      </div>
    </header>
    ...
  </div>
  <div class="sidebar-overlay" id="sidebar-overlay"></div>
  <script>{{THEME_TOGGLE_SCRIPT}}</script>
  <script>{{MENU_TOGGLE_SCRIPT}}</script>
</body>
```

### CSS（已确认正确）

```css
.menu-toggle {
  display: none;  /* 默认隐藏 */
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform var(--duration-slow) var(--ease-out);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .menu-toggle {
    display: flex;  /* 移动端显示 */
  }
  .sidebar-overlay {
    display: block;
  }
}
```

### JavaScript 脚本

```javascript
(function(){
  var btn = document.getElementById('menu-toggle');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebar-overlay');

  if (!btn || !sidebar) return;

  function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      overlay && overlay.classList.remove('visible');
      document.body.classList.remove('menu-open');
    } else {
      sidebar.classList.add('open');
      overlay && overlay.classList.add('visible');
      document.body.classList.add('menu-open');
    }
  }

  btn.addEventListener('click', toggle, false);

  // overlay 点击关闭
  if (overlay) {
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
      document.body.classList.remove('menu-open');
    }, false);
  }

  // 点击链接后关闭
  var links = sidebar.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function() {
      sidebar.classList.remove('open');
      overlay && overlay.classList.remove('visible');
      document.body.classList.remove('menu-open');
    }, false);
  }
})();
```

### 已排除的问题

1. ✅ HTML 结构正确 - 按钮在 `site-header-inner` 中
2. ✅ CSS 正确 - 移动端 `display: flex` 显示按钮
3. ✅ 脚本已注入 - 可以在页面源码中看到
4. ✅ 元素选择器正确 - `#menu-toggle`, `.sidebar`, `#sidebar-overlay`
5. ✅ 使用 `addEventListener` 而非 `onclick`
6. ✅ 添加了 `e.preventDefault()` 和 `e.stopPropagation()`

### 待排查方向

1. **控制台错误** - 需要在移动端打开开发者工具查看是否有 JS 错误
2. **事件监听** - 确认 `addEventListener` 是否成功绑定
3. **z-index 问题** - 检查是否有其他元素覆盖在按钮上
4. **触摸事件** - 移动端可能需要 `touchstart` 事件而非 `click`
5. **脚本执行时机** - DOM 可能未完全加载

## 相关文件

- `apps/site-template/scripts/sync.ts` - MENU_TOGGLE_SCRIPT 定义
- `apps/site-template/src/templates/page.html` - 页面模板
- `apps/site-template/src/styles/app.css` - 样式定义
- `apps/pc/src/main/site-publish/renderer/index.ts` - 渲染器

## 临时解决方案

暂无

## 备注

主题切换按钮（theme-toggle）使用相同的模式（`btn.onclick = function(){}`）可以正常工作，说明基本的事件绑定机制是没问题的。需要进一步调试确定具体原因。
