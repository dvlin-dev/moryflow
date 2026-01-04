/**
 * [PROVIDES]: markdownToHtml, htmlToMarkdown - Markdown 双向转换
 * [DEPENDS]: marked, turndown, turndown-plugin-gfm
 * [POS]: 编辑器工具模块，用于内容格式转换
 */

/// <reference path="../types/turndown-plugin-gfm.d.ts" />

import { marked } from "marked"
import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

// 创建并配置 Turndown 实例
function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  })

  service.use(gfm)

  // 任务列表规则
  service.addRule("taskList", {
    filter: (node) => {
      const element = node as HTMLElement
      return (
        element?.tagName === "LI" &&
        element.getAttribute?.("data-task") === "true"
      )
    },
    replacement: (content, node) => {
      const element = node as HTMLElement
      const isChecked = element?.getAttribute?.("data-checked") === "true"
      return `- [${isChecked ? "x" : " "}] ${content}`
    },
  })

  return service
}

// 配置 marked（模块级别，只执行一次）
marked.setOptions({
  gfm: true,
  breaks: false,
})

// 单例 turndown 实例
const turndownService = createTurndownService()

/**
 * Markdown 转 HTML
 * @throws 解析失败时抛出异常
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""
  const result = marked.parse(markdown)
  if (typeof result !== "string") {
    throw new Error("Unexpected async result from marked.parse")
  }
  return result
}

/**
 * HTML 转 Markdown
 * @throws 转换失败时抛出异常
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ""
  return turndownService.turndown(html)
}
