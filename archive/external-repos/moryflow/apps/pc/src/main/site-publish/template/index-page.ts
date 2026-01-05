/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * 此文件由 site-template 的 sync 脚本自动生成
 * 如需修改，请编辑 apps/site-template/src/ 下的源文件
 * 然后执行: cd apps/site-template && pnpm build && pnpm sync
 *
 * Generated at: 2025-12-28T16:43:12.192Z
 */

/** index-page.html 模板 */
export const INDEX_PAGE_TEMPLATE = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <meta name=\"generator\" content=\"Moryflow\">\n  <title>{{siteTitle}}</title>\n  <link rel=\"icon\" href=\"/favicon.ico\">\n  <style>{{STYLES}}{{INDEX_PAGE_STYLES}}</style>\n  <script>{{THEME_INIT_SCRIPT}}</script>\n</head>\n<body>\n  <div class=\"index-page\">\n    <header class=\"index-header\">\n      <h1 class=\"index-title\">{{siteTitle}}</h1>\n      <button id=\"theme-toggle\" class=\"theme-toggle\" type=\"button\" aria-label=\"Toggle theme\">\n        <svg class=\"theme-icon-dark\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/>\n        </svg>\n        <svg class=\"theme-icon-light\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <circle cx=\"12\" cy=\"12\" r=\"5\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"/><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"/>\n        </svg>\n      </button>\n    </header>\n    <main class=\"index-content\">\n      <div class=\"bento-grid\">\n{{navItems}}\n      </div>\n    </main>\n    <footer class=\"index-footer\">\n      <a href=\"https://moryflow.com\" target=\"_blank\" rel=\"noopener\">Made with Moryflow</a>\n    </footer>\n  </div>\n  <script>{{THEME_TOGGLE_SCRIPT}}</script>\n</body>\n</html>\n"
