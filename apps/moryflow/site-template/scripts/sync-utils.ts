/**
 * [PROVIDES]: 模板片段注入与默认值工具
 * [DEPENDS]: 无
 * [POS]: sync.ts 纯函数工具，供脚本与测试复用
 */

export type FragmentMap = Record<string, string>;

const FRAGMENT_PLACEHOLDER_PATTERN = /\{\{([A-Z_]+)\}\}/g;

export function injectFragments(content: string, fragments: FragmentMap): string {
  return content.replace(FRAGMENT_PLACEHOLDER_PATTERN, (fullMatch, placeholder: string) => {
    return placeholder in fragments ? fragments[placeholder] : fullMatch;
  });
}

export function materializeTemplateDefaults(fileName: string, content: string): string {
  // page.html 的 favicon 仍由渲染时动态注入；其余模板在导出阶段落地默认值
  if (fileName !== 'page.html') {
    return content.replace(/\{\{favicon\}\}/g, '/favicon.ico');
  }
  return content;
}

export function assertNoUnresolvedFragmentPlaceholders(
  fileName: string,
  content: string,
  placeholders: string[]
): void {
  const unresolved = placeholders.filter((placeholder) => content.includes(`{{${placeholder}}}`));

  if (unresolved.length > 0) {
    throw new Error(
      `Template ${fileName} still contains unresolved fragment placeholders: ${unresolved.join(', ')}`
    );
  }
}
