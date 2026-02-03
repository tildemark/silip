#!/bin/sh
set -e

echo "🚀 SILIP Docker Startup"
echo "=================================="

# Quick database readiness check (max 30 seconds)
echo "⏳ Waiting for PostgreSQL..."
for i in $(seq 1 15); do
  if npx prisma db execute --stdin < /dev/null 2>/dev/null; then
    echo "✅ Database is ready"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "⚠️  Database not ready, starting app anyway..."
    break
  fi
  sleep 2
done

# Run database initialization in background (non-blocking)
(
  echo "📊 Initializing database in background..."
  npx prisma db push --skip-generate 2>/dev/null || echo "⚠️  Schema may already exist"
  npx tsx scripts/seed-tags.ts 2>/dev/null || echo "⚠️  Tags may already be seeded"
  echo "✅ Background initialization complete"
) &

# Start Next.js immediately (don't wait for background tasks)
echo "🚀 Starting Next.js application..."
exec npm run start
