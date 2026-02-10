'use client';

import { Copy, Check } from 'lucide-react';
import { Button } from '../components/button';
import { cn } from '../lib/utils';
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
  type ShikiTransformer,
} from 'shiki';

// 常用语言列表 - 只预加载这些语言，其他语言按需加载
const PRELOAD_LANGUAGES: BundledLanguage[] = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'markdown',
  'html',
  'css',
  'python',
  'bash',
  'shell',
  'diff',
];

// 预加载的主题
const THEMES = ['one-light', 'one-dark-pro'] as const;

// 单例 highlighter 实例
let highlighterPromise: Promise<Highlighter> | null = null;

/**
 * 获取或创建 Shiki highlighter 实例（单例模式）
 */
async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...THEMES],
      langs: PRELOAD_LANGUAGES,
    });
  }
  return highlighterPromise;
}

/**
 * 确保语言已加载，未知语言回退到 plaintext
 */
async function ensureLanguage(highlighter: Highlighter, lang: string): Promise<BundledLanguage> {
  const loadedLangs = highlighter.getLoadedLanguages();
  if (loadedLangs.includes(lang as BundledLanguage)) {
    return lang as BundledLanguage;
  }

  try {
    // 尝试动态加载语言
    await highlighter.loadLanguage(lang as BundledLanguage);
    return lang as BundledLanguage;
  } catch {
    // 语言不存在，回退到 plaintext
    if (!loadedLangs.includes('plaintext')) {
      await highlighter.loadLanguage('plaintext');
    }
    return 'plaintext' as BundledLanguage;
  }
}

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

const lineNumberTransformer: ShikiTransformer = {
  name: 'line-numbers',
  line(node, line) {
    node.children.unshift({
      type: 'element',
      tagName: 'span',
      properties: {
        className: [
          'inline-block',
          'min-w-10',
          'mr-4',
          'text-right',
          'select-none',
          'text-muted-foreground',
        ],
      },
      children: [{ type: 'text', value: String(line) }],
    });
  },
};

export async function highlightCode(
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
): Promise<[string, string]> {
  const highlighter = await getHighlighter();
  const effectiveLang = await ensureLanguage(highlighter, language);
  const transformers: ShikiTransformer[] = showLineNumbers ? [lineNumberTransformer] : [];

  const lightHtml = highlighter.codeToHtml(code, {
    lang: effectiveLang,
    theme: 'one-light',
    transformers,
  });

  const darkHtml = highlighter.codeToHtml(code, {
    lang: effectiveLang,
    theme: 'one-dark-pro',
    transformers,
  });

  return [lightHtml, darkHtml];
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>('');
  const [darkHtml, setDarkHtml] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
      if (!cancelled) {
        setHtml(light);
        setDarkHtml(dark);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, language, showLineNumbers]);

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          'group relative w-full overflow-hidden rounded-lg border border-border-muted bg-background text-foreground',
          className
        )}
        {...props}
      >
        <div className="relative">
          <div
            className="overflow-hidden dark:hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="hidden overflow-hidden dark:block [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">{children}</div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const IconComponent = isCopied ? Check : Copy;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <IconComponent className="size-3.5" />}
    </Button>
  );
};
