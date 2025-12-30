# MongoDB Setup for PLAYMAKER

The application requires MongoDB to be running for:
- User authentication
- Chat creation and storage
- Message history

## Quick Setup Options

### Option 1: Install MongoDB Locally (Recommended for Development)

**macOS (using Homebrew):**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Or run manually
mongod --config /usr/local/etc/mongod.conf
```

**Check if MongoDB is running:**
```bash
brew services list | grep mongodb
# Should show: mongodb-community started
```

### Option 2: Use MongoDB Atlas (Cloud - Free Tier)

1. Sign up at https://www.mongodb.com/cloud/atlas/register
2. Create a free cluster (M0 Sandbox)
3. Create a database user
4. Get connection string
5. Update `.env`:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/playmaker?retryWrites=true&w=majority
   ```

### Option 3: Use Docker (If you have Docker)

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Check if running
docker ps | grep mongodb
```

## After MongoDB is Running

1. **Update `.env` file:**
   ```bash
   MONGO_URL=mongodb://localhost:27017/playmaker
   DB_NAME=playmaker
   JWT_SECRET=your-secret-key-here
   ```

2. **Create demo user:**
   ```bash
   source venv/bin/activate
   python -m backend.seed_demo_user
   ```

3. **Restart backend:**
   ```bash
   DEMO_MODE=true PYTHONPATH=/Users/maanyachugh/playmaker-1 python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
   ```

## Verify MongoDB is Working

```bash
# Test connection
mongosh mongodb://localhost:27017/playmaker

# Or if using older mongo client:
mongo mongodb://localhost:27017/playmaker
```

If you see a MongoDB prompt, it's working!

