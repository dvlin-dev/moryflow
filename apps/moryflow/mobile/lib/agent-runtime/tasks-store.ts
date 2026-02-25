/**
 * [INPUT]: TasksStoreContext(vaultRoot) + SQLite schema/migrations
 * [OUTPUT]: MobileTasksStore - 基于 expo-sqlite 的 TasksStore 实现
 * [POS]: Mobile 端 Tasks 存储实现，供 tasks_* 工具调用
 * [UPDATE]: 2026-01-25 - Vault 内 SQLite 路径修正与时间戳保留
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as SQLite from 'expo-sqlite';
import { AppState } from 'react-native';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type {
  TasksStore,
  TasksStoreContext,
  TaskRecord,
  TaskDependency,
  TaskNote,
  TaskFile,
  TasksStatus as TaskStatus,
  TaskPriority,
  TaskFileRole,
  ListTasksQuery,
  CreateTaskInput,
  UpdateTaskInput,
  SetStatusInput,
  AddNoteInput,
  AddFilesInput,
  DeleteTaskInput,
} from '@moryflow/agents-tools';
import {
  TASKS_PRAGMAS,
  TASKS_SCHEMA_MIGRATIONS,
  TASKS_SCHEMA_VERSION,
} from '@moryflow/agents-tools';

type MobileTasksStoreOptions = {
  onDatabaseChange?: () => void;
};

type TaskRow = {
  id: string;
  chat_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  version: number;
};

type TaskDependencyRow = {
  chat_id: string;
  task_id: string;
  depends_on: string;
};

type TaskNoteRow = {
  id: string;
  chat_id: string;
  task_id: string;
  body: string;
  created_at: string;
  author: string;
};

type TaskFileRow = {
  chat_id: string;
  task_id: string;
  path: string;
  role: TaskFileRole;
};

class MobileTasksStore implements TasksStore {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbPath: string | null = null;
  private vaultRoot: string | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private lastMtime: number | null = null;
  private appStateSubscription: { remove(): void } | null = null;

  constructor(
    private readonly capabilities: PlatformCapabilities,
    private readonly crypto: CryptoUtils,
    private readonly options: MobileTasksStoreOptions = {}
  ) {}

  async init(context: TasksStoreContext): Promise<void> {
    const { vaultRoot } = context;
    if (!vaultRoot) {
      throw new Error('missing_context');
    }

    if (this.vaultRoot !== vaultRoot) {
      this.vaultRoot = vaultRoot;
      await this.openDatabase(vaultRoot);
    }

    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      });
      this.startPolling();
    }
  }

  async listTasks(chatId: string, query?: ListTasksQuery): Promise<TaskRecord[]> {
    this.ensureReady();
    const includeArchived = query?.includeArchived ?? false;

    const conditions: string[] = ['chat_id = ?'];
    const params: unknown[] = [chatId];

    if (!includeArchived) {
      conditions.push('status <> ?');
      params.push('archived');
    }
    if (query?.status && query.status.length > 0) {
      conditions.push(`status IN (${query.status.map(() => '?').join(',')})`);
      params.push(...query.status);
    }
    if (query?.priority && query.priority.length > 0) {
      conditions.push(`priority IN (${query.priority.map(() => '?').join(',')})`);
      params.push(...query.priority);
    }
    if (query?.owner !== undefined) {
      if (query.owner === null) {
        conditions.push('owner IS NULL');
      } else {
        conditions.push('owner = ?');
        params.push(query.owner);
      }
    }
    if (query?.search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const sql = `SELECT * FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`;
    const rows = await this.db!.getAllAsync(sql, params);
    return rows.map(mapTaskRow);
  }

  async getTask(chatId: string, taskId: string): Promise<TaskRecord | null> {
    this.ensureReady();
    const row = await this.db!.getFirstAsync('SELECT * FROM tasks WHERE chat_id = ? AND id = ?', [
      chatId,
      taskId,
    ]);
    return row ? mapTaskRow(row) : null;
  }

  async createTask(chatId: string, input: CreateTaskInput): Promise<TaskRecord> {
    this.ensureReady();
    const now = new Date().toISOString();
    const id = `tsk_${this.crypto.randomUUID()}`;

    await this.runInTransaction(async () => {
      await this.db!.runAsync(
        `INSERT INTO tasks (
          id, chat_id, title, description, status, priority, owner, created_at, updated_at, started_at, completed_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          chatId,
          input.title,
          input.description,
          'todo',
          input.priority,
          input.owner ?? null,
          now,
          now,
          null,
          null,
          1,
        ]
      );

      if (input.dependencies?.length) {
        for (const dep of input.dependencies) {
          if (dep === id) {
            throw new Error('invalid_dependency');
          }
          await this.db!.runAsync(
            'INSERT INTO task_dependencies (chat_id, task_id, depends_on) VALUES (?, ?, ?)',
            [chatId, id, dep]
          );
        }
      }

      await this.db!.runAsync(
        'INSERT INTO task_events (id, chat_id, task_id, type, payload, created_at, actor) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          `evt_${this.crypto.randomUUID()}`,
          chatId,
          id,
          'create',
          JSON.stringify({ title: input.title }),
          now,
          'agent',
        ]
      );
    });

    const task = await this.getTask(chatId, id);
    if (!task) {
      throw new Error('create_failed');
    }
    this.notifyChange();
    return task;
  }

  async updateTask(chatId: string, taskId: string, input: UpdateTaskInput): Promise<TaskRecord> {
    this.ensureReady();
    const current = (await this.db!.getFirstAsync(
      'SELECT version FROM tasks WHERE chat_id = ? AND id = ?',
      [chatId, taskId]
    )) as { version: number } | null;

    if (!current) {
      throw new Error('not_found');
    }
    if (current.version !== input.expectedVersion) {
      throw new Error('conflict');
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    if (input.title !== undefined) {
      fields.push('title = ?');
      params.push(input.title);
    }
    if (input.description !== undefined) {
      fields.push('description = ?');
      params.push(input.description);
    }
    if (input.priority !== undefined) {
      fields.push('priority = ?');
      params.push(input.priority);
    }
    if (input.owner !== undefined) {
      fields.push('owner = ?');
      params.push(input.owner);
    }
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    fields.push('version = version + 1');

    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE chat_id = ? AND id = ? AND version = ?`;
    const result = await this.db!.runAsync(sql, [...params, chatId, taskId, input.expectedVersion]);
    if (result.changes === 0) {
      throw new Error('conflict');
    }

    await this.insertEvent(chatId, taskId, 'update', { fields: Object.keys(input) });
    const task = await this.getTask(chatId, taskId);
    if (!task) {
      throw new Error('not_found');
    }
    this.notifyChange();
    return task;
  }

  async setStatus(chatId: string, taskId: string, input: SetStatusInput): Promise<TaskRecord> {
    this.ensureReady();
    const current = (await this.db!.getFirstAsync(
      'SELECT version FROM tasks WHERE chat_id = ? AND id = ?',
      [chatId, taskId]
    )) as { version: number } | null;
    if (!current) {
      throw new Error('not_found');
    }
    if (current.version !== input.expectedVersion) {
      throw new Error('conflict');
    }

    const now = new Date().toISOString();
    const timestamps = await this.resolveStatusTimestamps(chatId, taskId, input.status, now);

    const result = await this.db!.runAsync(
      `UPDATE tasks SET status = ?, updated_at = ?, version = version + 1, started_at = ?, completed_at = ?
       WHERE chat_id = ? AND id = ? AND version = ?`,
      [
        input.status,
        now,
        timestamps.startedAt,
        timestamps.completedAt,
        chatId,
        taskId,
        input.expectedVersion,
      ]
    );
    if (result.changes === 0) {
      throw new Error('conflict');
    }

    await this.insertEvent(chatId, taskId, 'status', {
      status: input.status,
      reason: input.reason,
      summary: input.summary,
    });

    const task = await this.getTask(chatId, taskId);
    if (!task) {
      throw new Error('not_found');
    }
    this.notifyChange();
    return task;
  }

  async addDependency(chatId: string, taskId: string, dependsOn: string): Promise<void> {
    this.ensureReady();
    if (taskId === dependsOn) {
      throw new Error('invalid_dependency');
    }
    await this.ensureTaskExists(chatId, taskId);
    await this.ensureTaskExists(chatId, dependsOn);
    const hasCycle = await this.hasPath(chatId, dependsOn, taskId);
    if (hasCycle) {
      throw new Error('dependency_cycle');
    }
    await this.db!.runAsync(
      'INSERT OR IGNORE INTO task_dependencies (chat_id, task_id, depends_on) VALUES (?, ?, ?)',
      [chatId, taskId, dependsOn]
    );
    this.notifyChange();
  }

  async removeDependency(chatId: string, taskId: string, dependsOn: string): Promise<void> {
    this.ensureReady();
    await this.db!.runAsync(
      'DELETE FROM task_dependencies WHERE chat_id = ? AND task_id = ? AND depends_on = ?',
      [chatId, taskId, dependsOn]
    );
    this.notifyChange();
  }

  async listDependencies(chatId: string, taskId: string): Promise<TaskDependency[]> {
    this.ensureReady();
    const rows = await this.db!.getAllAsync(
      'SELECT chat_id, task_id, depends_on FROM task_dependencies WHERE chat_id = ? AND task_id = ?',
      [chatId, taskId]
    );
    return (rows as TaskDependencyRow[]).map((row) => ({
      chatId: row.chat_id,
      taskId: row.task_id,
      dependsOn: row.depends_on,
    }));
  }

  async addNote(chatId: string, taskId: string, input: AddNoteInput): Promise<TaskNote> {
    this.ensureReady();
    const id = `note_${this.crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await this.db!.runAsync(
      'INSERT INTO task_notes (id, chat_id, task_id, body, created_at, author) VALUES (?, ?, ?, ?, ?, ?)',
      [id, chatId, taskId, input.body, now, input.author]
    );
    this.notifyChange();
    return {
      id,
      chatId,
      taskId,
      body: input.body,
      createdAt: now,
      author: input.author,
    };
  }

  async listNotes(chatId: string, taskId: string): Promise<TaskNote[]> {
    this.ensureReady();
    const rows = await this.db!.getAllAsync(
      'SELECT * FROM task_notes WHERE chat_id = ? AND task_id = ? ORDER BY created_at ASC',
      [chatId, taskId]
    );
    return (rows as TaskNoteRow[]).map((row) => ({
      id: row.id,
      chatId: row.chat_id,
      taskId: row.task_id,
      body: row.body,
      createdAt: row.created_at,
      author: row.author,
    }));
  }

  async addFiles(chatId: string, taskId: string, input: AddFilesInput): Promise<void> {
    this.ensureReady();
    await this.runInTransaction(async () => {
      for (const file of input.files) {
        await this.db!.runAsync(
          'INSERT OR IGNORE INTO task_files (chat_id, task_id, path, role) VALUES (?, ?, ?, ?)',
          [chatId, taskId, file.path, file.role]
        );
      }
    });
    this.notifyChange();
  }

  async listFiles(chatId: string, taskId: string): Promise<TaskFile[]> {
    this.ensureReady();
    const rows = await this.db!.getAllAsync(
      'SELECT * FROM task_files WHERE chat_id = ? AND task_id = ?',
      [chatId, taskId]
    );
    return (rows as TaskFileRow[]).map((row) => ({
      chatId: row.chat_id,
      taskId: row.task_id,
      path: row.path,
      role: row.role,
    }));
  }

  async deleteTask(chatId: string, taskId: string, input: DeleteTaskInput): Promise<void> {
    this.ensureReady();
    if (!input.confirm) {
      throw new Error('confirm_required');
    }
    await this.db!.runAsync('DELETE FROM tasks WHERE chat_id = ? AND id = ?', [chatId, taskId]);
    this.notifyChange();
  }

  private async openDatabase(vaultRoot: string): Promise<void> {
    const { path, fs } = this.capabilities;
    const dirPath = path.join(vaultRoot, '.moryflow', 'agent');
    const dbName = 'tasks.db';
    const dbPath = path.join(dirPath, dbName);

    await fs.mkdir(dirPath, { recursive: true });

    if (this.db && this.dbPath && this.dbPath !== dbPath) {
      await this.db.closeAsync();
    }

    this.stopPolling();
    this.lastMtime = null;
    this.db = await SQLite.openDatabaseAsync(dbName, undefined, dirPath);
    this.dbPath = dbPath;

    for (const pragma of TASKS_PRAGMAS) {
      await this.db.execAsync(pragma);
    }

    const row = await this.db.getFirstAsync('PRAGMA user_version');
    const currentVersion = typeof row?.user_version === 'number' ? row.user_version : 0;
    if (currentVersion > TASKS_SCHEMA_VERSION) {
      throw new Error('schema_version_mismatch');
    }

    const migrations = TASKS_SCHEMA_MIGRATIONS.filter((m) => m.version > currentVersion);
    if (migrations.length > 0) {
      await this.runInTransaction(async () => {
        for (const migration of migrations) {
          for (const statement of migration.statements) {
            await this.db!.execAsync(statement);
          }
        }
      });
    }

    this.startPolling();
  }

  private ensureReady(): void {
    if (!this.db || !this.vaultRoot) {
      throw new Error('store_not_ready');
    }
  }

  private async ensureTaskExists(chatId: string, taskId: string): Promise<void> {
    const row = await this.db!.getFirstAsync('SELECT id FROM tasks WHERE chat_id = ? AND id = ?', [
      chatId,
      taskId,
    ]);
    if (!row) {
      throw new Error('not_found');
    }
  }

  private notifyChange(): void {
    this.options.onDatabaseChange?.();
  }

  private async hasPath(chatId: string, start: string, target: string): Promise<boolean> {
    const rows = await this.db!.getAllAsync(
      'SELECT task_id, depends_on FROM task_dependencies WHERE chat_id = ?',
      [chatId]
    );
    const graph = new Map<string, string[]>();
    for (const row of rows as Array<{ task_id: string; depends_on: string }>) {
      const list = graph.get(row.task_id) ?? [];
      list.push(row.depends_on);
      graph.set(row.task_id, list);
    }

    const visited = new Set<string>();
    const stack: string[] = [start];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node === target) return true;
      if (visited.has(node)) continue;
      visited.add(node);
      const neighbors = graph.get(node) ?? [];
      for (const next of neighbors) {
        stack.push(next);
      }
    }
    return false;
  }

  private async insertEvent(
    chatId: string,
    taskId: string,
    type: string,
    payload: Record<string, unknown>
  ) {
    const now = new Date().toISOString();
    await this.db!.runAsync(
      'INSERT INTO task_events (id, chat_id, task_id, type, payload, created_at, actor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        `evt_${this.crypto.randomUUID()}`,
        chatId,
        taskId,
        type,
        JSON.stringify(payload),
        now,
        'agent',
      ]
    );
  }

  private async resolveStatusTimestamps(
    chatId: string,
    taskId: string,
    status: SetStatusInput['status'],
    now: string
  ): Promise<{ startedAt: string | null; completedAt: string | null }> {
    const row = (await this.db!.getFirstAsync(
      'SELECT started_at, completed_at FROM tasks WHERE chat_id = ? AND id = ?',
      [chatId, taskId]
    )) as { started_at: string | null; completed_at: string | null } | null;
    const startedAt = status === 'in_progress' ? now : (row?.started_at ?? null);
    const completedAt = status === 'done' ? now : (row?.completed_at ?? null);
    return { startedAt, completedAt };
  }

  private async runInTransaction(work: () => Promise<void>): Promise<void> {
    await this.db!.execAsync('BEGIN');
    try {
      await work();
      await this.db!.execAsync('COMMIT');
    } catch (error) {
      await this.db!.execAsync('ROLLBACK');
      throw error;
    }
  }

  private startPolling(): void {
    if (this.pollingTimer || !this.dbPath) return;
    this.pollingTimer = setInterval(async () => {
      try {
        const latest = await this.getLatestMtime(this.dbPath!);
        if (latest === null) {
          return;
        }
        if (this.lastMtime === null) {
          this.lastMtime = latest;
          return;
        }
        if (latest !== this.lastMtime) {
          this.lastMtime = latest;
          this.options.onDatabaseChange?.();
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async getLatestMtime(dbPath: string): Promise<number | null> {
    const candidates = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
    const times: number[] = [];
    for (const candidate of candidates) {
      try {
        const stat = await this.capabilities.fs.stat(candidate);
        times.push(stat.mtime);
      } catch {
        // ignore missing files
      }
    }
    if (times.length === 0) return null;
    return Math.max(...times);
  }
}

const mapTaskRow = (row: TaskRow): TaskRecord => ({
  id: row.id,
  chatId: row.chat_id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  owner: row.owner,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  version: row.version,
});

export const createMobileTasksStore = (
  capabilities: PlatformCapabilities,
  crypto: CryptoUtils,
  options?: MobileTasksStoreOptions
): TasksStore => {
  return new MobileTasksStore(capabilities, crypto, options);
};
