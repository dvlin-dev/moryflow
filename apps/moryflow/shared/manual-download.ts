/**
 * [PROVIDES]: 手动下载触发工具
 * [DEPENDS]: DOM document
 * [POS]: 公开下载入口共用的浏览器下载行为
 */

export function triggerManualDownload(
  url: string,
  doc: Pick<Document, 'createElement' | 'body'> = document
): void {
  const link = doc.createElement('a');
  link.href = url;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  doc.body.appendChild(link);
  link.click();
  doc.body.removeChild(link);
}
