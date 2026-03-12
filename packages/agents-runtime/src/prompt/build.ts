import { applyChatSystemHook, type ChatSystemHook } from '../hooks';
import {
  MOBILE_FILE_TOOLS_PROFILE,
  PC_BASH_FIRST_PROFILE,
  type PlatformProfile,
} from '../platform-profile';
import { getCoreAgentPrompt } from './core';
import { getMobileFileToolsPrompt } from './platform/mobile-file-tools';
import { getPcBashFirstPrompt } from './platform/pc-bash-first';

export interface BuildSystemPromptOptions {
  platformProfile: PlatformProfile;
  basePrompt?: string;
  customInstructions?: string;
  availableSkillsBlock?: string;
  systemHook?: ChatSystemHook;
}

const SKILL_POLICY_LINES = [
  'Decide whether to invoke a skill by intent-to-skill matching, not by task size or complexity.',
  'When user intent matches an available skill, prefer calling the `skill` tool proactively.',
  'Only skip skill invocation when there is no meaningful match or a clear conflict.',
];

export const getPlatformPrompt = (platformProfile: PlatformProfile): string => {
  switch (platformProfile) {
    case PC_BASH_FIRST_PROFILE:
      return getPcBashFirstPrompt();
    case MOBILE_FILE_TOOLS_PROFILE:
      return getMobileFileToolsPrompt();
    default: {
      const exhaustive: never = platformProfile;
      return exhaustive;
    }
  }
};

export const buildSystemPrompt = ({
  platformProfile,
  basePrompt,
  customInstructions,
  availableSkillsBlock,
  systemHook,
}: BuildSystemPromptOptions): string => {
  const sections = [basePrompt?.trim() || getCoreAgentPrompt(), getPlatformPrompt(platformProfile)];

  const normalizedCustomInstructions = customInstructions?.trim();
  if (normalizedCustomInstructions) {
    sections.push(
      ['<custom_instructions>', normalizedCustomInstructions, '</custom_instructions>'].join('\n')
    );
  }

  if (availableSkillsBlock?.trim()) {
    sections.push(...SKILL_POLICY_LINES, availableSkillsBlock.trim());
  }

  return applyChatSystemHook(sections.join('\n\n').trim(), systemHook);
};
