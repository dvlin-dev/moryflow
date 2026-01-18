// Prisma config for Anyhunt vector database (production migrations)
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/vector/schema.prisma',
  migrations: {
    path: 'prisma/vector/migrations',
  },
  datasource: {
    url: env('VECTOR_DATABASE_URL'),
  },
});
