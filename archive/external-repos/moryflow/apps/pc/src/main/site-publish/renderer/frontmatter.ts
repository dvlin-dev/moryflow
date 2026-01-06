/**
 * [PROVIDES]: Markdown frontmatter 解析
 * [POS]: 解析 YAML 格式的 frontmatter
 */

export interface FrontmatterResult {
  frontmatter: Record<string, string>
  body: string
}

/** 解析 Markdown frontmatter */
export function parseFrontmatter(content: string): FrontmatterResult {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterStr = match[1]
  const body = content.slice(match[0].length)

  const frontmatter: Record<string, string> = {}
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '')
      frontmatter[key] = value
    }
  }

  return { frontmatter, body }
}
