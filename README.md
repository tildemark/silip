# SILIP: Searchable Interface for Legal Information & Privacy

**Version 1.0.0**

**SILIP** is a comprehensive, high-performance search engine for Philippine data privacy laws and regulations. Built specifically for Data Protection Officers (DPOs), legal professionals, and privacy practitioners, SILIP provides instant access to the Data Privacy Act, IRR, and all NPC issuances through an intelligent, context-aware search interface.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Redis](https://img.shields.io/badge/Redis-7-red) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)

## 🎯 What Makes SILIP Different

Unlike simple PDF searches, SILIP intelligently **parses and structures** legal documents into queryable sections, making privacy law research fast and precise:

* **Search "consent"** → Get all sections about consent across DPA, IRR, advisories, and decisions
* **Search "CCTV"** → Automatically includes related terms like surveillance, camera, monitoring
* **Click any result** → See highlighted terms in context with direct links to source PDFs
* **Filter by type** → Narrow results to just Advisories, Circulars, Decisions, Orders, or Resolutions

## 🚀 Key Features

### 🔍 Intelligent Search Engine
* **Full-text search** across 400+ legal sections with intelligent keyword expansion
* **35+ legal concept tags** automatically mapped (Consent, Data Breach, CCTV, DPO, etc.)
* **Smart highlighting** preserves search terms from results through detail pages
* **Multi-filter support** for all document types (DPA, IRR, Advisory, Circular, Order, Decision, Resolution)

### 📚 Comprehensive Legal Database
* **Data Privacy Act of 2012** - All 44 sections fully parsed and searchable
* **IRR 2016** - Complete 72 sections with cross-references
* **21 NPC Advisories** - Including AI Guidelines, CCTV policies, and more
* **32 NPC Circulars** - Policy guidance and compliance requirements  
* **92 NPC Decisions** - Adjudication case outcomes
* **73 NPC Orders** - Cease and desist orders, breach notifications
* **140 NPC Resolutions** - Compliance investigations and determinations

### 📄 Document Management
* **Secure PDF downloads** for all source documents
* **Direct NPC website links** to original publications
* **Path traversal protection** for secure file serving
* **Organized resources page** with all ingested documents

### 🔧 Developer Tools
* **OpenAPI 3.0 documentation** with Swagger UI at `/api-docs`
* **Interactive API testing** for all endpoints
* **RESTful API** for search, resources, and section retrieval
* **Redis caching** with automatic invalidation

## 🛠️ Tech Stack

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Language:** TypeScript 5
* **Database:** [PostgreSQL](https://www.postgresql.org/) 16
* **ORM:** [Prisma](https://www.prisma.io/) 5
* **Caching:** [Redis](https://redis.io/) 7 (via `ioredis`)
* **UI Components:** [Shadcn/UI](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Ingestion:** `pdf-parse` (PDFs), `cheerio` (HTML parsing)

---

## ⚡ Quick Start

### Prerequisites

* Node.js 18+
* PostgreSQL 16+
* Redis 7+

### 1. Clone & Install

```bash
git clone https://github.com/tildemark/silip.git
cd silip
npm install
```

### 2. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial tags (35 privacy concept tags)
npx prisma db seed
```

### 3. Set Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/silip"
REDIS_URL="redis://localhost:6379"
```

### 4. Ingest Legal Documents

```bash
# Ingest DPA 2012 (44 sections)
npx tsx scripts/ingest-dpa-pdf.ts

# Ingest IRR 2016 (72 sections)
npx tsx scripts/ingest-irr-pdf.ts

# Ingest NPC Advisories (21 documents)
npx tsx scripts/ingest-advisories.ts

# Ingest NPC Circulars (32 documents)
npx tsx scripts/ingest-circulars.ts

# Ingest NPC Decisions (92 documents)
npx tsx scripts/ingest-decisions.ts

# Ingest NPC Orders (73 documents)
npx tsx scripts/ingest-orders.ts

# Ingest NPC Resolutions (140 documents)
npx tsx scripts/ingest-resolutions.ts
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Try searching for:** 
- `consent` - Find all sections about consent and authorization
- `data breach` - Security breach requirements and notifications
- `CCTV` - Surveillance and camera policies
- `sensitive personal information` - Special categories of data

**Explore the API:** Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for interactive API documentation.

---

## 🏗️ Project Structure

```
silip/
├── app/
│   ├── api/
│   │   ├── search/route.ts           # Search API endpoint
│   │   ├── resources/route.ts        # Resources API
│   │   ├── section/[id]/route.ts     # Section detail API
│   │   ├── download/[...path]/       # PDF download endpoint
│   │   ├── swagger/route.ts          # OpenAPI spec
│   │   └── api-docs/page.tsx         # Swagger UI
│   ├── section/[id]/page.tsx         # Section detail page
│   ├── resources/page.tsx            # Resources page
│   ├── page.tsx                      # Main search page
│   └── layout.tsx                    # Root layout
├── components/ui/                    # Shadcn/UI components
├── lib/
│   ├── db.ts                         # Prisma client
│   ├── redis.ts                      # Redis cache service
│   ├── search.ts                     # Search logic
│   ├── swagger.ts                    # OpenAPI specification
│   ├── document-urls.ts              # URL helpers
│   └── utils.ts                      # Utilities (highlighting)
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Tag seeding
├── scripts/
│   ├── ingest-dpa-pdf.ts             # DPA ingestion
│   ├── ingest-irr-pdf.ts             # IRR ingestion
│   ├── ingest-advisories.ts          # Advisories ingestion
│   ├── ingest-circulars.ts           # Circulars ingestion
│   ├── ingest-decisions.ts           # Decisions ingestion
│   ├── ingest-orders.ts              # Orders ingestion
│   ├── ingest-resolutions.ts         # Resolutions ingestion
│   └── lib/                          # Ingestion utilities
├── data/                             # PDF source files
└── CHANGELOG.md                      # Version history
```

---

## 📡 API Documentation

### Interactive Documentation

Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for full interactive API documentation with Swagger UI.

### Quick Reference

**Search Endpoint:**
```
GET /api/search?q=consent&filter=ADVISORY
```

**Section Detail:**
```
GET /api/section/:id
```

**Resources:**
```
GET /api/resources
```

**Download PDF:**
```
GET /api/download/issuances/advisories/Advisory-2024.12.19-Guidelines-on-Artificial-Intelligence-w-SGD.pdf
```

---

## 🔍 How Search Works

### Query Expansion

SILIP automatically expands search queries using 35 predefined legal concept tags:

```
User searches: "consent"
Expanded to: consent OR authorization OR permission OR agreement OR approval
```

### Highlighting Persistence

Search terms are highlighted throughout the user journey:

1. User searches "consent" → Results show highlighted snippets
2. User clicks result → URL includes `?q=consent`
3. Section page reads query parameter → Highlights all matching terms
4. Copy link preserves query → Shared links maintain highlighting

### Caching Strategy

- **Cache Key:** `search:{filter}:{query}`
- **TTL:** 24 hours
- **Invalidation:** Automatic after ingestion
- **Performance:** ~10ms cached, ~100ms uncached

---

## 🏷️ Tag System

SILIP includes 35 pre-configured privacy concept tags for automatic categorization:

| Category | Tags |
|----------|------|
| **Core Concepts** | Consent, Personal Data, Sensitive Personal Information, Privileged Information |
| **Parties** | Data Subject, Personal Information Controller (PIC), Personal Information Processor (PIP), Data Protection Officer (DPO) |
| **Rights** | Right to Information, Right to Access, Right to Correction, Right to Erasure, Right to Data Portability, Right to Object, Right to File Complaint |
| **Security** | Data Breach, Security Incident, Security Measures, Encryption, Anonymization, Pseudonymization |
| **Processing** | Data Processing, Collection, Retention, Storage, Transfer, Cross-Border Transfer, Outsourcing |
| **Technology** | CCTV, Biometrics, Cookies, AI/Artificial Intelligence |
| **Compliance** | Privacy Notice, Privacy Policy, Impact Assessment, Registration, Compliance, Enforcement |
| **Violations** | Unauthorized Processing, Unauthorized Access, Unauthorized Disclosure, Malicious Disclosure, Data Protection Violations |

---

## 🐛 Troubleshooting

### Search Returns No Results

1. Check if data has been ingested:
   ```bash
   npx prisma studio
   # Browse Section and LegalDocument tables
   ```

2. Clear Redis cache:
   ```bash
   redis-cli FLUSHDB
   ```

3. Re-run ingestion scripts

### PDF Downloads Show Blank Page

This is fixed in v1.0.0. Ensure you're running the latest version and that `app/api/download/[...path]/route.ts` properly awaits params.

### Database Connection Errors

Check your `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/silip"
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Set production environment variables
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Build application: `npm run build`
- [ ] Configure Redis connection with TLS
- [ ] Set up PostgreSQL backup strategy
- [ ] Configure CDN for PDF downloads (optional)
- [ ] Enable monitoring and logging

### Recommended Services

- **Hosting:** Vercel, Railway, or DigitalOcean
- **Database:** Supabase, Railway, or Neon
- **Redis:** Upstash or Redis Cloud
- **Monitoring:** Sentry + Vercel Analytics

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **National Privacy Commission (NPC)** for making Philippine privacy laws publicly accessible at [privacy.gov.ph](https://privacy.gov.ph)
- **Shadcn/UI** for the beautiful component library
- **Next.js** team for the amazing framework
- All contributors to Philippine data privacy advocacy

---

## 📧 Support

For questions, issues, or contributions:
- Open an issue on [GitHub](https://github.com/tildemark/silip/issues)
- See [CHANGELOG.md](CHANGELOG.md) for version history

---

**Built with ❤️ for Philippine Data Protection Officers**

*Making Philippine privacy law accessible to everyone.*
