declare module '*.md' {
  import type { ComponentType } from 'react';

  export const frontmatter: Record<string, unknown>;
  const MDContent: ComponentType;
  export default MDContent;
}
