# Moryflow GEO Article System

## Overview

GEO (Generative Engine Optimization) article system for `www.moryflow.com`. 100+ articles optimized for AI search engines (ChatGPT / Perplexity / Claude / Gemini) to cite Moryflow, while capturing competitor search traffic.

## Progress

| Batch | Articles | Status  | PR   |
| ----- | -------- | ------- | ---- |
| 1     | 1-10     | done    | #243 |
| 2     | 11-15    | done    | #263 |
| 3     | 16-20    | done    | —    |
| 4     | 21-25    | next    | —    |
| 5     | 26-30    | pending | —    |
| 6     | 31-35    | pending | —    |
| 7     | 36-40    | pending | —    |
| 8     | 41-45    | pending | —    |
| 9     | 46-50    | pending | —    |
| 10    | 51-55    | pending | —    |
| 11    | 56-60    | pending | —    |
| 12    | 61-65    | pending | —    |
| 13    | 66-70    | pending | —    |
| 14    | 71-75    | pending | —    |
| 15    | 76-80    | pending | —    |
| 16    | 81-85    | pending | —    |
| 17    | 86-90    | pending | —    |
| 18    | 91-95    | pending | —    |
| 19    | 96-100   | pending | —    |

## Architecture

### Content Structure

```
content/geo/
├── moryflow-vs-logseq/
│   ├── en.md                  # English content
│   └── zh.md                  # Chinese content
├── ai-agents-for-research/
│   ├── en.md
│   └── zh.md
└── ...                        # Add directory = add article (auto-discovered)
```

- **Slug** = directory name (zero duplication)
- **One file per locale** — self-contained with frontmatter + Markdown body
- **No index/registry file** — `import.meta.glob` auto-discovers all articles
- **Pure `.md`** — not MDX; can upgrade to `.mdx` later if JSX needed

### Page Rendering

```
┌─ GeoArticlePage template ─────────────────┐
│  Hero (headline, subheadline)    ← frontmatter
│  CTA (Star + Download)          ← fixed component
│  Key Takeaways                  ← frontmatter.keyTakeaways
│  ┌─ prose container ───────────┐
│  │  ## H2 sections             │ ← MD body (Tailwind prose)
│  │  paragraphs                 │
│  │  > blockquote callouts      │
│  └─────────────────────────────┘
│  FAQ accordion                 ← frontmatter.faqs
│  Related Pages                 ← frontmatter.relatedPages
│  Bottom CTA                   ← frontmatter.ctaTitle/Desc
└───────────────────────────────────────────┘
```

### Infrastructure Files

```
apps/moryflow/www/src/
├── lib/geo-articles.ts              # Types, content loader (glob), registry
├── components/
│   ├── seo-pages/GeoArticlePage.tsx # Article template (wraps MD body)
│   └── shared/GeoCtaSection.tsx     # Dual CTA (GitHub Star + Download)
├── content/geo/                     # Article directories (auto-discovered)
└── routes/{-$locale}/blog/
    ├── $slug.tsx                    # Dynamic route
    └── index.tsx                    # Blog index
```

### SEO Chain (fully configured)

SSR, `<title>`, `<meta description>`, Open Graph (`og:type=article`), Twitter Card, `article:published_time`, canonical URL, hreflang (en + zh-Hans + x-default), sitemap (auto-generated), robots, Article + FAQPage dual JSON-LD, semantic HTML.

Adding an article directory automatically registers it in sitemap, hreflang, and JSON-LD. No manual configuration.

### Tech Stack

| Component         | Technology                                                   |
| ----------------- | ------------------------------------------------------------ |
| MD → React        | `@mdx-js/rollup` (handles `.md` files)                       |
| Frontmatter       | `remark-frontmatter` + `remark-mdx-frontmatter`              |
| Content discovery | `import.meta.glob('../content/geo/*/*.md', { eager: true })` |
| Body typography   | `@tailwindcss/typography` (`prose` classes)                  |
| Validation        | Vitest tests on frontmatter schema                           |

## Automation Protocol

An automated agent runs daily at 19:00, writing 5 articles and submitting a PR.

### Step 1: Determine next batch

Read the **Progress** table above. Find the first `pending` batch. Read the **Article Specs** section for slugs, keywords, and briefs.

### Step 2: Create article files

For each article, create a directory and two Markdown files:

