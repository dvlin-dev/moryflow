export type WorkspaceDemoSidebarMode = 'home' | 'chat';

export type WorkspaceDemoFile = {
  id: string;
  title: string;
  subtitle: string;
};

export type WorkspaceDemoMessage =
  | {
      id: string;
      role: 'user' | 'assistant';
      kind: 'text';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'tool-step';
      content: string;
    };

export const WORKSPACE_DEMO_SIDEBAR_FILES: WorkspaceDemoFile[] = [
  {
    id: 'introducing-moryflow',
    title: 'Introducing Moryflow.md',
    subtitle: 'Product overview',
  },
];

export const WORKSPACE_DEMO_DOCUMENT_TITLE = 'Introducing Moryflow.md';

export const WORKSPACE_DEMO_DOCUMENT_BODY = `# Moryflow

Moryflow is a local-first AI agent workspace for people who think in notes.

Instead of losing work inside chat threads, you can keep ideas, research, drafts, and outputs inside editable documents that stay yours.

Moryflow combines three parts in one workflow:

- Local-first notes that remain durable and easy to edit
- AI agents that can search, draft, summarize, and organize with context
- Publishing tools that turn finished notes into clean websites

This makes Moryflow useful for research, writing, personal knowledge management, and digital garden publishing.

You can start with a question, let the agent work through it, keep the result in a document, and continue refining the work until it is ready to publish.
`;

export const WORKSPACE_DEMO_DEFAULT_MESSAGES: WorkspaceDemoMessage[] = [
  {
    id: 'intro-user',
    role: 'user',
    kind: 'text',
    content: 'Please introduce Moryflow.',
  },
  {
    id: 'intro-tool-search',
    role: 'assistant',
    kind: 'tool-step',
    content: 'Searching the web for product positioning',
  },
  {
    id: 'intro-tool-collect',
    role: 'assistant',
    kind: 'tool-step',
    content: 'Collecting key product capabilities',
  },
  {
    id: 'intro-tool-write',
    role: 'assistant',
    kind: 'tool-step',
    content: 'Writing summary to Introducing Moryflow.md',
  },
  {
    id: 'intro-assistant',
    role: 'assistant',
    kind: 'text',
    content:
      'Moryflow is a local-first AI workspace for notes, agent workflows, and publishing. It helps users keep work in editable documents and turn finished notes into websites.',
  },
];

export const WORKSPACE_DEMO_FOLLOW_UP_REPLY =
  'This is a simulated demo on the website. Please download Moryflow to experience the real interactive workspace.';
