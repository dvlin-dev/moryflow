/**
 * [PROVIDES]: TasksStore 接口 + SQLite schema/migrations 规范
 * [DEPENDS]: 无
 * [POS]: Tasks Store 设计基线，供 Desktop/Mobile 端实现
 * [UPDATE]: 2026-01-25 - 接口改为显式 chatId 参数，避免会话串读
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'blocked'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'archived';

export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';

export type TaskFileRole = 'input' | 'output' | 'reference';

export interface TasksStoreContext {
  vaultRoot: string;
}

export interface TaskRecord {
  id: string;
  chatId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  version: number;
}

export interface TaskDependency {
  chatId: string;
  taskId: string;
  dependsOn: string;
}

export interface TaskNote {
  id: string;
  chatId: string;
  taskId: string;
  body: string;
  createdAt: string;
  author: string;
}

export interface TaskFile {
  chatId: string;
  taskId: string;
  path: string;
  role: TaskFileRole;
}

export interface TaskFileInput {
  path: string;
  role: TaskFileRole;
}

export interface TaskEvent {
  id: string;
  chatId: string;
  taskId: string;
  type: string;
  payload: string;
  createdAt: string;
  actor: string;
}

export interface ListTasksQuery {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  owner?: string | null;
  search?: string;
  includeArchived?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  owner?: string | null;
  dependencies?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  owner?: string | null;
  expectedVersion: number;
}

export interface SetStatusInput {
  status: TaskStatus;
  reason?: string;
  summary?: string;
  expectedVersion: number;
}

export interface AddNoteInput {
  body: string;
  author: string;
}

export interface AddFilesInput {
  files: TaskFileInput[];
}

export interface DeleteTaskInput {
  confirm: true;
}

export interface TasksStore {
  init(context: TasksStoreContext): Promise<void>;
  listTasks(chatId: string, query?: ListTasksQuery): Promise<TaskRecord[]>;
  getTask(chatId: string, taskId: string): Promise<TaskRecord | null>;
  createTask(chatId: string, input: CreateTaskInput): Promise<TaskRecord>;
  updateTask(chatId: string, taskId: string, input: UpdateTaskInput): Promise<TaskRecord>;
  setStatus(chatId: string, taskId: string, input: SetStatusInput): Promise<TaskRecord>;
  addDependency(chatId: string, taskId: string, dependsOn: string): Promise<void>;
  removeDependency(chatId: string, taskId: string, dependsOn: string): Promise<void>;
  listDependencies(chatId: string, taskId: string): Promise<TaskDependency[]>;
  addNote(chatId: string, taskId: string, input: AddNoteInput): Promise<TaskNote>;
  listNotes(chatId: string, taskId: string): Promise<TaskNote[]>;
  addFiles(chatId: string, taskId: string, input: AddFilesInput): Promise<void>;
  listFiles(chatId: string, taskId: string): Promise<TaskFile[]>;
  deleteTask(chatId: string, taskId: string, input: DeleteTaskInput): Promise<void>;
}

export const TASKS_SCHEMA_VERSION = 1;

export const TASKS_PRAGMAS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA foreign_keys = ON;',
  'PRAGMA busy_timeout = 5000;',
] as const;

export const TASKS_SCHEMA_MIGRATIONS: ReadonlyArray<{
  version: number;
  statements: string[];
}> = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        owner TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        version INTEGER NOT NULL,
        PRIMARY KEY (id),
        UNIQUE (chat_id, id),
        CHECK (status IN ('todo','in_progress','blocked','done','failed','cancelled','archived')),
        CHECK (priority IN ('p0','p1','p2','p3'))
      );`,
      `CREATE TABLE IF NOT EXISTS task_dependencies (
        chat_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        depends_on TEXT NOT NULL,
        PRIMARY KEY (chat_id, task_id, depends_on),
        FOREIGN KEY (chat_id, task_id) REFERENCES tasks(chat_id, id) ON DELETE CASCADE,
        FOREIGN KEY (chat_id, depends_on) REFERENCES tasks(chat_id, id) ON DELETE CASCADE,
        CHECK (task_id <> depends_on)
      );`,
      `CREATE TABLE IF NOT EXISTS task_notes (
        id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        author TEXT NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY (chat_id, task_id) REFERENCES tasks(chat_id, id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS task_files (
        chat_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        path TEXT NOT NULL,
        role TEXT NOT NULL,
        PRIMARY KEY (chat_id, task_id, path, role),
        FOREIGN KEY (chat_id, task_id) REFERENCES tasks(chat_id, id) ON DELETE CASCADE,
        CHECK (role IN ('input','output','reference'))
      );`,
      `CREATE TABLE IF NOT EXISTS task_events (
        id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        actor TEXT NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY (chat_id, task_id) REFERENCES tasks(chat_id, id) ON DELETE CASCADE
      );`,
      'CREATE INDEX IF NOT EXISTS idx_tasks_chat_id ON tasks(chat_id);',
      'CREATE INDEX IF NOT EXISTS idx_task_dependencies_chat_id ON task_dependencies(chat_id);',
      'CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(chat_id, task_id);',
      'CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(chat_id, depends_on);',
      'CREATE INDEX IF NOT EXISTS idx_task_notes_chat_id ON task_notes(chat_id);',
      'CREATE INDEX IF NOT EXISTS idx_task_files_chat_id ON task_files(chat_id);',
      'CREATE INDEX IF NOT EXISTS idx_task_events_chat_id ON task_events(chat_id);',
      `PRAGMA user_version = ${TASKS_SCHEMA_VERSION};`,
    ],
  },
];
