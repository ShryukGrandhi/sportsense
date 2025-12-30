# Deploy PLAYMAKER to Railway

Quick guide to deploy your PLAYMAKER application to Railway.

## Prerequisites

- GitHub account (your code should be pushed to GitHub)
- Railway account (sign up at https://railway.app)
- API keys ready:
  - Highlightly API Key
  - Perplexity API Key
  - Sportradar API Key

---

## Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## Step 2: Create Railway Project

1. Go to https://railway.app and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your `PLAYMAKER_FULL_STACK` repository


## Step 3: Configure Services

Railway will detect your `docker-compose.yml` and create services automatically. You need to configure 3 services:

### Service 1: MongoDB

1. In Railway dashboard, click **"+ New"** → **"Database"** → **"MongoDB"**
2. Railway will create a MongoDB instance
3. Copy the connection URL (you'll need this)

### Service 2: Backend API

1. Railway should auto-detect the backend service from docker-compose
2. Go to **backend service** → **Settings** → **Root Directory**
3. Set Root Directory to: `backend`
4. Under **Build**, ensure Dockerfile is detected
5. Go to **Variables** tab and add environment variables:

```bash
# MongoDB Connection (use Railway's MongoDB connection string)
MONGO_URL=${{MongoDB.DATABASE_URL}}

# Generate a secure random string (32+ characters)
JWT_SECRET=your_random_secret_min_32_characters_here

# Your API Keys
HIGHLIGHTLY_API_KEY=your_highlightly_key
PPLX_API_KEY=your_perplexity_key
PERPLEXITY_API_KEY=your_perplexity_key
SPORTRADAR_API_KEY=your_sportradar_key

# CORS (will update after frontend deploys)
ALLOWED_ORIGINS=https://your-frontend.up.railway.app
```

6. Under **Settings** → **Networking**, click **Generate Domain** to get a public URL
7. Copy the backend URL (e.g., `https://your-backend.up.railway.app`)

### Service 3: Frontend

1. Railway should auto-detect the frontend service
2. Go to **frontend service** → **Settings** → **Root Directory**
3. Set Root Directory to: `frontend`
4. Go to **Variables** tab and add:

```bash
# Point to your Railway backend URL
REACT_APP_API_URL=https://your-backend.up.railway.app/api
```

5. Under **Settings** → **Networking**, click **Generate Domain**
6. Copy the frontend URL (e.g., `https://your-frontend.up.railway.app`)

### Update Backend CORS

Go back to **backend service** → **Variables** and update `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS=https://your-frontend.up.railway.app
```

---

## Step 4: Deploy

Railway automatically deploys when you push to GitHub. To trigger initial deployment:

1. All services should start building automatically
2. Monitor the build logs in each service
3. Wait for all services to show "Active" status

---

## Step 5: Custom Domain (Optional)

To use your own domain (e.g., sportsense.dev):

### Frontend Domain

1. Go to **frontend service** → **Settings** → **Domains**
2. Click **Custom Domain**
3. Add: `sportsense.dev` and `www.sportsense.dev`
4. Railway will show DNS instructions
5. In your domain registrar, add:
   ```
   Type    Name    Value (from Railway)
   CNAME   @       your-frontend.up.railway.app
   CNAME   www     your-frontend.up.railway.app
   ```

### Backend Domain

1. Go to **backend service** → **Settings** → **Domains**
2. Click **Custom Domain**
3. Add: `api.sportsense.dev`
4. In your domain registrar, add:
   ```
   Type    Name    Value (from Railway)
   CNAME   api     your-backend.up.railway.app
   ```

### Update Environment Variables

After adding custom domains, update:

**Backend Variables:**
```bash
ALLOWED_ORIGINS=https://sportsense.dev,https://www.sportsense.dev
```

**Frontend Variables:**
```bash
REACT_APP_API_URL=https://api.sportsense.dev/api
```

Railway will automatically redeploy with new settings.

---

## Monitoring & Logs

### View Logs
1. Click on any service
2. Go to **Deployments** tab
3. Click on the latest deployment
4. View real-time logs

### Resource Usage
1. Click on service
2. Go to **Metrics** tab
3. View CPU, Memory, Network usage

---

## Environment Variables Reference

All variables needed for Railway deployment:

### MongoDB (Railway Plugin)
```bash
# Auto-configured by Railway, reference it in backend:
MONGO_URL=${{MongoDB.DATABASE_URL}}
```

### Backend Service
```bash
MONGO_URL=${{MongoDB.DATABASE_URL}}
JWT_SECRET=<generate 32+ random characters>
HIGHLIGHTLY_API_KEY=<your key>
PPLX_API_KEY=<your key>
PERPLEXITY_API_KEY=<your key>
SPORTRADAR_API_KEY=<your key>
ALLOWED_ORIGINS=https://sportsense.dev,https://www.sportsense.dev
```

### Frontend Service
```bash
REACT_APP_API_URL=https://api.sportsense.dev/api
```

---

## Costs

Railway pricing (as of 2024):
- **Free Trial**: $5 credit to start
- **Hobby Plan**: $5/month base + usage
- **Estimated monthly cost**: $20-30 for this app

Monitor usage in Railway dashboard → **Usage** tab.

---

## Troubleshooting

### Service Won't Start

Check build logs:
1. Go to service → **Deployments**
2. Click failed deployment
3. Review logs for errors

### Backend Can't Connect to MongoDB

Ensure `MONGO_URL` uses Railway's reference:
```bash
MONGO_URL=${{MongoDB.DATABASE_URL}}
```

### Frontend Shows API Errors

1. Verify `REACT_APP_API_URL` is correct
2. Check backend is running (visit backend URL)
3. Ensure CORS is configured with frontend URL

### Environment Variables Not Working

1. Variables must be set BEFORE build
2. After changing variables, redeploy:
   - Go to service → **Deployments**
   - Click **⋯** → **Redeploy**

---

## Updating Your App

Railway auto-deploys on git push:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically builds and deploys
```

Manual redeploy:
1. Go to service
2. **Deployments** → click **⋯** → **Redeploy**

---

## Quick Start Checklist

- [ ] Push code to GitHub
- [ ] Create Railway project from GitHub
- [ ] Add MongoDB database plugin
- [ ] Configure backend service (root directory: `backend`)
- [ ] Add backend environment variables
- [ ] Generate backend domain
- [ ] Configure frontend service (root directory: `frontend`)
- [ ] Add frontend environment variables (with backend URL)
- [ ] Generate frontend domain
- [ ] Update backend CORS with frontend URL
- [ ] Test the deployment
- [ ] (Optional) Add custom domains
- [ ] (Optional) Update variables with custom domain URLs

---

## Support & Resources

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Deployment Logs: Check each service's deployment tab

---

**Your app will be live at:**
- Frontend: https://your-frontend.up.railway.app (or custom domain)
- Backend: https://your-backend.up.railway.app/api (or custom domain)

Railway handles SSL/HTTPS automatically!
