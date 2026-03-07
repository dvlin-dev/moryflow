import { describe, expect, it } from 'vitest';
import { getMorySystemPrompt } from '../prompt';

describe('getMorySystemPrompt', () => {
  it('uses runtime-injected tool inventory wording instead of a fixed full list', () => {
    const prompt = getMorySystemPrompt();

    expect(prompt).toContain('可用工具清单以当前运行时实际注入为准');
    expect(prompt).toContain('桌面端运行时可能采用 Bash-First');
    expect(prompt).toContain('移动端因无 bash 能力');
    expect(prompt).toContain('任务管理（task）');
    expect(prompt).not.toContain('tasks_*');
    expect(prompt).not.toContain('manage_plan');
    expect(prompt).not.toContain(
      '可用内置工具包括：read, edit, write, ls, glob, grep, search_in_file, move, delete, tasks_*, web_fetch, web_search, subagent。'
    );
  });

  it('prioritizes task planning for complex work and task.get after resume or compaction', () => {
    const prompt = getMorySystemPrompt();

    expect(prompt).toContain('多步复杂任务开始执行前，优先使用 task 建立或更新当前执行清单。');
    expect(prompt).toContain(
      '会话恢复、上下文压缩后继续执行、或不确定当前进度时，先调用 task.get 再继续。'
    );
    expect(prompt).not.toContain('多步复杂任务使用 task 工具跟踪状态。');
  });
});
