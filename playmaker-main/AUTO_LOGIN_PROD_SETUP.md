# Production Login Setup Guide

## ✅ Already Done (Deployed to GitHub)

1. Backend creates test user on startup:
   - Email: `testuser@playmaker.com`
   - Password: `SportsSense!`

2. Frontend password-only login:
   - Login page only requires password (no email field)
   - Email is automatically set to `testuser@playmaker.com`
   - Users just enter password to access the app

## 🔧 Required: Configure Vercel Environment Variable

### Step 1: Get Your Railway Backend URL

1. Go to your Railway dashboard
2. Click on your backend service
3. Go to **Settings** → **Domains**
4. Copy your backend URL (e.g., `https://playmaker-production-xxxx.up.railway.app`)

### Step 2: Set Vercel Environment Variable

1. Go to https://vercel.com/dashboard
2. Select your PLAYMAKER project
3. Go to **Settings** → **Environment Variables**
4. Add this variable:

```
Name: REACT_APP_BACKEND_URL
Value: https://your-railway-backend-url.up.railway.app
Environment: Production, Preview, Development (select all)
```

5. Click **Save**

### Step 3: Redeploy Frontend

After setting the environment variable, trigger a redeploy:

**Option A: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

**Option B: Push to GitHub** (Automatic)
```bash
git commit --allow-empty -m "Trigger redeploy with env vars"
git push origin main
```

## ✅ Expected Behavior in Production

Once deployed with the environment variable:

1. User visits your Vercel app
2. Login screen appears with password field only
3. User enters password: `SportsSense!`
4. User is logged in to the app

## 🧪 Test Login

1. Visit your Vercel app: `https://your-app.vercel.app`
2. Enter password: `SportsSense!`
3. Click "Get Started" or press Enter
4. You should be logged in successfully

## 🚨 Troubleshooting

### Login not working?

**Check 1: Environment Variable**
```bash
# In browser console on your Vercel app:
console.log(process.env.REACT_APP_BACKEND_URL)
# Should show your Railway backend URL
```

**Check 2: Correct Password**
Make sure you're entering: `SportsSense!` (case-sensitive, with exclamation mark)

**Check 3: Backend is running**
Visit your Railway backend URL:
```
https://your-railway-backend.up.railway.app/docs
```
You should see the FastAPI documentation page.

**Check 4: Test user exists**
In Railway logs, look for:
```
✅ Created test user: testuser@playmaker.com
```
Or:
```
ℹ️  Test user already exists: testuser@playmaker.com
```

**Check 5: CORS Configuration**
In Railway backend environment variables, ensure:
```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.your-app.vercel.app
```

### Still failing?

Check browser console for errors and Railway backend logs for authentication errors.

## 📝 Current Status

- ✅ Code pushed to GitHub (commit 81d3a87)
- ⏳ Waiting for Vercel environment variable configuration
- ⏳ Waiting for redeploy

## 🎯 Quick Action Items

1. [ ] Set REACT_APP_BACKEND_URL in Vercel dashboard
2. [ ] Redeploy Vercel app
3. [ ] Test auto-login in production
4. [ ] Verify CORS settings in Railway backend

---

**Test Credentials:**
- **Email:** testuser@playmaker.com
- **Password:** SportsSense!
