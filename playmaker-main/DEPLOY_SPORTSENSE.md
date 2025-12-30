# Deploy to sportsense.dev - Quick Start Guide

This guide will help you deploy your PLAYMAKER application to **sportsense.dev**.

## Prerequisites

- Domain: sportsense.dev (already owned ✓)
- Server/VPS with Docker installed
- API keys for Highlightly, Perplexity, and Sportradar

---

## Deployment Options

### Option 1: DigitalOcean (Recommended - Easiest)

**Cost:** ~$24-39/month

#### Step 1: Create Droplet

1. Go to DigitalOcean
2. Create new Droplet:
   - **Image:** Docker on Ubuntu 22.04 (Marketplace)
   - **Plan:** Basic - $24/mo (4GB RAM, 2 vCPUs)
   - **Region:** Choose closest to your users
   - **Authentication:** SSH key (recommended)

#### Step 2: Configure DNS

In your domain registrar where you bought sportsense.dev:

```
Type    Name    Value               TTL
A       @       YOUR_DROPLET_IP     3600
A       www     YOUR_DROPLET_IP     3600
A       api     YOUR_DROPLET_IP     3600
```

Wait 5-10 minutes for DNS to propagate. Test with:
```bash
ping sportsense.dev
```

#### Step 3: Deploy Application

SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Clone your repository:
```bash
git clone https://github.com/yourusername/PLAYMAKER_FULL_STACK.git
cd PLAYMAKER_FULL_STACK
```

Set up production environment:
```bash
cp .env.production .env
nano .env
```

