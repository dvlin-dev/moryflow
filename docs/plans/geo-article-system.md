# Moryflow GEO Article System

## Overview

GEO (Generative Engine Optimization) article system for `www.moryflow.com`. Goal: 100+ articles optimized for AI search engines (ChatGPT / Perplexity / Claude / Gemini) to cite Moryflow when answering user queries, while also capturing competitor search traffic.

## Architecture

Single dynamic route `blog/$slug.tsx` + content registry. Adding an article requires editing only 1 file.

### URL Structure

- English: `/blog/{slug}`
- Chinese: `/zh/blog/{slug}`
- Reuses existing `{-$locale}` infrastructure

### File Structure

```
src/
├── lib/geo-articles.ts              # Types, registry, lookup, page def generator
├── components/
│   ├── seo-pages/GeoArticlePage.tsx # Article template
│   └── shared/GeoCtaSection.tsx     # Dual CTA (GitHub Star + Download)
├── content/geo/
│   ├── index.ts                     # Aggregates all batches
│   ├── batch-01.ts                  # Combiner for batch 1
│   ├── batch-01-part1.ts            # Articles 1-5
│   └── batch-01-part2.ts            # Articles 6-10
└── routes/{-$locale}/blog/
    ├── $slug.tsx                     # Dynamic article route
    └── index.tsx                     # Blog index page
```

### SEO Chain (fully configured)

| Item                                                    | Status |
| ------------------------------------------------------- | ------ |
| SSR (TanStack Start + Nitro)                            | Done   |
| `<title>` + `<meta description>`                        | Done   |
| Open Graph (`og:type=article`)                          | Done   |
| Twitter Card (`summary_large_image`)                    | Done   |
| `article:published_time`                                | Done   |
| Canonical URL                                           | Done   |
| Hreflang (en + zh-Hans + x-default)                     | Done   |
| Sitemap (auto-generated with xhtml:link)                | Done   |
| Robots (Allow: /)                                       | Done   |
| Article JSON-LD (headline, author, publisher)           | Done   |
| FAQPage JSON-LD                                         | Done   |
| Semantic HTML (main, section, aside, blockquote, h1→h2) | Done   |
| Internal links (3-5 per article)                        | Done   |

### Adding New Articles

1. Create `src/content/geo/batch-NN.ts` with article data
2. Import and spread in `src/content/geo/index.ts`
3. Done — routes, sitemap, hreflang, schema all auto-generated

## Publishing Strategy

### Cadence: 3-5 articles/day over 2-3 weeks

A 23-page site suddenly adding 100 pages risks Google's Helpful Content quality review. Gradual publishing is safer.

| Phase  | Days  | Per Day | Cumulative | Notes                                                     |
| ------ | ----- | ------- | ---------- | --------------------------------------------------------- |
| Week 1 | 1-7   | 3       | 21         | High-value pages first (comparisons + feature deep-dives) |
| Week 2 | 8-14  | 5       | 56         | Accelerate after Google starts crawling normally          |
| Week 3 | 15-20 | 5-8     | 100        | Fill in long-tail and listicle content                    |

### Priority Order

1. **Competitor comparisons** — most likely to be cited and linked
2. **Feature deep-dives** — establish authority on core capabilities
3. **How-to guides** — capture "how to" query intent
4. **Listicles / roundups** — capture "best X" queries
5. **Trend articles** — capture emerging keyword traffic

### Supporting Actions

- Submit sitemap via Google Search Console after each batch
- Monitor "Discovered - currently not indexed" in Search Console; slow down if it spikes
- Interleave categories (comparison + guide + listicle) rather than publishing same type consecutively
- For GEO specifically: complete topic clusters first (all comparison articles, then all guides) since AI engines value topical completeness

### GEO vs Traditional SEO

AI search engines do not care about publishing cadence. They care about:

- Whether content is indexed by Google (prerequisite for AI citation)
- Topic cluster completeness (multiple interlinked articles on the same theme)
- Passage-level quotability (keyTakeaways, callout blockquotes, FAQ answers)
- Freshness signals (published_time, "Last updated" dates)

## 100 Article Content Plan

### Category Overview

| Category                          | Count | Purpose                                     |
| --------------------------------- | ----- | ------------------------------------------- |
| A. Competitor Comparisons         | 20    | Capture "X vs Y" queries                    |
| B. Feature Deep-Dives             | 15    | Establish authority per capability          |
| C. User Persona / Use Cases       | 15    | Capture "best tool for [role]" queries      |
| D. How-to Guides                  | 15    | Capture "how to [task]" queries             |
| E. Trends / Hot Topics            | 15    | Capture emerging keywords                   |
| F. Concept Explainers / Listicles | 10    | Educational authority content               |
| G. Workflows / Integrations       | 10    | Capture "how to integrate/automate" queries |