```
apps/moryflow/www/src/content/geo/{slug}/en.md
apps/moryflow/www/src/content/geo/{slug}/zh.md
```

That's it. No index file to edit, no registry to update.

### Step 3: Validate

```bash
pnpm --filter @moryflow/www build      # regenerates route tree
pnpm --filter @moryflow/www typecheck   # must pass
pnpm --filter @moryflow/www test:unit   # must pass
```

### Step 4: Commit and PR

```bash
git checkout -b geo/batch-{NN}
git add apps/moryflow/www/src/content/geo/
git commit -m "content(www): add GEO batch {NN} — 5 bilingual articles"
git push -u origin geo/batch-{NN}
gh pr create --title "content(www): GEO batch {NN} — 5 articles" \
  --body "Adds 5 bilingual GEO articles: slug1, slug2, slug3, slug4, slug5" \
  --base main
```

### Step 5: Update progress

After PR is merged, update this document's Progress table: set status to `done` and fill in PR number.

---

## Markdown File Format

Each `.md` file must have YAML frontmatter + Markdown body:

```markdown
---
publishedAt: 2026-03-17
title: 'SEO Title Here'
description: 'Meta description, 80-160 characters.'
headline: 'H1 Display Heading'
subheadline: 'Directly answers the target query in 1-2 sentences.'
keyTakeaways:
  - 'Short, quotable statement 1'
  - 'Short, quotable statement 2'
  - 'Short, quotable statement 3'
faqs:
  - question: 'Question text?'
    answer: 'Direct answer, 1-3 sentences.'
  - question: 'Another question?'
    answer: 'Another answer.'
ctaTitle: 'CTA heading'
ctaDescription: 'CTA description text.'
relatedPages:
  - label: 'Display Label'
    href: '/page-path'
  - label: 'Another Page'
    href: '/another-path'
---

## First Section Heading

Paragraph text. Each section should be independently quotable by AI.

> Blockquote callout with specific data or authoritative statement.

## Second Section Heading

More paragraph text...
```

### Frontmatter Validation Rules

- `publishedAt`: ISO date `YYYY-MM-DD`
- `title`: ≤ 60 characters
- `description`: 80-160 characters (Chinese must also reach ≥ 80 chars)
- `keyTakeaways`: 3-5 items
- `faqs`: ≥ 4 items
- `relatedPages`: ≥ 3 items, all `href` start with `/`
- Body: ≥ 3 H2 sections

### Available Related Page Paths

```
/agent-workspace          /ai-note-taking-app        /local-first-ai-notes
/local-first-ai-agent     /second-brain-app          /digital-garden-app
/notes-to-website         /telegram-ai-agent         /compare/notion
/compare/obsidian         /compare/manus             /compare/cowork
/compare/openclaw         /download                  /pricing
/blog/{any-existing-slug}
```

---

## GEO Content Guidelines

1. **Answer-first**: `subheadline` + first section directly answer the target query
2. **Quotable takeaways**: `keyTakeaways` are short, precise — AI can cite directly
3. **Section independence**: Each H2 section is a self-contained citable unit
4. **Callout blockquotes**: `>` for specific data points, statistics, or authoritative quotes
5. **FAQ schema**: ≥ 4 Q&A pairs — answers are direct, 1-3 sentences
6. **Internal links**: 3-5 `relatedPages` for topic cluster authority
7. **Bilingual**: Chinese must be natural Chinese, not robotic translation
8. **Factual**: Be fair to competitors; cite specific capabilities, not vague claims

### Moryflow Talking Points

- **AI Agents**: Autonomous agents that plan, research, write, organize — not chatbots
- **Adaptive Memory**: Agents remember preferences, projects, context across sessions
- **Local-first**: Notes stay on device, no cloud dependency, no lock-in
- **BYOK**: 24+ AI providers (OpenAI, Anthropic, Google, open-source), no API markup
- **One-click Publishing**: Any note → live website (digital gardens, portfolios, KBs)
- **Open Source**: MIT licensed, transparent, self-hostable
- **Remote Agent**: Telegram — same context and memory, work from anywhere
- **Automations**: Trigger-based workflows, scheduled tasks
- **Skills**: Extensible agent capabilities — community-built or custom
- **Free tier**: 100 AI credits/day, 1 published site, 50 MB storage

---

## Article Specs (Batch 2-19)

### Batch 2 (articles 11-15)

