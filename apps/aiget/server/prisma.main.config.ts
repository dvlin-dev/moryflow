import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/main/schema.prisma',
  migrations: {
    path: 'prisma/main/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
