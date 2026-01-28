/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Landing playground tabs + preview (Lucide icons direct render)
 */

import { useState, useCallback } from 'react';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Label,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Badge,
} from '@anyhunt/ui';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Globe,
  Layers,
  Loader,
  Map,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Turnstile } from './Turnstile';
import { usePublicEnv } from '@/lib/public-env-context';
import { useCaptchaVerification } from '@/hooks/useCaptchaVerification';
import {
  scrapeUrl,
  mapSite,
  crawlSite,
  extractData,
  searchWeb,
  type ScrapeResult,
  type MapResult,
  type CrawlResult,
  type ExtractResult,
  type SearchResult,
} from '@/lib/api';

// ============== Types ==============

type TabType = 'scrape' | 'crawl' | 'map' | 'extract' | 'search';
type FormatType = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'pdf';

type ResultType =
  | { type: 'scrape'; data: ScrapeResult }
  | { type: 'map'; data: MapResult }
  | { type: 'crawl'; data: CrawlResult }
  | { type: 'extract'; data: ExtractResult }
  | { type: 'search'; data: SearchResult };

// ============== Constants ==============

const TABS: { id: TabType; label: string; icon: LucideIcon }[] = [
  { id: 'scrape', label: 'Scrape', icon: Globe },
  { id: 'crawl', label: 'Crawl', icon: Layers },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'extract', label: 'Extract', icon: Sparkles },
  { id: 'search', label: 'Search', icon: Search },
];

const FORMAT_OPTIONS: { value: FormatType; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'rawHtml', label: 'Raw HTML' },
  { value: 'links', label: 'Links' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'pdf', label: 'PDF' },
];

const CRAWL_DEPTH_OPTIONS = ['1', '2'] as const;
const CRAWL_LIMIT_OPTIONS = ['1', '2', '3', '4', '5'] as const;
const SEARCH_LIMIT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

// Display limits for result renderers
const MAX_MARKDOWN_LENGTH = 2000;
const MAX_HTML_LENGTH = 3000;
const MAX_LINKS_DISPLAY = 20;
const MAX_MAP_URLS_DISPLAY = 10;

// URL validation
const VALID_DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;

function validateUrlInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'Please enter a URL';
  }
  if (!VALID_DOMAIN_REGEX.test(trimmed)) {
    return 'Please enter a valid domain (e.g., example.com)';
  }
  return null;
}

// ============== Param Components ==============

interface ScrapeParamsProps {
  formats: FormatType[];
  onToggleFormat: (format: FormatType) => void;
  onlyMainContent: boolean;
  onOnlyMainContentChange: (value: boolean) => void;
}