Update these critical values in `.env`:
```bash
# Generate secure password (20+ characters)
MONGO_PASSWORD=your_super_secure_password_here

# Generate JWT secret (32+ random characters)
JWT_SECRET=your_random_jwt_secret_min_32_chars

# Add your API keys
HIGHLIGHTLY_API_KEY=your_actual_key
PPLX_API_KEY=your_actual_key
PERPLEXITY_API_KEY=your_actual_key
SPORTRADAR_API_KEY=your_actual_key

# These are already configured for sportsense.dev
ALLOWED_ORIGINS=https://sportsense.dev,https://www.sportsense.dev,https://api.sportsense.dev
REACT_APP_API_URL=https://api.sportsense.dev/api
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Step 4: Set Up SSL with Certbot

Install nginx and certbot:
```bash
apt update
apt install nginx certbot python3-certbot-nginx -y
```

Create nginx configuration:
```bash
nano /etc/nginx/sites-available/sportsense
```

Paste this configuration:
```nginx
# Frontend - sportsense.dev
server {
    listen 80;
    server_name sportsense.dev www.sportsense.dev;

    location / {
        proxy_pass http://localhost:3000;
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

# Backend API - api.sportsense.dev
server {
    listen 80;
    server_name api.sportsense.dev;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for AI operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/sportsense /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

Get SSL certificates:
```bash
certbot --nginx -d sportsense.dev -d www.sportsense.dev -d api.sportsense.dev
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose: Redirect HTTP to HTTPS (option 2)

Auto-renewal is configured automatically!

#### Step 5: Verify Deployment

Visit in your browser:
- https://sportsense.dev (should show your frontend)
- https://api.sportsense.dev/api/ (should show: "PLAYMAKER Sports AI API is running! 🏆")

Check logs:
```bash
cd PLAYMAKER_FULL_STACK
docker-compose -f docker-compose.prod.yml logs -f
```

---

### Option 2: AWS EC2

**Cost:** ~$30-40/month

#### Step 1: Launch EC2 Instance

1. Go to AWS EC2 Console
2. Launch instance:
   - **AMI:** Ubuntu Server 22.04 LTS
   - **Instance type:** t3.medium (2 vCPU, 4GB RAM)
   - **Security Group:**
     - SSH (22) - Your IP
     - HTTP (80) - 0.0.0.0/0
     - HTTPS (443) - 0.0.0.0/0
     - Custom TCP (8000) - 0.0.0.0/0

#### Step 2: Install Docker

SSH into instance:
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes
exit
```

#### Step 3: Configure DNS

Point your domain to the EC2 Elastic IP (create one if needed):
```
Type    Name    Value           TTL
A       @       EC2_ELASTIC_IP  3600
A       www     EC2_ELASTIC_IP  3600
A       api     EC2_ELASTIC_IP  3600
```

#### Step 4: Deploy

Follow the same steps as DigitalOcean (Step 3-5) starting from cloning the repository.

---

### Option 3: Railway (Simplest but Higher Cost)

**Cost:** ~$20-50/month (usage-based)

#### Quick Deploy

1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect `docker-compose.yml`
6. Add environment variables in Railway dashboard (copy from `.env.production`)
7. Add custom domain:
   - Go to Settings → Domains
   - Add: `sportsense.dev`, `www.sportsense.dev`, `api.sportsense.dev`
   - Configure DNS as Railway instructs

Railway handles SSL automatically!

---

## Post-Deployment Checklist

- [ ] DNS records configured and propagated
- [ ] SSL certificates installed and working
- [ ] All environment variables set with real values
- [ ] Backend health check passing: https://api.sportsense.dev/api/
- [ ] Frontend loading: https://sportsense.dev
- [ ] Test user registration and login
- [ ] Test chat functionality
- [ ] Monitor logs for errors
- [ ] Set up database backups (see below)

---

## Maintenance

### View Logs
```bash
cd PLAYMAKER_FULL_STACK
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Update Application
```bash
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Backup
```bash
# Create backup script
nano ~/backup-mongo.sh
```

Add this script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/mongodb-backups"
mkdir -p $BACKUP_DIR

docker exec sportsense-mongodb mongodump \
  --username admin \
  --password YOUR_MONGO_PASSWORD \
  --authenticationDatabase admin \
  --out /backup/backup_$DATE

docker cp sportsense-mongodb:/backup/backup_$DATE $BACKUP_DIR/

# Keep only last 7 backups
ls -t $BACKUP_DIR | tail -n +8 | xargs -I {} rm -rf $BACKUP_DIR/{}

echo "Backup completed: $BACKUP_DIR/backup_$DATE"
```

Make it executable and run:
```bash
chmod +x ~/backup-mongo.sh
./backup-mongo.sh
```

Schedule daily backups:
```bash
crontab -e
```

Add this line (runs daily at 2 AM):
```
0 2 * * * /root/backup-mongo.sh >> /var/log/mongo-backup.log 2>&1
```

---

## Monitoring

### Check Service Health
```bash
# All containers running
docker ps

# Resource usage
docker stats

# Disk usage
df -h
```

### Set Up Uptime Monitoring

Free options:
- [UptimeRobot](https://uptimerobot.com) - Monitor https://sportsense.dev
- [BetterUptime](https://betteruptime.com) - Free tier

---

## Troubleshooting

### Site not loading
```bash
# Check nginx
systemctl status nginx
nginx -t

# Check containers
docker ps
docker-compose -f docker-compose.prod.yml logs
```

### SSL certificate issues
```bash
# Renew certificate manually
certbot renew --force-renewal

# Check certificate status
certbot certificates
```

### Database connection errors
```bash
# Check MongoDB is running
docker ps | grep mongodb

# Test connection
docker exec -it sportsense-mongodb mongosh -u admin -p YOUR_PASSWORD
```

### API not responding
```bash
# Check backend logs
docker logs sportsense-backend --tail 100

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Security Best Practices

1. **Firewall:**
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

2. **SSH Hardening:**
```bash
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
systemctl restart sshd
```

3. **Regular Updates:**
```bash
apt update && apt upgrade -y
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Quick Commands Reference

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# SSL renewal (auto-configured)
certbot renew --dry-run
```

---

**Your app will be live at:**
- 🌐 Frontend: https://sportsense.dev
- 🔌 API: https://api.sportsense.dev
- 📊 MongoDB: Internal (not publicly accessible)

Good luck with your deployment! 🚀
