from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with optimized settings
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=50,  # Increased connection pool
    minPoolSize=10,  # Maintain minimum connections
    maxIdleTimeMS=45000,  # Close idle connections after 45s
    serverSelectionTimeoutMS=5000,  # Faster server selection timeout
    connectTimeoutMS=10000,  # Connection timeout
    socketTimeoutMS=30000,  # Socket timeout
)
db = client[os.environ['DB_NAME']]

async def init_database():
    """Initialize database with indexes and constraints."""
    try:
        # Create indexes for better performance
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username")

        # Compound index for chat queries (optimizes user chat list)
        await db.chats.create_index([("user_id", 1), ("updated_at", -1)])

        # Compound index for message queries (optimizes chat message loading)
        await db.messages.create_index([("chat_id", 1), ("timestamp", 1)])

        # Add index on message type for faster filtering
        await db.messages.create_index([("chat_id", 1), ("type", 1)])

        # Compound index for sports content trending queries
        await db.sports_content.create_index([("sport", 1), ("trending_score", -1)])
        await db.sports_content.create_index([("created_at", -1)])
        await db.sports_content.create_index([("type", 1), ("sport", 1), ("trending_score", -1)])

        # Add sparse index for URL deduplication
        await db.sports_content.create_index("url", sparse=True)

        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"❌ Error creating database indexes: {e}")

async def close_database():
    """Close database connection."""
    client.close()