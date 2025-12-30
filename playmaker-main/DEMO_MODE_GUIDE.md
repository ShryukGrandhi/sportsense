# Demo Mode Guide - Test Visuals Without API Keys

This guide shows you how to test the visual AI responses without setting up API keys.

## Quick Start

### 1. Start Backend in Demo Mode

```bash
# From project root
source venv/bin/activate  # Activate virtual environment
DEMO_MODE=true PYTHONPATH=/Users/maanyachugh/playmaker-1 python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

**Note:** You still need MongoDB running for authentication, but you don't need any sports API keys!

### 2. Start Frontend

```bash
# From project root (in a new terminal)
cd frontend && npm start
```

### 3. Create Demo User (One-time setup)

If you haven't created the demo user yet:

```bash
# Make sure MongoDB is running first!
# Then run:
source venv/bin/activate
python -m backend.seed_demo_user
```

This creates a user with:
- Email: `test@example.com`
- Password: `password123`

### 4. Test It!

1. Open http://localhost:3000
2. Login with the demo credentials
3. Ask any question in the chat (e.g., "Show me Bears vs Bengals stats")
4. You'll see:
   - Game scorecard with team logos
   - Top players section with stats
   - All visual components rendered

## What You'll See

The demo mode returns mock data for:
- **Chicago Bears vs Cincinnati Bengals** game
- Scorecard showing final score (47-42)
- Top players from both teams with statistics
- All formatted exactly like real API responses

## Switching to Real API Keys

When you're ready to use real data:

1. Remove `DEMO_MODE=true` from your command
2. Add your API keys to `.env`:
   - `HIGHLIGHTLY_API_KEY`
   - `SPORTRADAR_API_KEY`
   - `PPLX_API_KEY`
3. Restart the backend

The visual components work the same way with real data!

