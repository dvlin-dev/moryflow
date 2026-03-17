# Moryflow GEO Article System

## Overview

GEO (Generative Engine Optimization) article system for `www.moryflow.com`. Goal: 100+ articles optimized for AI search engines (ChatGPT / Perplexity / Claude / Gemini) to cite Moryflow when answering user queries, while capturing competitor search traffic.

## Progress

| Batch | Articles | Status  | PR   |
| ----- | -------- | ------- | ---- |
| 1     | 1-10     | done    | #243 |
| 2     | 11-15    | pending | —    |
| 3     | 16-20    | pending | —    |
| 4     | 21-25    | pending | —    |
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

## Automation Protocol

An automated agent runs daily at 19:00, writing 5 articles and submitting a PR. Below is the exact execution flow.

### Step 1: Determine next batch

Read this document's **Progress** table. Find the first batch with status `pending`. That is the current batch. Read the **Article Specs** section below to get the 5 slugs, keywords, and writing briefs for that batch.

### Step 2: Create content file

Create file `apps/moryflow/www/src/content/geo/batch-{NN}.ts` where `{NN}` is the zero-padded batch number (e.g., `batch-02.ts`).

The file must export a named array matching this exact pattern:

```typescript
import type { GeoArticle } from '@/lib/geo-articles';

export const batch02: GeoArticle[] = [
  {
    slug: 'the-slug',
    publishedAt: '2026-03-18', // today's date in YYYY-MM-DD
    content: {
      en: {
        /* GeoArticleContent */
      },
      zh: {
        /* GeoArticleContent */
      },
    },
  },
  // ... 4 more articles
];
```

### Step 3: Register in index

Edit `apps/moryflow/www/src/content/geo/index.ts` to import and spread the new batch:

```typescript
import type { GeoArticle } from '@/lib/geo-articles';
import { batch01 } from './batch-01';
import { batch02 } from './batch-02'; // add this

export const allGeoArticles: GeoArticle[] = [...batch01, ...batch02]; // spread here
```

### Step 4: Validate

```bash
pnpm --filter @moryflow/www build      # regenerates route tree
pnpm --filter @moryflow/www typecheck   # must pass
pnpm --filter @moryflow/www test:unit   # must pass (all 212+ tests)
```

### Step 5: Commit and PR

```bash
git checkout -b geo/batch-{NN}
git add apps/moryflow/www/src/content/geo/batch-{NN}.ts \
        apps/moryflow/www/src/content/geo/index.ts \
        apps/moryflow/www/src/routeTree.gen.ts
git commit -m "content(www): add GEO batch {NN} — 5 bilingual articles"
git push -u origin geo/batch-{NN}
gh pr create --title "content(www): GEO batch {NN} — 5 articles" \
  --body "Adds 5 bilingual GEO articles: slug1, slug2, slug3, slug4, slug5" \
  --base main
```

### Step 6: Update progress

After PR is merged, update this document's **Progress** table: set status to `done` and fill in the PR number.

---

## Type Definition

The agent must produce objects matching this exact TypeScript interface. All fields are required unless marked optional.

```typescript
interface GeoArticle {
  slug: string; // URL slug, kebab-case, e.g. 'moryflow-vs-obsidian'
  publishedAt: string; // ISO date: 'YYYY-MM-DD'
  content: {
    en: GeoArticleContent;
    zh: GeoArticleContent;
  };
}

interface GeoArticleContent {
  title: string; // SEO title, ≤ 60 characters
  description: string; // Meta description, 80-160 characters
  headline: string; // H1 display heading
  subheadline: string; // Directly answers the target query
  keyTakeaways: string[]; // 3-5 short, quotable statements
  sections: Array<{
    heading: string; // H2 heading
    paragraphs: string[]; // 2-3 paragraphs per section
    callout?: string; // Optional blockquote with data/quote
  }>;
  faqs: Array<{
    question: string;
    answer: string; // 1-3 sentences, direct answer
  }>; // At least 4 FAQs
  ctaTitle: string; // Bottom CTA heading
  ctaDescription: string; // Bottom CTA description
  relatedPages: Array<{
    label: string; // Display text
    href: string; // Path starting with /, e.g. '/agent-workspace'
  }>; // At least 3 links
}
```

