/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * 此文件由 site-template 的 sync 脚本自动生成
 * 如需修改，请编辑 apps/site-template/src/ 下的源文件
 * 然后执行: cd apps/site-template && pnpm build && pnpm sync
 *
 * Generated at: 2025-12-28T16:43:12.192Z
 */

/** 404.html 模板 */
export const ERROR_404_TEMPLATE = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <meta name=\"generator\" content=\"Moryflow\">\n  <title>Page Not Found - {{siteTitle}}</title>\n  <link rel=\"icon\" href=\"/favicon.ico\">\n  <style>{{STYLES}}{{ERROR_PAGE_STYLES}}</style>\n  <script>{{THEME_INIT_SCRIPT}}</script>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"error-code\">404</div>\n    <p class=\"error-message\">Page not found</p>\n    <a href=\"/\" class=\"back-link\">Back to Home</a>\n  </div>\n</body>\n</html>\n"
