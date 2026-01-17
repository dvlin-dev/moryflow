import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureBootstrapAdmin } from '../bootstrap-admin';

vi.mock('better-auth/crypto', () => ({
  hashPassword: vi.fn(async () => 'better-auth-hash'),
  verifyPassword: vi.fn(async () => true),
}));

import { hashPassword, verifyPassword } from 'better-auth/crypto';

function createLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
  };
}

function createPrismaMock(overrides?: Partial<any>) {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ...overrides,
  };
}

describe('ensureBootstrapAdmin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should skip when env not set', async () => {
    const prisma = createPrismaMock();
    const logger = createLogger();

    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;

    await ensureBootstrapAdmin(prisma as any, logger as any);

    expect(logger.warn).toHaveBeenCalledWith(
      'ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping admin bootstrap',
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should rehash invalid existing password hash', async () => {
    const prisma = createPrismaMock();
    const logger = createLogger();

    process.env.ADMIN_EMAIL = 'a@anyhunt.app';
    process.env.ADMIN_PASSWORD = 'TestPassword_123456';

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isAdmin: true });
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc1',
      userId: 'u1',
      password: '$2a$10$not-a-better-auth-hash',
    });

    (verifyPassword as any).mockImplementationOnce(async () => {
      throw new Error('Invalid password hash');
    });

    await ensureBootstrapAdmin(prisma as any, logger as any);

    expect(hashPassword).toHaveBeenCalledWith('TestPassword_123456');
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 'acc1' },
      data: { password: 'better-auth-hash' },
    });
  });

  it('should rotate password when mismatch', async () => {
    const prisma = createPrismaMock();
    const logger = createLogger();

    process.env.ADMIN_EMAIL = 'a@anyhunt.app';
    process.env.ADMIN_PASSWORD = 'TestPassword_123456';

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isAdmin: true });
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc1',
      userId: 'u1',
      password: 'old-hash',
    });

    (verifyPassword as any).mockResolvedValueOnce(false);

    await ensureBootstrapAdmin(prisma as any, logger as any);

    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 'acc1' },
      data: { password: 'better-auth-hash' },
    });
  });
});
