# Schema Update: Ingestion Tracking

## What Changed

Added `IngestionLog` model to track all data ingestion operations with:
- Source information (name, URL, document type)
- Status tracking (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- Section counts and error messages
- Timestamps (started, completed)

## Update Instructions

### Step 1: Update Schema

The schema has already been updated in `prisma/schema.prisma`.

### Step 2: Apply Schema Changes

```powershell
# Generate new Prisma Client with the updated schema
npx prisma generate

# Push the schema changes to your database
npx prisma db push
```

### Step 3: Verify

```powershell
# Check the new table was created
npx prisma studio
```

You should see the new `IngestionLog` table in Prisma Studio.

### Step 4: Test

```powershell
# Run the sample ingestion (now with logging)
npm run ingest:sample

# View the results
# Open http://localhost:3000/resources
```

## New Features Available

1. **Ingestion Tracking**: All ingestion scripts now create logs
2. **Resources Page**: View database statistics and history at `/resources`
3. **Real DPA Scraper**: Run `npm run ingest:dpa` to scrape from privacy.gov.ph
4. **Status Monitoring**: See which ingestions succeeded or failed

## Ingestion Log Fields

```typescript
{
  id: string              // Unique ID
  source: string          // "DPA 2012", "IRR 2016", etc.
  sourceUrl: string?      // Original URL
  docType: DocType        // DPA, IRR, or ISSUANCE
  status: IngestionStatus // PENDING, IN_PROGRESS, COMPLETED, FAILED
  sectionsCount: number   // How many sections were added
  errorMessage: string?   // Error details if failed
  metadata: Json?         // Custom metadata
  startedAt: DateTime     // When ingestion began
  completedAt: DateTime?  // When ingestion finished
}
```

## Next Steps

1. Run `npx prisma db push` to update your database
2. Run `npm run ingest:sample` to test the new logging
3. Visit http://localhost:3000/resources to see the new page
4. Try `npm run ingest:dpa` to scrape real data (may need HTML selector adjustments)
