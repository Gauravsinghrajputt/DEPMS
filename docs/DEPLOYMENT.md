# DEPMS Deployment Guide

## Prerequisites
- Docker & Docker Compose installed on server
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

---

## Option A — DigitalOcean Droplet (Recommended for small-medium teams)

### 1. Create Droplet
```
Size:     4 GB RAM, 2 vCPUs (minimum)
OS:       Ubuntu 22.04 LTS
Region:   Closest to your users
Add SSH:  Yes (your public key)
```

### 2. Server Setup
```bash
ssh root@YOUR_DROPLET_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Create app directory
mkdir -p /opt/depms && cd /opt/depms

# Clone repo
git clone https://github.com/YOUR_ORG/depms.git .

# Copy and fill env
cp .env.example .env
nano .env   # <— fill all values
```

### 3. SSL with Let's Encrypt
```bash
apt-get install -y certbot
certbot certonly --standalone -d your-domain.com

# Certs will be at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Copy to nginx ssl folder
mkdir -p /opt/depms/nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/depms/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/depms/nginx/ssl/key.pem

# Auto-renew cron
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/depms/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/depms/nginx/ssl/key.pem && cd /opt/depms && docker-compose restart nginx" | crontab -
```

### 4. Start Application
```bash
cd /opt/depms

# Start all services
docker-compose --profile production up -d

# Run migrations + seed
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# Check health
curl http://localhost/health
```

---

## Option B — AWS (EC2 + RDS + ElastiCache)

### Architecture
```
Internet → ALB → EC2 (App Server)
                   ├── Backend Container
                   └── Frontend Container (nginx)
EC2 → RDS PostgreSQL 15 (Multi-AZ)
EC2 → ElastiCache Redis
S3  ← Backend (report exports)
```

### Steps
```bash
# 1. Launch EC2 (t3.medium minimum, Amazon Linux 2023)
# 2. Create RDS PostgreSQL 15 (db.t3.medium, Multi-AZ for prod)
# 3. Create ElastiCache Redis cluster
# 4. Create S3 bucket for exports
# 5. Attach IAM role with S3 permissions to EC2

# .env additions for AWS:
DB_HOST=your-rds-endpoint.rds.amazonaws.com
REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
STORAGE_PROVIDER=s3
S3_BUCKET=depms-exports
S3_REGION=ap-south-1

# Security Groups:
# EC2:  Allow 80, 443 from 0.0.0.0/0; 22 from your IP
# RDS:  Allow 5432 from EC2 security group only
# Redis: Allow 6379 from EC2 security group only
```

---

## Option C — Azure Container Apps

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create resource group
az group create --name depms-rg --location eastus

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group depms-rg \
  --name depms-postgres \
  --admin-user depms_user \
  --admin-password 'YourSecurePassword123!' \
  --sku-name Standard_B2s \
  --version 15

# Create Azure Cache for Redis
az redis create \
  --resource-group depms-rg \
  --name depms-redis \
  --sku Basic \
  --vm-size c0

# Create Container App Environment
az containerapp env create \
  --resource-group depms-rg \
  --name depms-env \
  --location eastus

# Deploy backend
az containerapp create \
  --name depms-backend \
  --resource-group depms-rg \
  --environment depms-env \
  --image ghcr.io/YOUR_ORG/depms-backend:latest \
  --target-port 3000 \
  --ingress internal \
  --env-vars DB_HOST=secretref:db-host DB_PASSWORD=secretref:db-password
```

---

## Backup Strategy

### PostgreSQL Automated Backup
```bash
# Create backup script
cat > /opt/depms/scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/depms/backups
mkdir -p $BACKUP_DIR

# Dump
docker-compose exec -T postgres pg_dump -U depms_user depms | gzip > $BACKUP_DIR/depms_$DATE.sql.gz

# Keep last 30 days only
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Optional: upload to S3
# aws s3 cp $BACKUP_DIR/depms_$DATE.sql.gz s3://your-backup-bucket/postgres/

echo "Backup completed: depms_$DATE.sql.gz"
EOF

chmod +x /opt/depms/scripts/backup.sh

# Schedule daily at 2 AM
echo "0 2 * * * /opt/depms/scripts/backup.sh >> /var/log/depms-backup.log 2>&1" | crontab -
```

### Restore from Backup
```bash
gunzip -c /opt/depms/backups/depms_20240101_020000.sql.gz | \
  docker-compose exec -T postgres psql -U depms_user depms
```

---

## Environment Variables Reference (Production)

```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=depms
DB_USER=depms_user
DB_PASSWORD=STRONG_RANDOM_PASSWORD

REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD

JWT_SECRET=RANDOM_64_CHAR_HEX_STRING
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=ANOTHER_RANDOM_64_CHAR_HEX_STRING
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10

STORAGE_PROVIDER=s3
S3_BUCKET=depms-exports
S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@your-domain.com

LOG_LEVEL=warn
```

---

## Scaling Plan

### Phase 1 (0–50 employees): Single server
- 1 EC2 t3.medium / DO Droplet 4GB
- RDS db.t3.micro or managed PostgreSQL
- All services on one Docker Compose

### Phase 2 (50–200 employees): Separate services
- Dedicated DB server (RDS Multi-AZ)
- Redis cluster (ElastiCache)
- 2 app servers behind ALB
- S3 for exports

### Phase 3 (200+ employees): Full scale
- ECS Fargate / Kubernetes (EKS/AKS)
- RDS Aurora PostgreSQL (auto-scaling)
- ElastiCache cluster mode
- CloudFront CDN for frontend
- Separate read replicas for reports

### Performance Checklist
- [ ] Enable pg connection pooling (PgBouncer)
- [ ] Redis caching for dashboard queries (already implemented)
- [ ] Add DB indexes (already in migrations)
- [ ] Enable gzip compression (already in nginx)
- [ ] Rate limiting (already implemented)
- [ ] Separate reporting DB replica for heavy exports
