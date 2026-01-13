/**
 * Snapshot Service
 *
 * [INPUT]: Page 实例 + 快照选项
 * [OUTPUT]: 可访问性树文本 + Ref 映射
 * [POS]: 生成页面快照，提取元素引用供 AI Agent 使用
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Page } from 'playwright';
import type { SnapshotInput, SnapshotResponse, RefData } from '../dto';

/** ARIA 角色分类 */
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'treeitem',
]);

const CONTENT_ROLES = new Set([
  'heading',
  'cell',
  'gridcell',
  'columnheader',
  'rowheader',
  'listitem',
  'article',
  'region',
  'main',
  'navigation',
  'complementary',
  'contentinfo',
  'banner',
]);

const STRUCTURAL_ROLES = new Set([
  'generic',
  'group',
  'list',
  'table',
  'row',
  'rowgroup',
  'grid',
  'menu',
  'menubar',
  'toolbar',
  'tablist',
  'tree',
  'treegrid',
  'document',
  'application',
]);

/** 解析后的 ARIA 节点 */
interface ParsedAriaNode {
  role: string;
  name?: string;
  attributes: Record<string, string | boolean | number>;
  indent: number;
  children: ParsedAriaNode[];
}

/** Role+Name 追踪器，用于检测重复元素 */
class RoleNameTracker {
  private counts = new Map<string, number>();
  private indices = new Map<string, number>();

  getKey(role: string, name?: string): string {
    return `${role}:${name ?? ''}`;
  }

  track(role: string, name?: string): number {
    const key = this.getKey(role, name);
    const count = this.counts.get(key) ?? 0;
    this.counts.set(key, count + 1);

    const index = this.indices.get(key) ?? 0;
    this.indices.set(key, index + 1);
    return index;
  }

  getDuplicateKeys(): Set<string> {
    const duplicates = new Set<string>();
    for (const [key, count] of this.counts) {
      if (count > 1) {
        duplicates.add(key);
      }
    }
    return duplicates;
  }

  reset(): void {
    this.indices.clear();
  }
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  /**
   * 生成页面快照
   */
  async capture(
    page: Page,
    options?: Partial<SnapshotInput>,
  ): Promise<{ snapshot: SnapshotResponse; refs: Map<string, RefData> }> {
    const {
      interactive = false,
      compact = false,
      maxDepth,
      scope,
    } = options ?? {};

    // 获取可访问性树
    // 使用 locator.ariaSnapshot() 获取 YAML 格式的可访问性快照
    const rootLocator = scope ? page.locator(scope) : page.locator('body');

    // 获取 ARIA 快照（YAML 格式）
    let ariaYaml: string;
    try {
      ariaYaml = await rootLocator.ariaSnapshot();
    } catch (error) {
      this.logger.warn(`Failed to get ARIA snapshot: ${error}`);
      return {
        snapshot: {
          tree: '(empty page)',
          refs: {},
          stats: { lines: 1, chars: 12, refs: 0, interactive: 0 },
        },
        refs: new Map(),
      };
    }

    if (!ariaYaml || ariaYaml.trim() === '') {
      return {
        snapshot: {
          tree: '(empty page)',
          refs: {},
          stats: { lines: 1, chars: 12, refs: 0, interactive: 0 },
        },
        refs: new Map(),
      };
    }

    // 解析 YAML 格式并转换为结构化数据
    const nodes = this.parseAriaYaml(ariaYaml);

    // 第一遍：追踪所有元素的 role+name 组合
    const tracker = new RoleNameTracker();
    this.trackElements(nodes, tracker, interactive);

    // 获取重复的 keys
    const duplicateKeys = tracker.getDuplicateKeys();
    tracker.reset();

    // 第二遍：生成增强树文本和 refs
    const refs = new Map<string, RefData>();
    let refCounter = 1;
    let interactiveCount = 0;
    const lines: string[] = [];

    const processNode = (node: ParsedAriaNode, depth: number): void => {
      // 检查深度限制
      if (maxDepth !== undefined && depth > maxDepth) {
        return;
      }

      const { role, name, attributes } = node;

      // 过滤模式
      const isInteractive = INTERACTIVE_ROLES.has(role);
      const isContent = CONTENT_ROLES.has(role);
      const isStructural = STRUCTURAL_ROLES.has(role);

      if (interactive && !isInteractive) {
        // 仅交互模式：跳过非交互元素，但继续处理子节点
        for (const child of node.children) {
          processNode(child, depth);
        }
        return;
      }

      // 紧凑模式：跳过纯结构元素
      if (
        compact &&
        isStructural &&
        !name &&
        Object.keys(attributes).length === 0
      ) {
        for (const child of node.children) {
          processNode(child, depth);
        }
        return;
      }

      // 构建行内容
      const indent = '  '.repeat(depth);
      const parts: string[] = [];

      // 角色
      parts.push(role);

      // 名称（如果有）
      if (name) {
        parts.push(`"${this.escapeString(name)}"`);
      }

      // 生成 ref（仅对可交互或内容元素）
      if (isInteractive || isContent) {
        const refKey = `e${refCounter++}`;
        parts.push(`[ref=${refKey}]`);

        // 计算 nth
        const key = tracker.getKey(role, name);
        const index = tracker.track(role, name);

        const refData: RefData = { role, name };

        // 仅当存在重复时才添加 nth
        if (duplicateKeys.has(key)) {
          refData.nth = index;
        }

        refs.set(refKey, refData);

        if (isInteractive) {
          interactiveCount++;
        }
      }

      // 附加属性
      for (const [attr, value] of Object.entries(attributes)) {
        if (value === true) {
          parts.push(`[${attr}]`);
        } else {
          parts.push(`[${attr}=${value}]`);
        }
      }

      lines.push(`${indent}- ${parts.join(' ')}`);

      // 处理子节点
      for (const child of node.children) {
        processNode(child, depth + 1);
      }
    };

    for (const node of nodes) {
      processNode(node, 0);
    }

    const tree = lines.join('\n');

    // 转换 refs Map 为普通对象
    const refsObject: Record<string, RefData> = {};
    for (const [key, value] of refs) {
      refsObject[key] = value;
    }

    return {
      snapshot: {
        tree,
        refs: refsObject,
        stats: {
          lines: lines.length,
          chars: tree.length,
          refs: refs.size,
          interactive: interactiveCount,
        },
      },
      refs,
    };
  }

