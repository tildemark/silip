# SILIP: Searchable Interface for Legal Information & Privacy

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A modern, full-featured search engine for Philippine data privacy laws with semantic search, AI re-ranking, and production-ready infrastructure.

## 🎯 Features

- **Semantic Search v2.0** - Hybrid keyword + vector search with advanced ranking
- **AI Re-ranking** - Gemini-powered semantic analysis for complex queries
- **Stop Word Filtering** - Clean results, no noise from common words
- **Document Type Badges** - Visual identification of law sources (DPA, IRR, Issuances)
- **Smart Pagination** - Navigate thousands of results efficiently
- **Redis Caching** - Sub-100ms response times
- **Production-Ready** - Docker deployment, full API documentation, comprehensive testing
- **Dark Mode Support** - Beautiful responsive UI with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

```bash
# Clone and install
git clone https://github.com/tildemark/silip
cd silip
npm install

# Start infrastructure
docker-compose up -d

# Setup database
npx prisma generate
npx prisma db push
npm run prisma:seed

# Load sample data
npm run ingest:sample

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Documentation

- **[Complete Documentation](DOCUMENTATION.md)** - Full setup, deployment, API reference
- **[Setup Guide](DOCUMENTATION.md#setup-guide)** - Detailed environment setup
- **[Deployment Guide](DOCUMENTATION.md#deployment)** - Vercel, Docker, OCI/Portainer
- **[API Documentation](DOCUMENTATION.md#api-documentation)** - REST endpoint reference
- **[Ingestion Guide](DOCUMENTATION.md#ingestion-guide)** - Adding custom documents
- **[Changelog](CHANGELOG.md)** - Version history and release notes

## 🏗️ Tech Stack

- **Frontend:** Next.js 16.1.6, TypeScript, TailwindCSS, Shadcn/UI
- **Backend:** Node.js, Express (via Next.js API routes), Prisma ORM
- **Search:** BM25 ranking (wink-bm25-text-search), pgvector for embeddings
- **Database:** PostgreSQL 16, pgvector for embeddings
- **Cache:** Redis 7
- **AI/ML:** Google Gemini 1.5 Flash
- **Deployment:** Docker, Docker Compose, Vercel-ready

## 📦 What's Included

- ✅ 475 legal document sections (DPA 2012, IRR, NPC Issuances)
- ✅ Full-text search with relevance ranking
- ✅ 35 privacy-related tags
- ✅ Automatic section highlighting
- ✅ API documentation with Swagger UI
- ✅ Docker infrastructure (PostgreSQL, Redis)
- ✅ Bootstrap scripts for data ingestion
- ✅ Production deployment configurations

## 🔍 How Search Works

1. **Query Expansion** - Abbreviations automatically expand (e.g., "dpo" → "data protection officer")
2. **Keyword Matching** - OR logic searches for any matching term
3. **Vector Search** - Cosine similarity on 768-dim embeddings
4. **Advanced Ranking** - 7-tier intelligent scoring:
   - **Tier 1:** Strong title relevance (3+ matching terms in title)
   - **Tier 2:** Exact phrase matches in title
   - **Tier 3:** Exact phrase matches in content
   - **Tier 4:** Primary sources (DPA/IRR) rank above derivative documents when both have exact matches
   - **Tier 5:** Primary source prioritization for non-exact matches
   - **Tier 6:** Section number sorting (earlier sections first within same document)
   - **Tier 7:** Term frequency, keyword density, and other relevance signals
5. **Stop Word Filtering** - Common words filtered for cleaner results
6. **Caching** - Results cached in Redis for instant retrieval
7. **AI Re-ranking** - Complex queries get Gemini-powered semantic analysis

## 🎨 Search Examples

Try these searches at [http://localhost:3000](http://localhost:3000):

- `"data protection officer"` - Exact phrase matching
- `"dpo"` - Abbreviation expansion (finds "data protection officer")
- `"consent"` - Simple keyword search
- `"How do I register as the DPO?"` - Natural language (triggers AI re-ranking)
- `"CCTV"` - Technical terms
- Filter by: DPA, IRR, Advisories, Circulars, Decisions, Orders, Resolutions

## 📊 API Endpoints

### Search v2 (Legal Mode - Recommended)
```bash
GET /api/search/v2?q=query&filter=ALL&page=1&pageSize=20
```
Intelligent ranking with primary source prioritization (DPA/IRR over advisories).

### Search BM25 (Relevance Mode)
```bash
GET /api/search/bm25?q=query&filter=ALL&page=1&pageSize=20
```
Pure BM25 relevance ranking based on term frequency and document length.

### Health Check
```bash
GET /api/health
```

### API Documentation
```bash
GET /api-docs  # Interactive Swagger UI
GET /api/swagger  # OpenAPI JSON spec
```

See [API Documentation](DOCUMENTATION.md#api-documentation) for full details.

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel deploy --prod
```
Requires: Neon/Supabase (PostgreSQL), Upstash (Redis), Gemini API key

### Docker / VPS
```bash
docker-compose up -d --build
```

### Portainer
See [Portainer Deployment Guide](DOCUMENTATION.md#portainer-deployment)

## 📝 Available Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Run production server

# Data Management
npm run bootstrap        # Ingest all documents
npm run ingest:dpa       # Ingest DPA sections
npm run ingest:irr       # Ingest IRR sections

# Database
npx prisma db push       # Deploy schema
npx prisma studio       # Visual DB editor
npm run prisma:seed      # Seed tags

# Testing
npm run search:test      # Test search functionality
npm run health           # Check API health
```

## 🐛 Troubleshooting

Common issues and solutions are documented in [Troubleshooting](DOCUMENTATION.md#troubleshooting).

**Quick fixes:**
```bash
# Database connection issues
docker-compose logs silip-db

# Clear cache
redis-cli FLUSHDB

# Reset everything
npm run reset:database
```

## 🔐 Security & Privacy

- All data processed locally (no external API calls except Gemini for AI features)
- PostgreSQL with proper authentication
- Redis connection pooling
- No personal data stored or transmitted
- Respects Philippine Data Privacy Act

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- [National Privacy Commission](https://privacy.gov.ph) - Making Philippine privacy laws accessible
- [Shadcn/UI](https://ui.shadcn.com) - Beautiful component library
- [Next.js](https://nextjs.org) - Amazing React framework

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/tildemark/silip/issues)
- **Discussions:** [GitHub Discussions](https://github.com/tildemark/silip/discussions)
- **Docs:** [Complete Documentation](DOCUMENTATION.md)

---

## 📈 Project Status

- ✅ v2.1.0 - BM25 Search & Ranking Improvements (Current)
- ✅ v2.0.2 - Search Recall Fix & UI Updates
- ✅ v2.0.1 - Swagger UI CORS fix
- ✅ v2.0.0 - Semantic Search & AI Re-ranking
- ✅ v1.0.1 - Docker & Deployment fixes
- ✅ v1.0.0 - Initial release with full-text search

See [CHANGELOG](CHANGELOG.md) for detailed version history.

---

**Made with ❤️ for Philippine privacy advocacy**
