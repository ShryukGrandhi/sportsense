# Docker Deployment Guide for PLAYMAKER Sports AI

This guide covers deploying PLAYMAKER to Railway (backend) and Vercel (frontend) with secure API key management.

## 🚀 Quick Start

### Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- MongoDB Atlas account (or Railway MongoDB)

## 📦 Repository Setup

### 1. Create New GitHub Repository

1. Go to https://github.com/new
2. Repository name: `playmaker`
3. Owner: `tarundevi`
4. Description: "PLAYMAKER - AI-Powered Sports Analytics Platform"
5. Set to **Private** (recommended for API keys)
6. Do NOT initialize with README (we already have one)
7. Click "Create repository"

### 2. Push Code to New Repository

```bash
cd /Users/tarun/workspace/playmaker

# Add new remote (if not already added)
git remote add origin https://github.com/tarundevi/playmaker.git

# Or update existing remote
git remote set-url origin https://github.com/tarundevi/playmaker.git

# Push all branches
git push -u origin main
```

## 🔐 Secure API Key Management

### Environment Variables Required

**CRITICAL: Never commit .env files or hardcode API keys in code!**

#### Backend Environment Variables (Railway)
```env
# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/playmaker

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Sports Data APIs
HIGHLIGHTLY_API_KEY=your-highlightly-api-key
PPLX_API_KEY=your-perplexity-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
SPORTRADAR_API_KEY=your-sportradar-api-key

# CORS Configuration
ALLOWED_ORIGINS=https://playmaker.vercel.app,https://sportssense.dev

# Optional Settings
SKIP_ENV_VALIDATION=false
DISABLE_BACKGROUND_TASKS=false
```

#### Frontend Environment Variables (Vercel)
```env
REACT_APP_API_URL=https://your-backend-url.railway.app
```

## 🚂 Railway Deployment (Backend)

### Option 1: Using Railway Dashboard

1. **Login to Railway**
   - Go to https://railway.app
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `tarundevi/playmaker`

3. **Configure Service**
   - Service name: `playmaker-backend`
   - Root directory: `/`
   - Build command: Uses Dockerfile automatically
   - Start command: Defined in railway.toml

4. **Add Environment Variables**
   - Go to "Variables" tab
   - Click "Add Variable" for each required variable
   - **IMPORTANT**: Use Railway's secret management
   - Paste all backend environment variables from above

5. **Add MongoDB**
   - Click "New" → "Database" → "MongoDB"
   - Copy connection string to MONGO_URL variable

6. **Configure Domain**
   - Go to "Settings" tab
   - Click "Generate Domain"
   - Or add custom domain: `api.sportssense.dev`
   - Copy backend URL for frontend configuration

7. **Deploy**
   - Railway auto-deploys on push to main
   - Check logs for any errors

### Option 2: Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to project
railway link

# Add environment variables
railway variables set MONGO_URL="your-mongodb-url"
railway variables set JWT_SECRET="your-jwt-secret"
railway variables set HIGHLIGHTLY_API_KEY="your-key"
railway variables set PPLX_API_KEY="your-key"
railway variables set SPORTRADAR_API_KEY="your-key"
railway variables set ALLOWED_ORIGINS="https://playmaker.vercel.app,https://sportssense.dev"

# Deploy
railway up
```

## ⚡ Vercel Deployment (Frontend)

### Option 1: Using Vercel Dashboard

1. **Login to Vercel**
   - Go to https://vercel.com
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import `tarundevi/playmaker`

3. **Configure Project**
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `yarn build`
   - Output Directory: `build`
   - Install Command: `yarn install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add: `REACT_APP_API_URL`
   - Value: Your Railway backend URL (e.g., `https://playmaker-backend.railway.app`)
   - Apply to: Production, Preview, Development

5. **Configure Domain**
   - Go to "Settings" → "Domains"
   - Add custom domain: `sportssense.dev` and `www.sportssense.dev`
   - Follow DNS configuration instructions

6. **Deploy**
   - Click "Deploy"
   - Vercel auto-deploys on push to main

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set REACT_APP_API_URL environment variable

# Deploy to production
vercel --prod
```

## 🌐 Custom Domain Setup (sportssense.dev)

### Backend (Railway)
1. Go to Railway project settings
2. Add custom domain: `api.sportssense.dev`
3. Add DNS records from your domain provider:
   ```
   Type: CNAME
   Name: api
   Value: [Railway provides this]
   ```

### Frontend (Vercel)
1. Go to Vercel project settings → Domains
2. Add custom domain: `sportssense.dev`
3. Add DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

## 🔒 Security Best Practices

### 1. API Key Management
- ✅ Use Railway/Vercel environment variables
- ✅ Never commit .env files
- ✅ Rotate API keys regularly
- ✅ Use different keys for dev/staging/prod
- ❌ Never hardcode secrets in code
- ❌ Never expose keys in client-side code

### 2. Database Security
- Use MongoDB Atlas with IP whitelisting
- Enable authentication
- Use strong passwords
- Regular backups

### 3. CORS Configuration
- Set specific allowed origins
- Don't use `*` in production
- Update ALLOWED_ORIGINS when adding new domains

### 4. JWT Secret
- Generate strong random string (32+ characters)
- Use different secrets for different environments
- Never reuse across projects

## 🐳 Local Docker Testing

Before deploying, test locally with Docker:

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Build and run with docker-compose
docker-compose -f docker-compose.prod.yml up --build

# Test endpoints
curl http://localhost:8000/api/
curl http://localhost:3000
```

## 📊 Monitoring & Logs

### Railway
- View logs: Railway dashboard → Deployments → Logs
- Metrics: CPU, Memory, Network usage
- Set up alerts for errors

### Vercel
- View logs: Vercel dashboard → Deployments → Function logs
- Analytics: Built-in web analytics
- Real-time monitoring

## 🔧 Troubleshooting

### Common Issues

**Backend not starting:**
- Check Railway logs for errors
- Verify all environment variables are set
- Check MongoDB connection string
- Ensure ALLOWED_ORIGINS includes frontend URL

**Frontend can't connect to backend:**
- Verify REACT_APP_API_URL is correct
- Check CORS configuration
- Ensure Railway backend is running
- Check browser console for errors

**API keys not working:**
- Verify keys are correctly set in Railway
- Check for extra spaces or quotes
- Ensure keys haven't expired
- Test keys with curl/Postman first

**Build failures:**
- Check package.json dependencies
- Verify Node/Python versions
- Review build logs
- Clear build cache

## 📝 Post-Deployment Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] All environment variables configured
- [ ] Custom domains configured (sportssense.dev)
- [ ] SSL certificates active
- [ ] CORS properly configured
- [ ] Database connected and accessible
- [ ] API endpoints responding
- [ ] Frontend can communicate with backend
- [ ] User registration/login working
- [ ] Sports data APIs responding
- [ ] Background tasks running (if enabled)
- [ ] Monitoring and alerts set up
- [ ] Backup strategy in place

## 🎯 Next Steps

1. Test all features in production
2. Set up staging environment
3. Configure CI/CD pipelines
4. Enable automatic deployments
5. Set up monitoring and alerting
6. Plan for scaling
7. Document API endpoints
8. Create user documentation

## 📞 Support

- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas/support

---

**Remember**: Keep your API keys secure! Use environment variables, rotate keys regularly, and never commit secrets to Git.