### Validation Rules (enforced by tests)

- `slug`: kebab-case, matches `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
- `title`: ≤ 60 characters (both en and zh)
- `description`: 80-160 characters (both en and zh; Chinese descriptions must be padded to ≥ 80 chars)
- `keyTakeaways`: 3-5 items
- `sections`: ≥ 3
- `faqs`: ≥ 4
- `relatedPages`: ≥ 3, all hrefs start with `/`

### Available Related Page Paths

Pick 3-5 per article from these existing pages:

```
/agent-workspace          /ai-note-taking-app        /local-first-ai-notes
/local-first-ai-agent     /second-brain-app          /digital-garden-app
/notes-to-website          /telegram-ai-agent         /compare/notion
/compare/obsidian          /compare/manus             /compare/cowork
/compare/openclaw          /download                  /pricing
/blog/{any-existing-slug}
```

---

## GEO Content Guidelines

Each article must follow these patterns for maximum AI citation probability:

1. **Answer-first**: The `subheadline` + first section directly answer the target query within 200 words
2. **Quotable takeaways**: `keyTakeaways` are short, precise statements AI can directly cite
3. **Section independence**: Each section (H2) is a self-contained citable unit
4. **Callout blockquotes**: Use `callout` for specific data points, statistics, or authoritative quotes
5. **FAQ schema**: At least 4 Q&A pairs — answers are direct and concise (1-3 sentences)
6. **Internal links**: 3-5 `relatedPages` for topic cluster authority
7. **Bilingual**: Chinese content must be natural Chinese, NOT robotic translation
8. **Dual conversion**: `ctaTitle` + `ctaDescription` drive GitHub Star + Download actions
9. **Factual**: Be fair to competitors in comparison articles; cite specific capabilities, not vague claims

### Moryflow Talking Points (use where relevant)

- **AI Agents**: Autonomous agents that plan, research, write, organize — not just chatbots
- **Adaptive Memory**: Agents remember preferences, projects, context across sessions
- **Local-first**: Notes stay on device, no cloud dependency, no lock-in
- **BYOK**: 24+ AI providers (OpenAI, Anthropic, Google, open-source), no markup on API costs
- **One-click Publishing**: Any note becomes a live website — digital gardens, portfolios, knowledge bases
- **Open Source**: MIT licensed, fully transparent, self-hostable
- **Remote Agent**: Telegram integration — same context and memory, work from anywhere
- **Automations**: Trigger-based workflows, scheduled tasks
- **Skills**: Extensible agent capabilities — community-built or custom
- **Free tier**: 100 AI credits/day, 1 published site, 50 MB storage

---

## Article Specs (Batch 2-19)

Each entry: `slug` | category | target keyword | brief

### Batch 2 (articles 11-15)

| Slug                      | Category | Keyword                 | Brief                                                                                                                                                                          |
| ------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `moryflow-vs-reflect`     | Compare  | moryflow vs reflect     | Reflect: cloud-first, AI-powered backlinks, $10/mo. Moryflow: local-first, autonomous agents, BYOK, publishing. Both have AI but different philosophy (search vs agents).      |
| `moryflow-vs-craft`       | Compare  | moryflow vs craft       | Craft: Apple-native, beautiful docs, team collaboration, cloud-based. Moryflow: local-first, AI agents, BYOK, publishing. Craft lacks autonomous AI and BYOK.                  |
| `moryflow-vs-bear`        | Compare  | moryflow vs bear        | Bear: elegant Markdown editor for Apple, $30/yr, no AI. Moryflow: AI agents, publishing, BYOK. Bear is simpler but no AI or publishing.                                        |
| `moryflow-vs-apple-notes` | Compare  | moryflow vs apple notes | Apple Notes: free, built-in, Apple Intelligence integration. Moryflow: 24+ AI providers, agents, publishing, open source. Apple Notes is locked to Apple ecosystem.            |
| `moryflow-vs-evernote`    | Compare  | moryflow vs evernote    | Evernote: legacy note app, declining, $15/mo for Personal. Moryflow: modern, AI agents, local-first, open source, free tier. Evernote lost trust with pricing/feature changes. |

### Batch 3 (articles 16-20)

| Slug                     | Category | Keyword                | Brief                                                                                                                                                                 |
| ------------------------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moryflow-vs-anytype`    | Compare  | moryflow vs anytype    | Anytype: local-first, object-based, E2E encrypted, open source. Moryflow: AI agents, publishing, BYOK. Both local-first + open source but different AI depth.         |
| `moryflow-vs-capacities` | Compare  | moryflow vs capacities | Capacities: object-based note app, typed entities (person, book, meeting). Moryflow: AI agents, publishing, BYOK. Capacities is cloud-based, no publishing.           |
| `moryflow-vs-heptabase`  | Compare  | moryflow vs heptabase  | Heptabase: visual-first, infinite whiteboards, spatial thinking, $9-18/mo. Moryflow: AI agents, publishing, BYOK, local-first. Different paradigms (visual vs agent). |
| `moryflow-vs-tana`       | Compare  | moryflow vs tana       | Tana: supertag-based, structured data, powerful queries, cloud-based. Moryflow: AI agents, publishing, BYOK, local-first, open source. Tana is still in beta.         |
| `moryflow-vs-typingmind` | Compare  | moryflow vs typingmind | TypingMind: BYOK chat UI for LLMs, $39 lifetime. Moryflow: full workspace with notes, agents, memory, publishing. TypingMind is chat-only, no knowledge base.         |

