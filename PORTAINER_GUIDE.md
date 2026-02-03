# Portainer Deployment Guide for SILIP

## Quick Start - Fast Deployment (Skip Bootstrap)

### Option 1: Via Portainer UI (Easiest)

1. **Open Portainer** → Go to **Stacks**
2. **Click "Add Stack"** → Choose **Upload**
3. **Upload** `docker-compose.yml` from the repo
4. **Scroll down** to **Environment variables**
5. **Add this variable:**
   - **Name:** `SKIP_BOOTSTRAP`
   - **Value:** `true`
6. **Click Deploy**

Your app will be up in **30 seconds** without waiting for ingestion!

### Option 2: Via .env File (Recommended)

1. **On your OCI instance**, create `.env.production`:

```bash
# Database
DB_USER=silip
DB_PASSWORD=your_secure_password_here
DB_NAME=silip_db

# Skip bootstrap on startup (true = skip, false/omit = run bootstrap)
SKIP_BOOTSTRAP=true

# Next.js
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://silip.sanchez.ph/api
NEXT_PUBLIC_BASE_URL=https://silip.sanchez.ph
```

2. **In Portainer**, upload stack with **Environment file** option:
   - Upload `.env.production`
   - Or paste contents in the environment field

3. **Click Deploy**

### Option 3: Via Docker CLI

```bash
# SSH to your OCI instance
cd /path/to/silip

# Create .env file
echo "SKIP_BOOTSTRAP=true" > .env.production

# Deploy
docker-compose --env-file .env.production up -d
```

## After Deployment

### Check App Status

```bash
# In Portainer → Containers → silip-app
# Should show "Running" within 30 seconds
```

### Later: Ingest Documents

When ready to ingest data:

```bash
# Option 1: Via Docker CLI
docker-compose exec silip-app npm run bootstrap

# Option 2: Via Portainer
# Console → silip-app container → Exec
# Run: npm run bootstrap
```

### Quick Seed (No Ingestion)

If you want just tags without documents:

```bash
docker-compose exec silip-app npm run bootstrap -- --skip-ingest
```

## Portainer Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `SKIP_BOOTSTRAP` | `false` | Skip bootstrap (database + ingestion) on startup |
| `DB_USER` | `silip` | PostgreSQL username |
| `DB_PASSWORD` | `silip_password` | PostgreSQL password ⚠️ Change this! |
| `DB_NAME` | `silip_db` | Database name |
| `NODE_ENV` | `production` | Node environment |
| `NEXT_PUBLIC_API_URL` | - | Frontend API endpoint |
| `NEXT_PUBLIC_BASE_URL` | - | Frontend base URL |
| `FORCE_REINGEST` | - | Force re-ingest (set when running bootstrap) |

## Step-by-Step Portainer UI Deployment

### 1. Prepare Files

```bash
# On your local machine
git clone https://github.com/tildemark/silip.git
cd silip
```

### 2. Open Portainer

- Navigate to: `https://your-oci-ip:9000`
- Login with your credentials

### 3. Deploy Stack

**Left Menu** → **Stacks** → **Add Stack**

Choose: **Upload** (or paste compose file)

```yaml
# Paste docker-compose.yml content
# Or upload the file
```

### 4. Set Environment Variables

**Before clicking "Deploy":**

- **Name:** `SKIP_BOOTSTRAP`
- **Value:** `true`
- **Click "Add variable"**

Or use **Environment file** tab:

```
SKIP_BOOTSTRAP=true
DB_USER=silip
DB_PASSWORD=your_secure_db_password
DB_NAME=silip_db
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://silip.sanchez.ph/api
NEXT_PUBLIC_BASE_URL=https://silip.sanchez.ph
```

### 5. Deploy

**Click "Deploy"** ✅

**Wait 30 seconds** → App is running!

### 6. Verify

**Containers** tab:

```
silip-db:      Running ✅
silip-redis:   Running ✅
silip-app:     Running ✅
```

### 7. Check nginx-manager npm

In **npm (nginx-manager)**:

1. **New Proxy Host:**
   - Domain: `silip.sanchez.ph`
   - Forward to: `silip-app:3000`
   - Enable SSL
   - Enable HTTP/2

2. **Custom Headers:**
   - Add SSL/security headers

3. **Advanced:**
   ```nginx
   location /api {
       proxy_cache_bypass 1;
       proxy_no_cache 1;
   }
   ```

## Bootstrap Later

### Via Portainer Console

1. **Containers** → **silip-app** → **Console**
2. **Run command:**
   ```bash
   npm run bootstrap
   ```
3. **Monitor logs** (takes 5 minutes)

### Via SSH

```bash
docker-compose exec silip-app npm run bootstrap

# Watch progress
docker-compose logs -f silip-app
```

## Rollback / Changes

To redeploy with different options:

1. **In Portainer** → **Stacks** → Select **silip** stack
2. **Click "Editor"**
3. **Update environment variables**
4. **Click "Update"**

Container will restart with new settings.

## Troubleshooting

### App won't start

Check logs:
- **Portainer** → **Containers** → **silip-app** → **Logs**

Common issues:
- Database not connected: Check `silip-db` is running
- Password mismatch: Verify `DB_PASSWORD` in env vars

### Bootstrap stuck

In Portainer console:
```bash
# Check status
docker-compose exec silip-app ps aux | grep node

# Kill and restart
docker-compose restart silip-app

# Try bootstrap again
npm run bootstrap
```

### Too slow to build

The Docker build can be slow on first run. Options:

1. **Use pre-built image** (if available in registry)
2. **Split deployment:**
   - Deploy infrastructure first (DB, Redis)
   - Build app separately
3. **Use development branch** while waiting

## Production Checklist

- [ ] `.env.production` created with secure passwords
- [ ] `SKIP_BOOTSTRAP=true` set for fast deployment
- [ ] `NEXT_PUBLIC_API_URL` points to your domain
- [ ] SSL certificate configured in nginx-manager npm
- [ ] Database backup configured
- [ ] Security headers added
- [ ] Bootstrap run after app is verified working

## Next Steps

After deployment:

```bash
# 1. Verify app is running
curl https://silip.sanchez.ph/

# 2. When ready, ingest documents
docker-compose exec silip-app npm run bootstrap

# 3. Check database stats
curl https://silip.sanchez.ph/api/resources

# 4. Test search
curl "https://silip.sanchez.ph/api/search?q=consent"
```

---

**Questions?**
- Check Portainer logs for container errors
- Check docker-compose logs locally: `docker-compose logs [service]`
- Review `/DEPLOYMENT.md` for more details
