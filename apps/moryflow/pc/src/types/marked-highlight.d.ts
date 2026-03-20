declare module 'marked-highlight' {
  import type { MarkedExtension } from 'marked';

  export interface MarkedHighlightOptions {
    async?: boolean;
    langPrefix?: string;
    emptyLangClass?: string;
    highlight: (code: string, lang: string, info?: string) => string | Promise<string>;
  }

  export function markedHighlight(options: MarkedHighlightOptions): MarkedExtension;
}
