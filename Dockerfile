FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and PostgreSQL client for database operations
RUN apk add --no-cache openssl postgresql-client

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit

# Install tsx for runtime bootstrap scripts
RUN npm install --no-save tsx

# Copy prisma
COPY prisma ./prisma

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy runtime scripts and shared libraries (for bootstrap/ingest)
COPY scripts ./scripts
COPY lib ./lib
COPY tsconfig.json ./

# Copy built application from builder
COPY --from=builder /app/.next ./.next
# Create public directory (Next.js may not generate if empty)
RUN mkdir -p ./public

# Create data directory for PDFs
RUN mkdir -p ./data

# Make startup script executable
RUN chmod +x ./scripts/docker-start.sh

# Expose port
EXPOSE 3000

# Health check - give app time to start
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the Next.js server with database initialization
CMD ["sh", "./scripts/docker-start.sh"]