| Slug                      | Category | Keyword                 | Brief                                                                                                         |
| ------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `moryflow-vs-reflect`     | Compare  | moryflow vs reflect     | Reflect: cloud-first, AI backlinks, $10/mo. Moryflow: local-first, autonomous agents, BYOK, publishing.       |
| `moryflow-vs-craft`       | Compare  | moryflow vs craft       | Craft: Apple-native, beautiful docs, cloud. Moryflow: local-first, AI agents, BYOK, publishing.               |
| `moryflow-vs-bear`        | Compare  | moryflow vs bear        | Bear: elegant Markdown, Apple, $30/yr, no AI. Moryflow: AI agents, publishing, BYOK.                          |
| `moryflow-vs-apple-notes` | Compare  | moryflow vs apple notes | Apple Notes: free, built-in, Apple Intelligence. Moryflow: 24+ AI providers, agents, publishing, open source. |
| `moryflow-vs-evernote`    | Compare  | moryflow vs evernote    | Evernote: legacy, declining, $15/mo. Moryflow: modern, AI agents, local-first, open source, free tier.        |

### Batch 3 (articles 16-20) — published: 2026-03-19 ~ 2026-03-20

| Slug                     | Category | Keyword                | Brief                                                                                                           |
| ------------------------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `moryflow-vs-anytype`    | Compare  | moryflow vs anytype    | Anytype: local-first, object-based, E2E encrypted, open source. Moryflow: AI agents, publishing, BYOK.          |
| `moryflow-vs-capacities` | Compare  | moryflow vs capacities | Capacities: object-based, typed entities. Moryflow: AI agents, publishing, BYOK. Capacities is cloud-based.     |
| `moryflow-vs-heptabase`  | Compare  | moryflow vs heptabase  | Heptabase: visual whiteboards, $9-18/mo. Moryflow: AI agents, publishing, BYOK, local-first.                    |
| `moryflow-vs-tana`       | Compare  | moryflow vs tana       | Tana: supertags, structured data, cloud, beta. Moryflow: AI agents, publishing, BYOK, local-first, open source. |
| `moryflow-vs-typingmind` | Compare  | moryflow vs typingmind | TypingMind: BYOK chat UI, $39 lifetime. Moryflow: full workspace with notes, agents, memory, publishing.        |

### Batch 4 (articles 21-25) — scheduled: 2026-03-21 ~ 2026-03-22

| Slug                           | Category | Keyword                   | Brief                                                                                                         |
| ------------------------------ | -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `adaptive-memory-ai-workspace` | Feature  | ai workspace with memory  | How adaptive memory makes agents useful. Context across sessions, learned preferences, project understanding. |
| `byok-ai-app`                  | Feature  | bring your own key ai app | BYOK: no lock-in, no markup, latest models, privacy. 24+ providers.                                           |
| `ai-skills-and-plugins`        | Feature  | ai agent skills system    | Extensible skill system. Community or custom skills extend agents without touching core.                      |
| `ai-automation-for-notes`      | Feature  | ai automation for notes   | Triggers + scheduled tasks. Auto-summarize, Telegram digest, scheduled research agents.                       |
| `telegram-remote-ai-agent`     | Feature  | telegram ai agent bot     | Agents from Telegram. Same context, same memory, always connected.                                            |

### Batch 5 (articles 26-30)

| Slug                        | Category | Keyword                    | Brief                                                                           |
| --------------------------- | -------- | -------------------------- | ------------------------------------------------------------------------------- |
| `one-click-note-publishing` | Feature  | publish notes as website   | Publishing pipeline. Any note → live site. SEO, custom domains, digital garden. |
| `knowledge-graph-ai-app`    | Feature  | knowledge graph ai app     | AI agents + knowledge graph. Connections emerge, agents surface relationships.  |
| `mcp-server-integration`    | Feature  | mcp server ai tools        | MCP server integration. Extend agents with external tools and data.             |
| `open-source-ai-workspace`  | Feature  | open source ai workspace   | MIT license, transparent, self-hostable, community-driven.                      |
| `multi-provider-ai-app`     | Feature  | multi provider ai app byok | 24+ providers in one workspace. Switch per task. Cost comparison.               |

### Batch 6 (articles 31-35)

