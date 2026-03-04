/**
 * [INPUT]: userData path（sqlite db）+ telegram repositories ports
 * [OUTPUT]: Telegram 持久化仓储（offset/session/sent/pairing）
 * [POS]: Telegram 主进程持久化实现（safe watermark + pairing 首版必做）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import type {
  PairingRepository,
  PairingRequest,
  PairingRequestStatus,
  SafeWatermarkRepository,
  SentMessageRepository,
  SessionRepository,
  SessionMapping,
} from '@moryflow/channels-core';

const PRAGMAS = [
  'PRAGMA journal_mode = WAL',
  'PRAGMA synchronous = NORMAL',
  'PRAGMA foreign_keys = ON',
];

type DatabaseInstance = ReturnType<typeof Database>;

export type TelegramPersistenceStore = {
  offsets: SafeWatermarkRepository;
  sessions: SessionRepository;
  sentMessages: SentMessageRepository;
  pairing: PairingRepository;
  getPairingRequestById: (requestId: string) => PairingRequest | null;
};

let singleton: TelegramPersistenceStore | null = null;

const ensureDirExists = (dbPath: string): void => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
};

const mapPairingRow = (row: any): PairingRequest => ({
  id: row.id,
  channel: row.channel,
  accountId: row.account_id,
  senderId: row.sender_id,
  peerId: row.peer_id,
  code: row.code,
  status: row.status,
  meta: row.meta_json ? (JSON.parse(row.meta_json) as Record<string, unknown>) : undefined,
  createdAt: row.created_at,
  lastSeenAt: row.last_seen_at,
  expiresAt: row.expires_at,
});

const expirePendingRequests = (db: DatabaseInstance, nowIso: string): void => {
  db.prepare(
    `UPDATE channel_pairing_requests
     SET status = 'expired', last_seen_at = ?
     WHERE status = 'pending' AND expires_at <= ?`
  ).run(nowIso, nowIso);
};

const createStore = (): TelegramPersistenceStore => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'channels', 'telegram.db');

  ensureDirExists(dbPath);
  const db: DatabaseInstance = new Database(dbPath);

  for (const pragma of PRAGMAS) {
    db.exec(pragma);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_update_offsets (
      account_id TEXT PRIMARY KEY,
      safe_watermark_update_id INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channel_sessions (
      channel TEXT NOT NULL,
      account_id TEXT NOT NULL,
      peer_key TEXT NOT NULL,
      thread_key TEXT NOT NULL,
      session_key TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (channel, account_id, peer_key, thread_key)
    );

    CREATE TABLE IF NOT EXISTS telegram_sent_messages (
      account_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      PRIMARY KEY (account_id, chat_id, message_id)
    );

    CREATE TABLE IF NOT EXISTS channel_pairing_requests (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      account_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      peer_id TEXT NOT NULL,
      code TEXT NOT NULL,
      status TEXT NOT NULL,
      meta_json TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pairing_requests_lookup
      ON channel_pairing_requests (channel, account_id, sender_id, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS channel_pairing_allow_from (
      channel TEXT NOT NULL,
      account_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      approved_at TEXT NOT NULL,
      PRIMARY KEY (channel, account_id, sender_id)
    );
  `);

  const offsets: SafeWatermarkRepository = {
    getSafeWatermark: async (accountId) => {
      const row = db
        .prepare(
          'SELECT safe_watermark_update_id FROM telegram_update_offsets WHERE account_id = ?'
        )
        .get(accountId) as { safe_watermark_update_id: number } | undefined;
      return row ? row.safe_watermark_update_id : null;
    },
    setSafeWatermark: async (accountId, updateId) => {
      db.prepare(
        `INSERT INTO telegram_update_offsets(account_id, safe_watermark_update_id, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           safe_watermark_update_id = excluded.safe_watermark_update_id,
           updated_at = excluded.updated_at`
      ).run(accountId, updateId, new Date().toISOString());
    },
  };

  const sessions: SessionRepository = {
    upsertSession: async (mapping) => {
      db.prepare(
        `INSERT INTO channel_sessions(channel, account_id, peer_key, thread_key, session_key, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(channel, account_id, peer_key, thread_key) DO UPDATE SET
           session_key = excluded.session_key,
           updated_at = excluded.updated_at`
      ).run(
        mapping.channel,
        mapping.accountId,
        mapping.peerKey,
        mapping.threadKey,
        mapping.sessionKey,
        mapping.updatedAt
      );
    },
    getSession: async (input) => {
      const row = db
        .prepare(
          'SELECT * FROM channel_sessions WHERE channel = ? AND account_id = ? AND peer_key = ? AND thread_key = ?'
        )
        .get(input.channel, input.accountId, input.peerKey, input.threadKey) as any;
      if (!row) {
        return null;
      }
      return {
        channel: row.channel,
        accountId: row.account_id,
        peerKey: row.peer_key,
        threadKey: row.thread_key,
        sessionKey: row.session_key,
        updatedAt: row.updated_at,
      } as SessionMapping;
    },
  };

  const sentMessages: SentMessageRepository = {
    rememberSentMessage: async (input) => {
      db.prepare(
        `INSERT OR IGNORE INTO telegram_sent_messages(account_id, chat_id, message_id, sent_at)
         VALUES (?, ?, ?, ?)`
      ).run(input.accountId, input.chatId, input.messageId, input.sentAt);
    },
  };

  const pairing: PairingRepository = {
    hasApprovedSender: async (input) => {
      const row = db
        .prepare(
          'SELECT 1 AS ok FROM channel_pairing_allow_from WHERE channel = ? AND account_id = ? AND sender_id = ?'
        )
        .get(input.channel, input.accountId, input.senderId) as { ok: number } | undefined;
      return Boolean(row?.ok);
    },
    createPairingRequest: async (input) => {
      expirePendingRequests(db, input.createdAt);

      const existing = db
        .prepare(
          `SELECT * FROM channel_pairing_requests
           WHERE channel = ? AND account_id = ? AND sender_id = ? AND status = 'pending'
           ORDER BY created_at DESC
           LIMIT 1`
        )
        .get(input.channel, input.accountId, input.senderId) as any;

      if (existing) {
        db.prepare(
          `UPDATE channel_pairing_requests
           SET code = ?, peer_id = ?, meta_json = ?, last_seen_at = ?, expires_at = ?
           WHERE id = ?`
        ).run(
          input.code,
          input.peerId,
          input.meta ? JSON.stringify(input.meta) : null,
          input.createdAt,
          input.expiresAt,
          existing.id
        );
        const updated = db
          .prepare('SELECT * FROM channel_pairing_requests WHERE id = ?')
          .get(existing.id) as any;
        return mapPairingRow(updated);
      }

      const requestId = `pair_${randomUUID()}`;
      db.prepare(
        `INSERT INTO channel_pairing_requests(
          id, channel, account_id, sender_id, peer_id, code, status, meta_json,
          created_at, last_seen_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
      ).run(
        requestId,
        input.channel,
        input.accountId,
        input.senderId,
        input.peerId,
        input.code,
        input.meta ? JSON.stringify(input.meta) : null,
        input.createdAt,
        input.createdAt,
        input.expiresAt
      );

      const created = db
        .prepare('SELECT * FROM channel_pairing_requests WHERE id = ?')
        .get(requestId) as any;
      return mapPairingRow(created);
    },
    updatePairingRequestStatus: async (input) => {
      db.prepare(
        `UPDATE channel_pairing_requests
         SET status = ?, last_seen_at = ?
         WHERE id = ?`
      ).run(input.status, input.updatedAt, input.requestId);
    },
    listPairingRequests: async (input) => {
      expirePendingRequests(db, new Date().toISOString());

      const clauses: string[] = ['channel = ?'];
      const params: unknown[] = [input.channel];

      if (input.accountId) {
        clauses.push('account_id = ?');
        params.push(input.accountId);
      }

      if (input.status) {
        clauses.push('status = ?');
        params.push(input.status);
      }

      const rows = db
        .prepare(
          `SELECT * FROM channel_pairing_requests
           WHERE ${clauses.join(' AND ')}
           ORDER BY created_at DESC`
        )
        .all(...params) as any[];

      return rows.map(mapPairingRow);
    },
    approveSender: async (input) => {
      db.prepare(
        `INSERT INTO channel_pairing_allow_from(channel, account_id, sender_id, approved_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(channel, account_id, sender_id) DO UPDATE SET
           approved_at = excluded.approved_at`
      ).run(input.channel, input.accountId, input.senderId, input.approvedAt);
    },
  };

  const getPairingRequestById = (requestId: string): PairingRequest | null => {
    expirePendingRequests(db, new Date().toISOString());
    const row = db
      .prepare('SELECT * FROM channel_pairing_requests WHERE id = ?')
      .get(requestId) as any;
    return row ? mapPairingRow(row) : null;
  };

  return {
    offsets,
    sessions,
    sentMessages,
    pairing,
    getPairingRequestById,
  };
};

export const getTelegramPersistenceStore = (): TelegramPersistenceStore => {
  if (!singleton) {
    singleton = createStore();
  }
  return singleton;
};
