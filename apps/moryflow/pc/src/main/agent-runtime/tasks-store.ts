/**
 * [INPUT]: TasksStoreContext(vaultRoot) + SQLite schema/migrations
 * [OUTPUT]: DesktopTasksStore - 基于 better-sqlite3 的 TasksStore 实现
 * [POS]: PC 主进程 Tasks 存储实现，供 tasks_* 工具调用
 * [UPDATE]: 2026-01-25 - 显式 chatId 参数/状态时间戳保留/重置文件监听/归档状态可查询
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import Database from 'better-sqlite3';
import type { PlatformCapabilities, CryptoUtils } from '@anyhunt/agents-adapter';
import type {
  TasksStore,
  TasksStoreContext,
  TaskRecord,
  TaskDependency,
  TaskNote,
  TaskFile,
  TaskEvent,
  ListTasksQuery,
  CreateTaskInput,
  UpdateTaskInput,
  SetStatusInput,
  AddNoteInput,
  AddFilesInput,
  DeleteTaskInput,
} from '@anyhunt/agents-tools';
import {
  TASKS_PRAGMAS,
  TASKS_SCHEMA_MIGRATIONS,
  TASKS_SCHEMA_VERSION,
} from '@anyhunt/agents-tools';

type DatabaseInstance = ReturnType<typeof Database>;

type TasksStoreOptions = {
  onDatabaseChange?: () => void;
};

class DesktopTasksStore implements TasksStore {
  private db: DatabaseInstance | null = null;
  private dbPath: string | null = null;
  private vaultRoot: string | null = null;
  private stopWatch: (() => void) | null = null;

  constructor(
    private readonly capabilities: PlatformCapabilities,
    private readonly crypto: CryptoUtils,
    private readonly options: TasksStoreOptions = {}
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
  }

  async listTasks(chatId: string, query?: ListTasksQuery): Promise<TaskRecord[]> {
    this.ensureReady();
    const statusFilter = query?.status ?? null;
    const hasArchivedStatus = statusFilter?.includes('archived') ?? false;
    const includeArchived = query?.includeArchived ?? false;

    const conditions: string[] = ['chat_id = ?'];
    const params: unknown[] = [chatId];

    if (!includeArchived && !hasArchivedStatus) {
      conditions.push('status <> ?');
      params.push('archived');
    }
    if (statusFilter && statusFilter.length > 0) {
      conditions.push(`status IN (${statusFilter.map(() => '?').join(',')})`);
      params.push(...statusFilter);
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
    const rows = this.db!.prepare(sql).all(...params);
    return rows.map(mapTaskRow);
  }

  async getTask(chatId: string, taskId: string): Promise<TaskRecord | null> {
    this.ensureReady();
    const row = this.db!.prepare('SELECT * FROM tasks WHERE chat_id = ? AND id = ?').get(
      chatId,
      taskId
    );
    return row ? mapTaskRow(row) : null;
  }

  async createTask(chatId: string, input: CreateTaskInput): Promise<TaskRecord> {
    this.ensureReady();
    const now = new Date().toISOString();
    const id = `tsk_${this.crypto.randomUUID()}`;

    const insertTask = this.db!.prepare(
      `INSERT INTO tasks (
        id, chat_id, title, description, status, priority, owner, created_at, updated_at, started_at, completed_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertDependency = this.db!.prepare(
      'INSERT INTO task_dependencies (chat_id, task_id, depends_on) VALUES (?, ?, ?)'
    );

    const insertEvent = this.db!.prepare(
      'INSERT INTO task_events (id, chat_id, task_id, type, payload, created_at, actor) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const run = this.db!.transaction(() => {
      insertTask.run(
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
        1
      );
      if (input.dependencies?.length) {
        for (const dep of input.dependencies) {
          if (dep === id) {
            throw new Error('invalid_dependency');
          }
          insertDependency.run(chatId, id, dep);
        }
      }
      insertEvent.run(
        `evt_${this.crypto.randomUUID()}`,
        chatId,
        id,
        'create',
        JSON.stringify({ title: input.title }),
        now,
        'agent'
      );
    });

    run();
    const task = await this.getTask(chatId, id);
    if (!task) {
      throw new Error('create_failed');
    }
    this.notifyChange();
    return task;
  }

  async updateTask(chatId: string, taskId: string, input: UpdateTaskInput): Promise<TaskRecord> {
    this.ensureReady();
    const current = this.db!.prepare('SELECT version FROM tasks WHERE chat_id = ? AND id = ?').get(
      chatId,
      taskId
    ) as { version: number } | undefined;
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

    const update = this.db!.prepare(
      `UPDATE tasks SET ${fields.join(', ')} WHERE chat_id = ? AND id = ? AND version = ?`
    );
    const result = update.run(...params, chatId, taskId, input.expectedVersion);
    if (result.changes === 0) {
      throw new Error('conflict');
    }

    this.insertEvent(chatId, taskId, 'update', { fields: Object.keys(input) });
    const task = await this.getTask(chatId, taskId);
    if (!task) {
      throw new Error('not_found');
    }
    this.notifyChange();
    return task;
  }

  async setStatus(chatId: string, taskId: string, input: SetStatusInput): Promise<TaskRecord> {
    this.ensureReady();
    const current = this.db!.prepare('SELECT version FROM tasks WHERE chat_id = ? AND id = ?').get(
      chatId,
      taskId
    ) as { version: number } | undefined;
    if (!current) {
      throw new Error('not_found');
    }
    if (current.version !== input.expectedVersion) {
      throw new Error('conflict');
    }

    const now = new Date().toISOString();
    const timestamps = this.resolveStatusTimestamps(chatId, taskId, input.status, now);
    const update = this.db!.prepare(
      `UPDATE tasks SET status = ?, updated_at = ?, version = version + 1, started_at = ?, completed_at = ?
       WHERE chat_id = ? AND id = ? AND version = ?`
    );

    const result = update.run(
      input.status,
      now,
      timestamps.startedAt,
      timestamps.completedAt,
      chatId,
      taskId,
      input.expectedVersion
    );
    if (result.changes === 0) {
      throw new Error('conflict');
    }

    this.insertEvent(chatId, taskId, 'status', {
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
    this.ensureTaskExists(chatId, taskId);
    this.ensureTaskExists(chatId, dependsOn);
    if (this.hasPath(chatId, dependsOn, taskId)) {
      throw new Error('dependency_cycle');
    }
    const stmt = this.db!.prepare(
      'INSERT OR IGNORE INTO task_dependencies (chat_id, task_id, depends_on) VALUES (?, ?, ?)'
    );
    stmt.run(chatId, taskId, dependsOn);
    this.notifyChange();
  }

  async removeDependency(chatId: string, taskId: string, dependsOn: string): Promise<void> {
    this.ensureReady();
    this.db!.prepare(
      'DELETE FROM task_dependencies WHERE chat_id = ? AND task_id = ? AND depends_on = ?'
    ).run(chatId, taskId, dependsOn);
    this.notifyChange();
  }

  async listDependencies(chatId: string, taskId: string): Promise<TaskDependency[]> {
    this.ensureReady();
    const rows = this.db!.prepare(
      'SELECT chat_id, task_id, depends_on FROM task_dependencies WHERE chat_id = ? AND task_id = ?'
    ).all(chatId, taskId);
    return rows.map((row: any) => ({
      chatId: row.chat_id,
      taskId: row.task_id,
      dependsOn: row.depends_on,
    }));
  }

  async addNote(chatId: string, taskId: string, input: AddNoteInput): Promise<TaskNote> {
    this.ensureReady();
    const id = `note_${this.crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const stmt = this.db!.prepare(
      'INSERT INTO task_notes (id, chat_id, task_id, body, created_at, author) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, chatId, taskId, input.body, now, input.author);
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
    const rows = this.db!.prepare(
      'SELECT * FROM task_notes WHERE chat_id = ? AND task_id = ? ORDER BY created_at ASC'
    ).all(chatId, taskId);
    return rows.map((row: any) => ({
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
    const stmt = this.db!.prepare(
      'INSERT OR IGNORE INTO task_files (chat_id, task_id, path, role) VALUES (?, ?, ?, ?)'
    );
    const run = this.db!.transaction(() => {
      for (const file of input.files) {
        stmt.run(chatId, taskId, file.path, file.role);
      }
    });
    run();
    this.notifyChange();
  }

  async listFiles(chatId: string, taskId: string): Promise<TaskFile[]> {
    this.ensureReady();
    const rows = this.db!.prepare('SELECT * FROM task_files WHERE chat_id = ? AND task_id = ?').all(
      chatId,
      taskId
    );
    return rows.map((row: any) => ({
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
    this.db!.prepare('DELETE FROM tasks WHERE chat_id = ? AND id = ?').run(chatId, taskId);
    this.notifyChange();
  }

  private async openDatabase(vaultRoot: string): Promise<void> {
    const { path, fs, optional } = this.capabilities;
    const dirPath = path.join(vaultRoot, '.moryflow', 'agent');
    const dbPath = path.join(dirPath, 'tasks.db');

    await fs.mkdir(dirPath, { recursive: true });

    if (this.stopWatch) {
      this.stopWatch();
      this.stopWatch = null;
    }

    if (this.db && this.dbPath && this.dbPath !== dbPath) {
      this.db.close();
    }

    this.db = new Database(dbPath);
    this.dbPath = dbPath;

    for (const pragma of TASKS_PRAGMAS) {
      this.db.exec(pragma);
    }

    const currentVersion = this.db.pragma('user_version', { simple: true }) as number;
    if (currentVersion > TASKS_SCHEMA_VERSION) {
      throw new Error('schema_version_mismatch');
    }

    const migrations = TASKS_SCHEMA_MIGRATIONS.filter((m) => m.version > currentVersion);
    if (migrations.length > 0) {
      const run = this.db.transaction(() => {
        for (const migration of migrations) {
          for (const statement of migration.statements) {
            this.db!.exec(statement);
          }
        }
      });
      run();
    }

    if (optional?.watchFiles && !this.stopWatch) {
      const watchPaths = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
      this.stopWatch = optional.watchFiles(watchPaths, () => {
        this.options.onDatabaseChange?.();
      });
    }
  }

  private ensureReady(): void {
    if (!this.db || !this.vaultRoot) {
      throw new Error('store_not_ready');
    }
  }

  private ensureTaskExists(chatId: string, taskId: string): void {
    const row = this.db!.prepare('SELECT id FROM tasks WHERE chat_id = ? AND id = ?').get(
      chatId,
      taskId
    );
    if (!row) {
      throw new Error('not_found');
    }
  }

  private notifyChange(): void {
    this.options.onDatabaseChange?.();
  }

  private hasPath(chatId: string, start: string, target: string): boolean {
    const rows = this.db!.prepare(
      'SELECT task_id, depends_on FROM task_dependencies WHERE chat_id = ?'
    ).all(chatId) as Array<{ task_id: string; depends_on: string }>;

    const graph = new Map<string, string[]>();
    for (const row of rows) {
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

  private insertEvent(
    chatId: string,
    taskId: string,
    type: string,
    payload: Record<string, unknown>
  ): void {
    const now = new Date().toISOString();
    const stmt = this.db!.prepare(
      'INSERT INTO task_events (id, chat_id, task_id, type, payload, created_at, actor) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(
      `evt_${this.crypto.randomUUID()}`,
      chatId,
      taskId,
      type,
      JSON.stringify(payload),
      now,
      'agent'
    );
  }

  private resolveStatusTimestamps(
    chatId: string,
    taskId: string,
    status: SetStatusInput['status'],
    now: string
  ): { startedAt: string | null; completedAt: string | null } {
    const row = this.db!.prepare(
      'SELECT started_at, completed_at FROM tasks WHERE chat_id = ? AND id = ?'
    ).get(chatId, taskId) as { started_at: string | null; completed_at: string | null } | undefined;
    const startedAt = status === 'in_progress' ? now : (row?.started_at ?? null);
    const completedAt = status === 'done' ? now : (row?.completed_at ?? null);
    return { startedAt, completedAt };
  }
}

const mapTaskRow = (row: any): TaskRecord => ({
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

export const createDesktopTasksStore = (
  capabilities: PlatformCapabilities,
  crypto: CryptoUtils,
  options?: TasksStoreOptions
): TasksStore => {
  return new DesktopTasksStore(capabilities, crypto, options);
};
