/**
 * 水印注入模块
 */

/** 水印 HTML 代码 - Notion 风格：极简、低调、浅色 */
const WATERMARK_HTML = `
<!-- Moryflow Watermark -->
<a id="moryflow-watermark" href="https://moryflow.com" target="_blank" rel="noopener" style="
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 6px 12px;
  background: #fbfbfb;
  color: #191919;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.01em;
  border-radius: 8px;
  z-index: 99999;
  text-decoration: none;
  box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 2px 4px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: all 0.15s ease;
">Made with Moryflow</a>
<style>
  #moryflow-watermark:hover {
    color: rgba(55, 53, 47, 0.8);
    box-shadow: rgba(15, 15, 15, 0.1) 0px 0px 0px 1px, rgba(15, 15, 15, 0.15) 0px 3px 6px;
  }
  @media (prefers-color-scheme: dark) {
    #moryflow-watermark {
      background: rgba(37, 37, 37, 0.9);
      color: rgba(255, 255, 255, 0.5);
      box-shadow: rgba(255, 255, 255, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.3) 0px 2px 4px;
    }
    #moryflow-watermark:hover {
      color: rgba(255, 255, 255, 0.8);
      box-shadow: rgba(255, 255, 255, 0.1) 0px 0px 0px 1px, rgba(0, 0, 0, 0.4) 0px 3px 6px;
    }
  }
  @media (max-width: 640px) {
    #moryflow-watermark { bottom: 16px; right: 16px; padding: 5px 8px; font-size: 10px; }
  }
</style>
<!-- End Moryflow Watermark -->
`

/**
 * 在 HTML 中注入水印
 * 在 </body> 标签前插入水印代码
 */
export function injectWatermark(html: string): string {
  // 尝试在 </body> 前插入
  const bodyCloseIndex = html.lastIndexOf('</body>')
  if (bodyCloseIndex !== -1) {
    return html.slice(0, bodyCloseIndex) + WATERMARK_HTML + html.slice(bodyCloseIndex)
  }

  // 尝试在 </html> 前插入
  const htmlCloseIndex = html.lastIndexOf('</html>')
  if (htmlCloseIndex !== -1) {
    return html.slice(0, htmlCloseIndex) + WATERMARK_HTML + html.slice(htmlCloseIndex)
  }

  // 直接追加到末尾
  return html + WATERMARK_HTML
}
