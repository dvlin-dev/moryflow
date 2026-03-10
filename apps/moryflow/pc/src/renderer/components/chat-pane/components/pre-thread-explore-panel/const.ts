/**
 * [PROVIDES]: PreThreadExplorePanel 静态数据 — Get Started 场景 + Skill 默认提示词 + 卡片图标映射
 * [POS]: pre-thread-explore-panel 唯一静态数据源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { PenLine, ListChecks, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ExploreItem = {
  id: string;
  title: string;
  prompt: string;
};

/** Get Started — 3 个场景，对应 Moryflow "知识库 → AI 思考 → 内容发布" 核心叙事 */
export const GET_STARTED_ITEMS: ExploreItem[] = [
  {
    id: 'write-publish',
    title: 'Write & publish a post',
    prompt:
      'Review my recent notes and draft a publication-ready article with a clear narrative, strong opening, and structured sections.',
  },
  {
    id: 'build-plan',
    title: 'Build a plan from my ideas',
    prompt:
      'Turn my latest notes into a concrete execution plan with milestones, deliverables, and risk flags.',
  },
  {
    id: 'create-site-page',
    title: 'Create a site page from my vault',
    prompt: 'Survey my vault content and help me structure and publish a focused page to my site.',
  },
];

/** 预装 Skill 名称列表（与 catalog.ts 中 preinstall: true 的条目对应） */
export const PREINSTALLED_SKILL_NAMES: string[] = [
  'pdf',
  'docx',
  'pptx',
  'xlsx',
  'frontend-design',
  'canvas-design',
  'algorithmic-art',
  'web-artifacts-builder',
  'theme-factory',
  'internal-comms',
  'skill-creator',
  'find-skills',
  'agent-browser',
  'macos-automation',
];

/** Skill 默认提示词 — 点击 Skill 卡片后填充到输入框的话术 */
export const SKILL_DEFAULT_PROMPTS: Record<string, string> = {
  pdf: 'Use $pdf to create a one-page summary PDF from my research notes.',
  docx: 'Use $docx to turn my current notes into a polished Word document ready to share.',
  pptx: 'Use $pptx to generate a presentation slide deck from my research notes.',
  xlsx: 'Use $xlsx to analyze my spreadsheet data and produce a structured insight report.',
  'frontend-design': 'Use $frontend-design to build a clean landing page for my published content.',
  'canvas-design':
    'Use $canvas-design to design a visual layout for my article — title, sections, and key callouts.',
  'algorithmic-art':
    'Use $algorithmic-art to generate a visual pattern inspired by the theme of my latest notes.',
  'web-artifacts-builder':
    'Use $web-artifacts-builder to build a structured web page from my article draft.',
  'theme-factory': 'Use $theme-factory to create a consistent visual theme for my published site.',
  'internal-comms':
    "Use $internal-comms to write a team update summarizing this week's progress from my notes.",
  'skill-creator': 'Use $skill-creator to help me design a new custom skill for my workflow.',
  'find-skills': 'Use $find-skills to discover the best skill for this task.',
  'agent-browser':
    'Use $agent-browser to research a topic and compile a structured report from the web.',
  'macos-automation':
    'Use $macos-automation to automate my daily file organization and note export workflow.',
};

/** Skill 名称找不到对应 prompt 时的降级话术 */
export const buildFallbackSkillPrompt = (skillName: string): string =>
  `Use $${skillName} to help me with this task.`;

/** Get Started 各场景对应图标（按 id 映射，纯表现层） */
export const EXPLORE_ITEM_ICONS: Record<string, LucideIcon> = {
  'write-publish': PenLine,
  'build-plan': ListChecks,
  'create-site-page': Globe,
};
