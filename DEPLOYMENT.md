# LuxeHost Backend - Deployment Guide

This guide covers deploying the LuxeHost backend to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Deployment Platforms](#deployment-platforms)
  - [Heroku](#heroku)
  - [Railway](#railway)
  - [Render](#render)
  - [Docker](#docker)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)
- [Health Checks](#health-checks)
- [Monitoring and Logging](#monitoring-and-logging)
- [Scaling Considerations](#scaling-considerations)
- [Security Checklist](#security-checklist)

## Prerequisites

Before deploying, ensure you have:

- ✅ MongoDB Atlas account (or production MongoDB instance)
- ✅ GitHub OAuth App configured for production URLs
- ✅ Cloudflare API token (if using Cloudflare Pages)
- ✅ Netlify API token (if using Netlify)
- ✅ All environment variables ready
- ✅ Frontend deployed and URL available

## Environment Setup

### Production Environment Variables

Create a production `.env` file or configure environment variables in your hosting platform:

```env
# Server
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/luxehost-prod?retryWrites=true&w=majority

# JWT (IMPORTANT: Use strong, unique values)
JWT_SECRET=your-super-strong-secret-at-least-32-characters-long-random-string
JWT_EXPIRY=7d

# GitHub OAuth (Production URLs)
GITHUB_CLIENT_ID=your_prod_github_client_id
GITHUB_CLIENT_SECRET=your_prod_github_client_secret
GITHUB_CALLBACK_URL=https://api.yourdomain.com/auth/github/callback

# Encryption (IMPORTANT: Use strong 32-byte key)
ENCRYPTION_KEY=your-32-byte-encryption-key-change-this

# Frontend
FRONTEND_URL=https://yourdomain.com

# Deployment Providers
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
NETLIFY_API_TOKEN=your_netlify_api_token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
WEBHOOK_RATE_LIMIT_MAX=50
GITHUB_RATE_LIMIT_MAX=30

# Logging
LOG_LEVEL=info
```

### Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (exactly 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## MongoDB Atlas Setup

### 1. Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Click "Build a Database"
4. Choose "Shared" (free tier) or preferred option
5. Select your cloud provider and region
6. Click "Create Cluster"

### 2. Configure Security

1. **Database Access:**
   - Navigate to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a strong username and password
   - Set permissions to "Read and write to any database"
   - Click "Add User"

2. **Network Access:**
   - Navigate to "Network Access"
   - Click "Add IP Address"
   - For deployment platforms, either:
     - Add specific platform IP addresses
     - Or click "Allow Access from Anywhere" (0.0.0.0/0)
   - Note: For production, restrict to specific IPs when possible

### 3. Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with your database name (e.g., `luxehost-prod`)

Example:
```
mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/luxehost-prod?retryWrites=true&w=majority
```

## Deployment Platforms

### Heroku

#### Setup

1. Install Heroku CLI:
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. Login to Heroku:
```bash
heroku login
```

3. Create Heroku app:
```bash
heroku create luxehost-backend
```

4. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your_mongodb_uri"
heroku config:set JWT_SECRET="your_jwt_secret"
heroku config:set ENCRYPTION_KEY="your_encryption_key"
heroku config:set GITHUB_CLIENT_ID="your_github_client_id"
heroku config:set GITHUB_CLIENT_SECRET="your_github_client_secret"
heroku config:set GITHUB_CALLBACK_URL="https://luxehost-backend.herokuapp.com/auth/github/callback"
heroku config:set FRONTEND_URL="https://yourdomain.com"
heroku config:set CLOUDFLARE_API_TOKEN="your_cloudflare_token"
heroku config:set CLOUDFLARE_ACCOUNT_ID="your_cloudflare_account"
heroku config:set NETLIFY_API_TOKEN="your_netlify_token"
```

5. Add Procfile (already exists in project):
```
web: node dist/server.js
```

6. Deploy:
```bash
git push heroku main
```

7. Check logs:
```bash
heroku logs --tail
```

#### Health Check Setup

Add this to `app.json`:
```json
{
  "name": "LuxeHost Backend",
  "description": "Static site hosting backend",
  "formation": {
    "web": {
      "quantity": 1
    }
  },
  "healthcheck": "https://luxehost-backend.herokuapp.com/health"
}
```

### Railway

#### Setup

1. Go to [Railway](https://railway.app/)
2. Sign up or log in
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Node.js

#### Configure Environment Variables

In Railway dashboard:
1. Click on your service
2. Go to "Variables" tab
3. Add all environment variables from `.env`

#### Build Settings

Railway auto-detects build settings, but you can customize:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

#### Deploy

Railway automatically deploys on push to main branch.

### Render

#### Setup

1. Go to [Render](https://render.com/)
2. Sign up or log in
3. Click "New +" > "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name:** luxehost-backend
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`

#### Environment Variables

In Render dashboard:
1. Go to "Environment" tab
2. Add all environment variables
3. Click "Save Changes"

#### Auto-Deploy

Render automatically deploys on push to main branch.

### Docker

#### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
```

#### .dockerignore

Create a `.dockerignore` file:

```
node_modules
dist
.env
.env.local
.git
.gitignore
README.md
DEPLOYMENT.md
npm-debug.log
```

#### Build and Run

```bash
# Build image
docker build -t luxehost-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env.production \
  --name luxehost-backend \
  luxehost-backend

# Check logs
docker logs -f luxehost-backend

# Stop container
docker stop luxehost-backend
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - GITHUB_CALLBACK_URL=${GITHUB_CALLBACK_URL}
      - FRONTEND_URL=${FRONTEND_URL}
      - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
      - CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID}
      - NETLIFY_API_TOKEN=${NETLIFY_API_TOKEN}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Run with:
```bash
docker-compose up -d
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript compilation check
        run: npm run build

      - name: Run linter (if configured)
        run: npm run lint || echo "No lint script"

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.14
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "luxehost-backend"
          heroku_email: "your-email@example.com"

      - name: Health check
        run: |
          sleep 30
          curl -f https://luxehost-backend.herokuapp.com/health || exit 1
```

Add secrets to GitHub repository:
1. Go to repository settings
2. Navigate to "Secrets and variables" > "Actions"
3. Add: `HEROKU_API_KEY`

## Health Checks

### Endpoint

The `/health` endpoint returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-08T12:00:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

### Load Balancer Configuration

For AWS ALB, Azure Application Gateway, or similar:

- **Health Check Path:** `/health`
- **Health Check Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Unhealthy Threshold:** 3
- **Healthy Threshold:** 2
- **Success Codes:** 200

### Monitoring Scripts

Simple uptime monitoring:

```bash
#!/bin/bash
# check-health.sh

URL="https://api.yourdomain.com/health"
EXPECTED_STATUS="ok"

RESPONSE=$(curl -s $URL)
STATUS=$(echo $RESPONSE | jq -r '.status')

if [ "$STATUS" = "$EXPECTED_STATUS" ]; then
  echo "✅ Health check passed"
  exit 0
else
  echo "❌ Health check failed: $RESPONSE"
  exit 1
fi
```

## Monitoring and Logging

### Log Aggregation

#### Option 1: Papertrail

1. Sign up at [Papertrail](https://www.papertrail.com/)
2. Get your log destination (e.g., `logs.papertrailapp.com:12345`)
3. For Heroku:
```bash
heroku addons:create papertrail
heroku addons:open papertrail
```

#### Option 2: Logtail

1. Sign up at [Logtail](https://betterstack.com/logtail)
2. Get your source token
3. Install and configure Logtail client

### Application Monitoring

#### Option 1: New Relic

```bash
npm install newrelic

# Add to start of server.ts:
require('newrelic');
```

#### Option 2: Sentry

```bash
npm install @sentry/node

# In server.ts:
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Custom Logging

The application uses structured JSON logging in production. Configure `LOG_LEVEL`:

- `debug` - All logs
- `info` - Info, warnings, and errors (default)
- `warn` - Warnings and errors only
- `error` - Errors only

## Scaling Considerations

### Horizontal Scaling

The application is stateless and can be horizontally scaled:

1. **No Session Storage:** JWT tokens are stateless
2. **No In-Memory State:** All state in MongoDB
3. **Safe to Run Multiple Instances:** No shared in-memory data

### Database Scaling

For high traffic:

1. **Connection Pooling:** Already configured in Mongoose
2. **Indexes:** Add indexes on frequently queried fields
3. **Read Replicas:** Use MongoDB Atlas clusters with read replicas
4. **Sharding:** For very large datasets

### Caching

Consider adding Redis for:

- Rate limiting (shared across instances)
- Session storage
- API response caching

### Load Balancing

Use a load balancer (AWS ALB, NGINX, etc.) to:

- Distribute traffic across instances
- Perform health checks
- Handle SSL termination
- Rate limiting at edge

## Security Checklist

Before deploying to production:

- ✅ Use strong, unique `JWT_SECRET` and `ENCRYPTION_KEY`
- ✅ Enable MongoDB authentication and encryption at rest
- ✅ Use HTTPS only (no HTTP)
- ✅ Restrict MongoDB network access to specific IPs
- ✅ Set `NODE_ENV=production`
- ✅ Configure proper CORS origins (no wildcards)
- ✅ Review rate limiting settings
- ✅ Enable security headers (Helmet - already configured)
- ✅ Keep dependencies updated (`npm audit`)
- ✅ Use environment variables for all secrets (never hardcode)
- ✅ Set up monitoring and alerting
- ✅ Configure log retention policies
- ✅ Regular backups of MongoDB
- ✅ Review and rotate API tokens regularly

## Backup and Recovery

### MongoDB Backups

#### MongoDB Atlas Automated Backups

1. Go to Atlas dashboard
2. Select cluster
3. Go to "Backup" tab
4. Enable "Continuous Backup" or "Cloud Provider Snapshots"
5. Configure retention policy

#### Manual Backup

```bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/luxehost-prod" --out=./backup
```

#### Restore

```bash
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/luxehost-prod" ./backup
```

### Disaster Recovery Plan

1. **Database Failure:**
   - Restore from latest MongoDB Atlas snapshot
   - Verify data integrity

2. **Application Failure:**
   - Redeploy from last known good commit
   - Verify health check passes

3. **Complete Outage:**
   - Deploy to new platform
   - Restore database from backup
   - Update DNS records
   - Verify all services operational

## Troubleshooting

### Common Issues

#### Database Connection Errors

```
Error: connect ECONNREFUSED
```

**Solution:**
- Check `MONGODB_URI` is correct
- Verify MongoDB Atlas network access allows your IP
- Ensure database user has correct permissions

#### JWT Errors in Production

```
Error: jwt malformed
```

**Solution:**
- Verify `JWT_SECRET` matches between environments
- Check token is being sent correctly in `Authorization` header

#### Rate Limit Issues

```
429 Too Many Requests
```

**Solution:**
- Adjust rate limits in environment variables
- Implement IP whitelisting for trusted services
- Use API keys for service-to-service communication

## Support

For deployment issues:

1. Check application logs
2. Verify environment variables
3. Test `/health` endpoint
4. Review MongoDB connection status
5. Open an issue on GitHub

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Heroku Node.js Guide](https://devcenter.heroku.com/categories/nodejs-support)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Docker Documentation](https://docs.docker.com/)
