# SILIP Complete Documentation

This document consolidates setup, deployment, development, and API documentation for SILIP (Searchable Interface for Legal Information & Privacy).

## Table of Contents
1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Setup Guide](#setup-guide)
4. [Development](#development)
5. [Deployment](#deployment)
6. [API Documentation](#api-documentation)
7. [Ingestion Guide](#ingestion-guide)
8. [Portainer Deployment](#portainer-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)
- npm or yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/tildemark/silip
cd silip

# 2. Install dependencies
npm install

# 3. Start infrastructure (Docker)
docker-compose up -d

# 4. Setup database
npx prisma generate
npx prisma db push
npm run prisma:seed

# 5. Load sample data (optional)
npm run ingest:sample

# 6. Start development server
npm run dev

# 7. Open http://localhost:3000
```

### Available Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema to database
npx prisma studio       # Open Prisma Studio UI
npm run prisma:seed      # Seed initial tags

# Data Ingestion
npm run bootstrap         # Full data ingestion (all documents)
npm run ingest:sample    # Load 5 sample DPA sections
npm run ingest:dpa       # Ingest DPA 2012 sections
npm run ingest:irr       # Ingest IRR sections
npm run ingest:advisories  # Ingest NPC Advisories
npm run ingest:circulars   # Ingest NPC Circulars
npm run ingest:decisions   # Ingest NPC Decisions
npm run ingest:orders      # Ingest NPC Orders
npm run ingest:resolutions # Ingest NPC Resolutions

# Testing
npm run search:test      # Test search functionality
npm run health           # Check API health
```

---

## Project Structure

```
silip/
├── app/
│   ├── api/
│   │   ├── search/v2/
│   │   │   └── route.ts              # Semantic search endpoint (v2)
│   │   ├── health/
│   │   │   └── route.ts              # Health check endpoint
│   │   ├── resources/
│   │   │   └── route.ts              # Resource listing endpoint
│   │   ├── swagger/
│   │   │   └── route.ts              # OpenAPI spec endpoint
│   │   └── section/[id]/
│   │       └── route.ts              # Section detail endpoint
│   ├── api-docs/
│   │   └── page.tsx                  # Swagger UI for API docs
│   ├── resources/
│   │   └── page.tsx                  # Resource listing page
│   ├── section/[id]/
│   │   └── page.tsx                  # Section detail page
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Search homepage
├── components/
│   └── ui/
│       ├── badge.tsx                 # Document type badge
│       ├── button.tsx                # Button component
│       ├── card.tsx                  # Card container
│       ├── input.tsx                 # Input field
│       ├── separator.tsx             # Separator divider
│       ├── skeleton.tsx              # Loading skeleton
│       └── tabs.tsx                  # Tab component
├── lib/
│   ├── db.ts                         # Prisma client instance
│   ├── redis.ts                      # Redis client & cache service
│   ├── search.ts                     # Search logic with ranking
│   ├── utils.ts                      # Utilities (highlighting, etc)
│   └── document-urls.ts              # Document URL helpers
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Tag seeding script
├── scripts/
│   ├── bootstrap.ts                  # Full data ingestion
│   ├── check-section.ts              # Section validation
│   ├── ingest-*.ts                   # Individual ingestion scripts
│   ├── ingestion-utils.ts            # Ingestion utilities
│   ├── reset-database.ts             # Database reset script
│   ├── seed-tags.ts                  # Tag seeding
│   ├── setup-database.ts             # Database setup
│   └── test-search.ts                # Search testing
├── data/
│   ├── README.md                     # Data directory info
│   ├── issuances/
│   │   ├── advisories/               # NPC Advisories
│   │   ├── circulars/                # NPC Circulars
│   │   ├── decisions/                # NPC Decisions
│   │   ├── orders/                   # NPC Orders
│   │   └── resolutions/              # NPC Resolutions
│   └── [DPA/IRR PDFs]                # Source documents
├── .env                              # Environment variables
├── .env.example                      # Example env file
├── .gitignore                        # Git ignore rules
├── docker-compose.yml                # Docker infrastructure
├── Dockerfile                        # Container definition
├── next.config.js                    # Next.js configuration
├── package.json                      # Dependencies & scripts
├── postcss.config.js                 # PostCSS configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── README.md                         # Project overview
├── CHANGELOG.md                      # Version history
└── DOCUMENTATION.md                  # This file
```

---

## Setup Guide

### Environment Variables

Create `.env` file with:

```bash
# Database
DATABASE_URL="postgresql://silip:silip_password@localhost:5432/silip_db"

# Redis
REDIS_URL="redis://localhost:6379"

# API Keys
GEMINI_API_KEY="your-gemini-api-key"  # For AI re-ranking (optional)

# Application
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"

# Optional for production
DATABASE_SSL=true
REDIS_PASSWORD="your-redis-password"
```

**Important for Production:**
- `NEXT_PUBLIC_API_URL` must include the full URL with HTTPS scheme (e.g., `https://yourdomain.com/api`)
- This ensures Swagger UI works correctly without CORS errors
- The environment variable is used for both the Swagger client and OpenAPI spec server configuration

### Docker Setup

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Deploy schema
npx prisma db push

# Seed initial tags
npm run prisma:seed

# Open Prisma Studio (visual DB editor)
npx prisma studio
```

### Data Ingestion

```bash
# Load sample data (5 DPA sections)
npm run ingest:sample

# Full ingestion (all documents)
npm run bootstrap

# Individual document types
npm run ingest:dpa
npm run ingest:irr
npm run ingest:advisories
npm run ingest:circulars
npm run ingest:decisions
npm run ingest:orders
npm run ingest:resolutions
```

---

## Development

### Running Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

### Code Structure

#### Frontend (Next.js App Router)
- `app/page.tsx` - Main search interface
- `app/section/[id]/page.tsx` - Section detail view
- `app/api-docs/page.tsx` - API documentation viewer

#### Backend (API Routes)
- `app/api/search/v2/route.ts` - Semantic search endpoint
- `app/api/health/route.ts` - Health check
- `app/api/resources/route.ts` - List resources
- `app/api/swagger/route.ts` - OpenAPI spec

#### Search Logic
- `lib/search.ts` - Core search implementation
  - `searchLegalDocuments()` - Main search function with ranking
  - `calculateRelevanceScore()` - Relevance calculation
  - `buildWhereClause()` - Database query builder
  - `getRelatedSections()` - Related section finder

#### Utilities
- `lib/utils.ts` - Helper functions
  - `normalizeQuery()` - Query normalization
  - `highlightSearchTerms()` - Yellow highlighting
  - `extractSnippet()` - Content extraction
- `lib/document-urls.ts` - URL generation
- `lib/redis.ts` - Cache service

### Database Schema

```prisma
model LegalDocument {
  id String @id @default(cuid())
  title String
  alias String
  type DocType              # DPA, IRR, ISSUANCE
  subType IssuanceType?     # ADVISORY, CIRCULAR, ORDER, DECISION, RESOLUTION
  url String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sections Section[]
}

model Section {
  id String @id @default(cuid())
  documentId String
  document LegalDocument @relation(fields: [documentId], references: [id])
  sectionNum String        # "1", "2.1", "38", etc
  title String
  content String           # Full text content
  embedding Float[] @db.Vector(768)  # For vector search
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tags Tag[]
}

model Tag {
  id String @id @default(cuid())
  name String @unique
  description String?
  sections Section[]
}
```

### Search Algorithm

#### Ranking Priority (in order)
1. **DPA/IRR with exact phrase match** - Highest priority
2. **Any document with exact phrase in title** - Very high priority
3. **Any document with exact phrase** - High priority
4. **Matched terms count** - How many search keywords found
5. **Matched term frequency** - How often terms appear
6. **Document type** - DPA > IRR > ISSUANCE
7. **Section number** - Lower numbers first (meaningful vs boilerplate)

#### Stop Words (Excluded from Scoring)
a, an, and, are, as, at, be, by, for, from, has, he, in, is, it, its, of, on, or, that, the, to, was, will, with, do, i, me, my, we, you, your, this, these, there, they, them, their

#### Caching Strategy
- Redis with 24-hour TTL
- Versioned keys (v3) for cache invalidation
- Full result set cached before pagination
- Pagination served from cache

### Testing

```bash
# Test search endpoint
curl "http://localhost:3000/api/search/v2?q=data+protection&filter=ALL&page=1&pageSize=20"

# Test health endpoint
curl "http://localhost:3000/api/health"

# Test API docs
curl "http://localhost:3000/api/swagger"

# Run search test script
npm run search:test
```

---

## Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   vercel link
   ```

2. **Add Environment Variables**
   - Go to Vercel Project Settings > Environment Variables
   - Add: `DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY`

3. **Deploy**
   ```bash
   vercel deploy --prod
   ```

4. **Database Services**
   - PostgreSQL: Neon, Supabase, or Railway
   - Redis: Upstash or Redis Cloud
   - API Keys: Gemini API (optional, for AI re-ranking)

### Docker / VPS Deployment

```bash
# Build image
docker build -t silip:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e GEMINI_API_KEY="..." \
  --name silip \
  silip:latest

# With docker-compose
docker-compose -f docker-compose.yml up -d --build
```

### OCI/Portainer Deployment

See [Portainer Deployment](#portainer-deployment) section below.

### Production Checklist

**Environment & Configuration:**
- [ ] Set production environment variables (see `.env.production.example`)
- [ ] Set `NEXT_PUBLIC_API_URL` to full HTTPS URL (e.g., `https://yourdomain.com/api`)
- [ ] Use strong passwords for database (`DB_PASSWORD`)
- [ ] Configure Gemini API key (`GEMINI_API_KEY`) for AI features
- [ ] Set `NODE_ENV=production`

**Security:**
- [ ] Enable SSL/TLS for Redis (if external)
- [ ] Use secure database connections
- [ ] Configure reverse proxy with HTTPS (Nginx/Caddy)
- [ ] Review CORS settings if needed

**Data & Files:**
- [ ] Copy PDF files from GitHub repo to `/app/data/` (see [Copying PDF Files to Production](#copying-pdf-files-to-production))
- [ ] Verify all issuance HTML files are present in `data/issuances/`
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Run initial bootstrap: `npm run bootstrap`

**Infrastructure:**
- [ ] Configure backup strategy for PostgreSQL
- [ ] Set up monitoring and logging
- [ ] Configure CDN for static assets (optional)
- [ ] Set up error tracking (Sentry, optional)

**Application:**
- [ ] Build application: `npm run build`
- [ ] Test health endpoint: `/api/health`
- [ ] Verify search functionality
- [ ] Test Swagger UI at `/api-docs`
- [ ] Verify PDF downloads work

---

## API Documentation

### Search Endpoint - v2 (Recommended)

**Endpoint:** `GET /api/search/v2`

**Parameters:**
- `q` (string, required) - Search query
- `filter` (enum, optional) - Document type filter
  - `ALL` (default), `DPA`, `IRR`, `ISSUANCE`, `ADVISORY`, `CIRCULAR`, `ORDER`, `DECISION`, `RESOLUTION`
- `page` (number, optional) - Page number (default: 1)
- `pageSize` (number, optional) - Results per page (default: 20)

**Response:**
```json
{
  "results": [
    {
      "id": "string",
      "documentId": "string",
      "documentType": "DPA|IRR|ISSUANCE",
      "documentSubtype": "ADVISORY|CIRCULAR|...",
      "documentAlias": "string",
      "documentTitle": "string",
      "sectionNum": "38",
      "sectionTitle": "Data Breach Notification",
      "snippet": "...highlighted excerpt...",
      "highlightedContent": "...html with <mark> tags...",
      "tags": [{"id": "string", "name": "Data Breach"}],
      "url": "string"
    }
  ],
  "query": "data breach",
  "filter": "ALL",
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3,
  "cached": true
}
```

**Examples:**
```bash
# Simple search
curl "http://localhost:3000/api/search/v2?q=consent&filter=ALL&page=1&pageSize=20"

# Filter by document type
curl "http://localhost:3000/api/search/v2?q=CCTV&filter=DPA"

# Pagination
curl "http://localhost:3000/api/search/v2?q=notification&page=2&pageSize=20"
```

### Health Endpoint

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-02-04T10:30:00Z"
}
```

### Resources Endpoint

**Endpoint:** `GET /api/resources`

**Response:**
```json
{
  "documents": 9,
  "sections": 475,
  "tags": 35,
  "indexed": 475
}
```

### Section Detail Endpoint

**Endpoint:** `GET /api/section/:id`

**Response:**
```json
{
  "id": "string",
  "sectionNum": "38",
  "title": "Data Breach Notification",
  "content": "...full content...",
  "document": {
    "id": "string",
    "title": "Data Privacy Act of 2012",
    "alias": "DPA",
    "type": "DPA",
    "url": "..."
  },
  "tags": [...]
}
```

### OpenAPI/Swagger Endpoint

**Endpoint:** `GET /api/swagger`

Returns OpenAPI 3.0 specification in JSON format.

**View Interactive Docs:** `http://localhost:3000/api-docs`

**Note:** The Swagger UI uses the `NEXT_PUBLIC_API_URL` environment variable to construct the proper base URL for API calls. In production environments, ensure this is set to your full HTTPS URL (e.g., `https://yourdomain.com/api`) to avoid CORS errors.

---

## Ingestion Guide

### Data Format

Each document should be:
1. HTML content or plain text
2. Split into sections with numbers (Section 1, Section 2.1, etc)
3. Associated with tags automatically

### Ingestion Scripts

All located in `scripts/` directory:

```typescript
// Example: ingest-dpa.ts
import { createSectionWithAutoTag } from './ingestion-utils'

export async function ingestDPA() {
  const sections = parseHTMLFile('path/to/dpa.html')
  
  for (const section of sections) {
    await createSectionWithAutoTag({
      documentId: 'dpa-doc-id',
      sectionNum: section.number,
      title: section.title,
      content: section.content,
      autoTag: true
    })
  }
}
```

### Auto-Tagging System

Tags are automatically assigned based on content keywords:

```bash
# Run tagging
npm run seed:tags

# Tags include:
# - Data Breach Notification
# - Data Protection Officer
# - Personal Data Processing
# - Consent Management
# - Security Measures
# ... and 30+ more
```

### Custom Ingestion

```typescript
import { prisma } from '@/lib/db'
import { autoTagSection } from './ingestion-utils'

// Create document
const doc = await prisma.legalDocument.create({
  data: {
    title: 'My Law',
    alias: 'ML',
    type: 'ISSUANCE',
    subType: 'ADVISORY'
  }
})

// Create section
const section = await prisma.section.create({
  data: {
    documentId: doc.id,
    sectionNum: '1',
    title: 'Purpose',
    content: 'This law shall...'
  }
})

// Auto-tag
await autoTagSection(section.id, section.content)
```

---

## Portainer Deployment

### Prerequisites
- Docker Engine running
- Portainer installed: `docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest`
- Access to Portainer UI (port 9443)

### Step-by-Step Deployment

1. **Login to Portainer**
   - Go to `https://your-host:9443`
   - Create admin account
   - Go to "Stacks"

2. **Create New Stack**
   - Click "Add Stack"
   - Name: `silip`
   - Paste `docker-compose.yml` content

3. **Environment Variables**
   - Before deploying, set environment variables:
     ```
     DATABASE_URL=postgresql://silip:password@silip-db:5432/silip_db
     REDIS_URL=redis://silip-redis:6379
     GEMINI_API_KEY=your-api-key
     NEXT_PUBLIC_API_URL=https://your-domain/api
     ```

4. **Deploy Stack**
   - Click "Deploy Stack"
   - Wait for containers to start

5. **Verify Deployment**
   ```bash
   # Check running containers
   docker ps

   # View logs
   docker logs silip-app
   docker logs silip-db
   docker logs silip-redis

   # Test API
   curl http://localhost:3000/api/health
   ```

6. **Initial Data Load**
   - Option A (Fast): Skip ingestion
     ```bash
     SKIP_BOOTSTRAP=true docker-compose up -d
     ```
   - Option B (Full): Ingest data
     ```bash
     docker-compose exec silip-app npm run bootstrap
     ```

### Copying PDF Files to Production

The application requires PDF source files for document downloads. These are not included in the Docker image and must be copied separately to production.

**Important:** PDF files are stored in Git and need to be manually copied to the container's data volume in production.

#### Method 1: Clone Repository on Production Server

```bash
# 1. SSH into your production server
ssh user@your-production-server

# 2. Navigate to a temporary directory
cd /tmp

# 3. Clone the repository (to get the PDF files)
git clone https://github.com/tildemark/silip.git
cd silip

# 4. Find the container's data volume location
docker volume inspect silip_data_volume

# 5. Copy PDF files to the container's volume
# Option A: Direct copy to volume mount point
sudo cp -r data/* /var/lib/docker/volumes/silip_data_volume/_data/

# Option B: Copy into running container
docker cp data/DPA-2012.pdf silip-app:/app/data/
docker cp data/dpa-irr-2016.pdf silip-app:/app/data/
docker cp data/issuances/ silip-app:/app/data/

# 6. Verify files are copied
docker exec silip-app ls -la /app/data/

# 7. Clean up
cd /tmp
rm -rf silip
```

#### Method 2: Using Docker Volume Mount (Recommended for Portainer)

```bash
# 1. Create a bind mount in docker-compose.yml or Portainer Stack
# Add this to the silip-app service:
volumes:
  - ./data:/app/data

# 2. Clone repo on the host machine
git clone https://github.com/tildemark/silip.git

# 3. The data directory will automatically be mounted to the container

# 4. Verify in Portainer:
#    - Go to Containers → silip-app → Volumes
#    - Should see /app/data mounted
```

#### Method 3: Manual Upload via Portainer Console

```bash
# 1. In Portainer, go to Containers → silip-app → Console
# 2. Connect using /bin/sh
# 3. Create directory structure
mkdir -p /app/data/issuances/{advisories,circulars,decisions,orders,resolutions}

# 4. Upload files using Portainer's file upload feature:
#    - Go to Container Details → Exec Console
#    - Use a file transfer method (SCP, SFTP, or Portainer's upload)

# 5. Alternative: Use curl to download from GitHub
cd /app/data
curl -o DPA-2012.pdf https://raw.githubusercontent.com/tildemark/silip/main/data/DPA-2012.pdf
curl -o dpa-irr-2016.pdf https://raw.githubusercontent.com/tildemark/silip/main/data/dpa-irr-2016.pdf
```

#### Files Required

The following files should be present in `/app/data/`:

```
data/
├── DPA-2012.pdf                    # Data Privacy Act of 2012
├── dpa-irr-2016.pdf                # Implementing Rules and Regulations
└── issuances/
    ├── advisories/                 # HTML files for NPC Advisories
    │   └── [various .html files]
    ├── circulars/                  # HTML files for NPC Circulars
    ├── decisions/                  # HTML files for NPC Decisions
    ├── orders/                     # HTML files for NPC Orders
    └── resolutions/                # HTML files for NPC Resolutions
```

**Verification:**

```bash
# Check if files are accessible
docker exec silip-app ls -la /app/data/
docker exec silip-app ls -la /app/data/issuances/advisories/

# Test download API
curl http://localhost:3000/api/download/DPA-2012.pdf
```

**Notes:**
- The `/api/download/[...path]` endpoint serves files from the `data/` directory
- Path traversal protection is in place for security
- If files are missing, download endpoints will return 404
- For v2 deployment, ensure all PDF and HTML files are copied before running bootstrap

### Nginx Reverse Proxy Configuration

```nginx
server {
  listen 443 ssl http2;
  server_name silip.example.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }
}
```

---

## Troubleshooting

### Database Issues

**Connection Error**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker logs silip-db

# Test connection
psql postgresql://silip:password@localhost:5432/silip_db

# Reset database
npx prisma db push --force-reset
npm run prisma:seed
```

**Migration Issues**
```bash
# Manually migrate
npx prisma migrate deploy

# Reset and replay
npx prisma migrate reset --force
```

### Redis Issues

**Connection Failed**
```bash
# Check if Redis is running
docker ps | grep redis

# View logs
docker logs silip-redis

# Test connection
redis-cli -h localhost -p 6379 ping

# Clear cache
redis-cli FLUSHDB
```

### Search Not Working

**No Results**
- Check if data is ingested: `SELECT COUNT(*) FROM "Section"`
- Verify Redis connection: `npm run search:test`
- Check for stop words filtering

**Slow Search**
- Enable Redis caching
- Run `npx prisma generate`
- Check database indexes

### Docker Issues

**Container won't start**
```bash
# View detailed logs
docker logs silip-app

# Check memory
docker stats

# Restart service
docker-compose restart silip-app
```

**Port already in use**
```bash
# Find process using port
lsof -i :3000

# Use different port
docker-compose up -d -p 3001:3000
```

### Build Issues

**TypeScript errors**
```bash
npm run lint              # Check linting
npx tsc --noEmit        # Type check
npm run build            # Full build
```

**Missing dependencies**
```bash
npm install              # Reinstall all
npm install --legacy-peer-deps  # If peer dependency issues
```

### API Documentation Issues

**Swagger UI CORS Error**
If you see "URL scheme must be 'http' or 'https' for CORS request" in `/api-docs`:

1. Ensure `NEXT_PUBLIC_API_URL` is set correctly in your environment
2. For production: Use full HTTPS URL (e.g., `https://yourdomain.com/api`)
3. For development: Use `http://localhost:3000/api`
4. Rebuild and restart the application after changing environment variables

```bash
# Set environment variable
export NEXT_PUBLIC_API_URL="https://yourdomain.com/api"

# Rebuild
npm run build
npm start
```

The Swagger UI dynamically constructs the API URL from this environment variable to ensure the correct scheme (HTTP/HTTPS) is used.

### Performance Optimization

**Database optimization**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 1000;

-- Create indexes
CREATE INDEX idx_section_content ON "Section" USING GIN(content);
CREATE INDEX idx_section_doc_id ON "Section"(documentId);
```

**Redis optimization**
```bash
# Monitor Redis commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Optimize cache
redis-cli CONFIG GET maxmemory-policy
```

---

## Quick Reference: v2.0 to v2.0.1 Deployment

If you're upgrading from v2.0.0 to v2.0.1 on production:

```bash
# 1. Pull latest changes
cd /path/to/silip
git pull origin main

# 2. Ensure environment variable is set
# Edit .env.production to include:
# NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# 3. Rebuild the Docker image
docker-compose build

# 4. Restart containers
docker-compose down
docker-compose up -d

# 5. Verify Swagger UI works without CORS errors
curl https://yourdomain.com/api-docs
```

**Key Changes in v2.0.1:**
- Fixed Swagger UI CORS error by using `NEXT_PUBLIC_API_URL` for proper HTTPS scheme
- No database changes required
- No data migration needed

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## Support & Resources

- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Documentation:** [DOCUMENTATION.md](DOCUMENTATION.md)
- **API Docs:** http://localhost:3000/api-docs
- **Privacy Laws:** https://privacy.gov.ph

---

## License

MIT License - see LICENSE file for details

---

**Last Updated:** 2026-02-04 | **Version:** 2.0.0