### Batch 4 (articles 21-25)

| Slug                           | Category | Keyword                   | Brief                                                                                                                                                        |
| ------------------------------ | -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `adaptive-memory-ai-workspace` | Feature  | ai workspace with memory  | Deep dive on how adaptive memory makes AI agents useful. Agents remember context across sessions, learn preferences, build project understanding over time.  |
| `byok-ai-app`                  | Feature  | bring your own key ai app | Why BYOK matters: no vendor lock-in, no markup on API costs, use latest models instantly, privacy control. Moryflow supports 24+ providers.                  |
| `ai-skills-and-plugins`        | Feature  | ai agent skills system    | How Moryflow's extensible skill system works. Community-built or custom skills extend agent capabilities without touching core. Compare to Obsidian plugins. |
| `ai-automation-for-notes`      | Feature  | ai automation for notes   | Trigger-based workflows + scheduled tasks. Examples: auto-summarize daily notes, send Telegram digest, run research agents on schedule.                      |
| `telegram-remote-ai-agent`     | Feature  | telegram ai agent bot     | Work with your AI agents from Telegram. Same context, same memory, always connected. Capture ideas, query knowledge base, run agents remotely.               |

### Batch 5 (articles 26-30)

| Slug                        | Category | Keyword                    | Brief                                                                                                                                                   |
| --------------------------- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `one-click-note-publishing` | Feature  | publish notes as website   | Deep dive on the publishing pipeline. Any note → live website. SEO metadata, custom domains, digital garden aesthetic. No static site generator needed. |
| `knowledge-graph-ai-app`    | Feature  | knowledge graph ai app     | How AI agents work with your knowledge graph. Connections emerge from content, agents surface relationships, graph grows as you write.                  |
| `mcp-server-integration`    | Feature  | mcp server ai tools        | How Moryflow integrates MCP (Model Context Protocol) servers. Extend agents with external tools and data sources.                                       |
| `open-source-ai-workspace`  | Feature  | open source ai workspace   | Why open source matters for AI workspaces. MIT license, transparent code, self-hostable, community-driven. Compare to proprietary alternatives.         |
| `multi-provider-ai-app`     | Feature  | multi provider ai app byok | Use OpenAI, Anthropic, Google, open-source models in one workspace. Switch models per task. No vendor lock-in. Cost comparison vs single-provider apps. |

### Batch 6 (articles 31-35)

