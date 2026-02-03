# v2.0 Endpoints - Quick Start & Testing Guide

## Endpoint Reference

### 1. Hybrid Search (GET /api/search/v2)
**Purpose:** Search with keyword + vector search combined, with AI re-ranking

**Query Parameters:**
- `q` (required): Search query string
- `filter` (optional): Document type - `ALL`, `DPA`, `IRR`, `ISSUANCE`, `CIRCULAR`, `ADVISORY`, `ORDER`, `DECISION`, `RESOLUTION`
- `limit` (optional): Results to return (default 20, max 100)

**Example Requests:**
```bash
# Basic search
curl "http://localhost:3000/api/search/v2?q=data+privacy"

# Semantic drift prevention test
curl "http://localhost:3000/api/search/v2?q=CCTV&filter=DPA"

# Multi-word query (triggers re-ranking)
curl "http://localhost:3000/api/search/v2?q=requirements+for+data+breach+notification"

# With filter and limit
curl "http://localhost:3000/api/search/v2?q=consent&filter=IRR&limit=10"
```

**Response:**
```json
{
  "results": [
    {
      "id": "section-id",
      "documentId": "doc-id",
      "documentType": "DPA",
      "documentTitle": "Data Privacy Act of 2012",
      "sectionNum": "Section 13",
      "sectionTitle": "Sensitive Personal Information",
      "snippet": "...",
      "highlightedContent": "...",
      "tags": [],
      "score": 8
    }
  ],
  "count": 5,
  "query": "data privacy",
  "filter": "ALL",
  "reranked": true,
  "message": "Results re-ranked using AI"
}
```

---

### 2. Legal Consultant (POST /api/consult)
**Purpose:** Get AI-powered legal advice with citations

**Request Body:**
```json
{
  "query": "What are the requirements for data breach notification?"
}
```

**Example Requests:**
```bash
# Basic consultation
curl -X POST http://localhost:3000/api/consult \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the requirements for data breach notification?"}'

# Longer question
curl -X POST http://localhost:3000/api/consult \
  -H "Content-Type: application/json" \
  -d '{"query": "Can a company use my personal data for marketing without my consent?"}'

# Specific legal term
curl -X POST http://localhost:3000/api/consult \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the definition of sensitive personal information under the DPA?"}'
```

**Response:**
```json
{
  "answer": "According to [Source 1], data breach notifications must be submitted within...[Source 2] specifies...",
  "sources": [
    {
      "id": "section-id-1",
      "documentId": "doc-id",
      "documentType": "DPA",
      "documentTitle": "Data Privacy Act of 2012",
      "sectionNum": "Section 21",
      "sectionTitle": "Reporting of Data Breaches",
      "snippet": "...",
      "citationNum": 1
    },
    {
      "id": "section-id-2",
      "documentId": "doc-id",
      "documentType": "IRR",
      "documentTitle": "Implementing Rules and Regulations",
      "sectionNum": "Section 45",
      "sectionTitle": "Notification Procedures",
      "snippet": "...",
      "citationNum": 2
    }
  ],
  "query": "What are the requirements for data breach notification?",
  "confidence": "high",
  "sourceCount": 2,
  "message": "Response generated with 2 cited source(s)"
}
```

---

## Testing Scenarios

### Scenario 1: Semantic Drift Prevention
**Goal:** Verify CCTV query doesn't return "Compliance Monitoring" matches

```bash
curl "http://localhost:3000/api/search/v2?q=CCTV"
```

**Expected Results:**
- ✅ Sections about surveillance, video cameras, monitoring equipment
- ❌ NOT sections about compliance monitoring unless directly related to surveillance

**Why it works:**
- Re-ranking triggers (keyword "CCTV")
- Gemini scores sections where CCTV is mentioned directly (8-10)
- Scores sections about compliance monitoring lower (3-5)
- Filters out scores < 6

---

### Scenario 2: Simple vs Complex Query
**Goal:** Verify re-ranking only runs when beneficial

**Simple query (no re-ranking):**
```bash
curl "http://localhost:3000/api/search/v2?q=consent"
```
Response: `"reranked": false` (simple word, keyword results sufficient)

**Complex query (triggers re-ranking):**
```bash
curl "http://localhost:3000/api/search/v2?q=requirements+for+consent+to+process+personal+data"
```
Response: `"reranked": true` (3+ words, activates AI)

---

### Scenario 3: Citation Accuracy
**Goal:** Verify consultant only returns cited sources

```bash
curl -X POST http://localhost:3000/api/consult \
  -H "Content-Type: application/json" \
  -d '{"query": "What definitions are provided for personal data?"}'
```