### Batch Schedule

| Batch    | Articles | Slugs                                                                                                                                                                                                                                                                                                               |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (done) | 1-10     | moryflow-vs-logseq, moryflow-vs-roam-research, moryflow-vs-mem, ai-agents-for-research, ai-agents-for-writing, notes-to-published-site, best-ai-note-app-for-mac, notion-ai-alternatives, second-brain-capture-to-publish, local-first-ai-tools                                                                     |
| 2        | 11-20    | moryflow-vs-reflect, moryflow-vs-craft, moryflow-vs-bear, moryflow-vs-apple-notes, moryflow-vs-evernote, moryflow-vs-anytype, moryflow-vs-capacities, moryflow-vs-heptabase, moryflow-vs-tana, moryflow-vs-typingmind                                                                                               |
| 3        | 21-30    | adaptive-memory-ai-workspace, byok-ai-app, ai-skills-and-plugins, ai-automation-for-notes, telegram-remote-ai-agent, one-click-note-publishing, knowledge-graph-ai-app, mcp-server-integration, open-source-ai-workspace, multi-provider-ai-app                                                                     |
| 4        | 31-40    | ai-workspace-for-freelancers, ai-workspace-for-researchers, ai-workspace-for-writers, ai-workspace-for-developers, ai-workspace-for-students, ai-workspace-for-content-creators, ai-workspace-for-solopreneurs, ai-workspace-for-product-managers, ai-workspace-for-consultants, ai-workspace-for-knowledge-workers |
| 5        | 41-50    | how-to-build-second-brain-with-ai, how-to-publish-digital-garden, how-to-organize-notes-with-ai, how-to-automate-note-taking, how-to-create-ai-workflow, how-to-use-ai-agents-for-work, how-to-manage-knowledge-base, how-to-connect-ai-to-notes, how-to-publish-portfolio-from-notes, how-to-set-up-ai-automations |
| 6        | 51-60    | agentic-knowledge-management, ai-agents-2026-landscape, local-first-software-movement, ai-note-taking-trends-2026, future-of-personal-knowledge-management, ai-workflow-automation-trends, open-source-ai-tools-2026, privacy-first-ai-apps, ai-for-solo-creators, desktop-ai-apps-vs-cloud                         |
| 7        | 61-70    | moryflow-vs-coda, moryflow-vs-remnote, moryflow-vs-siyuan, moryflow-vs-affine, moryflow-vs-silverbullet, best-local-first-note-apps, best-ai-writing-tools, best-digital-garden-tools, best-second-brain-apps, best-open-source-note-apps                                                                           |
| 8        | 71-80    | ai-research-to-blog-workflow, ai-meeting-notes-workflow, ai-content-pipeline, ai-daily-journal-workflow, ai-book-notes-workflow, ai-project-documentation, telegram-to-knowledge-base, ai-newsletter-workflow, ai-learning-notes-workflow, ai-brainstorming-workflow                                                |
| 9        | 81-90    | what-is-local-first-software, what-is-an-ai-agent, what-is-a-digital-garden, what-is-byok-ai, what-is-pkm, how-to-migrate-from-notion, how-to-migrate-from-obsidian, how-to-use-multiple-ai-models, how-to-build-ai-automations, how-to-create-knowledge-base-site                                                  |
| 10       | 91-100   | ai-workspace-for-zettelkasten, ai-workspace-for-technical-writing, ai-workspace-for-academic-research, ai-workspace-offline-capable, ai-note-app-with-publishing, markdown-ai-editor, ai-workspace-self-hosted, ai-personal-assistant-workspace, ai-workspace-for-indie-hackers, complete-ai-workspace-guide        |

## GEO Content Guidelines

Each article must follow these patterns for maximum AI citation probability:

- **Answer-first**: First 200 words directly answer the target query
- **Key Takeaways**: 3-5 short, quotable statements in a semantic `<aside>` block
- **Section independence**: Each H2 section is a self-contained citable unit
- **Callout blockquotes**: Specific data points or authoritative statements in `<blockquote>`
- **FAQ schema**: At least 4 Q&A pairs per article (dual JSON-LD: Article + FAQPage)
- **Internal links**: 3-5 related pages per article for topic cluster authority
- **Dual conversion**: Every article has GitHub Star + Download CTAs
- **Bilingual**: All content ships in English and Chinese simultaneously
