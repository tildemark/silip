# SILIP Setup Guide

## Quick Start

### 1. Install Dependencies

```powershell
npm install
# or
pnpm install
# or
yarn install
```

### 2. Start Infrastructure (PostgreSQL + Redis)

```powershell
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Set up Database

```powershell
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial tags
npm run prisma:seed
```

### 4. Start Development Server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
silip/
├── app/                      # Next.js App Router
│   ├── api/search/          # Search API endpoint
│   ├── page.tsx             # Main search page
│   └── layout.tsx           # Root layout
├── components/ui/           # Shadcn/UI components
│   ├── card.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── tabs.tsx
│   └── skeleton.tsx
├── lib/                     # Core libraries
│   ├── db.ts               # Prisma client
│   ├── redis.ts            # Redis client & cache service
│   ├── search.ts           # Search logic with caching
│   └── utils.ts            # Utility functions
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script for tags
└── docker-compose.yml      # PostgreSQL + Redis setup
```

---

## Key Features

### 1. **Redis Caching Strategy**
- Cache key format: `silip:search:{filter}:{normalizedQuery}`
- TTL: 24 hours (86400 seconds)
- Auto-invalidation: Call `cacheService.invalidateSearchCache()` after ingestion

### 2. **Search Logic**
The search performs:
- Full-text search on `Section.content` and `Section.title`
- Tag-based search (e.g., "CCTV" matches sections tagged with CCTV)
- Multi-word queries (all terms must match)
- Case-insensitive matching

### 3. **Highlighting**
Search terms are automatically highlighted with `<mark>` tags for visual emphasis.

---

## Next Steps

### Add Data Ingestion Scripts

Create ingestion scripts to populate the database:

```typescript
// scripts/ingest-dpa.ts
// Scrape DPA 2012 from official sources
// Parse into Section records
// Auto-tag using the Tag dictionary
```

### Invalidate Cache After Ingestion

```typescript
import { cacheService } from '@/lib/redis'

async function afterIngestion() {
  await cacheService.invalidateSearchCache()
  console.log('✅ Cache invalidated')
}
```

---

## Environment Variables

Copy `.env.example` to `.env` and update if needed:

```env
DATABASE_URL="postgresql://silip_user:silip_password@localhost:5432/silip_db?schema=public"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Troubleshooting

### Redis Connection Issues
```powershell
# Check if Redis is running
docker ps | Select-String redis

# View Redis logs
docker logs silip_redis
```

### Database Issues
```powershell
# Check if PostgreSQL is running
docker ps | Select-String postgres

# View PostgreSQL logs
docker logs silip_postgres

# Reset database
npx prisma db push --force-reset
npm run prisma:seed
```

### Clear Redis Cache
```powershell
docker exec -it silip_redis redis-cli FLUSHDB
```

---

## Production Deployment

### Vercel Deployment

1. Add PostgreSQL and Redis (Upstash) integrations
2. Set environment variables in Vercel dashboard
3. Deploy:

```powershell
vercel deploy --prod
```

### Database Migration

```powershell
npx prisma migrate deploy
```

---

## API Documentation

### GET /api/search

**Query Parameters:**
- `q` (required): Search query string
- `filter` (optional): Document type filter
  - `ALL` (default)
  - `DPA`
  - `IRR`
  - `ISSUANCE`

**Example:**
```
GET /api/search?q=consent&filter=DPA
```

**Response:**
```json
{
  "results": [
    {
      "id": "clx...",
      "documentAlias": "DPA 2012",
      "sectionNum": "Section 13",
      "sectionTitle": "Sensitive Personal Information",
      "highlightedContent": "...<mark>consent</mark>...",
      "tags": [
        { "id": "tag1", "name": "Consent" }
      ]
    }
  ],
  "query": "consent",
  "filter": "DPA",
  "total": 1,
  "cached": false
}
```

---

## License

MIT