function ScrapeParams({
  formats,
  onToggleFormat,
  onlyMainContent,
  onOnlyMainContentChange,
}: ScrapeParamsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Formats</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 font-mono text-xs">
              {formats.length === 0 ? 'Select formats' : formats.join(', ')}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {FORMAT_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={formats.includes(option.value)}
                onCheckedChange={() => onToggleFormat(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="main-content" className="text-xs text-muted-foreground">
          Main content only
        </Label>
        <Switch
          id="main-content"
          checked={onlyMainContent}
          onCheckedChange={onOnlyMainContentChange}
        />
      </div>
    </div>
  );
}

interface MapParamsProps {
  search: string;
  onSearchChange: (value: string) => void;
  includeSubdomains: boolean;
  onIncludeSubdomainsChange: (value: boolean) => void;
}

function MapParams({
  search,
  onSearchChange,
  includeSubdomains,
  onIncludeSubdomainsChange,
}: MapParamsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">ListFilter</Label>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="e.g. blog, docs"
          className="h-7 w-32 border border-border bg-background px-2 font-mono text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="subdomains" className="text-xs text-muted-foreground">
          Include subdomains
        </Label>
        <Switch
          id="subdomains"
          checked={includeSubdomains}
          onCheckedChange={onIncludeSubdomainsChange}
        />
      </div>
    </div>
  );
}

interface CrawlParamsProps {
  maxDepth: string;
  onMaxDepthChange: (value: string) => void;
  limit: string;
  onLimitChange: (value: string) => void;
}

function CrawlParams({ maxDepth, onMaxDepthChange, limit, onLimitChange }: CrawlParamsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Max depth</Label>
        <Select value={maxDepth} onValueChange={onMaxDepthChange}>
          <SelectTrigger size="sm" className="h-7 w-16 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRAWL_DEPTH_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Limit</Label>
        <Select value={limit} onValueChange={onLimitChange}>
          <SelectTrigger size="sm" className="h-7 w-16 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRAWL_LIMIT_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface ExtractParamsProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  schema: string;
  onSchemaChange: (value: string) => void;
}

function ExtractParams({ prompt, onPromptChange, schema, onSchemaChange }: ExtractParamsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Prompt</Label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="What do you want to extract?"
          className="h-7 flex-1 border border-border bg-background px-2 font-mono text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-start gap-2">
        <Label className="mt-1.5 text-xs text-muted-foreground">Schema</Label>
        <textarea
          value={schema}
          onChange={(e) => onSchemaChange(e.target.value)}
          placeholder='Optional JSON schema, e.g. {"title": "string", "price": "number"}'
          className="h-16 flex-1 resize-none border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

interface SearchParamsProps {
  limit: string;
  onLimitChange: (value: string) => void;
}

function SearchParams({ limit, onLimitChange }: SearchParamsProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Results</Label>
        <Select value={limit} onValueChange={onLimitChange}>
          <SelectTrigger size="sm" className="h-7 w-16 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEARCH_LIMIT_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============== Scrape Format Renderers ==============

function MarkdownRenderer({ content }: { content: string }) {
  const truncated = content.length > MAX_MARKDOWN_LENGTH;
  return (
    <pre className="max-h-64 overflow-auto bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
      {content.slice(0, MAX_MARKDOWN_LENGTH)}
      {truncated && '...'}
    </pre>
  );
}

function HtmlRenderer({ content }: { content: string }) {
  const truncated = content.length > MAX_HTML_LENGTH;
  return (
    <pre className="max-h-64 overflow-auto bg-muted/50 p-3 font-mono text-xs">
      {content.slice(0, MAX_HTML_LENGTH)}
      {truncated && '\n...'}
    </pre>
  );
}

function LinksRenderer({ links }: { links: string[] }) {
  return (
    <ul className="max-h-48 space-y-1 overflow-auto">
      {links.slice(0, MAX_LINKS_DISPLAY).map((link, i) => (
        <li key={i} className="truncate font-mono text-xs text-foreground">
          <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {link}
          </a>
        </li>
      ))}
      {links.length > MAX_LINKS_DISPLAY && (
        <li className="text-xs text-muted-foreground">
          ... and {links.length - MAX_LINKS_DISPLAY} more
        </li>
      )}
    </ul>
  );
}

function ScreenshotRenderer({
  screenshot,
}: {
  screenshot: NonNullable<ScrapeResult['screenshot']>;
}) {
  const src = screenshot.base64 ? `data:image/png;base64,${screenshot.base64}` : screenshot.url;

  if (!src) {
    return <div className="text-xs text-muted-foreground">No screenshot available</div>;
  }

  // Calculate aspect ratio for proper height calculation before image loads
  const aspectRatio =
    screenshot.width && screenshot.height ? screenshot.width / screenshot.height : 16 / 9; // Default to 16:9 if dimensions unknown

  return (
    <div className="space-y-2">
      {screenshot.width && screenshot.height && (
        <div className="text-xs text-muted-foreground">
          {screenshot.width} × {screenshot.height}
        </div>
      )}
      <img
        src={src}
        alt="Screenshot"
        className="w-full border border-border"
        style={{ aspectRatio }}
      />
    </div>
  );
}

function PdfRenderer({ pdf }: { pdf: NonNullable<ScrapeResult['pdf']> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{pdf.pageCount} pages</span>
        <span>{Math.round(pdf.fileSize / 1024)} KB</span>
      </div>
      <a
        href={pdf.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 border border-border bg-muted/50 px-3 py-2 font-mono text-xs hover:bg-muted"
      >
        <span>Download PDF</span>
        <Download className="h-3 w-3" />
      </a>
    </div>
  );
}

// ============== Scrape Result Content ==============

interface ScrapeResultContentProps {
  data: ScrapeResult;
  formats: FormatType[];
}

function ScrapeResultContent({ data, formats }: ScrapeResultContentProps) {
  // ListFilter to only formats that have data
  const availableFormats = formats.filter((format) => {
    switch (format) {
      case 'markdown':
        return !!data.markdown;
      case 'html':
        return !!data.html;
      case 'rawHtml':
        return !!data.rawHtml;
      case 'links':
        return data.links && data.links.length > 0;
      case 'screenshot':
        return !!data.screenshot;
      case 'pdf':
        return !!data.pdf;
      default:
        return false;
    }
  });

  if (availableFormats.length === 0) {
    return <div className="text-xs text-muted-foreground">No content available</div>;
  }

  // Single format: render directly without accordion
  if (availableFormats.length === 1) {
    return <FormatContent format={availableFormats[0]} data={data} />;
  }

  // Multiple formats: use accordion
  return (
    <Accordion type="multiple" defaultValue={availableFormats} className="space-y-1">
      {availableFormats.map((format) => (
        <AccordionItem key={format} value={format} className="border border-border">
          <AccordionTrigger className="px-3 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                {format}
              </Badge>
              <FormatSummary format={format} data={data} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <FormatContent format={format} data={data} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function FormatSummary({ format, data }: { format: FormatType; data: ScrapeResult }) {
  switch (format) {
    case 'markdown':
      return <span className="text-xs text-muted-foreground">{data.markdown?.length} chars</span>;
    case 'html':
      return (
        <span className="text-xs text-muted-foreground">
          {Math.round((data.html?.length || 0) / 1024)}KB
        </span>
      );
    case 'rawHtml':
      return (
        <span className="text-xs text-muted-foreground">
          {Math.round((data.rawHtml?.length || 0) / 1024)}KB
        </span>
      );
    case 'links':
      return <span className="text-xs text-muted-foreground">{data.links?.length} found</span>;
    case 'screenshot':
      return data.screenshot?.width && data.screenshot?.height ? (
        <span className="text-xs text-muted-foreground">
          {data.screenshot.width}×{data.screenshot.height}
        </span>
      ) : null;
    case 'pdf':
      return data.pdf ? (
        <span className="text-xs text-muted-foreground">{data.pdf.pageCount} pages</span>
      ) : null;
    default:
      return null;
  }
}

function FormatContent({ format, data }: { format: FormatType; data: ScrapeResult }) {
  switch (format) {
    case 'markdown':
      return data.markdown ? <MarkdownRenderer content={data.markdown} /> : null;
    case 'html':
      return data.html ? <HtmlRenderer content={data.html} /> : null;
    case 'rawHtml':
      return data.rawHtml ? <HtmlRenderer content={data.rawHtml} /> : null;
    case 'links':
      return data.links ? <LinksRenderer links={data.links} /> : null;
    case 'screenshot':
      return data.screenshot ? <ScreenshotRenderer screenshot={data.screenshot} /> : null;
    case 'pdf':
      return data.pdf ? <PdfRenderer pdf={data.pdf} /> : null;
    default:
      return null;
  }
}

// ============== Result Components ==============

interface ResultDisplayProps {
  result: ResultType;
  scrapeFormats?: FormatType[];
}

function ResultDisplay({ result, scrapeFormats = ['markdown'] }: ResultDisplayProps) {
  const showCacheTag = result.type === 'scrape' && result.data.fromCache;

  return (
    <div className="mt-4 border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono uppercase">{result.type} Result</span>
        <div className="flex items-center gap-2">
          {showCacheTag && (
            <span className="font-mono text-[10px] text-muted-foreground/70">cached</span>
          )}
          <span>{result.data.processingMs}ms</span>
        </div>
      </div>

      {result.type === 'scrape' && (
        <ScrapeResultContent data={result.data} formats={scrapeFormats} />
      )}
      {result.type === 'map' && <MapResultContent data={result.data} />}
      {result.type === 'crawl' && <CrawlResultContent data={result.data} />}
      {result.type === 'extract' && <ExtractResultContent data={result.data} />}
      {result.type === 'search' && <SearchResultContent data={result.data} />}
    </div>
  );
}

function MapResultContent({ data }: { data: MapResult }) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground">Found {data.count} URLs</div>
      <ul className="max-h-48 space-y-1 overflow-auto">
        {data.links.slice(0, MAX_MAP_URLS_DISPLAY).map((link, i) => (
          <li key={i} className="truncate font-mono text-xs text-foreground">
            {link}
          </li>
        ))}
        {data.links.length > MAX_MAP_URLS_DISPLAY && (
          <li className="text-xs text-muted-foreground">
            ... and {data.links.length - MAX_MAP_URLS_DISPLAY} more
          </li>
        )}
      </ul>
    </div>
  );
}

function CrawlResultContent({ data }: { data: CrawlResult }) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        Crawled {data.completedUrls} of {data.totalUrls} pages
      </div>
      <Accordion type="multiple" className="space-y-1">
        {data.pages.map((page, i) => (
          <AccordionItem key={i} value={`page-${i}`} className="border border-border">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <div className="flex flex-1 flex-col items-start gap-1 text-left">
                <div className="flex w-full items-center gap-2">
                  <span className="flex-1 truncate font-mono text-xs">{page.url}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    depth: {page.depth}
                  </Badge>
                </div>
                {page.metadata?.title && (
                  <div className="text-xs text-muted-foreground">{page.metadata.title}</div>
                )}
                {page.markdown && (
                  <div className="line-clamp-1 text-xs text-muted-foreground/70">
                    {page.markdown.slice(0, 100)}
                  </div>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3">
              {page.markdown ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap bg-muted/50 p-3 font-mono text-xs">
                  {page.markdown}
                </pre>
              ) : (
                <div className="py-2 text-xs text-muted-foreground">No content available</div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function ExtractResultContent({ data }: { data: ExtractResult }) {
  return (
    <pre className="max-h-64 overflow-auto bg-muted/50 p-3 font-mono text-xs">
      {JSON.stringify(data.data, null, 2)}
    </pre>
  );
}

function SearchResultContent({ data }: { data: SearchResult }) {
  return (
    <div className="space-y-3">
      {data.results.map((item, i) => (
        <div key={i} className="border-l-2 border-border pl-3">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm hover:underline"
          >
            {item.title}
          </a>
          {item.description && (
            <div className="line-clamp-2 text-xs text-muted-foreground">{item.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============== Main Component ==============

export function HeroPlayground() {
  const { turnstileSiteKey, apiUrl } = usePublicEnv();
  const [activeTab, setActiveTab] = useState<TabType>('scrape');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultType | null>(null);

  // Scrape options
  const [scrapeFormats, setScrapeFormats] = useState<FormatType[]>(['markdown', 'screenshot']);
  const [onlyMainContent, setOnlyMainContent] = useState(true);

  // Map options
  const [mapSearch, setMapSearch] = useState('');
  const [includeSubdomains, setIncludeSubdomains] = useState(false);

  // Crawl options
  const [crawlMaxDepth, setCrawlMaxDepth] = useState('1');
  const [crawlLimit, setCrawlLimit] = useState('3');

  // Extract options
  const [extractPrompt, setExtractPrompt] = useState('Extract the main title and description');
  const [extractSchema, setExtractSchema] = useState('');

  // Search options
  const [searchLimit, setSearchLimit] = useState('10');

  const {
    turnstileRef,
    canSubmit,
    getTokenForRequest,
    handleCaptchaSuccess,
    handleCaptchaError,
    handleCaptchaExpire,
    markAsVerified,
    handleApiError,
    shouldShowTurnstile,
  } = useCaptchaVerification({ apiUrl, turnstileSiteKey });

  const toggleFormat = useCallback((format: FormatType) => {
    setScrapeFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    // Validate URL for non-search tabs
    if (activeTab !== 'search') {
      const validationError = validateUrlInput(urlInput);
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!urlInput.trim()) {
      setError('Please enter a search query');
      return;
    }

    const inputValue = activeTab === 'search' ? urlInput : `https://${urlInput}`;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const token = getTokenForRequest();

    try {
      switch (activeTab) {
        case 'scrape': {
          const data = await scrapeUrl(inputValue, token, apiUrl, {
            formats: scrapeFormats,
            onlyMainContent,
          });
          setResult({ type: 'scrape', data });
          break;
        }
        case 'map': {
          const data = await mapSite(inputValue, token, apiUrl, {
            search: mapSearch || undefined,
            includeSubdomains,
          });
          setResult({ type: 'map', data });
          break;
        }
        case 'crawl': {
          const data = await crawlSite(inputValue, token, apiUrl, {
            maxDepth: parseInt(crawlMaxDepth, 10),
            limit: parseInt(crawlLimit, 10),
          });
          setResult({ type: 'crawl', data });
          break;
        }
        case 'extract': {
          let schema: Record<string, unknown> | undefined;
          if (extractSchema.trim()) {
            try {
              schema = JSON.parse(extractSchema);
            } catch {
              setError('Invalid JSON schema');
              setIsLoading(false);
              return;
            }
          }
          const data = await extractData(inputValue, token, apiUrl, {
            prompt: extractPrompt,
            schema,
          });
          setResult({ type: 'extract', data });
          break;
        }
        case 'search': {
          const data = await searchWeb(inputValue, token, apiUrl, {
            limit: parseInt(searchLimit, 10),
          });
          setResult({ type: 'search', data });
          break;
        }
      }
      markAsVerified();
    } catch (err) {
      handleApiError(err);
      // Display the actual error message from API
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(String((err as { message: unknown }).message));
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    activeTab,
    urlInput,
    canSubmit,
    apiUrl,
    scrapeFormats,
    onlyMainContent,
    mapSearch,
    includeSubdomains,
    crawlMaxDepth,
    crawlLimit,
    extractPrompt,
    extractSchema,
    searchLimit,
    getTokenForRequest,
    markAsVerified,
    handleApiError,
  ]);

  const isSubmitDisabled = !canSubmit || isLoading || urlInput.trim().length === 0;
  const placeholder = activeTab === 'search' ? 'Enter search query...' : 'example.com';

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="h-auto w-full justify-start rounded-t-lg border-b border-border bg-transparent p-0">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-1.5 px-4 py-2 font-mono text-xs data-[state=active]:border-b-2 data-[state=active]:border-foreground"
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Input Box */}
      <div className="border border-t-0 border-border bg-card">
        {/* URL Input Row */}
        <div className="flex items-center gap-2 p-3">
          {activeTab !== 'search' && (
            <span className="shrink-0 font-mono text-sm text-muted-foreground">https://</span>
          )}
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSubmitDisabled) {
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            size="sm"
            className="font-mono"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Mode-specific Parameters */}
        <div className="border-t border-border bg-muted/30 px-3 py-2">
          {activeTab === 'scrape' && (
            <ScrapeParams
              formats={scrapeFormats}
              onToggleFormat={toggleFormat}
              onlyMainContent={onlyMainContent}
              onOnlyMainContentChange={setOnlyMainContent}
            />
          )}
          {activeTab === 'map' && (
            <MapParams
              search={mapSearch}
              onSearchChange={setMapSearch}
              includeSubdomains={includeSubdomains}
              onIncludeSubdomainsChange={setIncludeSubdomains}
            />
          )}
          {activeTab === 'crawl' && (
            <CrawlParams
              maxDepth={crawlMaxDepth}
              onMaxDepthChange={setCrawlMaxDepth}
              limit={crawlLimit}
              onLimitChange={setCrawlLimit}
            />
          )}
          {activeTab === 'extract' && (
            <ExtractParams
              prompt={extractPrompt}
              onPromptChange={setExtractPrompt}
              schema={extractSchema}
              onSchemaChange={setExtractSchema}
            />
          )}
          {activeTab === 'search' && (
            <SearchParams limit={searchLimit} onLimitChange={setSearchLimit} />
          )}
        </div>
      </div>

      {/* Turnstile - disappears after verification */}
      {shouldShowTurnstile && (
        <div className="mt-3">
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey!}
            onSuccess={handleCaptchaSuccess}
            onError={handleCaptchaError}
            onExpire={handleCaptchaExpire}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Results */}
      {result && <ResultDisplay result={result} scrapeFormats={scrapeFormats} />}

      {/* Empty State */}
      {!result && !error && !isLoading && (
        <div className="mt-4 flex min-h-32 items-center justify-center border border-dashed border-border bg-muted/20 p-4">
          <span className="font-mono text-xs text-muted-foreground">Results will appear here</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 flex min-h-32 items-center justify-center border border-border bg-card p-4">
          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
