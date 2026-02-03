# 📥 SILIP Ingestion Guide

## Available Ingestion Scripts

### 1. Sample Data (Quick Start)
```bash
npm run ingest:sample
```
- **What it does**: Loads 5 pre-written DPA 2012 sections
- **Use case**: Testing, development, quick setup
- **Time**: ~2 seconds
- **Sections**: 5

### 2. Real DPA Scraper
```bash
npm run ingest:dpa
```
- **What it does**: Scrapes actual DPA 2012 from privacy.gov.ph
- **Use case**: Production data, full DPA coverage
- **Time**: ~10-30 seconds (depending on network)
- **Sections**: Varies (typically 40-60 sections)
- **Note**: May need HTML selector adjustments based on website structure

## Creating New Ingestion Scripts

### Template Structure

```typescript
import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'
import { createIngestionLog, completeIngestionLog, autoTagSection } from './ingestion-utils'

const prisma = new PrismaClient()

async function ingestYourSource() {
  // 1. Create ingestion log
  const log = await createIngestionLog({
    source: 'Your Source Name',
    sourceUrl: 'https://example.com',
    docType: 'DPA', // or 'IRR' or 'ISSUANCE'
    metadata: {
      version: '1.0.0',
      custom: 'field'
    }
  })

  try {
    // 2. Create/update document
    const doc = await prisma.legalDocument.upsert({
      where: { alias: 'YOUR-ALIAS' },
      update: {},
      create: {
        type: 'DPA',
        title: 'Full Document Title',
        alias: 'YOUR-ALIAS',
        url: 'https://source-url.com'
      }
    })

    // 3. Scrape/parse sections
    const sections = await yourScrapingLogic()

    // 4. Insert sections
    let count = 0
    for (const section of sections) {
      const created = await prisma.section.upsert({
        where: { id: `${doc.id}-${section.num}` },
        update: { content: section.content },
        create: {
          id: `${doc.id}-${section.num}`,
          documentId: doc.id,
          sectionNum: section.num,
          title: section.title,
          content: section.content
        }
      })

      // 5. Auto-tag
      await autoTagSection(created.id, section.content, section.title)
      count++
    }

    // 6. Mark as completed
    await completeIngestionLog(log.id, count, 'COMPLETED')

    // 7. Invalidate cache
    await cacheService.invalidateSearchCache()

  } catch (error) {
    // Mark as failed
    await completeIngestionLog(
      log.id, 
      0, 
      'FAILED', 
      error.message
    )
    throw error
  }
}

// Run
ingestYourSource()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Ingestion Utilities

### Available Helper Functions

```typescript
// Create log entry
createIngestionLog(data: {
  source: string
  sourceUrl?: string
  docType: 'DPA' | 'IRR' | 'ISSUANCE'
  metadata?: any
})

// Mark log as complete/failed
completeIngestionLog(
  logId: string,
  sectionsCount: number,
  status: 'COMPLETED' | 'FAILED',
  errorMessage?: string
)

// Automatically tag a section
autoTagSection(
  sectionId: string,
  content: string,
  title: string
)

// Clean text content
cleanText(text: string)

// Parse HTML with Cheerio
parseHTMLContent(html: string)

// Invalidate search cache
invalidateCacheAfterIngestion()
```

## Common Ingestion Patterns

### 1. HTML Scraping (Cheerio)

```typescript
import * as cheerio from 'cheerio'

const response = await fetch(url)
const html = await response.text()
const $ = cheerio.load(html)

$('.section').each((_, el) => {
  const sectionNum = $(el).find('.number').text()
  const title = $(el).find('.title').text()
  const content = $(el).find('.content').text()
  
  sections.push({ sectionNum, title, content })
})
```

### 2. PDF Scraping (pdf-parse)

```typescript
import pdf from 'pdf-parse'
import fs from 'fs'

const dataBuffer = fs.readFileSync('document.pdf')
const pdfData = await pdf(dataBuffer)
const text = pdfData.text

// Parse text into sections...
```

### 3. API Fetching

```typescript
const response = await fetch('https://api.example.com/documents')
const data = await response.json()

for (const item of data.documents) {
  // Process each document...
}
```

## Monitoring Ingestion

### View Logs in Database
```bash
npx prisma studio
```
Navigate to `IngestionLog` table.

### View in UI
Visit: http://localhost:3000/resources

Shows:
- ✅ Successful ingestions
- ❌ Failed ingestions with error messages
- ⏳ In-progress ingestions
- 📊 Statistics (documents, sections, tags)
- 📄 Recent documents

## Best Practices

1. **Always create ingestion logs** - helps with debugging and transparency
2. **Use try-catch blocks** - mark logs as failed on error
3. **Validate data** - check section counts, required fields
4. **Auto-tag sections** - improves search relevance
5. **Invalidate cache** - ensures fresh search results
6. **Add metadata** - version, source type, scraper info
7. **Limit content size** - avoid huge text blobs (10KB per section max)
8. **Test on small datasets first** - before running full scrapes

## Troubleshooting

### Ingestion Fails Silently
- Check `IngestionLog` table for error messages
- Look at terminal output during ingestion
- Verify database connection

### No Sections Found
- Website HTML structure changed - update selectors
- Check if website is accessible
- Verify parsing logic with console.log()

### Auto-tagging Not Working
- Ensure tags are seeded: `npm run prisma:seed`
- Check tag names match content keywords
- Review `autoTagSection()` logic in ingestion-utils.ts

### Cache Not Updating
- Verify Redis connection
- Check if `invalidateSearchCache()` is called
- Manually clear: `docker exec -it silip_redis redis-cli FLUSHDB`

## Example: Adding NPC Circular

```bash
# Create new script
# scripts/ingest-circular.ts

npm run ingest:circular
```

```typescript
// scripts/ingest-circular.ts
const log = await createIngestionLog({
  source: 'NPC Circular 16-01',
  sourceUrl: 'https://www.privacy.gov.ph/circular-16-01.pdf',
  docType: 'ISSUANCE',
  metadata: {
    circularNumber: '16-01',
    year: 2016,
    type: 'circular'
  }
})

// ... scrape PDF, parse sections, insert ...
```

Add to package.json:
```json
"scripts": {
  "ingest:circular": "tsx scripts/ingest-circular.ts"
}
```

## Resources

- [Cheerio Documentation](https://cheerio.js.org/)
- [pdf-parse on npm](https://www.npmjs.com/package/pdf-parse)
- [Prisma Docs](https://www.prisma.io/docs)
- [SILIP Resources Page](http://localhost:3000/resources)
