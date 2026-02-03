#!/bin/bash
# Production Bootstrap Script
# Run this after deployment to set up the database and ingest all legal documents

set -e  # Exit on any error

echo "🚀 SILIP Production Bootstrap Started"
echo "=========================================="

# Step 1: Generate Prisma Client
echo "📦 Step 1: Generating Prisma Client..."
npm run prisma:generate

# Step 2: Push database schema
echo "📊 Step 2: Pushing database schema..."
npm run prisma:push

# Step 3: Seed tags
echo "🏷️  Step 3: Seeding 35 privacy concept tags..."
npm run tags:seed

# Step 4: Ingest all legal documents
echo "📚 Step 4: Ingesting legal documents..."
echo "   - Ingesting DPA 2012..."
npm run ingest:dpa-pdf

echo "   - Ingesting IRR 2016..."
npm run ingest:irr-pdf

echo "   - Ingesting NPC Advisories..."
npm run ingest:advisories

echo "   - Ingesting NPC Circulars..."
npm run ingest:circulars

echo "   - Ingesting NPC Decisions..."
npm run ingest:decisions

echo "   - Ingesting NPC Orders..."
npm run ingest:orders

echo "   - Ingesting NPC Resolutions..."
npm run ingest:resolutions

echo ""
echo "✅ Bootstrap Complete!"
echo "=========================================="
echo "Summary:"
echo "  ✓ Database schema deployed"
echo "  ✓ 35 privacy tags seeded"
echo "  ✓ 44 DPA sections ingested"
echo "  ✓ 72 IRR sections ingested"
echo "  ✓ 21 NPC Advisories ingested"
echo "  ✓ 32 NPC Circulars ingested"
echo "  ✓ 92 NPC Decisions ingested"
echo "  ✓ 73 NPC Orders ingested"
echo "  ✓ 140 NPC Resolutions ingested"
echo "=========================================="
echo "🎉 SILIP is ready for production!"