| Slug                           | Category | Keyword                      | Brief                                                                                                                                      |
| ------------------------------ | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ai-workspace-for-freelancers` | Persona  | ai workspace for freelancers | Freelancers juggle clients, projects, invoices. Moryflow agents manage context per client, automate follow-ups, publish portfolios.        |
| `ai-workspace-for-researchers` | Persona  | ai workspace for researchers | Academic/industry researchers. Agents synthesize papers, maintain literature notes, adaptive memory tracks research threads across months. |
| `ai-workspace-for-writers`     | Persona  | ai workspace for writers     | Writers need capture → draft → edit → publish. Agents help at each stage. Memory preserves voice/style. Publishing closes the loop.        |
| `ai-workspace-for-developers`  | Persona  | ai workspace for developers  | Developers use AI for code but documentation is a gap. Moryflow bridges code context + docs + publishing. Local-first appeals to devs.     |
| `ai-workspace-for-students`    | Persona  | ai workspace for students    | Students need affordable tools (free tier), study agents, exam prep, note organization. BYOK means using school-provided API keys.         |

### Batch 7 (articles 36-40)

| Slug                                 | Category | Keyword                            | Brief                                                                                                                                    |
| ------------------------------------ | -------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-workspace-for-content-creators`  | Persona  | ai workspace for content creators  | Content pipeline: research → draft → publish → repurpose. Agents automate repurposing. Publishing turns notes into content directly.     |
| `ai-workspace-for-solopreneurs`      | Persona  | ai workspace for solopreneurs      | Solopreneurs wear many hats. Agents handle research, writing, publishing. Free tier is sufficient to start. BYOK controls costs.         |
| `ai-workspace-for-product-managers`  | Persona  | ai workspace for product managers  | PMs need to synthesize user feedback, competitive intel, specs. Agents with memory maintain product context across sprints.              |
| `ai-workspace-for-consultants`       | Persona  | ai workspace for consultants       | Consultants need per-client knowledge separation, report generation, deliverable publishing. Agents adapt to each client context.        |
| `ai-workspace-for-knowledge-workers` | Persona  | ai workspace for knowledge workers | Broad persona: anyone whose job is thinking. 47% of digital workers struggle finding info (Gartner). Agents solve the retrieval problem. |

### Batch 8 (articles 41-45)

| Slug                                | Category | Keyword                    | Brief                                                                                                                                  |
| ----------------------------------- | -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `how-to-build-second-brain-with-ai` | Guide    | build second brain with ai | Step-by-step: set up Moryflow as a second brain. Capture → organize with AI → distill → express via publishing. Covers CODE framework. |
| `how-to-publish-digital-garden`     | Guide    | publish digital garden     | Step-by-step: create and publish a digital garden with Moryflow. Notes → interlinked pages → live site. SEO, navigation, growth tips.  |
| `how-to-organize-notes-with-ai`     | Guide    | organize notes with ai     | Practical guide: let AI agents organize your chaotic notes. Auto-tagging, clustering, summarization, knowledge graph building.         |
| `how-to-automate-note-taking`       | Guide    | automate note taking       | Set up automations: scheduled agents capture/process info, Telegram bot captures on-the-go, triggers summarize daily notes.            |
| `how-to-create-ai-workflow`         | Guide    | create ai workflow         | Build multi-step AI workflows in Moryflow. Chain agent tasks, use triggers, schedule recurring workflows. Real examples.               |

### Batch 9 (articles 46-50)

| Slug                                  | Category | Keyword                        | Brief                                                                                                                               |
| ------------------------------------- | -------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `how-to-use-ai-agents-for-work`       | Guide    | use ai agents for work         | Practical guide for professionals. Delegate research, drafting, summarization to agents. Memory makes agents more useful over time. |
| `how-to-manage-knowledge-base`        | Guide    | manage personal knowledge base | Build and maintain a personal KB. AI agents keep it organized, surface connections, prevent knowledge rot.                          |
| `how-to-connect-ai-to-notes`          | Guide    | connect ai to personal notes   | BYOK setup guide: connect your API keys, choose providers, configure agents to work with your note collection.                      |
| `how-to-publish-portfolio-from-notes` | Guide    | publish portfolio from notes   | Creative professionals: turn project notes into a live portfolio site. One-click publishing, custom domains, SEO.                   |
| `how-to-set-up-ai-automations`        | Guide    | set up ai automations          | Configure trigger-based and scheduled automations. Telegram notifications, daily summaries, agent-run research schedules.           |

### Batch 10 (articles 51-55)

