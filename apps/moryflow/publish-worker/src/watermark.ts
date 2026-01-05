/**
 * [PROVIDES]: injectWatermark(html)
 * [DEPENDS]: 无
 * [POS]: 免费站点水印注入（HTML）
 *
 * [PROTOCOL]: 本文件变更时，需确保对 HTML 的注入不会破坏 <head>/<body> 结构。
 */

export function injectWatermark(html: string): string {
  const watermark = `
<style>
  .moryflow-watermark{position:fixed;right:16px;bottom:16px;z-index:9999;font:12px/1.2 system-ui,-apple-system,sans-serif;opacity:.7}
  .moryflow-watermark a{color:#111;text-decoration:none;background:rgba(255,255,255,.8);backdrop-filter:saturate(180%) blur(12px);padding:6px 10px;border-radius:999px;border:1px solid rgba(0,0,0,.08)}
  @media (prefers-color-scheme:dark){.moryflow-watermark a{color:#fff;background:rgba(0,0,0,.5);border-color:rgba(255,255,255,.1)}}
</style>
<div class="moryflow-watermark"><a href="https://moryflow.com" rel="nofollow">Powered by Moryflow</a></div>
`;

  if (html.includes('moryflow-watermark')) return html;
  if (html.includes('</body>')) return html.replace('</body>', `${watermark}\n</body>`);
  return `${html}\n${watermark}`;
}

