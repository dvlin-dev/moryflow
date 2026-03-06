import { describe, expect, it } from 'vitest';
import { parseTelegramCommand } from '../src';

describe('parseTelegramCommand', () => {
  it('应识别 /start 命令', () => {
    expect(parseTelegramCommand('/start')).toEqual({ kind: 'start' });
  });

  it('应识别 /new 命令', () => {
    expect(parseTelegramCommand('/new')).toEqual({ kind: 'new' });
  });

  it('应识别带 @bot 后缀命令', () => {
    expect(parseTelegramCommand('/new@mybot')).toEqual({ kind: 'new' });
  });

  it('非命令文本应返回 null', () => {
    expect(parseTelegramCommand('hello')).toBeNull();
    expect(parseTelegramCommand('')).toBeNull();
  });
});
