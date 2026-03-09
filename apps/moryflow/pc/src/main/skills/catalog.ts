/**
 * [PROVIDES]: Curated skills 静态目录与查询能力
 * [DEPENDS]: skills/types
 * [POS]: Moryflow PC 内置 skills 清单事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { CuratedSkill } from './types.js';

const createSkill = (skill: CuratedSkill): CuratedSkill => skill;

export const CURATED_SKILLS: CuratedSkill[] = [
  createSkill({
    name: 'xlsx',
    fallbackTitle: 'XLSX',
    fallbackDescription: 'Read, edit, and create spreadsheet files for data workflows.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/xlsx',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/xlsx',
    },
  }),
  createSkill({
    name: 'algorithmic-art',
    fallbackTitle: 'Algorithmic Art',
    fallbackDescription: 'Generate algorithmic visual artifacts and procedural patterns.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/algorithmic-art',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/algorithmic-art',
    },
  }),
  createSkill({
    name: 'canvas-design',
    fallbackTitle: 'Canvas Design',
    fallbackDescription: 'Create and iterate visual layouts with canvas-oriented workflows.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/canvas-design',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/canvas-design',
    },
  }),
  createSkill({
    name: 'docx',
    fallbackTitle: 'DOCX',
    fallbackDescription: 'Work with Microsoft Word documents including generation and edits.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/docx',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/docx',
    },
  }),
  createSkill({
    name: 'frontend-design',
    fallbackTitle: 'Frontend Design',
    fallbackDescription: 'Build polished frontend interfaces with strong design direction.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/frontend-design',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/frontend-design',
    },
  }),
  createSkill({
    name: 'internal-comms',
    fallbackTitle: 'Internal Comms',
    fallbackDescription: 'Draft and refine internal communication artifacts and updates.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/internal-comms',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/internal-comms',
    },
  }),
  createSkill({
    name: 'pdf',
    fallbackTitle: 'PDF',
    fallbackDescription: 'Analyze and transform PDF documents with structured workflows.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/pdf',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/pdf',
    },
  }),
  createSkill({
    name: 'pptx',
    fallbackTitle: 'PPTX',
    fallbackDescription: 'Generate and edit presentation slides with slide-aware patterns.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/pptx',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/pptx',
    },
  }),
  createSkill({
    name: 'skill-creator',
    fallbackTitle: 'Skill Creator',
    fallbackDescription:
      'Guide for creating effective skills with structured workflows and reusable resources.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/skill-creator',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/skill-creator',
    },
  }),
  createSkill({
    name: 'theme-factory',
    fallbackTitle: 'Theme Factory',
    fallbackDescription: 'Design and apply consistent visual themes for generated artifacts.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/theme-factory',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/theme-factory',
    },
  }),
  createSkill({
    name: 'web-artifacts-builder',
    fallbackTitle: 'Web Artifacts Builder',
    fallbackDescription: 'Build structured web deliverables and deployment-ready artifacts.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'anthropics',
      repo: 'skills',
      ref: 'main',
      path: 'skills/web-artifacts-builder',
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder',
    },
  }),
  createSkill({
    name: 'find-skills',
    fallbackTitle: 'Find Skills',
    fallbackDescription:
      'Discover and install agent skills from the open skills ecosystem based on user intent.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'vercel-labs',
      repo: 'skills',
      ref: 'main',
      path: 'skills/find-skills',
      sourceUrl: 'https://github.com/vercel-labs/skills/tree/main/skills/find-skills',
    },
  }),
  createSkill({
    name: 'agent-browser',
    fallbackTitle: 'Agent Browser',
    fallbackDescription: 'Browser automation workflows for agent-assisted web execution tasks.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'vercel-labs',
      repo: 'agent-browser',
      ref: 'main',
      path: 'skills/agent-browser',
      sourceUrl: 'https://github.com/vercel-labs/agent-browser/tree/main/skills/agent-browser',
    },
  }),
  createSkill({
    name: 'macos-automation',
    fallbackTitle: 'macOS Automation',
    fallbackDescription:
      'Automate native macOS apps and system workflows through structured tool templates.',
    preinstall: true,
    recommended: true,
    source: {
      owner: 'dvlin-dev',
      repo: 'macos-automation-skills',
      ref: 'main',
      path: 'skills/macos-automation',
      sourceUrl:
        'https://github.com/dvlin-dev/macos-automation-skills/tree/main/skills/macos-automation',
    },
  }),
  createSkill({
    name: 'remotion',
    fallbackTitle: 'Remotion',
    fallbackDescription: 'Create programmatic videos and animation pipelines with Remotion.',
    preinstall: false,
    recommended: true,
    source: {
      owner: 'remotion-dev',
      repo: 'skills',
      ref: 'main',
      path: 'skills/remotion',
      sourceUrl: 'https://github.com/remotion-dev/skills/tree/main/skills/remotion',
    },
  }),
  createSkill({
    name: 'baoyu-article-illustrator',
    fallbackTitle: 'Article Illustrator',
    fallbackDescription:
      'Analyze article structure and generate consistent illustrations with Type × Style controls.',
    preinstall: false,
    recommended: true,
    source: {
      owner: 'JimLiu',
      repo: 'baoyu-skills',
      ref: 'main',
      path: 'skills/baoyu-article-illustrator',
      sourceUrl:
        'https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-article-illustrator',
    },
  }),
];

export const CURATED_SKILL_MAP = new Map(CURATED_SKILLS.map((item) => [item.name, item]));
