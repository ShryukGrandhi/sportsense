#!/usr/bin/env python3
"""
Seed script to create a demo user for testing
Run with: python -m backend.seed_demo_user
Or: source venv/bin/activate && python -m backend.seed_demo_user
"""
import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

# Load environment variables
load_dotenv(ROOT_DIR / '.env')

from backend.database import init_database, db, close_database
from backend.auth import get_password_hash, get_user_by_email
from backend.models import User


async def seed_demo_user():
    """Create demo user if it doesn't exist"""
    await init_database()
    
    demo_email = "test@example.com"
    demo_password = "password123"
    
    # Check if user already exists
    existing_user = await get_user_by_email(demo_email)
    if existing_user:
        print(f"✅ Demo user {demo_email} already exists")
        await close_database()
        return
    
    # Create demo user
    demo_user = User(
        username="demo",
        email=demo_email,
        password_hash=get_password_hash(demo_password),
        interests=["NFL", "NBA", "MLB", "NCAA", "NHL"],
        subscription="free"
    )
    
    result = await db.users.insert_one(demo_user.dict(exclude={"id"}))
    demo_user.id = result.inserted_id
    
    print(f"✅ Created demo user:")
    print(f"   Email: {demo_email}")
    print(f"   Password: {demo_password}")
    print(f"   Username: {demo_user.username}")
    
    await close_database()


if __name__ == "__main__":
    asyncio.run(seed_demo_user())

