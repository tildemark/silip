# SILIP OCI Deployment Guide

## Prerequisites

- OCI Always Free instance with Docker and Portainer installed
- nginx-manager npm running in external network (`net-external`)
- Domain `silip.sanchez.ph` pointing to your OCI instance
- SSL certificate (Let's Encrypt) set up for `silip.sanchez.ph`

## Deployment Steps

### 1. Prepare Environment File

SSH into your OCI instance and create the production environment file:

```bash
cd /path/to/silip
cp .env.production.example .env.production
nano .env.production
```

Update with your secure database password:
```
DB_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://silip:your_secure_password_here@silip-db:5432/silip_db
```

### 2. Deploy via Portainer

1. Open Portainer at `https://your-oci-instance:9000`
2. Go to **Stacks** → **Add stack**
3. Choose **Upload** and select `docker-compose.yml`
4. Set environment variables or use `.env.production`
5. Select network: `net-external`
6. Click **Deploy**

**Alternative: Deploy via CLI**

```bash
# Navigate to project directory
cd /path/to/silip

# Create the external network if it doesn't exist
docker network create net-external || true

# Pull latest changes
git pull origin main

# Build and start services
docker-compose up -d --build
```

### 3. Database Initialization

After containers start, run the bootstrap script:

```bash
docker-compose exec silip-app npm run bootstrap
```

This will:
- Create database tables (Prisma migrations)
- Seed 35 privacy concept tags
- Ingest all 7 document types (475 sections total)

### 4. Configure nginx-manager npm

In **npm (nginx-manager)**:

1. Create a new **Proxy Host**:
   - Domain: `silip.sanchez.ph`
   - Forward to: `silip-app:3000` (or use the Docker network resolution)
   - Enable SSL with Let's Encrypt certificate
   - Enable HTTP/2 Support
   - Add Security Headers

2. Advanced tab:
```nginx
location /api/ {
    proxy_cache_bypass 1;
    proxy_no_cache 1;
}

location /api-docs {
    proxy_cache_bypass 1;
    proxy_no_cache 1;
}
```

### 5. Verify Deployment

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f silip-app

# Test API
curl https://silip.sanchez.ph/api/health

# Verify API docs
curl https://silip.sanchez.ph/api-docs
```

### 6. Data Backup

PostgreSQL data is stored in named volume `silip-postgres-data`:

```bash
# Backup database
docker-compose exec silip-db pg_dump -U silip silip_db > backup.sql

# Restore database
docker-compose exec -T silip-db psql -U silip silip_db < backup.sql
```

## Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f silip-app
docker-compose logs -f silip-db
docker-compose logs -f silip-redis
```

### Performance Monitoring

- **CPU/Memory**: Monitor via Portainer dashboard
- **Database**: Connect with `psql`:
  ```bash
  docker-compose exec silip-db psql -U silip silip_db
  ```
- **Redis**: Connect with `redis-cli`:
  ```bash
  docker-compose exec silip-redis redis-cli
  ```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Full rebuild
docker-compose down -v
docker-compose up -d --build
```

### Database connection errors
```bash
# Verify database is healthy
docker-compose ps

# Check database logs
docker-compose logs silip-db

# Manually verify connection
docker-compose exec silip-db psql -U silip silip_db -c "SELECT 1"
```

### Bootstrap script fails
```bash
# Run with verbose logging
docker-compose exec silip-app FORCE_REINGEST=true npm run bootstrap

# Check database exists
docker-compose exec silip-db psql -U silip -l
```

## Updates & Deployments

### Pull latest code and redeploy
```bash
git pull origin main
docker-compose up -d --build
```

### Force re-ingest all documents
```bash
FORCE_REINGEST=true docker-compose exec silip-app npm run bootstrap
```

## Network Architecture

```
Internet → nginx-manager npm (net-external)
         ↓
         silip-app (bridges net-external & silip-internal)
         ↓
    ┌────┴────┬──────────┐
    ↓         ↓          ↓
 silip-db  silip-redis  (silip-internal)
```

The app is exposed through the external `net-external` network, while databases communicate internally via `silip-internal` bridge network.

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USER` | silip | PostgreSQL username |
| `DB_PASSWORD` | silip_password | PostgreSQL password (CHANGE THIS!) |
| `DB_NAME` | silip_db | Database name |
| `NODE_ENV` | production | Node environment |
| `NEXT_PUBLIC_API_URL` | https://silip.sanchez.ph/api | API endpoint |
| `NEXT_PUBLIC_BASE_URL` | https://silip.sanchez.ph | Base URL |
| `REDIS_URL` | redis://silip-redis:6379 | Redis connection |

## Support

For issues, check:
1. Service logs: `docker-compose logs`
2. Portainer dashboard for container health
3. nginx-manager pm logs for proxy issues
4. Application API docs: `https://silip.sanchez.ph/api-docs`