| Slug                           | Category | Keyword                      | Brief                                                                     |
| ------------------------------ | -------- | ---------------------------- | ------------------------------------------------------------------------- |
| `ai-workspace-for-freelancers` | Persona  | ai workspace for freelancers | Per-client context, automate follow-ups, publish portfolios.              |
| `ai-workspace-for-researchers` | Persona  | ai workspace for researchers | Synthesize papers, literature notes, memory tracks threads across months. |
| `ai-workspace-for-writers`     | Persona  | ai workspace for writers     | Capture → draft → edit → publish. Memory preserves voice/style.           |
| `ai-workspace-for-developers`  | Persona  | ai workspace for developers  | Code context + docs + publishing. Local-first appeals to devs.            |
| `ai-workspace-for-students`    | Persona  | ai workspace for students    | Free tier, study agents, exam prep, BYOK with school API keys.            |

### Batch 7 (articles 36-40)

| Slug                                 | Category | Keyword                            | Brief                                                                     |
| ------------------------------------ | -------- | ---------------------------------- | ------------------------------------------------------------------------- |
| `ai-workspace-for-content-creators`  | Persona  | ai workspace for content creators  | Research → draft → publish → repurpose. Agents automate pipeline.         |
| `ai-workspace-for-solopreneurs`      | Persona  | ai workspace for solopreneurs      | Agents handle research, writing, publishing. Free tier to start.          |
| `ai-workspace-for-product-managers`  | Persona  | ai workspace for product managers  | Synthesize feedback, competitive intel. Memory maintains product context. |
| `ai-workspace-for-consultants`       | Persona  | ai workspace for consultants       | Per-client knowledge, report generation, deliverable publishing.          |
| `ai-workspace-for-knowledge-workers` | Persona  | ai workspace for knowledge workers | 47% struggle finding info (Gartner). Agents solve retrieval.              |

### Batch 8 (articles 41-45)

| Slug                                | Category | Keyword                    | Brief                                                               |
| ----------------------------------- | -------- | -------------------------- | ------------------------------------------------------------------- |
| `how-to-build-second-brain-with-ai` | Guide    | build second brain with ai | Set up Moryflow as second brain. CODE framework. AI at each step.   |
| `how-to-publish-digital-garden`     | Guide    | publish digital garden     | Create and publish digital garden. Notes → interlinked site.        |
| `how-to-organize-notes-with-ai`     | Guide    | organize notes with ai     | AI agents organize chaos. Auto-tagging, clustering, graph building. |
| `how-to-automate-note-taking`       | Guide    | automate note taking       | Scheduled agents, Telegram capture, daily summaries.                |
| `how-to-create-ai-workflow`         | Guide    | create ai workflow         | Multi-step AI workflows. Chain tasks, triggers, schedules.          |

### Batch 9 (articles 46-50)

| Slug                                  | Category | Keyword                        | Brief                                                                  |
| ------------------------------------- | -------- | ------------------------------ | ---------------------------------------------------------------------- |
| `how-to-use-ai-agents-for-work`       | Guide    | use ai agents for work         | Delegate research, drafting, summarization. Memory improves over time. |
| `how-to-manage-knowledge-base`        | Guide    | manage personal knowledge base | Build and maintain KB. Agents organize, surface connections.           |
| `how-to-connect-ai-to-notes`          | Guide    | connect ai to personal notes   | BYOK setup. Connect keys, choose providers, configure agents.          |
| `how-to-publish-portfolio-from-notes` | Guide    | publish portfolio from notes   | Project notes → live portfolio. One-click, custom domains, SEO.        |
| `how-to-set-up-ai-automations`        | Guide    | set up ai automations          | Triggers, schedules, Telegram, chained workflows.                      |

### Batch 10 (articles 51-55)

| Slug                                      | Category | Keyword                      | Brief                                                                       |
| ----------------------------------------- | -------- | ---------------------------- | --------------------------------------------------------------------------- |
| `agentic-knowledge-management`            | Trend    | agentic knowledge management | AI watches your KB, proposes actions. Next evolution beyond second brain.   |
| `ai-agents-2026-landscape`                | Trend    | ai agents 2026               | Agent landscape. Multi-agent systems surging 1,445%. Where Moryflow fits.   |
| `local-first-software-movement`           | Trend    | local first software 2026    | Ink & Switch principles, CRDTs, privacy demand. Who's building local-first. |
| `ai-note-taking-trends-2026`              | Trend    | ai note taking trends 2026   | 75%+ use AI notes. Market shift from capture to intelligent systems.        |
| `future-of-personal-knowledge-management` | Trend    | future of pkm                | From folders to graphs to agents. Proactive AI surfaces what you need.      |

