# Changelog

All notable changes to SILIP (Searchable Interface for Legal Information & Privacy) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
