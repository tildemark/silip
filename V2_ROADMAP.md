# SILIP v2.0.0 - Semantic Search & AI Consultant

## Overview

Upgrade from keyword-only search to AI-powered semantic search with re-ranking and an intelligent legal consultant.

**Key Problem Solved:** Semantic Drift
- Before: Searching "CCTV" returned "Compliance Monitoring" (same word "monitor")
- After: Smart re-ranking penalizes false positives, returns only truly relevant results

## Architecture

```
User Query
    ↓
[Hybrid Search]
  ├─ Keyword Match (Prisma contains)
  ├─ Vector Match (pgvector cosine similarity)
  └─ Merge → Top 20 candidates
    ↓
[Re-Ranking Filter]
  ├─ Check if query is specific (>3 words, has :, etc.)
  ├─ If yes → Send to Gemini for relevance scoring
  ├─ Filter score < 6 (semantic drift detection)
  └─ Return re-ordered Top-N
    ↓
[Endpoints]
  ├─ GET /api/search/v2 - Hybrid search with re-ranking
  └─ POST /api/consult - Legal consultant with citations
```

## Implementation Checklist

### Phase 1: Database & Schema
- [x] Enable pgvector extension in Prisma
- [x] Add `embedding` field to Section model (768-dim from Gemini)
- [ ] Run `prisma migrate dev --name add_vector_support`
- [ ] Verify migration succeeds in test environment

### Phase 2: AI Utilities
- [x] Create `lib/ai.ts` with:
  - [x] `generateEmbedding()` - Gemini text-embedding-004
  - [x] `rerankResults()` - Semantic drift mitigation
  - [x] `getConsultantResponse()` - Legal consultant
  - [x] `cosineSimilarity()` - Vector math helper
- [ ] Add `GEMINI_API_KEY` to `.env` and `.env.production`
- [ ] Test embeddings locally

### Phase 3: Ingestion & Re-indexing
- [x] Create `scripts/reindex.ts` to populate embeddings
- [x] Add `npm run search:reindex` script
- [ ] Run reindex on all existing sections (474 sections)
- [ ] Verify embeddings populate successfully

### Phase 4: Endpoints
- [ ] Build `GET /api/search/v2` (hybrid + re-ranking)
- [ ] Build `POST /api/consult` (consultant endpoint)
- [ ] Add comprehensive JSDoc and Swagger docs
- [ ] Create test cases for both endpoints

### Phase 5: Testing & Optimization
- [ ] Unit tests for AI utilities (embedding, re-ranking)
- [ ] Integration tests for endpoints
- [ ] Semantic drift test cases (CCTV vs Compliance, etc.)
- [ ] Performance testing (query latency, API costs)
- [ ] E2E testing in staging environment

### Phase 6: Documentation & Release
- [ ] Update README with v2.0 features
- [ ] Create API documentation for `/search/v2` and `/consult`
- [ ] Add cost tracking guide (Gemini embeddings + API calls)
- [ ] Update CHANGELOG
- [ ] Merge to main and tag v2.0.0

## Environment Variables

```bash
# Required for v2.0
GEMINI_API_KEY=sk-...  # From Google AI Studio https://aistudio.google.com/app/apikey
```

## Cost Considerations

**Gemini Pricing (as of Feb 2026):**
- `text-embedding-004`: ~$0.025 per 1M tokens
- `gemini-1.5-flash`: $0.075/1M input, $0.30/1M output

**Estimated Costs:**
- Re-index 474 sections: ~$0.01 (one-time)
- Per search (with re-ranking): ~$0.001-0.005
- Per consult: ~$0.005-0.01

**Optimization:**
- Cache embeddings (already stored)
- Only re-rank if query is specific (avoid wasteful API calls)
- Rate limit consult endpoint to prevent abuse

## Timeline

- **Week 1:** Database migrations + AI utilities + local testing
- **Week 2:** Ingestion upgrades + re-indexing production data
- **Week 3:** Build endpoints + comprehensive testing
- **Week 4:** Performance tuning + documentation + release

## Breaking Changes

None! v2.0 adds new endpoints without modifying v1.0 `/api/search`.

**Migration Path:**
1. Deploy v2.0 alongside v1.0
2. Gradual traffic shift to `/search/v2`
3. Deprecate `/search` (v1.0) after 30 days

## Rollback Plan

If critical issues arise:
1. Keep both endpoint versions live
2. Use feature flags to route traffic
3. Revert to v1.0 search endpoint with zero data loss
