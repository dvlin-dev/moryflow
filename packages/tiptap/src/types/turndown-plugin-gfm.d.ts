/**
 * Type declarations for turndown-plugin-gfm
 * @see https://github.com/mixmark-io/turndown-plugin-gfm
 */

declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown"

  /** GFM (GitHub Flavored Markdown) plugin - includes tables, strikethrough, etc. */
  export function gfm(turndownService: TurndownService): void

  /** Tables plugin only */
  export function tables(turndownService: TurndownService): void

  /** Strikethrough plugin only */
  export function strikethrough(turndownService: TurndownService): void

  /** Task list items plugin only */
  export function taskListItems(turndownService: TurndownService): void

  /** Autolinks plugin only */
  export function autolinks(turndownService: TurndownService): void
}
