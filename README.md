# SILIP: Searchable Interface for Legal Information & Privacy

**SILIP** is a high-performance, context-aware search engine specifically designed for Data Protection Officers (DPOs) in the Philippines. Unlike generic PDF searches, SILIP ingests, parses, and "atomizes" Philippine privacy laws into queryable data points, allowing for instant retrieval of specific sections, circulars, and advisories.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Redis](https://img.shields.io/badge/Redis-7-red) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)

## 🚀 Key Features

* **⚛️ Atomized Legal Database:** Stores laws not as blobs, but as individual `Sections`, enabling granular search results.
* **🧠 Dynamic Auto-Tagging:** Automatically maps keywords (e.g., "CCTV", "Breach") to relevant laws using a database-driven dictionary.
* **⚡ Redis-Powered Search:** Implements aggressive caching (24hr TTL) for instant search results, handling the read-heavy nature of legal research.
* **🎯 Smart Highlighting:** Highlights search terms within legal text with `<mark>` tags for quick scanning.
* **🔍 Multi-Filter Search:** Filter by document type (DPA Law, IRR, Circulars).
* **🏷️ Tag-Based Discovery:** Explore sections by topic tags (Consent, CCTV, Data Breach, etc.).
* **📱 Modern UI:** Clean, responsive interface built with Shadcn/UI and Tailwind CSS.

## 🛠️ Tech Stack

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Database:** [PostgreSQL](https://www.postgresql.org/) 16
* **ORM:** [Prisma](https://www.prisma.io/) 5
* **Caching:** [Redis](https://redis.io/) 7 (via `ioredis`)
* **UI Components:** [Shadcn/UI](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Ingestion:** `cheerio` (HTML), `puppeteer` & `pdf-parse` (PDFs)

---

## ⚡ Quick Start

### Prerequisites

* Node.js 18+
* Docker (for local Postgres & Redis)
* npm/pnpm/yarn

### 1. Clone & Install

```bash
git clone https://github.com/tildemark/silip.git
cd silip
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d

# Wait for containers to be healthy (check with docker ps)
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 3. Set Up Database

```bash
# The .env file is already configured for local development

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial tags
npm run prisma:seed
```

### 4. Ingest Sample Data

```bash
# Load sample DPA 2012 sections
npm run ingest:sample
```

This will populate the database with 5 sample sections from the Data Privacy Act of 2012.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Project Structure

```
silip/
├── app/
│   ├── api/search/route.ts    # Search API endpoint
│   ├── page.tsx               # Main search page (Hero + Results)
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles + mark tag styling
├── components/ui/             # Shadcn/UI components
│   ├── card.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── tabs.tsx
│   ├── separator.tsx
│   └── skeleton.tsx
├── lib/
│   ├── db.ts                  # Prisma client (singleton)
│   ├── redis.ts               # Redis client + CacheService
│   ├── search.ts              # Search logic with caching
│   └── utils.ts               # Utilities (highlighting, snippets)
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script for tags
├── scripts/
│   ├── ingest-sample.ts       # Sample DPA ingestion
│   └── ingestion-utils.ts     # Auto-tagging & helpers
├── docker-compose.yml         # PostgreSQL + Redis
└── SETUP.md                   # Detailed setup guide
```

---

## 🔍 How It Works

### Architecture Flow

```
User Query → API Route → Check Redis Cache
                             ↓ (cache miss)
                        Prisma Full-Text Search
                             ↓
                        Highlight + Format
                             ↓
                        Store in Redis (24hr TTL)
                             ↓
                        Return JSON Results
```

### Search Features

1. **Full-Text Search**
   - Searches `Section.content` and `Section.title`
   - Searches associated `Tag.name`
   - Case-insensitive
   - Multi-word support (all terms must match)

2. **Redis Caching**
   - Cache Key: `silip:search:{filter}:{normalizedQuery}`
   - TTL: 24 hours (86400 seconds)
   - Invalidation: Automatic after ingestion

3. **Smart Highlighting**
   - Wraps matching terms in `<mark>` tags
   - Extracts contextual snippets around matches
   - Custom yellow highlighting via CSS

---

## 📡 API Documentation

### GET `/api/search`

Search for legal sections across all documents.

**Query Parameters:**

| Parameter | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| `q`       | string | Yes      | Search query                                     |
| `filter`  | string | No       | Document type: `ALL`, `DPA`, `IRR`, `ISSUANCE`   |

**Example Request:**

```bash
GET /api/search?q=consent&filter=DPA
```

**Example Response:**

```json
{
  "results": [
    {
      "id": "clx...",
      "documentId": "doc123",
      "documentType": "DPA",
      "documentAlias": "DPA 2012",
      "documentTitle": "Data Privacy Act of 2012",
      "sectionNum": "Section 3",
      "sectionTitle": "Definition of Terms",
      "content": "Full text...",
      "highlightedContent": "...<mark>consent</mark>...",
      "snippet": "...excerpt with context...",
      "tags": [
        { "id": "tag1", "name": "Consent" }
      ],
      "url": "https://privacy.gov.ph/..."
    }
  ],
  "query": "consent",
  "filter": "DPA",
  "total": 1,
  "cached": false
}
```

---

## 🏷️ Database Schema

### Models

**LegalDocument**
- `id` - Unique identifier
- `type` - Enum: DPA, IRR, ISSUANCE
- `title` - Full document title
- `alias` - Short name (e.g., "DPA 2012")
- `url` - Source URL

**Section**
- `id` - Unique identifier
- `documentId` - Foreign key to LegalDocument
- `sectionNum` - Section number (e.g., "Section 13")
- `title` - Section title
- `content` - Full text content
- `tags` - Many-to-many relation with Tag

**Tag**
- `id` - Unique identifier
- `name` - Tag name (e.g., "Consent", "CCTV")
- `description` - Optional description
- `sections` - Many-to-many relation with Section

---

## 📥 Data Ingestion

### Adding New Legal Documents

1. **Create ingestion script:**

```typescript
// scripts/ingest-irr.ts
import { createDocument, createSectionWithAutoTag } from './ingestion-utils'

const doc = await createDocument({
  type: 'IRR',
  title: 'Implementing Rules and Regulations of RA 10173',
  alias: 'IRR 2016',
  url: 'https://www.privacy.gov.ph/...'
})

await createSectionWithAutoTag({
  documentId: doc.id,
  sectionNum: 'Rule I',
  title: 'General Provisions',
  content: '...'
})
```

2. **Run ingestion:**

```bash
npm run ingest:sample
```

3. **Cache is automatically cleared** after ingestion via `cacheService.invalidateSearchCache()`.

---

## 🔧 Development

### Available Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Push schema to DB
npm run prisma:seed      # Seed initial tags
npm run ingest:sample    # Load sample DPA data
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://silip_user:silip_password@localhost:5432/silip_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🐛 Troubleshooting

### Redis Connection Errors

```powershell
# Check if Redis is running
docker ps | Select-String redis

# View logs
docker logs silip_redis

# Restart
docker-compose restart redis
```

### Database Issues

```powershell
# Check PostgreSQL
docker ps | Select-String postgres

# View logs
docker logs silip_postgres

# Reset database
npx prisma db push --force-reset
npm run prisma:seed
```

### Clear Cache Manually

```powershell
docker exec -it silip_redis redis-cli FLUSHDB
```

---

## 🚀 Deployment

### Vercel + Managed Services

1. **Deploy to Vercel:**
   ```bash
   vercel deploy --prod
   ```

2. **Add PostgreSQL:**
   - Use [Vercel Postgres](https://vercel.com/storage/postgres) or
   - External provider (Supabase, Railway, Neon)

3. **Add Redis:**
   - Use [Upstash Redis](https://upstash.com/)
   - Set `REDIS_URL` in Vercel environment variables

4. **Run Migrations:**
   ```bash
   npx prisma migrate deploy
   ```

---

## 🎯 Future Enhancements

- [ ] PDF ingestion pipeline for NPC Circulars
- [ ] Advanced search with boolean operators
- [ ] Section-to-section linking
- [ ] User accounts with saved searches
- [ ] Export to PDF/Word
- [ ] Multi-language support (Filipino translations)
- [ ] Public API with rate limiting
- [ ] Analytics dashboard

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **National Privacy Commission (NPC)** for making Philippine privacy laws publicly accessible
- **Shadcn/UI** for the beautiful component library
- **Next.js** team for the amazing framework

---

## 📧 Contact

For questions or contributions, please open an issue on GitHub.

**Built with ❤️ for Philippine Data Protection Officers**

---

*"Ang hindi lumingon sa pinanggalingan, hindi makakarating sa paroroonan."* 

(He who does not look back at where he came from will never get to his destination.) 

**SILIP**: Looking back at the law so you can move forward with compliance.
