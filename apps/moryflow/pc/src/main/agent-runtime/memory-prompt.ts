/**
 * [PROVIDES]: buildMemoryPromptBlock / MEMORY_TOOL_INSTRUCTIONS - memory system prompt injection
 * [DEPENDS]: memory/api/client
 * [POS]: PC Agent Runtime memory prompt assembly utilities
 */

import type { MemoryToolDeps } from './memory-tools.js';

const MAX_INJECTED_MEMORIES = 30;

export const buildMemoryPromptBlock = async (deps: MemoryToolDeps): Promise<string> => {
  try {
    const workspaceId = await deps.getWorkspaceId();
    const result = await deps.api.listFacts({
      workspaceId,
      kind: 'manual',
      pageSize: MAX_INJECTED_MEMORIES,
    });

    const facts = result.items.slice(0, MAX_INJECTED_MEMORIES);
    if (facts.length === 0) return '';

    const lines = facts.map((f) => `- ${f.text}`).join('\n');
    return [
      '## About This User',
      '',
      'The following are things you know about this user from past interactions.',
      'Use this knowledge to personalize your responses.',
      '',
      lines,
    ].join('\n');
  } catch {
    return '';
  }
};

export const MEMORY_TOOL_INSTRUCTIONS = `## Your Tools — Memory & Knowledge

You have memory and knowledge tools. Use them proactively — they significantly
improve the user experience.

### When to use memory_save:
- User expresses a clear preference ("I prefer...", "Don't do...", "Always use...")
- User reveals their role, skills, or professional background
- User mentions an ongoing project, goal, or current focus area
- User shares interests or topics they care about
- Only save high-confidence persistent facts. Skip ephemeral details (specific error messages, one-off debugging).

### When to use memory_search:
- User references something from a past conversation
- User asks a question where personal context would help
- You want to check if you already know something before asking

### When to use memory_update:
- User's situation has changed (new role, migrated tech stack, etc.)
- A previously saved fact is now outdated
- Search first to find the memory ID, then update

### When to use knowledge_search:
- User asks about their own files, notes, or project content
- User's question could benefit from their existing documentation
- You need specific details from their workspace to give a better answer
- SEARCH PROACTIVELY when the topic relates to the user's workspace.`;
