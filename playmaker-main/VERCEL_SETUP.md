# Vercel Deployment Setup Guide

## 🚨 CRITICAL: Set Environment Variable in Vercel

The frontend **MUST** have the backend URL configured to work in production.

### Step-by-Step Instructions

#### 1. Get Your Railway Backend URL

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your **backend** service
3. Go to **Settings** → **Networking** → **Public Networking**
4. Copy your domain (e.g., `playmaker-production-xxxx.up.railway.app`)

#### 2. Configure Vercel Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **PLAYMAKER** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Set:
   ```
   Name: REACT_APP_BACKEND_URL
   Value: https://your-railway-backend.up.railway.app
   ```
   (Replace with your actual Railway URL)

6. **IMPORTANT:** Select **All Environments** (Production, Preview, Development)
7. Click **Save**

#### 3. Redeploy

After adding the environment variable, you **MUST** redeploy:

**Option A: Via Vercel Dashboard**
- Go to **Deployments** tab
- Click **⋯** (three dots) on the latest deployment
- Click **Redeploy**

**Option B: Push to GitHub** (triggers automatic deploy)
```bash
git commit --allow-empty -m "Trigger redeploy with env vars"
git push origin main
```

## 🧪 Testing the Setup

### 1. Check Backend URL on Login Screen

When you visit your Vercel app, the login screen will show:
```
Backend: https://your-backend-url.up.railway.app
```

If it shows `http://localhost:8000 (fallback)`, the environment variable is **NOT set** correctly.

### 2. Check Browser Console

Open browser console (F12) and look for:
- `⚠️  REACT_APP_BACKEND_URL not set` → **BAD** (env var missing)
- `🔐 Attempting login to: https://your-backend.up.railway.app/api/auth/login` → **GOOD**

### 3. Test Login

1. Enter password: `SportsSense!`
2. Click "Get Started"
3. Check console for detailed logs

## 🔍 Debugging Login Issues

### Issue: "Nothing happens" when clicking login button

**Check console logs for:**

```
🔑 Password entered: SportsSense!
🔑 Match: true
✅ Password correct, attempting login...
🔐 Attempting login to: https://...
```

**Common Problems:**

1. **Backend URL shows "localhost"**
   - Fix: Set `REACT_APP_BACKEND_URL` in Vercel
   - Then redeploy

2. **CORS Error in Console**
   ```
   Access to XMLHttpRequest blocked by CORS policy
   ```
   - Fix: Update `ALLOWED_ORIGINS` in Railway backend:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

3. **Network Error / Connection Refused**
   - Check: Is Railway backend running?
   - Visit: `https://your-backend.up.railway.app/api/` (should return JSON)

4. **401 Unauthorized**
   - Check: Is test user created in backend?
   - Look for in Railway logs: `✅ Created test user: testuser@playmaker.com`

## ✅ Correct Setup Checklist

- [ ] Railway backend is running
- [ ] Railway backend has domain in **Settings → Networking**
- [ ] Vercel has `REACT_APP_BACKEND_URL` environment variable set
- [ ] Vercel environment variable value is `https://your-backend.railway.app` (no trailing slash)
- [ ] Vercel app has been **redeployed** after setting env var
- [ ] Login screen shows correct backend URL (not localhost)
- [ ] Railway backend `ALLOWED_ORIGINS` includes Vercel domain

## 🎯 Quick Test Command

In your browser console on the Vercel app:

```javascript
// Check if env var is set
console.log('Backend URL:', process.env.REACT_APP_BACKEND_URL);

// Should show your Railway URL, not undefined or localhost
```

## 📝 Expected Production URLs

- **Frontend (Vercel):** `https://your-app.vercel.app`
- **Backend (Railway):** `https://playmaker-production-xxxx.up.railway.app`

---

**Test Credentials:**
- **Password:** `SportsSense!`
- Email is automatically set to `testuser@playmaker.com`
