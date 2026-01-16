/**
 * Digest Email Template
 *
 * [INPUT]: DigestRun 数据
 * [OUTPUT]: HTML 邮件内容
 * [POS]: 邮件模板渲染
 */

export interface DigestEmailData {
  subscriptionName: string;
  itemsCount: number;
  items: Array<{
    title: string;
    url: string;
    aiSummary?: string;
  }>;
  narrativeMarkdown?: string;
  viewUrl: string;
  unsubscribeUrl?: string;
}

/**
 * 生成 Digest 邮件 HTML
 */
export function generateDigestEmailHtml(data: DigestEmailData): string {
  const {
    subscriptionName,
    itemsCount,
    items,
    narrativeMarkdown,
    viewUrl,
    unsubscribeUrl,
  } = data;

  const itemsHtml = items
    .map(
      (item, index) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #eee;">
        <div style="margin-bottom: 8px;">
          <span style="color: #666; font-size: 12px; margin-right: 8px;">#${index + 1}</span>
          <a href="${escapeHtml(item.url)}" style="color: #333; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${escapeHtml(item.title)}
          </a>
        </div>
        ${
          item.aiSummary
            ? `<p style="color: #666; font-size: 14px; line-height: 1.5; margin: 8px 0 0 0;">${escapeHtml(item.aiSummary)}</p>`
            : ''
        }
        <div style="margin-top: 8px;">
          <a href="${escapeHtml(item.url)}" style="color: #0066cc; font-size: 12px; text-decoration: none;">
            Read more &rarr;
          </a>
        </div>
      </td>
    </tr>
  `,
    )
    .join('');

  // 如果有 narrative，转换为简单 HTML（基础 markdown 转换）
  const narrativeHtml = narrativeMarkdown
    ? convertMarkdownToHtml(narrativeMarkdown)
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subscriptionName)} - Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ${escapeHtml(subscriptionName)}
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                ${itemsCount} new item${itemsCount !== 1 ? 's' : ''} in this digest
              </p>
            </td>
          </tr>

          <!-- Narrative Summary (if available) -->
          ${
            narrativeHtml
              ? `
          <tr>
            <td style="padding: 24px; background-color: #fafafa; border-bottom: 1px solid #eee;">
              <div style="font-size: 14px; line-height: 1.6; color: #444;">
                ${narrativeHtml}
              </div>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Items List -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="color: #333; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                Today's Highlights
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 24px 32px 24px; text-align: center;">
              <a href="${escapeHtml(viewUrl)}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                View Full Digest
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px; border-top: 1px solid #eee; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                You're receiving this because you subscribed to "${escapeHtml(subscriptionName)}" on Anyhunt.
              </p>
              ${
                unsubscribeUrl
                  ? `
              <p style="margin: 8px 0 0 0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #666; font-size: 12px; text-decoration: underline;">
                  Unsubscribe from this digest
                </a>
              </p>
              `
                  : ''
              }
              <p style="color: #ccc; font-size: 11px; margin: 16px 0 0 0;">
                &copy; ${new Date().getFullYear()} Anyhunt. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * 简单的 Markdown 转 HTML（仅支持基础语法）
 * 注意：输入应为 AI 生成的可信内容，不应包含用户可控的恶意输入
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
    // Headers（先处理，避免被段落包裹）
    .replace(
      /^### (.+)$/gm,
      '<h4 style="color: #333; margin: 16px 0 8px 0; font-size: 14px;">$1</h4>',
    )
    .replace(
      /^## (.+)$/gm,
      '<h3 style="color: #333; margin: 16px 0 8px 0; font-size: 16px;">$1</h3>',
    )
    .replace(
      /^# (.+)$/gm,
      '<h2 style="color: #333; margin: 16px 0 8px 0; font-size: 18px;">$1</h2>',
    )
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links（转义 URL 防止 XSS）
    .replace(/\[(.+?)\]\((.+?)\)/g, (_: string, text: string, url: string) => {
      return `<a href="${escapeHtml(url)}" style="color: #0066cc;">${escapeHtml(text)}</a>`;
    });

  // 处理无序列表：将连续的 - 行包裹在 <ul> 中
  html = html.replace(
    /(?:^- .+$\n?)+/gm,
    (match) =>
      `<ul style="margin: 12px 0; padding-left: 20px;">${match.replace(/^- (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')}</ul>`,
  );

  // 处理有序列表：将连续的数字列表行包裹在 <ol> 中
  html = html.replace(
    /(?:^\d+\. .+$\n?)+/gm,
    (match) =>
      `<ol style="margin: 12px 0; padding-left: 20px;">${match.replace(/^\d+\. (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')}</ol>`,
  );

  // 段落：将剩余的普通文本行包裹在 <p> 中
  html = html
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // 跳过已经是 HTML 标签的块
      if (/^<(h[1-6]|ul|ol|p|div)/.test(trimmed)) {
        return trimmed;
      }
      return `<p style="margin: 12px 0;">${trimmed}</p>`;
    })
    .join('\n');

  return html;
}
