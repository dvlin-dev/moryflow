/**
 * [PROVIDES]: extract(page, baseUrl) - Link extraction from page
 * [DEPENDS]: playwright Page - Browser page context
 * [POS]: Extracts and normalizes all links from rendered page
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import { Injectable } from '@nestjs/common';
import type { Page } from 'playwright';

@Injectable()
export class LinksTransformer {
  /**
   * 提取页面中的所有链接
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extract(page: Page, baseUrl: string): Promise<string[]> {
    const links = await page.$$eval(
      'a[href]',
      (elements: HTMLAnchorElement[]) => elements.map((el) => el.href),
    );

    // 去重 + 过滤无效链接
    return [
      ...new Set(
        links.filter(
          (link: string) =>
            link.startsWith('http') && !link.includes('javascript:'),
        ),
      ),
    ];
  }
}
