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

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit

# Install tsx for runtime bootstrap scripts
RUN npm install --no-save tsx

# Copy prisma
COPY prisma ./prisma

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

# Expose port
EXPOSE 3000

# Health check - simple check without making HTTP calls
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD test -d /app/.next && echo "ok" || exit 1

# Start the Next.js server
CMD ["npm", "run", "start"]