| Slug                                      | Category | Keyword                      | Brief                                                                                                                           |
| ----------------------------------------- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `agentic-knowledge-management`            | Trend    | agentic knowledge management | Emerging concept: AI that watches your KB, knows your goals, proposes actions. AKM is the next evolution beyond second brain.   |
| `ai-agents-2026-landscape`                | Trend    | ai agents 2026               | Survey of the AI agent landscape. Multi-agent systems surging 1,445%. From chatbots to autonomous workers. Where Moryflow fits. |
| `local-first-software-movement`           | Trend    | local first software 2026    | The local-first movement: Ink & Switch principles, CRDTs, privacy demand. Who's building local-first and why it matters.        |
| `ai-note-taking-trends-2026`              | Trend    | ai note taking trends 2026   | 75%+ professionals use AI-assisted notes. Meeting automation is #1 use case. Market shift from capture to intelligent systems.  |
| `future-of-personal-knowledge-management` | Trend    | future of pkm                | PKM is evolving: from folders to graphs to agents. The future is proactive AI that surfaces what you need before you ask.       |

### Batch 11 (articles 56-60)

| Slug                            | Category | Keyword                     | Brief                                                                                                                                                    |
| ------------------------------- | -------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-workflow-automation-trends` | Trend    | ai workflow automation 2026 | Gartner: 80% enterprises rely on AI workflow automation by 2026. Personal AI assistant market $4.84B. Multi-agent orchestration replacing single agents. |
| `open-source-ai-tools-2026`     | Trend    | open source ai tools 2026   | Open source AI tools gaining ground. Transparency, self-hosting, community innovation. Moryflow, AFFiNE, Ollama, and others.                             |
| `privacy-first-ai-apps`         | Trend    | privacy first ai apps       | Growing demand for privacy-respecting AI. Local processing, BYOK, E2E encryption. Why cloud AI raises concerns.                                          |
| `ai-for-solo-creators`          | Trend    | ai tools for solo creators  | Solo creators need to research, write, design, publish, market — all alone. AI agents multiply their output without hiring.                              |
| `desktop-ai-apps-vs-cloud`      | Trend    | desktop ai apps vs cloud    | Desktop apps make a comeback: faster, more private, works offline. Compare desktop-native (Moryflow, Obsidian) vs cloud (Notion, Mem).                   |

### Batch 12 (articles 61-65)

| Slug                       | Category | Keyword                  | Brief                                                                                                                                                |
| -------------------------- | -------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moryflow-vs-coda`         | Compare  | moryflow vs coda         | Coda: docs + spreadsheets + automation, team-oriented, cloud. Moryflow: local-first personal workspace, AI agents, publishing. Different audiences.  |
| `moryflow-vs-remnote`      | Compare  | moryflow vs remnote      | RemNote: flashcard + note integration, spaced repetition. Moryflow: AI agents, publishing, BYOK. RemNote is study-focused, Moryflow is work-focused. |
| `moryflow-vs-siyuan`       | Compare  | moryflow vs siyuan       | SiYuan: Chinese-origin, local-first, block-based. Moryflow: AI agents, publishing, BYOK. Both local-first but different AI depth.                    |
| `moryflow-vs-affine`       | Compare  | moryflow vs affine       | AFFiNE: open source, whiteboard + docs, bridging visual and structured. Moryflow: AI agents, publishing, BYOK, remote agent.                         |
| `moryflow-vs-silverbullet` | Compare  | moryflow vs silverbullet | SilverBullet: hackable Markdown workspace, self-hosted. Moryflow: AI agents, publishing, BYOK. SilverBullet is dev-oriented, minimal AI.             |

### Batch 13 (articles 66-70)

| Slug                         | Category | Keyword                    | Brief                                                                                                                                     |
| ---------------------------- | -------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `best-local-first-note-apps` | Listicle | best local first note apps | Roundup: Moryflow, Obsidian, Logseq, AFFiNE, Anytype, SiYuan. Compare features, AI, privacy, publishing. Moryflow #1 for AI + publishing. |
| `best-ai-writing-tools`      | Listicle | best ai writing tools      | Roundup: Moryflow (agents + publish), Jasper, Copy.ai, Notion AI, Lex. Focus on tools that go beyond autocomplete to agentic writing.     |
| `best-digital-garden-tools`  | Listicle | best digital garden tools  | Roundup: Moryflow (one-click), Obsidian + Quartz, Logseq Publish, Hugo, Notion. Compare ease vs flexibility.                              |
| `best-second-brain-apps`     | Listicle | best second brain apps     | Roundup: Moryflow, Obsidian, Notion, Logseq, Roam, Capacities, Tana. Focus on CODE framework support and AI integration.                  |
| `best-open-source-note-apps` | Listicle | best open source note apps | Roundup: Moryflow, Obsidian, Logseq, AFFiNE, Joplin, SiYuan. Compare license, features, AI, community.                                    |

