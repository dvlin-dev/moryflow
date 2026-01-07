import { useState } from 'react';
import { Container } from '@/components/layout';
import { cn } from '@aiget/ui/lib';

const apis = ['scrape', 'crawl', 'extract'] as const;
type Api = (typeof apis)[number];

const apiLabels: Record<Api, string> = {
  scrape: 'Scrape API',
  crawl: 'Crawl API',
  extract: 'Extract API',
};

const codeExamples: Record<Api, string> = {
  scrape: `# Scrape a webpage to Markdown
curl -X POST https://aiget.dev/api/v1/scrape \\
  -H "X-API-Key: ag_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "metadata"],
    "onlyMainContent": true
  }'

# Response:
{
  "success": true,
  "data": {
    "id": "job_abc123",
    "status": "PENDING"
  },
  "timestamp": "2026-01-07T00:00:00.000Z"
}`,
  crawl: `# Crawl an entire website
curl -X POST https://aiget.dev/api/v1/crawl \\
  -H "X-API-Key: ag_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://docs.example.com",
    "maxDepth": 2,
    "limit": 100,
    "formats": ["markdown"]
}'

# Response:
{
  "success": true,
  "data": {
    "id": "crawl_abc123",
    "status": "PENDING"
  },
  "timestamp": "2026-01-07T00:00:00.000Z"
}`,
  extract: `# Extract structured data with AI
curl -X POST https://aiget.dev/api/v1/extract \\
  -H "X-API-Key: ag_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": ["https://example.com/product"],
    "prompt": "Extract product name, price, and description",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "price": { "type": "number" },
        "description": { "type": "string" }
      }
    }
}'

# Response:
{
  "success": true,
  "data": { "name": "Premium Widget", "price": 29.99, "description": "..." },
  "timestamp": "2026-01-07T00:00:00.000Z"
}`,
};

export function CodeExampleSection() {
  const [activeApi, setActiveApi] = useState<Api>('scrape');

  return (
    <section className="border-b border-border bg-muted/30 py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">SIMPLE API</h2>
          <p className="mt-4 text-muted-foreground">
            Powerful APIs for scraping, crawling, and extracting web data.
          </p>
        </div>

        {/* Code Block */}
        <div className="mx-auto max-w-3xl overflow-hidden border border-border bg-background">
          {/* API Tabs */}
          <div className="flex border-b border-border">
            {apis.map((api) => (
              <button
                key={api}
                onClick={() => setActiveApi(api)}
                className={cn(
                  'px-4 py-2 font-mono text-sm transition-colors',
                  activeApi === api
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {apiLabels[api]}
              </button>
            ))}
          </div>

          {/* Code Content */}
          <div className="overflow-x-auto p-4">
            <pre className="font-mono text-sm leading-relaxed">
              <code>{codeExamples[activeApi]}</code>
            </pre>
          </div>
        </div>
      </Container>
    </section>
  );
}
