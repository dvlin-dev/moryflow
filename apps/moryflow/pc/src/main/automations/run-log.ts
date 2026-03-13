import { automationRunRecordSchema, type AutomationRunRecord } from '@moryflow/automations-core';
import fs from 'node:fs/promises';
import path from 'node:path';

export type { AutomationRunRecord } from '@moryflow/automations-core';

const DEFAULT_LIMIT = 100;

const resolveBaseDir = (input?: {
  baseDir?: string;
  getUserDataPath?: () => string | undefined;
}) => {
  if (input?.baseDir) {
    return input.baseDir;
  }
  const e2eUserData = process.env['MORYFLOW_E2E_USER_DATA']?.trim();
  if (e2eUserData) {
    return path.join(e2eUserData, 'stores', 'automation-run-logs');
  }
  const userDataPath = input?.getUserDataPath?.()?.trim();
  if (userDataPath) {
    return path.join(userDataPath, 'automation-run-logs');
  }
  return path.join(process.cwd(), '.moryflow-automation-run-logs');
};

const encodeRecord = (record: AutomationRunRecord) => `${JSON.stringify(record)}\n`;

const parseJsonLine = (line: string): AutomationRunRecord | null => {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return automationRunRecordSchema.parse(JSON.parse(trimmed));
  } catch {
    return null;
  }
};

export const createAutomationRunLogStore = (config?: {
  baseDir?: string;
  limitPerJob?: number;
  getUserDataPath?: () => string | undefined;
}) => {
  const limitPerJob = config?.limitPerJob ?? DEFAULT_LIMIT;

  const resolveJobFile = (jobId: string) => path.join(resolveBaseDir(config), `${jobId}.jsonl`);

  const readJobRecords = async (jobId: string): Promise<AutomationRunRecord[]> => {
    try {
      const content = await fs.readFile(resolveJobFile(jobId), 'utf8');
      return content
        .split('\n')
        .map(parseJsonLine)
        .filter((record): record is AutomationRunRecord => record !== null)
        .sort((left, right) => right.finishedAt - left.finishedAt);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  };

  return {
    async append(record: AutomationRunRecord): Promise<AutomationRunRecord> {
      const parsed = automationRunRecordSchema.parse(record);
      await fs.mkdir(resolveBaseDir(config), { recursive: true });
      const nextRecords = [parsed, ...(await readJobRecords(parsed.jobId))].slice(0, limitPerJob);
      await fs.writeFile(
        resolveJobFile(parsed.jobId),
        nextRecords
          .sort((left, right) => left.finishedAt - right.finishedAt)
          .map(encodeRecord)
          .join(''),
        'utf8'
      );
      return parsed;
    },
    async listRecent(input: { jobId?: string; limit?: number }): Promise<AutomationRunRecord[]> {
      const limit = input.limit ?? 20;
      if (limit <= 0) {
        return [];
      }
      if (input.jobId) {
        return (await readJobRecords(input.jobId)).slice(0, limit);
      }
      try {
        const files = await fs.readdir(resolveBaseDir(config));
        const allRecords = await Promise.all(
          files
            .filter((file) => file.endsWith('.jsonl'))
            .map(async (file) => readJobRecords(file.slice(0, -'.jsonl'.length)))
        );
        return allRecords
          .flat()
          .sort((left, right) => right.finishedAt - left.finishedAt)
          .slice(0, limit);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    },
    async removeJobLogs(jobId: string): Promise<void> {
      try {
        await fs.rm(resolveJobFile(jobId), { force: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return;
        }
        throw error;
      }
    },
  };
};

export type AutomationRunLogStore = ReturnType<typeof createAutomationRunLogStore>;