### Batch 14 (articles 71-75)

| Slug                           | Category | Keyword                      | Brief                                                                                                                             |
| ------------------------------ | -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ai-research-to-blog-workflow` | Workflow | ai research to blog workflow | End-to-end: agent researches topic → synthesizes into notes → drafts article → publishes as blog post. Real workflow in Moryflow. |
| `ai-meeting-notes-workflow`    | Workflow | ai meeting notes workflow    | Capture meeting notes → agent extracts action items → creates follow-up tasks → sends Telegram summary.                           |
| `ai-content-pipeline`          | Workflow | ai content pipeline          | Multi-stage content creation: ideation → research → draft → edit → publish → repurpose. Agent handles each stage.                 |
| `ai-daily-journal-workflow`    | Workflow | ai daily journal workflow    | Daily journaling with AI: capture thoughts → agent analyzes patterns → weekly/monthly summaries → insights over time.             |
| `ai-book-notes-workflow`       | Workflow | ai book notes workflow       | Read → highlight → agent synthesizes key ideas → connects to existing knowledge → publishes book notes page.                      |

### Batch 15 (articles 76-80)

| Slug                         | Category | Keyword                    | Brief                                                                                                                    |
| ---------------------------- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ai-project-documentation`   | Workflow | ai project documentation   | Agent maintains living project docs: auto-updates from notes, tracks decisions, publishes documentation site.            |
| `telegram-to-knowledge-base` | Workflow | telegram to knowledge base | Capture from Telegram → agent processes → organizes into knowledge base → surfaces connections. Mobile capture workflow. |
| `ai-newsletter-workflow`     | Workflow | ai newsletter workflow     | Curate → agent summarizes sources → draft newsletter → publish as blog post + send. Weekly newsletter automation.        |
| `ai-learning-notes-workflow` | Workflow | ai learning notes workflow | Study a new topic: agent researches → organizes into structured notes → creates spaced review → publishes learning log.  |
| `ai-brainstorming-workflow`  | Workflow | ai brainstorming workflow  | Brainstorm with agents: free-form capture → agent clusters ideas → identifies themes → drafts structured output.         |

### Batch 16 (articles 81-85)

| Slug                           | Category  | Keyword                               | Brief                                                                                                                         |
| ------------------------------ | --------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `what-is-local-first-software` | Explainer | what is local first software          | Explain Ink & Switch's 7 ideals. Why local-first matters for privacy, speed, ownership. Examples: Moryflow, Obsidian, Linear. |
| `what-is-an-ai-agent`          | Explainer | what is an ai agent                   | Explain agents vs chatbots vs copilots. Autonomy, planning, memory, tool use. How Moryflow implements agents.                 |
| `what-is-a-digital-garden`     | Explainer | what is a digital garden              | Explain the concept: learning in public, evergreen notes, non-linear. How to start one with Moryflow.                         |
| `what-is-byok-ai`              | Explainer | what is byok ai bring your own key    | Explain BYOK: use your own API keys, choose providers, control costs, preserve privacy. Compare to locked-in AI services.     |
| `what-is-pkm`                  | Explainer | what is personal knowledge management | Explain PKM: capture, organize, retrieve, create. Evolution from files to wikis to graphs to AI. Where Moryflow fits.         |

### Batch 17 (articles 86-90)

