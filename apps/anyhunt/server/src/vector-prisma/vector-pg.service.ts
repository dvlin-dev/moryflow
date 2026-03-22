/**
 * [INPUT]: VECTOR_DATABASE_URL environment variable
 * [OUTPUT]: Low-level pg transaction helper for vector-domain bulk SQL writes
 * [POS]: Memox vector database raw SQL service
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';

@Injectable()
export class VectorPgService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorPgService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.VECTOR_DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'VECTOR_DATABASE_URL environment variable is required for vector database connection',
      );
    }

    this.pool = new Pool({ connectionString });
  }

  async onModuleInit() {
    const client = await this.pool.connect();
    client.release();
    this.logger.log('Vector pg pool ready');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Vector pg pool disconnected');
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        this.logger.error(
          'Failed to rollback vector pg transaction',
          rollbackError instanceof Error ? rollbackError.stack : undefined,
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
