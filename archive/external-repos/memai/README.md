# Memory SaaS Platform

A standalone Memory API service similar to [mem0.ai](https://mem0.ai), built with NestJS 11 + PostgreSQL + pgvector.

Give your AI applications long-term memory with semantic search and knowledge graphs.

## Features

- **Semantic Memory** - Store and search memories using vector embeddings with pgvector
- **Entity Extraction** - Automatically extract entities from unstructured text using LLMs
- **Knowledge Graph** - Build and traverse relationship graphs between entities
- **Multi-tenant API** - API key based data isolation for SaaS deployment
- **Subscription System** - Free, Hobby ($19/mo), and Enterprise (usage-based) tiers
- **Self-hostable** - Deploy on your own infrastructure with Docker

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma 7 |
| Cache | Redis 7 |
| Queue | BullMQ |
| Auth | Better Auth |
| Frontend | React 19, Vite, Tailwind CSS 4 |
| UI | shadcn/ui |
| Payments | Creem.io |
| Embeddings | OpenAI / Aliyun |

## Project Structure

```
.
├── apps/
│   ├── server/      # NestJS API server
│   ├── console/     # User dashboard (React)
│   ├── admin/       # Admin panel (React)
│   └── www/         # Marketing site (React)
├── packages/
│   ├── ui/          # Shared UI components
│   └── shared-types/ # Shared TypeScript types
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 with pgvector extension
- Redis 7+
- OpenAI API key (for embeddings)

### Development

```bash
# Clone the repository
git clone https://github.com/your-org/memory-saas.git
cd memory-saas

# Install dependencies
pnpm install

# Copy environment variables
cp apps/server/.env.example apps/server/.env

# Edit .env with your configuration
# Required: DATABASE_URL, REDIS_URL, OPENAI_API_KEY, BETTER_AUTH_SECRET

# Generate Prisma client
pnpm --filter @memory/server prisma:generate

# Run database migrations
pnpm --filter @memory/server prisma:migrate

# Start development servers
pnpm dev
```

### Docker Deployment

```bash
# Start all services with Docker Compose
docker compose up -d

# Or start only the database and Redis for local development
docker compose up -d db redis
```

## API Endpoints

### Memory API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/memories | Create a new memory |
| POST | /v1/memories/search | Search memories by semantic similarity |
| GET | /v1/memories | List memories for a user |
| DELETE | /v1/memories/:id | Delete a memory |

### Entity API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/entities | Create an entity |
| POST | /v1/entities/batch | Batch create entities |
| GET | /v1/entities | List entities |
| DELETE | /v1/entities/:id | Delete an entity |

### Relation API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/relations | Create a relation |
| GET | /v1/relations | List relations |
| GET | /v1/relations/entity/:id | Get relations for an entity |
| DELETE | /v1/relations/:id | Delete a relation |

### Graph API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1/graph | Get full knowledge graph |
| POST | /v1/graph/traverse | Traverse graph from entity |
| GET | /v1/graph/path | Find path between entities |
| GET | /v1/graph/neighbors/:id | Get entity neighbors |

### Extract API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/extract | Extract entities and relations from text |
| POST | /v1/extract/preview | Preview extraction without saving |

## Pricing

| Plan | Price | Memories | API Calls/month |
|------|-------|----------|-----------------|
| Free | $0 | 10,000 | 1,000 |
| Hobby | $19/mo | 50,000 | 5,000 |
| Enterprise | Pay-as-you-go | Unlimited | Unlimited |

## Self-Hosting

For self-hosting, you can disable the payment system and give all users Enterprise-level access:

1. Set up your PostgreSQL database with pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. Configure environment variables (see `.env.example`)

3. Run with Docker Compose:
   ```bash
   docker compose up -d
   ```

4. Access the services:
   - API: http://localhost:3000
   - Console: http://localhost:3001
   - Admin: http://localhost:3002
   - WWW: http://localhost:3003

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| REDIS_URL | Redis connection string | Yes |
| OPENAI_API_KEY | OpenAI API key for embeddings | Yes |
| BETTER_AUTH_SECRET | Secret for Better Auth | Yes |
| BETTER_AUTH_URL | Public URL for auth | Yes |
| ALLOWED_ORIGINS | CORS allowed origins | Yes |
| RESEND_API_KEY | Resend API key for emails | No |
| CREEM_API_KEY | Creem payment API key | No |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
