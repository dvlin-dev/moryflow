/**
 * [INPUT]: SyncActionTokenClaims / receipt token
 * [OUTPUT]: 签发后的 receipt token / 已验签 claims
 * [POS]: Sync action plan 的签发与验签事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VectorClock } from '@moryflow/sync';

interface SyncActionTokenFileState {
  fileId: string;
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
  expectedHash?: string;
  expectedStorageRevision?: string;
  expectedVectorClock?: VectorClock;
}

interface SyncActionTokenEnvelope {
  version: 1;
  issuedAt: number;
  expiresAt: number;
}

interface SyncActionTokenContext {
  userId: string;
  vaultId: string;
  deviceId: string;
  actionId: string;
}

type SyncActionTokenSingleFileClaim = SyncActionTokenContext & {
  action: 'upload' | 'download' | 'delete';
  file: SyncActionTokenFileState;
};

type SyncActionTokenConflictClaim = SyncActionTokenContext & {
  action: 'conflict';
  original: SyncActionTokenFileState;
  conflictCopy: SyncActionTokenFileState;
};

export type SyncActionTokenUnsignedClaims =
  | SyncActionTokenSingleFileClaim
  | SyncActionTokenConflictClaim;

export type SyncActionTokenClaims = SyncActionTokenEnvelope &
  SyncActionTokenUnsignedClaims;

interface SyncActionTokenVerifyContext {
  userId: string;
  vaultId: string;
  deviceId: string;
  actionId: string;
}

const encodePayload = (payload: SyncActionTokenClaims): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decodePayload = (payload: string): SyncActionTokenClaims =>
  JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as SyncActionTokenClaims;

@Injectable()
export class SyncActionTokenService {
  private readonly secret: string;
  private readonly ttlMs: number;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('SYNC_ACTION_SECRET')?.trim();
    if (!secret) {
      throw new Error('SYNC_ACTION_SECRET is required');
    }
    this.secret = secret;
    const ttlSeconds = Number(
      this.configService.get<string>('SYNC_ACTION_RECEIPT_TTL_SECONDS', '900'),
    );
    this.ttlMs =
      Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? ttlSeconds * 1000
        : 900_000;
  }

  issueReceiptToken(claims: SyncActionTokenUnsignedClaims): string {
    const now = Date.now();
    const payload = encodePayload({
      version: 1,
      issuedAt: now,
      expiresAt: now + this.ttlMs,
      ...claims,
    });
    const signature = this.sign(payload);
    return `${payload}.${signature}`;
  }

  verifyReceiptToken(
    token: string,
    context: SyncActionTokenVerifyContext,
  ): SyncActionTokenClaims {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) {
      throw new Error('Invalid sync action receipt');
    }

    const expectedSignature = this.sign(payload);
    if (!this.isSignatureMatch(signature, expectedSignature)) {
      throw new Error('Invalid sync action receipt');
    }

    const claims = decodePayload(payload);
    if (
      claims.version !== 1 ||
      !Number.isFinite(claims.issuedAt) ||
      !Number.isFinite(claims.expiresAt)
    ) {
      throw new Error('Invalid sync action receipt');
    }
    if (claims.expiresAt < Date.now()) {
      throw new Error('Sync action receipt expired');
    }
    if (
      claims.userId !== context.userId ||
      claims.vaultId !== context.vaultId ||
      claims.deviceId !== context.deviceId ||
      claims.actionId !== context.actionId
    ) {
      throw new Error('Invalid sync action receipt');
    }

    return claims;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');
  }

  private isSignatureMatch(
    signature: string,
    expectedSignature: string,
  ): boolean {
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    return timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    );
  }
}
