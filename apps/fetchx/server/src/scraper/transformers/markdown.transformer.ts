/**
 * [PROVIDES]: transform(html, options) - HTML to Markdown conversion
 * [DEPENDS]: turndown, turndown-plugin-gfm - Conversion library
 * [POS]: Converts HTML content to clean Markdown with GFM support
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { JSDOM } from 'jsdom';

export interface MarkdownOptions {
  includeTags?: string[];
  excludeTags?: string[];
  baseUrl?: string;
}

@Injectable()
export class MarkdownTransformer {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx', // # 风格标题
      codeBlockStyle: 'fenced', // ``` 风格代码块
      bulletListMarker: '-', // 列表标记
      emDelimiter: '*', // 斜体标记
      strongDelimiter: '**', // 粗体标记
      linkStyle: 'inlined', // [text](url) 风格链接
    });

    // 使用 GFM 插件 (表格、删除线、任务列表)
    this.turndown.use(gfm);

    // 自定义规则：移除不需要的元素
    this.turndown.addRule('removeScript', {
      filter: ['script', 'style', 'noscript', 'iframe'],
      replacement: () => '',
    });

    // 额外规则：移除 SVG 元素（使用函数形式，因为 'svg' 不在 HTMLElementTagNameMap 中）
    this.turndown.addRule('removeSvg', {
      filter: (node) => node.nodeName.toLowerCase() === 'svg',
      replacement: () => '',
    });

    // 自定义规则：处理 pre > code
    this.turndown.addRule('fencedCodeBlock', {
      filter: (node) => {
        return node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE';
      },
      replacement: (_content, node) => {
        const codeNode = node.firstChild as HTMLElement;
        const language = this.detectLanguage(codeNode);
        const code = codeNode.textContent || '';
        return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
      },
    });
  }

  convert(html: string, options: MarkdownOptions = {}): string {
    // 1. 解析 HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 2. 清理 HTML
    this.cleanHtml(document);

    // 3. 标签过滤
    if (options.includeTags?.length) {
      this.filterIncludeTags(document, options.includeTags);
    }
    if (options.excludeTags?.length) {
      this.removeExcludeTags(document, options.excludeTags);
    }

    // 4. 转换为 Markdown
    let markdown = this.turndown.turndown(document.body.innerHTML);

    // 5. 后处理
    markdown = this.postProcess(markdown, options.baseUrl);

    return markdown;
  }

  private cleanHtml(document: Document): void {
    // 移除 script、style、注释
    const removeSelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'svg',
      'canvas',
      'video',
      'audio',
      '[hidden]',
      '[aria-hidden="true"]',
      '.ad',
      '.ads',
      '.advertisement',
      '#cookie-banner',
      '.cookie-notice',
    ];

    removeSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // 移除注释
    const walker = document.createTreeWalker(
      document.body,
      128, // NodeFilter.SHOW_COMMENT
    );
    const comments: Comment[] = [];
    while (walker.nextNode()) {
      comments.push(walker.currentNode as Comment);
    }
    comments.forEach((comment) => comment.remove());
  }

  private filterIncludeTags(document: Document, tags: string[]): void {
    const selector = tags.join(',');
    const elements = document.querySelectorAll(selector);
    const newBody = document.createElement('div');
    elements.forEach((el) => newBody.appendChild(el.cloneNode(true)));
    document.body.innerHTML = newBody.innerHTML;
  }

  private removeExcludeTags(document: Document, tags: string[]): void {
    const selector = tags.join(',');
    document.querySelectorAll(selector).forEach((el) => el.remove());
  }

  private postProcess(markdown: string, baseUrl?: string): string {
    let result = markdown;

    // 1. 清理多余空行 (最多保留2个)
    result = result.replace(/\n{3,}/g, '\n\n');

    // 2. 清理行首尾空格
    result = result
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // 3. 转换相对链接为绝对链接
    if (baseUrl) {
      result = result.replace(
        /\[([^\]]+)\]\((?!http|mailto|#)([^)]+)\)/g,
        (match, text: string, url: string) => {
          try {
            const absoluteUrl = new URL(url, baseUrl).href;
            return `[${text}](${absoluteUrl})`;
          } catch {
            return match;
          }
        },
      );
    }

    // 4. 清理首尾空白
    result = result.trim();

    return result;
  }

  private detectLanguage(codeNode: HTMLElement): string {
    // 从 class 中检测语言
    const classList = codeNode.className.split(' ');
    for (const cls of classList) {
      if (cls.startsWith('language-')) {
        return cls.replace('language-', '');
      }
      if (cls.startsWith('lang-')) {
        return cls.replace('lang-', '');
      }
    }
    return '';
  }
}
