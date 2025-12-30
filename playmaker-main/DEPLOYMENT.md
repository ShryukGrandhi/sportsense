# PLAYMAKER Deployment Guide

This guide will help you containerize and deploy your PLAYMAKER application to a production environment with a custom domain.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Docker Setup](#local-docker-setup)
3. [Production Deployment Options](#production-deployment-options)
4. [Domain Configuration](#domain-configuration)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- Docker and Docker Compose installed
- A domain name (e.g., playmaker.com)
- API keys for:
  - Highlightly
  - Perplexity
  - Sportradar

---

## Local Docker Setup

### Step 1: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your actual API keys:
```bash
# Update these values
MONGO_USER=admin
MONGO_PASSWORD=your-secure-password
JWT_SECRET=your-random-secret-key-min-32-chars
HIGHLIGHTLY_API_KEY=your-key
PPLX_API_KEY=your-key
PERPLEXITY_API_KEY=your-key
SPORTRADAR_API_KEY=your-key
```

### Step 2: Build and Run Locally

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

Your app should now be running at:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- MongoDB: localhost:27017

---

## Production Deployment Options

### Option 1: AWS (Recommended for Scalability)

#### Using AWS ECS (Elastic Container Service)

1. **Push images to ECR (Elastic Container Registry)**:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name playmaker-frontend
aws ecr create-repository --repository-name playmaker-backend

# Build and tag
docker build -t playmaker-frontend ./frontend
docker build -t playmaker-backend ./backend

docker tag playmaker-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/playmaker-frontend:latest
docker tag playmaker-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/playmaker-backend:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/playmaker-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/playmaker-backend:latest
```

2. **Set up MongoDB**:
   - Use AWS DocumentDB (MongoDB-compatible) or
   - MongoDB Atlas (cloud-managed)

3. **Create ECS Task Definitions**:
   - Create task definitions for frontend and backend
   - Set environment variables in task definitions
   - Configure resources (CPU, memory)

4. **Set up Load Balancer**:
   - Create Application Load Balancer
   - Configure target groups for frontend (port 80) and backend (port 8000)
   - Set up health checks

5. **Create ECS Service**:
   - Deploy tasks using Fargate or EC2
   - Configure auto-scaling
   - Attach to load balancer

#### Using AWS EC2 (Simpler approach)

1. **Launch EC2 instance** (Ubuntu 22.04 recommended):
   - t3.medium or larger
   - Open ports: 22, 80, 443, 8000

2. **SSH into your instance and install Docker**:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Clone your repository**:
```bash
git clone https://github.com/yourusername/playmaker.git
cd playmaker
```

4. **Set up environment**:
```bash
cp .env.example .env
nano .env  # Edit with your production values
```

5. **Deploy**:
```bash
docker-compose up -d
```

---

### Option 2: DigitalOcean (Easiest & Cost-Effective)

1. **Create a Droplet**:
   - Choose Docker marketplace image (Ubuntu + Docker pre-installed)
   - Minimum: $12/month (2GB RAM)
   - Recommended: $24/month (4GB RAM)

2. **SSH into droplet**:
```bash
ssh root@your-droplet-ip
```

3. **Clone and deploy**:
```bash
git clone https://github.com/yourusername/playmaker.git
cd playmaker
cp .env.example .env
nano .env  # Add your production values
docker-compose up -d
```

4. **Set up managed database** (Optional but recommended):
   - Create MongoDB managed database cluster in DigitalOcean
   - Update `MONGO_URL` in `.env` with connection string

---

### Option 3: Railway / Render (Simplest)

#### Railway
1. Connect your GitHub repository
2. Add environment variables in dashboard
3. Railway auto-detects Dockerfile and deploys
4. Set custom domain in settings

#### Render
1. Create new Web Service for backend
2. Create new Static Site for frontend
3. Add environment variables
4. Connect custom domain

---

## Domain Configuration

### Step 1: Point Domain to Server

In your domain registrar (GoDaddy, Namecheap, etc.):

1. **For EC2/DigitalOcean droplet**:
   - Create A record: `@` → `your-server-ip`
   - Create A record: `www` → `your-server-ip`
   - Create A record: `api` → `your-server-ip` (optional, for separate API domain)

2. **For AWS Load Balancer**:
   - Create CNAME record: `@` → `your-alb-dns-name.amazonaws.com`
   - Create CNAME record: `www` → `your-alb-dns-name.amazonaws.com`

### Step 2: Update Environment Variables

Update `.env` with your domain:
```bash
REACT_APP_API_URL=https://api.yourdomain.com
```

Rebuild frontend:
```bash
docker-compose up -d --build frontend
```

---

## SSL/HTTPS Setup

### Option A: Using Nginx + Certbot (Recommended for EC2/Droplet)

1. **Install Nginx and Certbot on host**:
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

2. **Create Nginx config** (`/etc/nginx/sites-available/playmaker`):
```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Enable site and get SSL**:
```bash
sudo ln -s /etc/nginx/sites-available/playmaker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### Option B: Using Traefik (Docker-based reverse proxy)

1. **Create `docker-compose.prod.yml`**:
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/traefik.yml:ro
      - ./traefik/acme.json:/acme.json
    networks:
      - playmaker-network

  backend:
    # ... existing backend config ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"

  frontend:
    # ... existing frontend config ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
```

---

## Production Checklist

- [ ] Update all API keys and secrets in `.env`
- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Update `MONGO_PASSWORD` to a strong password
- [ ] Set `REACT_APP_API_URL` to your production API URL
- [ ] Configure CORS in backend to only allow your domain
- [ ] Set up SSL/HTTPS certificates
- [ ] Configure database backups
- [ ] Set up monitoring (CloudWatch, Datadog, etc.)
- [ ] Configure log aggregation
- [ ] Set up error tracking (Sentry)
- [ ] Test all features in production
- [ ] Set up CI/CD pipeline (GitHub Actions, etc.)

---

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Update Application
```bash
git pull
docker-compose up -d --build
```

### Database Backup
```bash
# Export MongoDB
docker exec playmaker-mongodb mongodump --out /backup

# Copy to host
docker cp playmaker-mongodb:/backup ./mongodb-backup-$(date +%Y%m%d)
```

---

## Cost Estimates

### AWS
- EC2 t3.medium: ~$30/month
- DocumentDB (small): ~$70/month
- Load Balancer: ~$20/month
- **Total: ~$120/month**

### DigitalOcean
- Droplet (4GB): $24/month
- Managed MongoDB: $15/month
- **Total: ~$39/month**

### Railway/Render
- ~$20-50/month depending on usage

---

## Troubleshooting

### Container won't start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Database connection issues
- Check `MONGO_URL` in `.env`
- Ensure MongoDB container is running: `docker ps`
- Check network connectivity: `docker network ls`

### API not accessible
- Check backend logs
- Verify port 8000 is open in firewall
- Check CORS configuration

### Frontend can't reach backend
- Verify `REACT_APP_API_URL` is set correctly
- Check network tab in browser dev tools
- Ensure backend is accessible from internet

---

## Security Best Practices

1. **Never commit `.env` file** - it contains secrets
2. **Use strong passwords** for MongoDB and JWT
3. **Keep Docker images updated**:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```
4. **Limit SSH access** - use SSH keys, disable password auth
5. **Set up firewall**:
   ```bash
   sudo ufw allow 22,80,443/tcp
   sudo ufw enable
   ```
6. **Regular backups** - automate MongoDB backups
7. **Monitor logs** - set up alerts for errors

---

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Check firewall and security groups
4. Review this guide's troubleshooting section

---

**Good luck with your deployment!**