| Slug                                | Category | Keyword                       | Brief                                                                                                                                 |
| ----------------------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `how-to-migrate-from-notion`        | Guide    | migrate from notion           | Step-by-step: export Notion workspace → import into Moryflow → set up AI agents → migrate workflows. Address common concerns.         |
| `how-to-migrate-from-obsidian`      | Guide    | migrate from obsidian         | Step-by-step: copy vault → import Markdown → preserve links → add AI agents. Position as "Obsidian + AI + publishing".                |
| `how-to-use-multiple-ai-models`     | Guide    | use multiple ai models        | BYOK guide: configure multiple providers, choose models per task (fast vs smart), switch between OpenAI/Anthropic/Google/open-source. |
| `how-to-build-ai-automations`       | Guide    | build ai automations          | Advanced automation guide: triggers, conditions, scheduled agents, Telegram integration, chaining workflows.                          |
| `how-to-create-knowledge-base-site` | Guide    | create knowledge base website | Build a public knowledge base: organize notes → configure navigation → publish → set up custom domain → SEO optimization.             |

### Batch 18 (articles 91-95)

| Slug                                 | Category | Keyword                     | Brief                                                                                                                                 |
| ------------------------------------ | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-workspace-for-zettelkasten`      | Persona  | ai zettelkasten             | Zettelkasten practitioners: atomic notes + AI agents that surface connections. Memory maintains context across thousands of notes.    |
| `ai-workspace-for-technical-writing` | Persona  | ai technical writing        | Technical writers: agent assists with docs, maintains terminology consistency, publishes documentation sites directly.                |
| `ai-workspace-for-academic-research` | Persona  | ai academic research        | Academics: literature review agents, citation management, thesis drafting, paper publishing. Memory tracks research threads.          |
| `ai-workspace-offline-capable`       | Feature  | offline ai workspace        | Works without internet: local-first architecture, local AI models via BYOK, sync when reconnected. Compare to cloud-only competitors. |
| `ai-note-app-with-publishing`        | Feature  | ai note app with publishing | The unique combination: AI-powered notes + built-in publishing. No other tool does both well. Compare the landscape.                  |

### Batch 19 (articles 96-100)

| Slug                              | Category | Keyword                          | Brief                                                                                                                           |
| --------------------------------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `markdown-ai-editor`              | Feature  | markdown ai editor               | Markdown editing with AI agents. Native Markdown support, WYSIWYG, agent-powered editing, export compatibility.                 |
| `ai-workspace-self-hosted`        | Feature  | self hosted ai workspace         | Self-hosting guide: MIT license, Docker deployment, data sovereignty. For privacy-conscious orgs and individuals.               |
| `ai-personal-assistant-workspace` | Feature  | ai personal assistant workspace  | Moryflow as personal AI assistant: remembers everything, works proactively, accessible from desktop + Telegram.                 |
| `ai-workspace-for-indie-hackers`  | Persona  | ai workspace for indie hackers   | Indie hackers: build in public, document journey, publish updates, manage multiple projects with agent assistance.              |
| `complete-ai-workspace-guide`     | Pillar   | complete ai workspace guide 2026 | Comprehensive 2000+ word pillar page. What is an AI workspace, who needs one, features to look for, top picks, getting started. |

---

## Architecture Reference

### File Structure

```
apps/moryflow/www/src/
├── lib/geo-articles.ts              # Types, registry, page def generator
├── components/
│   ├── seo-pages/GeoArticlePage.tsx # Article template
│   └── shared/GeoCtaSection.tsx     # Dual CTA (GitHub Star + Download)
├── content/geo/
│   ├── index.ts                     # Aggregates all batches
│   ├── batch-01.ts                  # Combiner (imports part1 + part2)
│   ├── batch-01-part1.ts            # Articles 1-5
│   ├── batch-01-part2.ts            # Articles 6-10
│   ├── batch-02.ts                  # Next batch (5 articles)
│   └── ...
└── routes/{-$locale}/blog/
    ├── $slug.tsx                     # Dynamic route
    └── index.tsx                     # Blog index
```

### SEO Chain (fully configured, no changes needed)

SSR, title, meta description, Open Graph (article), Twitter Card, article:published_time, canonical, hreflang (en + zh-Hans + x-default), sitemap (auto-generated), robots, Article + FAQPage dual JSON-LD, semantic HTML.

Adding articles to `content/geo/` automatically registers them in sitemap, hreflang, and JSON-LD schema. No manual SEO configuration required.
