import { describe, expect, it } from 'vitest';
import {
  buildSystemPrompt,
  getCoreAgentPrompt,
  getPlatformPrompt,
  MOBILE_FILE_TOOLS_PROFILE,
  PC_BASH_FIRST_PROFILE,
} from '../prompt';

describe('prompt modules', () => {
  it('keeps shared identity/style/vibe in the core prompt only', () => {
    const prompt = getCoreAgentPrompt();

    expect(prompt).toContain('# Identity');
    expect(prompt).toContain('# Response Style');
    expect(prompt).toContain('# Vibe');
    expect(prompt).toContain("Be the assistant you'd actually want to talk to at 2am.");
    expect(prompt).not.toContain('Bash-First');
    expect(prompt).not.toContain('mobile');
  });

  it('builds a PC prompt with only PC bash-first instructions', () => {
    const prompt = buildSystemPrompt({ platformProfile: PC_BASH_FIRST_PROFILE });

    expect(prompt).toContain('The desktop runtime is Bash-First.');
    expect(prompt).toContain('default to using bash');
    expect(prompt).toContain('use bash directly');
    expect(prompt).toContain('read -> cat / sed -n / head / tail');
    expect(prompt).toContain('grep / search_in_file -> rg -n');
    expect(prompt).not.toContain('Mobile does not provide bash');
    expect(prompt).not.toContain('The mobile runtime provides');
  });

  it('builds a Mobile prompt with only mobile file-tool instructions', () => {
    const prompt = buildSystemPrompt({ platformProfile: MOBILE_FILE_TOOLS_PROFILE });

    expect(prompt).toContain('The mobile runtime provides a full set of file and search tools.');
    expect(prompt).toContain(
      'prefer using read/edit/write/ls/glob/grep/search_in_file/move/delete directly'
    );
    expect(prompt).toContain('Mobile does not provide bash');
    expect(prompt).not.toContain('The desktop runtime is Bash-First');
    expect(prompt).not.toContain('read -> cat / sed -n / head / tail');
  });

  it('exposes platform prompt fragments directly', () => {
    const pcPrompt = getPlatformPrompt(PC_BASH_FIRST_PROFILE);
    const mobilePrompt = getPlatformPrompt(MOBILE_FILE_TOOLS_PROFILE);

    expect(pcPrompt).toContain('The desktop runtime is Bash-First.');
    expect(mobilePrompt).toContain(
      'The mobile runtime provides a full set of file and search tools.'
    );
    expect(pcPrompt).not.toContain(
      'The mobile runtime provides a full set of file and search tools.'
    );
    expect(mobilePrompt).not.toContain('The desktop runtime is Bash-First.');
  });

  it('prioritizes task planning for complex work and task.get after resume or compaction', () => {
    const prompt = getCoreAgentPrompt();

    expect(prompt).toContain(
      'Before starting multi-step complex tasks, prefer using task to establish or update the current execution checklist.'
    );
    expect(prompt).toContain(
      'When resuming a session, continuing after context compaction, or uncertain about progress, call task.get before proceeding.'
    );
  });
});