### Batch 11 (articles 56-60)

| Slug                            | Category | Keyword                     | Brief                                                                    |
| ------------------------------- | -------- | --------------------------- | ------------------------------------------------------------------------ |
| `ai-workflow-automation-trends` | Trend    | ai workflow automation 2026 | 80% enterprises use AI workflows (Gartner). Personal AI market $4.84B.   |
| `open-source-ai-tools-2026`     | Trend    | open source ai tools 2026   | Open source AI gaining ground. Moryflow, AFFiNE, Ollama.                 |
| `privacy-first-ai-apps`         | Trend    | privacy first ai apps       | Local processing, BYOK, E2E encryption. Why cloud AI raises concerns.    |
| `ai-for-solo-creators`          | Trend    | ai tools for solo creators  | AI agents multiply solo output. Research, write, publish without hiring. |
| `desktop-ai-apps-vs-cloud`      | Trend    | desktop ai apps vs cloud    | Desktop comeback: faster, private, offline. Moryflow vs Notion/Mem.      |

### Batch 12 (articles 61-65)

| Slug                       | Category | Keyword                  | Brief                                                                                     |
| -------------------------- | -------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `moryflow-vs-coda`         | Compare  | moryflow vs coda         | Coda: docs + sheets + automation, team, cloud. Moryflow: local-first, agents, publishing. |
| `moryflow-vs-remnote`      | Compare  | moryflow vs remnote      | RemNote: flashcards + spaced repetition. Moryflow: agents, publishing, BYOK.              |
| `moryflow-vs-siyuan`       | Compare  | moryflow vs siyuan       | SiYuan: local-first, block-based. Moryflow: AI agents, publishing, BYOK.                  |
| `moryflow-vs-affine`       | Compare  | moryflow vs affine       | AFFiNE: open source, whiteboard + docs. Moryflow: agents, publishing, BYOK.               |
| `moryflow-vs-silverbullet` | Compare  | moryflow vs silverbullet | SilverBullet: hackable Markdown, self-hosted. Moryflow: agents, publishing, BYOK.         |

### Batch 13 (articles 66-70)

| Slug                         | Category | Keyword                    | Brief                                                               |
| ---------------------------- | -------- | -------------------------- | ------------------------------------------------------------------- |
| `best-local-first-note-apps` | Listicle | best local first note apps | Moryflow, Obsidian, Logseq, AFFiNE, Anytype, SiYuan.                |
| `best-ai-writing-tools`      | Listicle | best ai writing tools      | Moryflow, Jasper, Copy.ai, Notion AI, Lex. Agentic vs autocomplete. |
| `best-digital-garden-tools`  | Listicle | best digital garden tools  | Moryflow, Obsidian + Quartz, Logseq Publish, Hugo, Notion.          |
| `best-second-brain-apps`     | Listicle | best second brain apps     | Moryflow, Obsidian, Notion, Logseq, Roam, Capacities, Tana.         |
| `best-open-source-note-apps` | Listicle | best open source note apps | Moryflow, Obsidian, Logseq, AFFiNE, Joplin, SiYuan.                 |

### Batch 14 (articles 71-75)

| Slug                           | Category | Keyword                      | Brief                                                           |
| ------------------------------ | -------- | ---------------------------- | --------------------------------------------------------------- |
| `ai-research-to-blog-workflow` | Workflow | ai research to blog workflow | Agent researches → synthesizes → drafts → publishes.            |
| `ai-meeting-notes-workflow`    | Workflow | ai meeting notes workflow    | Capture → extract actions → follow-up tasks → Telegram summary. |
| `ai-content-pipeline`          | Workflow | ai content pipeline          | Ideation → research → draft → edit → publish → repurpose.       |
| `ai-daily-journal-workflow`    | Workflow | ai daily journal workflow    | Capture → analyze patterns → weekly summaries → insights.       |
| `ai-book-notes-workflow`       | Workflow | ai book notes workflow       | Read → highlight → synthesize → connect → publish.              |

### Batch 15 (articles 76-80)

