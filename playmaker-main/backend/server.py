from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import os
import logging
from pathlib import Path
from bson import ObjectId
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def validate_environment():
    """Validate that all required environment variables are present.

    Can be skipped by setting SKIP_ENV_VALIDATION=true for local/dev quick-start.
    """
    if os.getenv("SKIP_ENV_VALIDATION", "").lower() in {"1", "true", "yes"}:
        print("⚠️  Skipping environment validation (SKIP_ENV_VALIDATION enabled)")
        return

    required_vars = [
        "MONGO_URL",
        "JWT_SECRET",
        "HIGHLIGHTLY_API_KEY",
        "PPLX_API_KEY",
        "SPORTRADAR_API_KEY",
    ]

    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        error_msg = f"""
🚨 ENVIRONMENT CONFIGURATION ERROR 🚨

Missing required environment variables:
{chr(10).join(f'  - {var}' for var in missing_vars)}

Set SKIP_ENV_VALIDATION=true to bypass this in development, or ensure these are set in your .env:
  - MONGO_URL: MongoDB connection string
  - JWT_SECRET: Secret key for JWT token signing
  - HIGHLIGHTLY_API_KEY: API key for Highlightly sports data
  - PPLX_API_KEY: API key for Perplexity AI
  - SPORTRADAR_API_KEY: API key for Sportradar sports data
        """
        raise ValueError(error_msg)

    print("✅ Environment validation passed - all required variables present")

# Import our models and services
from backend.models import (
    UserCreate, UserLogin, UserUpdate, UserResponse, User,
    ChatCreate, ChatUpdate, ChatResponse, Chat, ChatWithMessages,
    MessageCreate, MessageResponse, Message,
    TokenResponse, TrendingResponse, SportsAnalyzeRequest,
    SportsContentResponse, ChatAnswer, Card
)
from backend.auth import (
    get_password_hash, authenticate_user, create_access_token, 
    get_current_user, user_to_response
)
from backend.database import db, init_database, close_database
from backend.sports_service import sports_service
from backend.services.highlightly import get_highlightly_client, warm_highlightly_cache
from backend.cache import cache

# Lazy import agent to avoid heavy AI dependencies at startup
def get_agent():
    """Get the agent instance on-demand to avoid import-time dependency issues."""
    try:
        from backend.services.agent import agent
        return agent
    except Exception as e:
        print(f"ℹ️  Agent service unavailable: {e}")
        return None

# Optional AI service (lazy import to avoid heavy deps at import time)
def get_ai_service():
    """Try to import the AI service on-demand; return None if unavailable."""
    try:
        from backend.ai_service import ai_service as _ai_service
        return _ai_service
    except Exception as e:
        print(f"ℹ️  AI service unavailable (using fallback): {e}")
        return None

# Background tasks
async def update_sports_data():
    """Background task to update sports data periodically."""
    while True:
        try:
            # Scrape ESPN news for major sports
            sports = ["nfl", "nba", "mlb"]
            for sport in sports:
                news = await sports_service.scrape_espn_news(sport)
                if news:
                    await sports_service.store_sports_content(news, "news", sport.upper())
            
            # Scrape video content
            videos = await sports_service.scrape_sports_videos()
            if videos:
                await sports_service.store_sports_content(videos, "video", "General")
            
            # Update trending scores
            await sports_service.update_trending_scores()
            
            print("✅ Sports data updated successfully")
            
        except Exception as e:
            print(f"❌ Error in background sports update: {e}")
        
        # Wait 30 minutes before next update
        await asyncio.sleep(1800)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup - validate environment first (can be skipped)
    validate_environment()
    try:
        await init_database()
    except Exception as e:
        print(f"⚠️  Database init failed or skipped: {e}")

    # Bootstrap Highlightly team cache on startup (ensure before first agent call)
    try:
        count = await warm_highlightly_cache("NFL")
        if count:
            print(f"✅ Highlightly teams cache loaded: {count} teams")
    except Exception as e:
        print(f"⚠️  Failed to bootstrap Highlightly teams cache: {e}")

    # Start background task for sports data updates unless disabled
    task = None
    if os.getenv("DISABLE_BACKGROUND_TASKS", "").lower() not in {"1", "true", "yes"}:
        task = asyncio.create_task(update_sports_data())
    else:
        print("ℹ️  Background tasks disabled (DISABLE_BACKGROUND_TASKS enabled)")

    try:
        yield
    finally:
        # Shutdown
        try:
            if task:
                task.cancel()
        except Exception:
            pass
        try:
            hl = await get_highlightly_client()
            await hl.close()
        except Exception:
            pass
        agent = get_agent()
        if agent:
            await agent.cleanup()
        try:
            await sports_service.close_session()
        except Exception:
            pass
        try:
            await close_database()
        except Exception:
            pass

