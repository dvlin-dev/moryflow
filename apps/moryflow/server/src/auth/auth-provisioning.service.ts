import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

type AuthProvisioningClient = {
  subscription: {
    create: typeof PrismaService.prototype.subscription.create;
  };
  user: {
    update: typeof PrismaService.prototype.user.update;
  };
};

const resolveAdminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const provisionAuthUser = async (
  client: AuthProvisioningClient,
  params: {
    userId: string;
    email: string;
    now?: Date;
  },
): Promise<void> => {
  const now = params.now ?? new Date();
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()),
  );

  await client.subscription.create({
    data: {
      userId: params.userId,
      tier: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  const adminEmails = resolveAdminEmails();
  if (adminEmails.includes(params.email.toLowerCase())) {
    await client.user.update({
      where: { id: params.userId },
      data: { isAdmin: true },
    });
  }
};

@Injectable()
export class AuthProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async provisionUser(
    userId: string,
    email: string,
    client?: AuthProvisioningClient,
  ): Promise<void> {
    await provisionAuthUser(client ?? this.prisma, { userId, email });
  }
}