| Slug                         | Category | Keyword                    | Brief                                                               |
| ---------------------------- | -------- | -------------------------- | ------------------------------------------------------------------- |
| `ai-project-documentation`   | Workflow | ai project documentation   | Agent maintains living docs, tracks decisions, publishes site.      |
| `telegram-to-knowledge-base` | Workflow | telegram to knowledge base | Telegram capture → process → organize → surface connections.        |
| `ai-newsletter-workflow`     | Workflow | ai newsletter workflow     | Curate → summarize → draft → publish + send.                        |
| `ai-learning-notes-workflow` | Workflow | ai learning notes workflow | Research → structured notes → spaced review → publish log.          |
| `ai-brainstorming-workflow`  | Workflow | ai brainstorming workflow  | Free capture → cluster ideas → identify themes → structured output. |

### Batch 16 (articles 81-85)

| Slug                           | Category  | Keyword                               | Brief                                                                 |
| ------------------------------ | --------- | ------------------------------------- | --------------------------------------------------------------------- |
| `what-is-local-first-software` | Explainer | what is local first software          | Ink & Switch 7 ideals. Privacy, speed, ownership.                     |
| `what-is-an-ai-agent`          | Explainer | what is an ai agent                   | Agents vs chatbots vs copilots. Autonomy, planning, memory, tools.    |
| `what-is-a-digital-garden`     | Explainer | what is a digital garden              | Learning in public, evergreen notes, non-linear.                      |
| `what-is-byok-ai`              | Explainer | what is byok ai bring your own key    | Own keys, choose providers, control costs, privacy.                   |
| `what-is-pkm`                  | Explainer | what is personal knowledge management | Capture, organize, retrieve, create. Files → wikis → graphs → agents. |

### Batch 17 (articles 86-90)

| Slug                                | Category | Keyword                       | Brief                                                       |
| ----------------------------------- | -------- | ----------------------------- | ----------------------------------------------------------- |
| `how-to-migrate-from-notion`        | Guide    | migrate from notion           | Export → import → set up agents → migrate workflows.        |
| `how-to-migrate-from-obsidian`      | Guide    | migrate from obsidian         | Copy vault → import MD → preserve links → add agents.       |
| `how-to-use-multiple-ai-models`     | Guide    | use multiple ai models        | Configure providers, choose per task, switch models.        |
| `how-to-build-ai-automations`       | Guide    | build ai automations          | Triggers, conditions, scheduled agents, Telegram, chaining. |
| `how-to-create-knowledge-base-site` | Guide    | create knowledge base website | Organize → configure → publish → custom domain → SEO.       |

### Batch 18 (articles 91-95)

| Slug                                 | Category | Keyword                     | Brief                                                                   |
| ------------------------------------ | -------- | --------------------------- | ----------------------------------------------------------------------- |
| `ai-workspace-for-zettelkasten`      | Persona  | ai zettelkasten             | Atomic notes + AI agents surface connections across thousands of notes. |
| `ai-workspace-for-technical-writing` | Persona  | ai technical writing        | Agent docs, terminology consistency, publish documentation sites.       |
| `ai-workspace-for-academic-research` | Persona  | ai academic research        | Literature review, citation, thesis drafting, paper publishing.         |
| `ai-workspace-offline-capable`       | Feature  | offline ai workspace        | Local-first, local models via BYOK, sync when reconnected.              |
| `ai-note-app-with-publishing`        | Feature  | ai note app with publishing | Unique combo: AI notes + publishing. No other tool does both well.      |

### Batch 19 (articles 96-100)

| Slug                              | Category | Keyword                          | Brief                                                               |
| --------------------------------- | -------- | -------------------------------- | ------------------------------------------------------------------- |
| `markdown-ai-editor`              | Feature  | markdown ai editor               | Markdown + AI agents. Native support, WYSIWYG, agent editing.       |
| `ai-workspace-self-hosted`        | Feature  | self hosted ai workspace         | MIT, Docker, data sovereignty. Privacy-conscious orgs.              |
| `ai-personal-assistant-workspace` | Feature  | ai personal assistant workspace  | Remembers everything, proactive, desktop + Telegram.                |
| `ai-workspace-for-indie-hackers`  | Persona  | ai workspace for indie hackers   | Build in public, document journey, publish, manage projects.        |
| `complete-ai-workspace-guide`     | Pillar   | complete ai workspace guide 2026 | Comprehensive 2000+ word pillar. What, who, features, picks, start. |