**Verification:**
- Count citation numbers in answer: `[Source 1]`, `[Source 2]`, etc.
- Match against sources array length
- Verify no uncited sources in response

---

### Scenario 4: Filter Functionality
**Goal:** Verify document type filtering works

```bash
# Get only DPA results
curl "http://localhost:3000/api/search/v2?q=consent&filter=DPA"

# Get only IRR results
curl "http://localhost:3000/api/search/v2?q=consent&filter=IRR"

# Get only Circulars
curl "http://localhost:3000/api/search/v2?q=privacy&filter=CIRCULAR"
```

**Expected:**
- Each response contains only sections from specified document type
- `filter` in response matches request

---

### Scenario 5: Error Handling
**Goal:** Verify graceful degradation

**Missing query parameter:**
```bash
curl "http://localhost:3000/api/search/v2"
```
Response: `400 Bad Request - Search query is required`

**Empty query:**
```bash
curl "http://localhost:3000/api/search/v2?q="
```
Response: `400 Bad Request - Search query is required`

**Missing GEMINI_API_KEY (if disabled):**
- Vector search gracefully disabled
- Keyword search still works
- Response: `"reranked": false`

---

## Pre-Deployment Checklist

### Environment
- [ ] GEMINI_API_KEY set in .env
- [ ] DATABASE_URL configured
- [ ] REDIS_URL configured (for caching)

### Database
- [ ] Run: `npx prisma migrate dev --name add_vector_support`
- [ ] Run: `npm run search:reindex`
- [ ] Verify: `SELECT COUNT(*) FROM "Section" WHERE embedding IS NOT NULL = 474`

### Testing
- [ ] GET /api/search/v2?q=test returns results
- [ ] POST /api/consult with valid query returns answer + sources
- [ ] Semantic drift scenario (CCTV) prevents false matches
- [ ] Filter parameter limits results by document type
- [ ] Error cases return proper 400/500 responses

### Deployment
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] All routes detected in build output
- [ ] v2.0 endpoints ready at /api/search/v2 and /api/consult
- [ ] Swagger docs updated to v2.0.0

---

## Development Server

Start the dev server:
```bash
npm run dev
```

Access endpoints:
- Search v2: http://localhost:3000/api/search/v2?q=test
- Consult: POST to http://localhost:3000/api/consult
- Swagger: http://localhost:3000/api-docs

---

## Production Deployment (OCI)

1. **Merge to main:**
   ```bash
   git checkout main
   git pull origin main
   git merge feature/v2.0-semantic-search
   git tag v2.0.0
   git push origin main --tags
   ```

2. **Via Portainer (Docker):**
   - Pull latest code
   - Ensure .env includes GEMINI_API_KEY
   - Re-deploy container
   - Wait for health check to pass

3. **Database Migration:**
   ```bash
   # SSH into container
   docker exec -it silip-app npx prisma migrate deploy
   
   # Run re-indexing
   npm run search:reindex
   ```

4. **Verify:**
   ```bash
   curl https://api.silip.ph/api/search/v2?q=consent
   curl -X POST https://api.silip.ph/api/consult \
     -H "Content-Type: application/json" \
     -d '{"query": "What is data privacy?"}'
   ```

---

## Troubleshooting

### Issue: `Module not found: @google/generative-ai`
**Solution:** `npm install @google/generative-ai`

### Issue: `Build error: embedding does not exist`
**Solution:** Run `npm run prisma:generate` after schema changes

### Issue: Vector search not working
**Check:**
1. Is pgvector extension created? `CREATE EXTENSION IF NOT EXISTS vector;`
2. Are embeddings populated? `SELECT COUNT(*) FROM "Section" WHERE embedding IS NOT NULL;`
3. Is GEMINI_API_KEY set?

### Issue: Re-ranking returns empty results
**Expected behavior:** If score filtering is too strict, falls back to keyword results

### Issue: Consultant response has no citations
**Debug:** Check response for `[Source N]` pattern matching

---

## Performance Notes

- **Vector search:** ~50ms per query (10-20 results typical)
- **Re-ranking:** ~500-2000ms (uses Gemini API)
- **Total time:** 500-2500ms depending on re-ranking
- **Cache:** Results cached for 24 hours (existing searches)

---

## API Versioning

- **v1.0:** GET /api/search (keyword only)
- **v2.0:** GET /api/search/v2 (hybrid + re-ranking)
- **v2.0:** POST /api/consult (legal consultant)

Both versions coexist. Existing clients can continue using v1.0.

---