# Create the main app
app = FastAPI(title="PLAYMAKER Sports AI API", version="1.0.0", lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CORS middleware
# Configure based on environment
# Configure based on environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://sportssense.dev,https://www.sportssense.dev").split(",")
if ALLOWED_ORIGINS == ["*"]:
    print("⚠️  WARNING: CORS is allowing all origins. Set ALLOWED_ORIGINS in production!")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression middleware for responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================================
# AUTHENTICATION ENDPOINTS
# ================================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check username availability
        existing_username = await db.users.find_one({"username": user_data.username})
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create new user
        user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            interests=["NFL", "NBA"]  # Default interests
        )
        
        # Insert user into database
        result = await db.users.insert_one(user.dict(exclude={"id"}))
        user.id = result.inserted_id
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            user=user_to_response(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login user."""
    user = await authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user=user_to_response(user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return user_to_response(current_user)

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user profile."""
    update_data = {}
    
    if profile_data.username:
        # Check username availability
        existing = await db.users.find_one({
            "username": profile_data.username,
            "_id": {"$ne": current_user.id}
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        update_data["username"] = profile_data.username
    
    if profile_data.interests is not None:
        update_data["interests"] = profile_data.interests
    
    if update_data:
        await db.users.update_one(
            {"_id": current_user.id},
            {"$set": update_data}
        )
    
    # Get updated user
    updated_user_data = await db.users.find_one({"_id": current_user.id})
    updated_user = User(**updated_user_data)
    
    return user_to_response(updated_user)

# ================================
# CHAT ENDPOINTS
# ================================

@api_router.post("/chats", response_model=ChatResponse)
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new chat."""
    chat = Chat(
        user_id=current_user.id,
        title=chat_data.title or "New Chat"
    )
    
    result = await db.chats.insert_one(chat.dict(exclude={"id"}))
    chat.id = result.inserted_id
    
    return ChatResponse(
        id=str(chat.id),
        user_id=str(chat.user_id),
        title=chat.title,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        message_count=0
    )

@api_router.get("/chats", response_model=List[ChatResponse])
async def get_user_chats(current_user: User = Depends(get_current_user)):
    """Get user's chats."""
    # Use projection to only fetch needed fields (reduces data transfer)
    cursor = db.chats.find(
        {"user_id": current_user.id},
        {"_id": 1, "user_id": 1, "title": 1, "created_at": 1, "updated_at": 1, "message_count": 1}
    ).sort("updated_at", -1).limit(50)  # Limit to recent 50 chats
    chats = []

    async for chat_data in cursor:
        chats.append(ChatResponse(
            id=str(chat_data["_id"]),
            user_id=str(chat_data["user_id"]),
            title=chat_data["title"],
            created_at=chat_data["created_at"],
            updated_at=chat_data["updated_at"],
            message_count=chat_data.get("message_count", 0)
        ))

    return chats

@api_router.get("/chats/{chat_id}", response_model=ChatWithMessages)
async def get_chat_with_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get chat with messages."""
    # Verify chat belongs to user
    try:
        # Use projection to only fetch needed fields
        chat_data = await db.chats.find_one(
            {"_id": ObjectId(chat_id), "user_id": current_user.id},
            {"_id": 1, "user_id": 1, "title": 1, "created_at": 1, "updated_at": 1, "message_count": 1}
        )
        if not chat_data:
            raise HTTPException(status_code=404, detail="Chat not found")

        # Get messages with projection and limit to prevent excessive data
        cursor = db.messages.find(
            {"chat_id": ObjectId(chat_id)},
            {"_id": 1, "chat_id": 1, "type": 1, "content": 1, "timestamp": 1, "sports_context": 1, "chat_answer": 1}
        ).sort("timestamp", 1).limit(100)  # Limit to 100 most recent messages
        messages = []

        async for msg_data in cursor:
            messages.append(MessageResponse(
                id=str(msg_data["_id"]),
                chat_id=str(msg_data["chat_id"]),
                type=msg_data["type"],
                content=msg_data["content"],
                timestamp=msg_data["timestamp"],
                sports_context=msg_data.get("sports_context"),
                chat_answer=msg_data.get("chat_answer")  # Include ChatAnswer structure
            ))

        chat_response = ChatResponse(
            id=str(chat_data["_id"]),
            user_id=str(chat_data["user_id"]),
            title=chat_data["title"],
            created_at=chat_data["created_at"],
            updated_at=chat_data["updated_at"],
            message_count=len(messages)
        )

        return ChatWithMessages(chat=chat_response, messages=messages)

    except Exception as e:
        raise HTTPException(status_code=404, detail="Chat not found")

@api_router.delete("/chats/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a chat."""
    try:
        # Verify chat belongs to user
        chat_data = await db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user.id
        })
        if not chat_data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Delete messages first
        await db.messages.delete_many({"chat_id": ObjectId(chat_id)})
        
        # Delete chat
        await db.chats.delete_one({"_id": ObjectId(chat_id)})
        
        return {"message": "Chat deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=404, detail="Chat not found")

@api_router.put("/chats/{chat_id}/title", response_model=ChatResponse)
async def update_chat_title(
    chat_id: str,
    title_data: ChatUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update chat title."""
    try:
        # Verify chat belongs to user and update
        result = await db.chats.update_one(
            {"_id": ObjectId(chat_id), "user_id": current_user.id},
            {"$set": {"title": title_data.title, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Get updated chat
        chat_data = await db.chats.find_one({"_id": ObjectId(chat_id)})
        
        return ChatResponse(
            id=str(chat_data["_id"]),
            user_id=str(chat_data["user_id"]),
            title=chat_data["title"],
            created_at=chat_data["created_at"],
            updated_at=chat_data["updated_at"],
            message_count=chat_data.get("message_count", 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=404, detail="Chat not found")

@api_router.post("/chats/{chat_id}/messages", response_model=MessageResponse)
async def send_message(
    chat_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send message and get AI response."""
    try:
        # Verify chat belongs to user
        chat_data = await db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user.id
        })
        if not chat_data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Store user message
        user_message = Message(
            chat_id=ObjectId(chat_id),
            type="user",
            content=message_data.content
        )
        
        result = await db.messages.insert_one(user_message.dict(exclude={"id"}))
        
        # Check for demo/mock mode FIRST
        demo_mode = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
        
        # Get sports context (legacy method for fallback) - skip in demo mode
        if demo_mode:
            sports_context = {}
        else:
            sports_context = await sports_service.get_sports_context(
                message_data.content, 
                current_user.interests
            )
        
        # Fetch recent chat history for continuity (exclude current message)
        cursor = db.messages.find(
            {
                "chat_id": ObjectId(chat_id),
                "_id": {"$ne": result.inserted_id}
            },
            {"type": 1, "content": 1, "_id": 0}
        ).sort("timestamp", -1).limit(5)
        
        chat_history = []
        async for msg in cursor:
            chat_history.append({"role": "user" if msg["type"] == "user" else "assistant", "content": msg["content"]})
        # Reverse to chronological order
        chat_history.reverse()
        
        if demo_mode:
            from backend.mock_data import create_mock_game_response
            logger.info("Using demo mode - returning mock data")
            mock_answer = create_mock_game_response()
            agent_response = {
                "ok": True,
                "answer": mock_answer["text"],
                "chat_answer": mock_answer,
                "context": {
                    "mode": "demo",
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        else:
            # Use new agent system with Sportradar integration
            agent = get_agent()
            if agent:
                agent_response = await agent.answer_with_sportradar(
                    message_data.content,
                    chat_id,
                    current_user.interests,
                    chat_history=chat_history
                )
            else:
                agent_response = {"error": "AI service unavailable"}
        
        # Handle agent response
        chat_answer_data = None
        if agent_response.get("ok", False):
            ai_response = agent_response["answer"]
            chat_answer_data = agent_response.get("chat_answer")  # Get the full ChatAnswer structure
            # Add agent context to sports context
            sports_context.update({
                "agent_used": True,
                "source": agent_response.get("source", "Unknown"),
                "processing_time_ms": agent_response.get("context", {}).get("processing_time_ms", 0),
                "chat_answer": chat_answer_data  # Include ChatAnswer in sports context for backward compatibility
            })
        else:
            # Fallback to legacy AI service (if available)
            print(f"⚠️ Agent failed, attempting fallback: {agent_response.get('error', 'Unknown error')}")
            _svc = get_ai_service()
            if _svc:
                ai_response = await _svc.get_ai_response(
                    message_data.content,
                    chat_id,
                    sports_context
                )
            else:
                ai_response = (
                    "I'm up, but advanced AI is not configured yet. Try again after setup. 🏈"
                )
            sports_context["agent_used"] = False
            sports_context["fallback_reason"] = agent_response.get("error", "Unknown error")
        
        # Store AI message
        ai_message = Message(
            chat_id=ObjectId(chat_id),
            type="ai",
            content=ai_response,
            sports_context=sports_context,
            chat_answer=chat_answer_data  # Store the ChatAnswer structure
        )
        
        result = await db.messages.insert_one(ai_message.dict(exclude={"id"}))
        ai_message.id = result.inserted_id
        
        # Update chat title if this is the first message
        message_count = await db.messages.count_documents({"chat_id": ObjectId(chat_id)})
        if message_count <= 2:  # User message + AI response
            _svc = get_ai_service()
            if _svc:
                # Audit: log when highlightly data is empty before requesting a title
                try:
                    hd = (chat_answer_data or {}).get("debug", {}).get("highlightly_data") if isinstance(chat_answer_data, dict) else None
                    is_empty = False
                    if hd is None:
                        is_empty = True
                    elif isinstance(hd, dict):
                        # consider empty if no keys or data list empty
                        is_empty = (len(hd.keys()) == 0) or (isinstance(hd.get("data"), list) and len(hd.get("data")) == 0)
                    elif isinstance(hd, list):
                        is_empty = len(hd) == 0
                    if is_empty:
                        logger.warning("[AUDIT][TITLE_REQ] title generation skipped since highlightly_data=0")
                except Exception:
                    pass
                title = await _svc.generate_chat_title(message_data.content)
                if not title:
                    title = (message_data.content[:32] + "...") if len(message_data.content) > 35 else message_data.content
            else:
                title = (message_data.content[:32] + "...") if len(message_data.content) > 35 else message_data.content
            await db.chats.update_one(
                {"_id": ObjectId(chat_id)},
                {"$set": {"title": title}}
            )
        
        # Update chat updated_at and message count
        await db.chats.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": {"updated_at": datetime.utcnow(), "message_count": message_count}}
        )
        
        return MessageResponse(
            id=str(ai_message.id),
            chat_id=str(ai_message.chat_id),
            type=ai_message.type,
            content=ai_message.content,
            timestamp=ai_message.timestamp,
            sports_context=ai_message.sports_context,
            chat_answer=ai_message.chat_answer  # Include ChatAnswer structure
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )

# ================================
# PUBLIC CHATBOT (NO AUTH)
# ================================



# ================================
# SPORTS DATA ENDPOINTS
# ================================

@api_router.get("/sports/trending", response_model=TrendingResponse)
async def get_trending_sports():
    """Get trending sports topics."""
    try:
        # Check cache first (5 minute TTL)
        cache_key = "trending_sports"
        cached = cache.get(cache_key)
        if cached:
            logger.debug("Returning cached trending sports")
            return cached

        # Use projection to only fetch needed fields
        cursor = db.sports_content.find(
            {},
            {"_id": 1, "type": 1, "sport": 1, "title": 1, "content": 1, "source": 1, "url": 1, "engagement": 1, "created_at": 1, "trending_score": 1}
        ).sort("trending_score", -1).limit(20)

        topics = []
        async for topic in cursor:
            topics.append(SportsContentResponse(
                id=str(topic["_id"]),
                type=topic.get("type", "news"),
                sport=topic["sport"],
                title=topic["title"],
                content=topic.get("content", topic["title"]),
                source=topic["source"],
                url=topic.get("url"),
                engagement=topic.get("engagement", 0),
                created_at=topic.get("created_at", datetime.utcnow()),
                trending_score=topic.get("trending_score", 0.0)
            ))

        result = TrendingResponse(topics=topics, total=len(topics))

        # Cache for 5 minutes
        cache.set(cache_key, result, ttl_seconds=300)

        return result

    except Exception as e:
        logger.error(f"Error getting trending topics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get trending topics"
        )

@api_router.get("/teams")
async def list_cached_teams():
    """Return cached teams from Highlightly bootstrap."""
    try:
        # Check cache first (30 minute TTL for teams data)
        cache_key = "all_teams"
        cached = cache.get(cache_key)
        if cached:
            logger.debug("Returning cached teams data")
            return cached

        hl = await get_highlightly_client()
        teams = await hl.get_all_teams()
        result = {"total": len(teams), "teams": teams}

        # Cache for 30 minutes
        cache.set(cache_key, result, ttl_seconds=1800)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load teams: {e}")

@api_router.get("/sports/{sport}")
async def get_sport_data(sport: str):
    """Get data for specific sport."""
    try:
        # Get recent news for the sport
        news = await sports_service.scrape_espn_news(sport.lower())
        
        # Get trending topics for the sport
        cursor = db.sports_content.find({"sport": sport.upper()}).sort("trending_score", -1).limit(10)
        trending = []
        
        async for doc in cursor:
            trending.append({
                "id": str(doc["_id"]),
                "title": doc["title"],
                "type": doc["type"],
                "engagement": doc["engagement"],
                "trending_score": doc["trending_score"],
                "source": doc["source"],
                "url": doc.get("url"),
                "created_at": doc["created_at"]
            })
        
        return {
            "sport": sport.upper(),
            "news": news[:10],
            "trending": trending,
            "total_items": len(news) + len(trending)
        }
        
    except Exception as e:
        logger.error(f"Error getting {sport} data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get {sport} data"
        )

# DEPRECATED: Orphaned endpoint (no active UI consumer). Keeping commented for reference.
# @api_router.get("/sports/videos")
# async def get_sports_videos():
#     """Get sports video content (deprecated)."""
#     try:
#         videos = await sports_service.scrape_sports_videos()
#         return {"videos": videos, "total": len(videos)}
#     except Exception as e:
#         logger.error(f"Error getting sports videos: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to get sports videos"
#         )

@api_router.post("/sports/analyze")
async def analyze_sports_query(
    request: SportsAnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """Analyze sports query with context."""
    try:
        # Get sports context if requested
        sports_context = None
        if request.include_context:
            sports_context = await sports_service.get_sports_context(
                request.query,
                current_user.interests
            )
        
        # Get AI analysis (fallback if AI service unavailable)
        _svc = get_ai_service()
        if _svc:
            response = await _svc.get_ai_response(
                request.query,
                f"analyze-{current_user.id}-{datetime.now().timestamp()}",
                sports_context
            )
        else:
            response = "Analysis service not configured yet. Please enable AI keys or use the public chatbot endpoint."
        
        return {
            "query": request.query,
            "analysis": response,
            "context_used": sports_context is not None,
            "sports_context": sports_context
        }
        
    except Exception as e:
        logger.error(f"Error analyzing sports query: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze query"
        )

@api_router.post("/agent/ask")
async def ask_agent(
    request: SportsAnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """Direct access to Sportradar agent system"""
    try:
        # Check for demo/mock mode
        if os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes"):
            from backend.mock_data import create_mock_game_response
            logger.info("Using demo mode - returning mock data")
            mock_answer = create_mock_game_response()
            return {
                "ok": True,
                "answer": mock_answer["text"],
                "chat_answer": mock_answer,
                "context": {
                    "mode": "demo",
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        
        # Use agent with Sportradar integration
        agent = get_agent()
        if agent:
            agent_response = await agent.answer_with_sportradar(
                request.query,
                f"agent-{current_user.id}-{datetime.now().timestamp()}",
                current_user.interests
            )
        else:
            agent_response = {"error": "AI service unavailable"}
        
        return agent_response
        
    except Exception as e:
        logger.error(f"Error in agent ask: {e}")
        return {
            "ok": False,
            "error": f"Agent request failed: {str(e)}",
            "context": {
                "error_type": "endpoint_error",
                "service": "agent",
                "timestamp": datetime.utcnow().isoformat()
            }
        }

@api_router.get("/agent/health")
async def agent_health():
    """Check agent system health"""
    try:
        agent = get_agent()
        if agent:
            health = await agent.health_check()
            return health
        else:
            return {
                "agent": "unavailable",
                "error": "AI service not loaded",
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "agent": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# ================================
# PULSE AI ENDPOINTS (Proxy to Pulse AI service)
# ================================

@api_router.post("/pulse-ai/recognize")
async def pulse_ai_recognize(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Proxy endpoint to Pulse AI recognition service"""
    try:
        import httpx
        
        # Pulse AI service URL (can be configured via env var)
        pulse_ai_url = os.getenv("PULSE_AI_URL", "http://localhost:8001")
        
        # Read audio data
        audio_data = await audio_file.read()
        
        # Forward to Pulse AI service
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"audio_file": (audio_file.filename, audio_data, audio_file.content_type)}
            response = await client.post(f"{pulse_ai_url}/recognize", files=files)
            response.raise_for_status()
            return response.json()
            
    except httpx.RequestError as e:
        logger.error(f"Pulse AI service connection error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Pulse AI service unavailable. Please try again later."
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"Pulse AI service error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Pulse AI recognition failed: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"Pulse AI proxy error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal error processing audio: {str(e)}"
        )

@api_router.post("/pulse-ai/recognize/voice-only")
async def pulse_ai_recognize_voice_only(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Proxy endpoint to Pulse AI voice-only recognition"""
    try:
        import httpx
        
        # Pulse AI service URL
        pulse_ai_url = os.getenv("PULSE_AI_URL", "http://localhost:8001")
        
        # Read audio data
        audio_data = await audio_file.read()
        
        # Forward to Pulse AI service
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"audio_file": (audio_file.filename, audio_data, audio_file.content_type)}
            response = await client.post(f"{pulse_ai_url}/recognize/voice-only", files=files)
            response.raise_for_status()
            
            # Return audio response
            from fastapi import Response
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "audio/mpeg"),
                headers={
                    "X-Total-Latency-Ms": response.headers.get("X-Total-Latency-Ms", ""),
                    "X-Narrative-Text": response.headers.get("X-Narrative-Text", "")
                }
            )
            
    except httpx.RequestError as e:
        logger.error(f"Pulse AI service connection error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Pulse AI service unavailable. Please try again later."
        )
    except Exception as e:
        logger.error(f"Pulse AI proxy error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal error processing audio: {str(e)}"
        )

# ================================
# PLAYER COMPARISON ENDPOINTS
# ================================

@api_router.get("/players/search")
async def search_players(
    query: str,
    sport: str = "NFL",
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Search for players by name across different sports"""
    try:
        from backend.services.highlightly import get_highlightly_client

        # Check cache first
        cache_key = f"player_search_{sport}_{query}_{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        hl = await get_highlightly_client()

        # Get teams for the sport
        teams = await hl.get_teams(league=sport)

        # Search for players matching the query
        players = []
        query_lower = query.lower()

        # For each team, get roster and search for matching players
        for team in teams[:20]:  # Limit to 20 teams for performance
            try:
                team_id = team.get("id")
                if not team_id:
                    continue

                # Get team statistics which includes player data
                stats = await hl.get_team_statistics(team_id)

                # Extract players from the stats
                if stats and isinstance(stats, dict):
                    # Look for player data in different possible structures
                    player_list = stats.get("players", []) or stats.get("roster", [])

                    for player in player_list:
                        if isinstance(player, dict):
                            player_name = player.get("name", "") or player.get("playerName", "")
                            if player_name and query_lower in player_name.lower():
                                players.append({
                                    "id": player.get("id") or f"{team_id}_{player_name}",
                                    "name": player_name,
                                    "team": team.get("name", ""),
                                    "team_id": team_id,
                                    "position": player.get("position", ""),
                                    "photo": player.get("photo") or player.get("image"),
                                    "sport": sport
                                })

                                if len(players) >= limit:
                                    break

            except Exception as e:
                logger.warning(f"Error searching team {team.get('name')}: {e}")
                continue

            if len(players) >= limit:
                break

        result = {
            "players": players[:limit],
            "total": len(players),
            "query": query,
            "sport": sport
        }

        # Cache for 30 minutes
        cache.set(cache_key, result, ttl_seconds=1800)

        return result

    except Exception as e:
        logger.error(f"Error searching players: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search players: {str(e)}"
        )

@api_router.post("/players/compare")
async def compare_players(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Compare multiple players (2-4 players) with detailed statistics and visualizations"""
    try:
        player_ids = request.get("player_ids", [])
        sport = request.get("sport", "NFL")

        if not player_ids or len(player_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 players required for comparison"
            )

        if len(player_ids) > 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 4 players can be compared at once"
            )

        # Check cache first
        cache_key = f"player_compare_{sport}_{'_'.join(sorted(player_ids))}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        from backend.services.highlightly import get_highlightly_client

        hl = await get_highlightly_client()

        # Fetch data for each player
        players_data = []

        # Fetch data for each player in parallel
        async def fetch_player_data(player_id):
            try:
                # Extract team_id and player name from composite ID
                if "_" in str(player_id):
                    parts = str(player_id).split("_", 1)
                    team_id = parts[0]
                    player_name = parts[1] if len(parts) > 1 else player_id
                else:
                    # Try to find player by ID
                    team_id = None
                    player_name = player_id

                # Get team statistics
                if team_id:
                    # Pass team_id directly (as int if possible) to avoid name resolution
                    try:
                        tid = int(team_id)
                    except ValueError:
                        tid = team_id
                        
                    stats = await hl.get_team_statistics(tid)

                    # Find the specific player in the team stats
                    player_list = stats.get("players", []) or stats.get("roster", [])

                    for player in player_list:
                        if isinstance(player, dict):
                            p_name = player.get("name", "") or player.get("playerName", "")
                            # Match by name or ID
                            if p_name == player_name or str(player.get("id")) == str(player_id):
                                # Build comprehensive player data
                                player_stats = {
                                    "name": p_name,
                                    "team": stats.get("team", {}).get("name", ""),
                                    "position": player.get("position", ""),
                                    "photo": player.get("photo") or player.get("image"),
                                    "stats": {},
                                    "impact_score": 0
                                }

                                # Extract statistics
                                player_statistics = player.get("statistics", {})
                                if isinstance(player_statistics, dict):
                                    for stat_key, stat_value in player_statistics.items():
                                        if isinstance(stat_value, (int, float)):
                                            player_stats["stats"][stat_key] = stat_value

                                # Calculate impact score (simple weighted average)
                                if player_stats["stats"]:
                                    total_stats = sum(player_stats["stats"].values())
                                    avg_stat = total_stats / len(player_stats["stats"])
                                    player_stats["impact_score"] = round(avg_stat, 2)

                                return player_stats
                return None
            except Exception as e:
                logger.warning(f"Error fetching data for player {player_id}: {e}")
                return None

        # Execute parallel requests
        results = await asyncio.gather(*[fetch_player_data(pid) for pid in player_ids])
        players_data = [p for p in results if p is not None]

        if len(players_data) < 2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Could not fetch data for enough players to compare"
            )

        # Build comparison metrics
        all_stat_keys = set()
        for player in players_data:
            all_stat_keys.update(player["stats"].keys())

        comparison_metrics = list(all_stat_keys)

        # Build chart data for visualization
        chart_data = {
            "type": "bar",
            "data": []
        }

        for stat_key in comparison_metrics[:10]:  # Limit to top 10 metrics for clarity
            chart_item = {"category": stat_key.replace("_", " ").title()}
            for i, player in enumerate(players_data):
                chart_item[f"player_{i+1}"] = player["stats"].get(stat_key, 0)
            chart_data["data"].append(chart_item)

        # Build radar chart data for skills comparison
        radar_data = []
        for stat_key in comparison_metrics[:8]:  # Top 8 metrics for radar
            radar_item = {"skill": stat_key.replace("_", " ").title()}
            for i, player in enumerate(players_data):
                radar_item[f"player_{i+1}"] = player["stats"].get(stat_key, 0)
            radar_data.append(radar_item)

        # Winner analysis - who wins in each category
        winner_analysis = {}
        for stat_key in comparison_metrics:
            max_value = -float('inf')
            winner = None

            for player in players_data:
                value = player["stats"].get(stat_key, 0)
                if value > max_value:
                    max_value = value
                    winner = player["name"]

            if winner:
                winner_analysis[stat_key] = winner

        result = {
            "players": players_data,
            "comparison_metrics": comparison_metrics,
            "chart_data": chart_data,
            "radar_data": radar_data,
            "winner_analysis": winner_analysis,
            "sport": sport,
            "total_players": len(players_data)
        }

        # Cache for 30 minutes
        cache.set(cache_key, result, ttl_seconds=1800)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing players: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare players: {str(e)}"
        )

# ================================
# USER PREFERENCES
# ================================

@api_router.get("/user/interests")
async def get_user_interests(current_user: User = Depends(get_current_user)):
    """Get user's sports interests."""
    return {"interests": current_user.interests}

@api_router.put("/user/interests")
async def update_user_interests(
    interests: List[str],
    current_user: User = Depends(get_current_user)
):
    """Update user's sports interests."""
    # Validate interests
    valid_sports = ["NFL", "NBA", "MLB", "NHL", "Football", "Basketball", "Baseball", "Hockey", "Soccer", "Tennis", "Golf"]
    filtered_interests = [sport for sport in interests if sport in valid_sports]
    
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"interests": filtered_interests}}
    )
    
    return {"interests": filtered_interests, "message": "Interests updated successfully"}

@api_router.get("/user/subscription")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """Get user's subscription status."""
    return {
        "subscription": current_user.subscription,
        "is_pro": current_user.subscription == "pro"
    }

# ================================
# BASIC HEALTH CHECK
# ================================

@api_router.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "PLAYMAKER Sports AI API is running! 🏆",
        "version": "1.0.0",
        "status": "active"
    }

# Include the router in the main app
app.include_router(api_router)
