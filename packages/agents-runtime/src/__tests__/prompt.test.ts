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
    expect(prompt).toContain('Be the assistant you\'d actually want to talk to at 2am.');
    expect(prompt).not.toContain('Bash-First');
    expect(prompt).not.toContain('移动端');
  });

  it('builds a PC prompt with only PC bash-first instructions', () => {
    const prompt = buildSystemPrompt({ platformProfile: PC_BASH_FIRST_PROFILE });

    expect(prompt).toContain('桌面端当前运行时为 Bash-First。');
    expect(prompt).toContain('本地文件与搜索相关工作默认应通过 bash 完成');
    expect(prompt).toContain('如果当前注入的是 bash，就应直接用 bash 自己实现所需能力');
    expect(prompt).toContain('read -> cat / sed -n / head / tail');
    expect(prompt).toContain('grep / search_in_file -> rg -n');
    expect(prompt).not.toContain('移动端因无 bash 能力');
    expect(prompt).not.toContain('移动端当前提供完整文件与搜索工具');
  });

  it('builds a Mobile prompt with only mobile file-tool instructions', () => {
    const prompt = buildSystemPrompt({ platformProfile: MOBILE_FILE_TOOLS_PROFILE });

    expect(prompt).toContain('移动端当前提供完整文件与搜索工具。');
    expect(prompt).toContain('优先直接使用 read/edit/write/ls/glob/grep/search_in_file/move/delete');
    expect(prompt).toContain('移动端不提供 bash');
    expect(prompt).not.toContain('桌面端当前运行时为 Bash-First');
    expect(prompt).not.toContain('read -> cat / sed -n / head / tail');
  });

  it('exposes platform prompt fragments directly', () => {
    const pcPrompt = getPlatformPrompt(PC_BASH_FIRST_PROFILE);
    const mobilePrompt = getPlatformPrompt(MOBILE_FILE_TOOLS_PROFILE);

    expect(pcPrompt).toContain('桌面端当前运行时为 Bash-First。');
    expect(mobilePrompt).toContain('移动端当前提供完整文件与搜索工具。');
    expect(pcPrompt).not.toContain('移动端当前提供完整文件与搜索工具。');
    expect(mobilePrompt).not.toContain('桌面端当前运行时为 Bash-First。');
  });

  it('prioritizes task planning for complex work and task.get after resume or compaction', () => {
    const prompt = getCoreAgentPrompt();

    expect(prompt).toContain('多步复杂任务开始执行前，优先使用 task 建立或更新当前执行清单。');
    expect(prompt).toContain(
      '会话恢复、上下文压缩后继续执行、或不确定当前进度时，先调用 task.get 再继续。'
    );
    expect(prompt).not.toContain('多步复杂任务使用 task 工具跟踪状态。');
  });
});
