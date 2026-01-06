# Extract API

> AI-powered structured data extraction from web pages.

---

## Requirement

Extract structured data from web pages using LLM, with optional JSON schema validation.

---

## Technical Design

```
POST /api/v1/extract
  ↓
ExtractController.extract()
  ↓
ExtractService.extract()
  ├── ScraperService.scrapeSync() → Get page content
  └── LlmClient.extract() → Call LLM for extraction
```

---

## Core Logic

```typescript
// ExtractService.extract() - apps/server/src/extract/extract.service.ts
async extract(userId: string, options: ExtractOptions) {
  // 1. Scrape page content first
  const scrapeResult = await this.scraperService.scrapeSync(userId, {
    url: options.url,
    formats: ['markdown'],
    onlyMainContent: true,
  });

  // 2. Build extraction prompt
  const prompt = this.buildPrompt(options.prompt, options.schema);

  // 3. Call LLM for extraction
  const extracted = await this.llmClient.extract({
    content: scrapeResult.markdown,
    prompt,
    schema: options.schema,
  });

  return { data: extracted, url: options.url };
}
```

```typescript
// LlmClient.extract() - apps/server/src/extract/llm.client.ts
async extract(input: ExtractInput) {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `${input.prompt}\n\nContent:\n${input.content}` }
    ],
    response_format: input.schema
      ? { type: 'json_schema', json_schema: input.schema }
      : { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## Request/Response

```typescript
// Request
interface ExtractOptions {
  url: string;              // URL to extract from
  prompt: string;           // Extraction instructions
  schema?: JsonSchema;      // Optional JSON schema for output
}

// Response
interface ExtractResult {
  data: Record<string, unknown>;
  url: string;
  processingMs: number;
}
```

---

## File Locations

| Component | Path |
|-----------|------|
| Controller | `apps/server/src/extract/extract.controller.ts` |
| Service | `apps/server/src/extract/extract.service.ts` |
| LLM Client | `apps/server/src/extract/llm.client.ts` |
| DTO | `apps/server/src/extract/dto/extract.dto.ts` |

---

*Version: 1.0 | Updated: 2026-01*
