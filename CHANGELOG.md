# Changelog

All notable changes to SILIP (Searchable Interface for Legal Information & Privacy) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.2] - 2026-02-04

### Fixed
- **Search Recall Issues**
  - Fixed ranking logic where generic sections outranked specific title matches (e.g., "Data Breach Notification")
  - Implemented Strong Title Relevance boost (3+ title term matches override other signals)
  - Restored missing scoring properties in hybrid search sorting
  - Fixed citation parsing mismatch in `/api/consult` causing empty responses

- **Build Errors**
  - Removed temporary debug scripts causing type errors during build

### Added
- **Decisions Category**
  - Added "Decisions" tab to search filters for NPC Decisions
  
- **Configuration**
  - Added `GEMINI_MODEL` environment variable support (defaults to `gemini-2.5-flash`)

## [2.0.1] - 2026-02-04

### Fixed
- **Swagger UI CORS error in production**
  - Fixed URL scheme mismatch causing "URL scheme must be 'http' or 'https' for CORS request" error
  - Updated `swagger-client.tsx` to use absolute URL with `NEXT_PUBLIC_API_URL` environment variable
  - Updated OpenAPI spec to dynamically set server URL from environment
  - Ensures correct HTTPS scheme in production environments
  - Ensures correct HTTPS scheme in production environments
  
## [2.0.0] - 2026-02-03

### Added
- **Semantic Search v2.0** - Hybrid keyword + vector search with advanced ranking
  - pgvector integration for 768-dimensional embeddings
  - Cosine similarity-based vector search
  - Multi-tier ranking system (exact phrase matches, document type priority, keyword frequency)
  - Stop word filtering for cleaner results
  - Combined keyword + vector scoring for optimal relevance

- **AI-powered consultant** (`/api/consult`)
  - Natural language query understanding with Gemini 1.5 Flash
  - Streaming responses with source citations
  - Context-aware answers grounded in actual legal documents
  - Automatic source section linking

- **AI re-ranking for complex queries**
  - Automatic detection of natural language queries
  - Gemini-powered semantic analysis and reordering
  - Improved relevance for conversational searches

- **Enhanced search capabilities**
  - New `/api/search/v2` endpoint with pagination
  - Page size configuration (default 20, max 100 results per page)
  - Total result count and pagination metadata
  - Backward compatible with original `/api/search` endpoint

- **Database migrations**
  - Proper Prisma migrations system
  - Vector extension support for pgvector
  - Embedding column for semantic search

- **Reindexing script** (`scripts/reindex.ts`)
  - Generate embeddings for existing sections
  - Batch processing with progress tracking
  - Handles large datasets efficiently

### Changed
- **Updated UI with semantic search**
  - Badge display for document types (DPA, IRR, Advisory, etc.)
  - Enhanced result cards with better typography
  - Loading skeletons for better UX
  - Pagination controls with page numbers

- **Improved search relevance**
  - Exact phrase matches (with quotes) prioritized highest
  - DPA/IRR documents ranked above issuances
  - Stop words filtered from search terms
  - Better handling of common legal terms

- **API documentation updates**
  - Added `/api/consult` endpoint documentation
  - Added `/api/search/v2` endpoint documentation
  - Updated OpenAPI spec to version 2.0.0
  - Enhanced example queries and responses

### Technical
- Added `@google/generative-ai` package for Gemini integration
- Upgraded database schema with vector support
- Added AI utility library (`lib/ai.ts`) for embeddings and consulting
- Enhanced search library with hybrid search capabilities
- Added comprehensive debug scripts in `.debug/` folder

## [1.0.1] - 2026-02-03

### Fixed
- **Docker build and deployment issues**
  - Fixed missing `swagger-ui-react` package installation
  - Added CSS import handling for Swagger UI in client components
  - Fixed dynamic route parameters for Next.js 16+ (params as Promise)
  
- **Prisma binary target compatibility**
  - Added `linux-musl-openssl-3.0.x` and `linux-musl-arm64-openssl-3.0.x` binary targets
  - Fixes Prisma client initialization errors in Alpine Linux containers
  - Enables support for both x86 and ARM64 deployments
  
- **Database initialization**
  - Automatic schema deployment on container startup
  - Background database initialization (non-blocking app startup)
  - Improved database readiness checking
  
- **504 Gateway Timeout issues**
  - Optimized Docker startup sequence for faster response times
  - App now responds within seconds instead of waiting for full initialization

### Improved
- **Health check endpoint** - Changed to actual HTTP health check with 60s grace period
- **Startup performance** - Reduced initial response time significantly

### Added
- Docker startup script (`scripts/docker-start.sh`) for database initialization
- OpenSSL and PostgreSQL client tools to Docker image

## [1.0.0] - 2026-02-03

### Added
- **Full-text search engine** with intelligent keyword expansion
  - Search across all Philippine data privacy laws and regulations
  - Support for 35+ legal concept tags with keyword variations
  - Advanced highlighting of search terms in results and detail pages
  - Filter by document type: DPA, IRR, Advisory, Circular, Order, Decision, Resolution
  
- **Comprehensive legal document database**
  - Data Privacy Act of 2012 (DPA) - 44 sections
  - Implementing Rules and Regulations 2016 (IRR) - 72 sections
  - 21 NPC Advisories
  - 32 NPC Circulars
  - 92 NPC Decisions
  - 73 NPC Orders
  - 140 NPC Resolutions
  
- **PDF document management**
  - Secure download API for all source documents
  - Path traversal protection
  - Direct links to original documents on NPC website
  
- **Auto-tagging system**
  - Intelligent content analysis and categorization
  - 35 predefined legal concept tags
  - Automatic tag suggestions based on content
  
- **Interactive API documentation**
  - Swagger UI at `/api-docs`
  - Complete OpenAPI 3.0 specification
  - Interactive endpoint testing
  
- **Search query persistence**
  - Highlighted search terms preserved across navigation
  - Query parameters maintain search context
  - Seamless user experience from results to detail pages
  
- **Redis caching**
  - Fast search performance
  - Automatic cache invalidation on data updates
  
- **Resources page**
  - Quick access to all ingested documents
  - Organized by document type
  - Direct links to NPC website

### Technical Stack
- Next.js 14 (App Router)
- TypeScript
- PostgreSQL with Prisma ORM
- Redis for caching
- TailwindCSS with shadcn/ui components
- PDF parsing with pdf-parse
- HTML parsing with cheerio

### Database Schema
- Legal documents with type/subtype classification
- Sections with full-text content
- Tag system with many-to-many relationships
- Ingestion logs for tracking data updates

[1.0.0]: https://github.com/tildemark/silip/releases/tag/v1.0.0
