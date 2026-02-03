#!/bin/sh
set -e

echo "🚀 SILIP Docker Startup"
echo "=================================="

# Wait for database to be ready by attempting to push schema
echo "⏳ Waiting for PostgreSQL to be ready and deploying schema..."
for i in $(seq 1 30); do
  if npx prisma db push --skip-generate 2>&1; then
    echo "✅ Database is ready and schema deployed"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Database failed to start after 30 attempts"
    exit 1
  fi
  echo "   Attempt $i/30..."
  sleep 2
done

# Seed tags if not already seeded
echo "🏷️  Seeding tags..."
npx tsx scripts/seed-tags.ts || echo "⚠️  Tag seeding may have already run, continuing..."

echo "✅ Database initialization complete"
echo "🚀 Starting Next.js application..."
exec npm run start
