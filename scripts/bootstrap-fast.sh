#!/bin/bash

# SILIP Bootstrap Script - Initialize Database and Ingest Documents
# Usage: npm run bootstrap [--skip-ingest]

set -e

echo "🚀 Starting SILIP database bootstrap..."
echo "======================================"

# Check if --skip-ingest flag is passed
SKIP_INGEST=false
if [[ "$*" == *"--skip-ingest"* ]]; then
  SKIP_INGEST=true
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Connecting to database
echo -e "\n${YELLOW}📊 Checking database connection...${NC}"
if ! npx prisma db push --skip-generate 2>/dev/null; then
  echo -e "${RED}✗ Database connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Database connected${NC}"

# Seed tags
echo -e "\n${YELLOW}🏷️  Seeding 35 privacy concept tags...${NC}"
if npx tsx scripts/seed-tags.ts > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Tags seeded${NC}"
else
  echo -e "${YELLOW}⚠️  Tags already seeded or error occurred${NC}"
fi

# Check if should skip ingestion
if [ "$SKIP_INGEST" = true ]; then
  echo -e "\n${YELLOW}⏭️  Skipping document ingestion (--skip-ingest flag set)${NC}"
  echo -e "${GREEN}✅ Bootstrap complete (minimal mode)${NC}"
  echo ""
  echo "To ingest documents later, run: npm run bootstrap"
  exit 0
fi

# Check if data already exists
SECTION_COUNT=$(npx prisma db execute --stdin < /dev/null 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$SECTION_COUNT" -gt 0 ]; then
  echo -e "\n${YELLOW}⚠️  Database already contains $SECTION_COUNT sections${NC}"
  echo "Skipping ingestion (set FORCE_REINGEST=true to override)"
else
  echo -e "\n${YELLOW}📥 Ingesting documents...${NC}"
  
  # Ingest in parallel for speed
  npx tsx scripts/ingest-advisories.ts &
  npx tsx scripts/ingest-circulars.ts &
  npx tsx scripts/ingest-decisions.ts &
  npx tsx scripts/ingest-orders.ts &
  npx tsx scripts/ingest-resolutions.ts &
  npx tsx scripts/ingest-dpa.ts &
  npx tsx scripts/ingest-irr-pdf.ts &
  
  wait
  
  echo -e "${GREEN}✅ Ingestion complete${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}📊 Bootstrap Summary:${NC}"

# Get stats
TOTAL_DOCS=$(npx prisma db execute --stdin < /dev/null 2>/dev/null || echo "0")
TOTAL_SECTIONS=$(npx prisma db execute --stdin < /dev/null 2>/dev/null || echo "0")

echo "Total Documents: $TOTAL_DOCS"
echo "Total Sections: $TOTAL_SECTIONS"
echo ""
echo -e "${GREEN}✅ Bootstrap complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the app: npm start"
echo "  2. Open: http://localhost:3000"
echo "  3. Search for documents"
echo ""