  /**
   * 解析 ARIA YAML 格式
   *
   * ARIA 快照格式示例：
   * - heading "Title" [level=1]
   * - button "Submit"
   * - textbox "Email" [disabled]
   */
  private parseAriaYaml(yaml: string): ParsedAriaNode[] {
    const lines = yaml.split('\n');
    const root: ParsedAriaNode[] = [];
    const stack: { node: ParsedAriaNode; indent: number }[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // 计算缩进（空格数）
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;

      // 解析行内容（格式: - role "name" [attr=value]）
      const contentMatch = line.match(/^\s*-\s+(.+)$/);
      if (!contentMatch) continue;

      const content = contentMatch[1];
      const node = this.parseAriaLine(content, indent);

      // 找到合适的父节点
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, indent });
    }

    return root;
  }

  /**
   * 解析单行 ARIA 内容
   */
  private parseAriaLine(content: string, indent: number): ParsedAriaNode {
    // 提取角色（第一个单词）
    const roleMatch = content.match(/^(\w+)/);
    const role = roleMatch ? roleMatch[1] : 'generic';

    // 提取名称（引号中的内容）
    const nameMatch = content.match(/"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : undefined;

    // 提取属性（[attr=value] 或 [attr] 格式）
    const attributes: Record<string, string | boolean | number> = {};
    const attrRegex = /\[(\w+)(?:=([^\]]+))?\]/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(content)) !== null) {
      const attrName = attrMatch[1];
      const attrValue = attrMatch[2];

      if (attrValue === undefined) {
        // [disabled] 格式
        attributes[attrName] = true;
      } else if (attrValue === 'true') {
        attributes[attrName] = true;
      } else if (attrValue === 'false') {
        attributes[attrName] = false;
      } else if (/^\d+$/.test(attrValue)) {
        attributes[attrName] = parseInt(attrValue, 10);
      } else {
        attributes[attrName] = attrValue;
      }
    }

    return {
      role,
      name,
      attributes,
      indent,
      children: [],
    };
  }

  /**
   * 追踪元素
   */
  private trackElements(
    nodes: ParsedAriaNode[],
    tracker: RoleNameTracker,
    interactiveOnly: boolean,
  ): void {
    for (const node of nodes) {
      const isInteractive = INTERACTIVE_ROLES.has(node.role);
      const isContent = CONTENT_ROLES.has(node.role);

      if (!interactiveOnly || isInteractive) {
        if (isInteractive || isContent) {
          tracker.track(node.role, node.name);
        }
      }

      this.trackElements(node.children, tracker, interactiveOnly);
    }
  }

  /**
   * 转义字符串中的特殊字符
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
