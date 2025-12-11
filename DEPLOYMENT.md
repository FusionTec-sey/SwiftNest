# SwiftNest Deployment Guide

Deploy SwiftNest to your Hostinger VPS using Coolify and Docker.

## Prerequisites

- Hostinger VPS with Coolify panel installed
- Docker installed on the VPS
- A domain pointed to your VPS IP
- Git repository access (GitHub, GitLab, etc.)

## Option 1: Deploy with Coolify (Recommended)

### Step 1: Push Code to Git Repository

Push your SwiftNest code to a Git repository (GitHub, GitLab, or Bitbucket).

### Step 2: Create Application in Coolify

1. Log into your Coolify panel
2. Go to **Projects** > **Add New Project**
3. Click **Add New Resource** > **Application**
4. Select your Git provider and repository
5. Choose **Dockerfile** as the build method

### Step 3: Configure Environment Variables

In Coolify, add these environment variables (under **Environment Variables**):

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Session encryption key | Generate with `openssl rand -base64 32` |
| `PGHOST` | Database host | `your-db-host` |
| `PGPORT` | Database port | `5432` |
| `PGUSER` | Database user | `swiftnest` |
| `PGPASSWORD` | Database password | `your-secure-password` |
| `PGDATABASE` | Database name | `swiftnest` |

### Step 4: Add PostgreSQL Database

1. In Coolify, click **Add New Resource** > **Database** > **PostgreSQL**
2. Configure credentials (save these for the app's environment variables)
3. The database will be accessible within your Coolify network

### Step 5: Configure Domain

1. In your application settings, go to **Domains**
2. Add your domain (e.g., `app.yourdomain.com`)
3. Enable **HTTPS** (Coolify auto-provisions Let's Encrypt certificates)

### Step 6: Deploy

Click **Deploy** to build and start your application.

---

## Option 2: Deploy with Docker Compose

### Step 1: Clone Repository on VPS

```bash
ssh root@your-vps-ip
git clone https://github.com/your-repo/swiftnest.git
cd swiftnest
```

### Step 2: Create Environment File

```bash
cp .env.example .env
nano .env
```

Edit the `.env` file with your values:

```env
POSTGRES_USER=swiftnest
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=swiftnest
SESSION_SECRET=your_session_secret_here
```

Generate a secure session secret:
```bash
openssl rand -base64 32
```

### Step 3: Build and Start

```bash
docker-compose up -d --build
```

### Step 4: Run Database Migrations

```bash
docker-compose exec app npm run db:push
```

### Step 5: Configure Reverse Proxy (Nginx/Caddy)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Useful Commands

### View Logs
```bash
docker-compose logs -f app
```

### Restart Application
```bash
docker-compose restart app
```

### Stop Everything
```bash
docker-compose down
```

### Update Deployment
```bash
git pull
docker-compose up -d --build
docker-compose exec app npm run db:push
```

### Database Backup
```bash
docker-compose exec db pg_dump -U swiftnest swiftnest > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T db psql -U swiftnest swiftnest
```

---

## Health Check

The application exposes a health check endpoint at `/api/health`:

```bash
curl https://app.yourdomain.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T15:30:00.000Z",
  "uptime": 3600
}
```

---

## Troubleshooting

### Application won't start
- Check logs: `docker-compose logs app`
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running and accessible

### Database connection errors
- Verify database credentials in environment variables
- Check if database container is healthy: `docker-compose ps`
- Ensure database migrations ran: `docker-compose exec app npm run db:push`

### SSL certificate issues
- Ensure domain DNS is pointing to your VPS IP
- Wait for DNS propagation (up to 48 hours)
- In Coolify, re-issue the certificate

### Port conflicts
- Check if port 5000 is in use: `netstat -tulpn | grep 5000`
- Stop conflicting services or change the port in docker-compose.yml
