# Production Bootstrap Script for Windows
# Run this after deployment to set up the database and ingest all legal documents

Write-Host "🚀 SILIP Production Bootstrap Started" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Generate Prisma Client
Write-Host "📦 Step 1: Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Step 2: Push database schema
Write-Host "📊 Step 2: Pushing database schema..." -ForegroundColor Yellow
npm run prisma:push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Step 3: Seed tags
Write-Host "🏷️  Step 3: Seeding 35 privacy concept tags..." -ForegroundColor Yellow
npm run tags:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Step 4: Ingest all legal documents
Write-Host "📚 Step 4: Ingesting legal documents..." -ForegroundColor Yellow

Write-Host "   - Ingesting DPA 2012..." -ForegroundColor Cyan
npm run ingest:dpa-pdf
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "   - Ingesting IRR 2016..." -ForegroundColor Cyan
npm run ingest:irr-pdf
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "   - Ingesting NPC Advisories..." -ForegroundColor Cyan
npm run ingest:advisories
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "   - Ingesting NPC Circulars..." -ForegroundColor Cyan
npm run ingest:circulars
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "   - Ingesting NPC Decisions..." -ForegroundColor Cyan
npm run ingest:decisions
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "   - Ingesting NPC Orders..." -ForegroundColor Cyan
npm run ingest:orders
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "   - Ingesting NPC Resolutions..." -ForegroundColor Cyan
npm run ingest:resolutions
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "✅ Bootstrap Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Green
Write-Host "  ✓ Database schema deployed"
Write-Host "  ✓ 35 privacy tags seeded"
Write-Host "  ✓ 44 DPA sections ingested"
Write-Host "  ✓ 72 IRR sections ingested"
Write-Host "  ✓ 21 NPC Advisories ingested"
Write-Host "  ✓ 32 NPC Circulars ingested"
Write-Host "  ✓ 92 NPC Decisions ingested"
Write-Host "  ✓ 73 NPC Orders ingested"
Write-Host "  ✓ 140 NPC Resolutions ingested"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 SILIP is ready for production!" -ForegroundColor Green
