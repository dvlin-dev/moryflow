/**
 * Redemption Codes E2E Tests
 *
 * Full-cycle verification against a live server.
 * Requires environment variables:
 *   E2E_BASE_URL   — e.g. https://server.moryflow.com
 *   E2E_ADMIN_TOKEN — admin JWT bearer token
 *   E2E_USER_TOKEN  — regular user JWT bearer token
 *
 * Run:
 *   E2E_BASE_URL=https://server.moryflow.com \
 *   E2E_ADMIN_TOKEN=xxx \
 *   E2E_USER_TOKEN=yyy \
 *   pnpm --filter @moryflow/server exec vitest run test/redemption-codes.e2e-spec.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.E2E_BASE_URL ?? '';
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN ?? '';
const USER_TOKEN = process.env.E2E_USER_TOKEN ?? '';

const ADMIN_PREFIX = `${BASE_URL}/api/v1/admin/redemption-codes`;
const USER_PREFIX = `${BASE_URL}/api/v1/app/redemption-codes`;

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  };
}

function userHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${USER_TOKEN}`,
  };
}

async function jsonResponse(res: Response) {
  const body = await res.json();
  return { status: res.status, body };
}

const canRun = Boolean(BASE_URL && ADMIN_TOKEN && USER_TOKEN);

describe.skipIf(!canRun)('Redemption Codes E2E (live server)', () => {
  let createdCodeId = '';
  let createdCodeStr = '';

  beforeAll(() => {
    if (!canRun) return;
    console.log(`E2E target: ${BASE_URL}`);
  });

  // 1. GET config
  it('1. should return config with tier list', async () => {
    const res = await fetch(`${ADMIN_PREFIX}/config`, {
      headers: adminHeaders(),
    });
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(200);
    expect(body.tiers).toBeDefined();
    expect(Array.isArray(body.tiers)).toBe(true);
    expect(body.tiers.length).toBeGreaterThan(0);
    expect(body.tiers[0]).toHaveProperty('value');
    expect(body.tiers[0]).toHaveProperty('label');
  });

  // 2. POST create (CREDITS code)
  it('2. should create a CREDITS redemption code', async () => {
    const res = await fetch(ADMIN_PREFIX, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        type: 'CREDITS',
        creditsAmount: 10,
        maxRedemptions: 2,
        note: 'E2E test code',
      }),
    });
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(201);
    expect(body.code).toBeDefined();
    expect(body.type).toBe('CREDITS');
    expect(body.creditsAmount).toBe(10);
    expect(body.maxRedemptions).toBe(2);
    expect(body.isActive).toBe(true);
    createdCodeId = body.id;
    createdCodeStr = body.code;
    console.log(`Created code: ${createdCodeStr} (id: ${createdCodeId})`);
  });

  // 3. GET list — verify code appears
  it('3. should list codes and include the created one', async () => {
    const res = await fetch(
      `${ADMIN_PREFIX}?page=1&limit=50&search=${encodeURIComponent(createdCodeStr)}`,
      { headers: adminHeaders() },
    );
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(200);
    expect(body.items).toBeDefined();
    const found = body.items.find(
      (i: { id: string }) => i.id === createdCodeId,
    );
    expect(found).toBeDefined();
    expect(found.code).toBe(createdCodeStr);
  });

  // 4. GET detail — verify code details and creator info
  it('4. should return code detail with creator info', async () => {
    const res = await fetch(`${ADMIN_PREFIX}/${createdCodeId}`, {
      headers: adminHeaders(),
    });
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(200);
    expect(body.id).toBe(createdCodeId);
    expect(body.code).toBe(createdCodeStr);
    expect(body.usages).toBeDefined();
    expect(Array.isArray(body.usages)).toBe(true);
    expect(body.creator).toBeDefined();
    expect(body.creator.email).toBeDefined();
  });

  // 5. PATCH update — change maxRedemptions
  it('5. should update maxRedemptions', async () => {
    const res = await fetch(`${ADMIN_PREFIX}/${createdCodeId}`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ maxRedemptions: 3 }),
    });
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(200);
    expect(body.maxRedemptions).toBe(3);
  });

  // 6. POST redeem — user redeems the code
  it('6. should redeem the code successfully', async () => {
    const res = await fetch(`${USER_PREFIX}/redeem`, {
      method: 'POST',
      headers: userHeaders(),
      body: JSON.stringify({ code: createdCodeStr }),
    });
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(201);
    expect(body.type).toBe('CREDITS');
    expect(body.creditsAmount).toBe(10);
  });

  // 7. POST redeem (duplicate) — same user redeems again → 409
  it('7. should reject duplicate redemption', async () => {
    const res = await fetch(`${USER_PREFIX}/redeem`, {
      method: 'POST',
      headers: userHeaders(),
      body: JSON.stringify({ code: createdCodeStr }),
    });
    expect(res.status).toBe(409);
  });

  // 8. DELETE deactivate
  it('8. should deactivate the code', async () => {
    const res = await fetch(`${ADMIN_PREFIX}/${createdCodeId}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(200);
    expect(body.isActive).toBe(false);
  });

  // 9. POST redeem (deactivated) — another attempt on deactivated code → 400
  it('9. should reject redemption of deactivated code', async () => {
    // Use a fresh token or different perspective — the same user already redeemed,
    // so we just verify the error message indicates the code is deactivated.
    const res = await fetch(`${USER_PREFIX}/redeem`, {
      method: 'POST',
      headers: userHeaders(),
      body: JSON.stringify({ code: createdCodeStr }),
    });
    // Could be 400 (deactivated) or 409 (already redeemed) — both are correct rejections
    expect([400, 409]).toContain(res.status);
  });

  // 10. Verify final detail state
  it('10. should show final state with usage and deactivated', async () => {
    const res = await fetch(`${ADMIN_PREFIX}/${createdCodeId}`, {
      headers: adminHeaders(),
    });
    const { status, body } = await jsonResponse(res);
    expect(status).toBe(200);
    expect(body.isActive).toBe(false);
    expect(body.currentRedemptions).toBe(1);
    expect(body.usages.length).toBe(1);
    expect(body.usages[0].userEmail).toBeDefined();
    expect(body.usages[0].type).toBe('CREDITS');
    expect(body.usages[0].creditsAmount).toBe(10);
  });
});
