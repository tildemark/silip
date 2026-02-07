# Remaining Ingestion Scripts to Update

The following scripts need to be updated to use the new embedding utilities:

1. **ingest-dpa.ts** - Update to use `createSectionWithEmbedding`
2. **ingest-irr-pdf.ts** - Update to use `createSectionWithEmbedding`  
3. **ingest-orders.ts** - Update to use `createSectionWithEmbedding`
4. **ingest-resolutions.ts** - Update to use `createSectionWithEmbedding`

## Pattern to Apply

For each script:

1. **Update imports**:
```typescript
import { createIngestionLog, completeIngestionLog, cleanText, createSectionWithEmbedding } from './ingestion-utils'
```

2. **Load tags once** (after creating ingestion log):
```typescript
// Load tags once for all sections (optimization)
console.log('\n📑 Loading tags for auto-tagging...')
const allTags = await prisma.tag.findMany()
console.log(`✓ Loaded ${allTags.length} tags`)
```

3. **Replace section creation**:
```typescript
// OLD:
const created = await prisma.section.create({ data })
await autoTagSection(created.id, created.content, created.title)

// NEW:
await createSectionWithEmbedding({
  documentId: doc.id,
  sectionNum: section.sectionNum,
  title: section.title,
  content: section.content,
  allTags,
})
```

## Status

- [x] ingest-advisories.ts
- [x] ingest-circulars.ts
- [x] ingest-decisions.ts
- [ ] ingest-dpa.ts
- [ ] ingest-irr-pdf.ts
- [ ] ingest-orders.ts
- [ ] ingest-resolutions.ts

**Note**: These remaining scripts follow the same pattern. The user can apply the changes manually using the pattern above, or we can update them programmatically.
