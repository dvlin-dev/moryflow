import type { ConsoleMessage, ElectronApplication, Page } from '@playwright/test';

type LogCaptureInput = {
  electronApp: ElectronApplication;
  page: Page;
  maxEntries?: number;
};

const trimBuffer = (buffer: string[], maxEntries: number) => {
  if (buffer.length > maxEntries) {
    buffer.splice(0, buffer.length - maxEntries);
  }
};

export const attachLogCapture = (input: LogCaptureInput) => {
  const maxEntries = input.maxEntries ?? 100;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const proc = input.electronApp.process();

  const onStdout = (chunk: Buffer | string) => {
    stdout.push(chunk.toString());
    trimBuffer(stdout, maxEntries);
  };
  const onStderr = (chunk: Buffer | string) => {
    stderr.push(chunk.toString());
    trimBuffer(stderr, maxEntries);
  };
  const onConsole = (message: ConsoleMessage) => {
    stdout.push(`[console:${message.type()}] ${message.text()}\n`);
    trimBuffer(stdout, maxEntries);
  };
  const onPageError = (error: Error) => {
    stderr.push(`[pageerror] ${error.message}\n`);
    trimBuffer(stderr, maxEntries);
  };

  proc?.stdout?.on('data', onStdout);
  proc?.stderr?.on('data', onStderr);
  input.page.on('console', onConsole);
  input.page.on('pageerror', onPageError);

  return {
    dumpRecent() {
      const joinedStdout = stdout.join('');
      const joinedStderr = stderr.join('');
      if (joinedStdout) {
        console.log('[e2e stdout]\n', joinedStdout);
      }
      if (joinedStderr) {
        console.log('[e2e stderr]\n', joinedStderr);
      }
    },
    dispose() {
      proc?.stdout?.off('data', onStdout);
      proc?.stderr?.off('data', onStderr);
      input.page.off('console', onConsole);
      input.page.off('pageerror', onPageError);
    },
  };
};

export type LogCapture = ReturnType<typeof attachLogCapture>;
