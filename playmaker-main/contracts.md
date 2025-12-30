# SportsBuddy (PLAYMAKER) - Backend Implementation Contracts

## API Contracts

### Authentication Endpoints
```
POST /api/auth/register        # User registration
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout  
GET /api/auth/me              # Get current user
PUT /api/auth/profile         # Update user profile
```

### Chat Endpoints
```
POST /api/chats                    # Create new chat
GET /api/chats                     # Get user's chats
GET /api/chats/{chat_id}           # Get specific chat with messages
DELETE /api/chats/{chat_id}        # Delete chat
POST /api/chats/{chat_id}/messages # Send message & get AI response
PUT /api/chats/{chat_id}/title     # Update chat title
```

### Sports Data Endpoints
```
GET /api/sports/trending           # Get trending sports topics
GET /api/sports/nfl               # NFL data and news
GET /api/sports/nba               # NBA data and news
GET /api/sports/football          # Football data and news
GET /api/sports/baseball          # Baseball data and news
GET /api/sports/videos            # Sports video content
POST /api/sports/analyze          # Analyze sports query with context
```

### User Preferences
```
GET /api/user/interests           # Get user's sports interests
PUT /api/user/interests           # Update interests
GET /api/user/subscription        # Get subscription status
POST /api/user/subscribe          # Subscribe to PRO
```

## Database Models

### User Model
```python
{
    "id": ObjectId,
    "username": str,
    "email": str,
    "password_hash": str,
    "interests": [str],  # ["NBA", "NFL", etc.]
    "subscription": str,  # "free" | "pro"
    "created_at": datetime,
    "last_active": datetime
}
```

### Chat Model
```python
{
    "id": ObjectId,
    "user_id": ObjectId,
    "title": str,
    "created_at": datetime,
    "updated_at": datetime,
    "message_count": int
}
```

### Message Model
```python
{
    "id": ObjectId,
    "chat_id": ObjectId,
    "type": str,  # "user" | "ai"
    "content": str,
    "timestamp": datetime,
    "sports_context": dict  # Optional sports data context
}
```

### SportsContent Model
```python
{
    "id": ObjectId,
    "type": str,  # "news", "video", "social", "stats"
    "sport": str,  # "NFL", "NBA", etc.
    "title": str,
    "content": str,
    "source": str,
    "url": str,
    "engagement": int,
    "created_at": datetime,
    "trending_score": float
}
```

## Sports API Integration

### SportRadar API
- Live scores and stats
- Player information
- Team data
- Game schedules
- Historical data

### Broadage API
- Sports news aggregation
- Social media mentions
- Trending topics
- Real-time updates

### Free/Scraping Sources
- ESPN public data
- Reddit sports communities
- Twitter/X sports content
- YouTube sports channels
- Sports news RSS feeds

## Gemini AI Integration

### Sports-Focused System Prompt
```
You are PLAYMAKER, an AI sports assistant specialized in:
- Live sports analysis and commentary
- Player and team statistics
- Trade analysis and predictions
- Fantasy sports advice
- Historical sports data insights
- Real-time game updates

Always provide engaging, accurate, and current sports information.
Use sports emojis and formatting for better engagement.
```

### Context Enhancement
- Inject current sports data into prompts
- Include relevant statistics
- Add trending topics context
- Provide real-time game information

## Implementation Plan

### Phase 1: Authentication & Core Setup
1. Install required dependencies
2. Set up JWT authentication
3. Create user registration/login endpoints
4. Implement password hashing and validation

### Phase 2: Database Models & Chat System
1. Create MongoDB models
2. Implement chat CRUD operations
3. Set up message storage and retrieval
4. Add chat history management

### Phase 3: Gemini AI Integration
1. Configure emergentintegrations
2. Implement sports-focused AI responses
3. Add context injection system
4. Set up response streaming

### Phase 4: Sports Data Integration
1. Integrate SportRadar API
2. Set up Broadage API
3. Implement content scraping
4. Create trending content system

### Phase 5: Frontend Integration
1. Replace mock data with real API calls
2. Implement authentication flow
3. Add real-time chat updates
4. Integrate sports content display

## Security & Performance
- JWT token validation
- Rate limiting on API endpoints
- Input sanitization
- Database query optimization
- Caching for sports data
- Content moderation