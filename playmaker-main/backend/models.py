from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any, Annotated, Union, Literal
from datetime import datetime
from bson import ObjectId
import uuid

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, validation_info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

# User Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    interests: Optional[List[str]] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    username: str
    email: str
    interests: List[str] = Field(default_factory=list)
    subscription: str = "free"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)

class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: str
    password_hash: str
    interests: List[str] = Field(default_factory=list)
    subscription: str = "free"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)

# Chat Models
class ChatCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatUpdate(BaseModel):
    title: str

class ChatResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(alias="_id")
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

class Chat(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    title: str = "New Chat"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = 0

# Message Models
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)

class MessageResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(alias="_id")
    chat_id: str
    type: str  # "user" | "ai"
    content: str
    timestamp: datetime
    sports_context: Optional[Dict[str, Any]] = None
    chat_answer: Optional[Dict[str, Any]] = None  # For structured ChatAnswer data

class Message(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    chat_id: PyObjectId
    type: str  # "user" | "ai"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sports_context: Optional[Dict[str, Any]] = None
    chat_answer: Optional[Dict[str, Any]] = None  # For structured ChatAnswer data

# Sports Content Models
class SportsContentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(alias="_id")
    type: str  # "news", "video", "social", "stats"
    sport: str  # "NFL", "NBA", etc.
    title: str
    content: str
    source: str
    url: Optional[str] = None
    engagement: int = 0
    created_at: datetime
    trending_score: float = 0.0

class SportsContent(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    type: str  # "news", "video", "social", "stats"
    sport: str  # "NFL", "NBA", etc.
    title: str
    content: str
    source: str
    url: Optional[str] = None
    engagement: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    trending_score: float = 0.0

# Structured Content Card Models for Rich Frontend Display
class ScoreCard(BaseModel):
    type: Literal["scorecard"]
    title: Optional[str] = None
    # Allow nested dicts for stats and metadata per team
    teams: List[Dict[str, Any]]
    meta: Optional[Dict[str, Any]] = None
    quarters: Optional[List[Dict[str, Any]]] = None  # Quarter-by-quarter breakdown
    chart_data: Optional[Dict[str, Any]] = None  # For scoring trend charts

class StatsCard(BaseModel):
    type: Literal["statistics"]  
    title: Optional[str] = None
    headers: List[str]
    rows: List[List[Union[str, int, float]]]
    chart_type: Optional[Literal["table", "bar", "line", "pie", "radar"]] = "table"
    chart_data: Optional[Dict[str, Any]] = None  # For recharts visualization
    sortable: Optional[bool] = True
    comparative: Optional[bool] = False  # For side-by-side comparisons

class PlayerCard(BaseModel):
    type: Literal["player"]
    title: Optional[str] = None
    player_name: str
    team: Optional[str] = None
    position: Optional[str] = None
    stats: Optional[Dict[str, Union[str, int, float]]] = None
    image_url: Optional[str] = None
    season_stats: Optional[Dict[str, Any]] = None  # Career/season data
    performance_chart: Optional[Dict[str, Any]] = None  # Quarter-by-quarter performance
    impact_score: Optional[float] = None  # Overall impact calculation
    radar_chart_data: Optional[List[Dict[str, Any]]] = None  # For skill radar chart

class ComparisonCard(BaseModel):
    type: Literal["comparison"]
    title: Optional[str] = None
    players: List[Dict[str, Any]]  # Array of player data for comparison
    comparison_metrics: List[str]  # Metrics being compared
    chart_data: Optional[Dict[str, Any]] = None  # Side-by-side visualization data
    winner_analysis: Optional[Dict[str, Any]] = None  # Who wins in each category

class TrendCard(BaseModel):
    type: Literal["trend"]
    title: Optional[str] = None
    metric_name: str  # e.g., "3-Point Shooting %"
    time_period: str  # e.g., "Season 2024-25"
    trend_data: List[Dict[str, Union[str, float]]]  # Time series data
    chart_type: Literal["line", "bar"] = "line"
    prediction: Optional[Dict[str, Any]] = None  # Future performance prediction

class HighlightVideoCard(BaseModel):
    type: Literal["highlight_video"]
    title: Optional[str] = None
    items: List[Dict[str, Any]]

class ImageGalleryCard(BaseModel):
    type: Literal["image_gallery"] 
    title: Optional[str] = None
    items: List[Dict[str, Any]]

class TopPlayerCard(BaseModel):
    type: Literal["top_player"]
    title: Optional[str] = None
    teams: List[Dict[str, Any]]  # each: { name, logo, player: { playerName, playerPosition, name, value } }
    meta: Optional[Dict[str, Any]] = None

# NFL/NCAA Match Models
class TeamInfo(BaseModel):
    id: int
    displayName: str
    name: str
    abbreviation: str
    logo: str

class MatchState(BaseModel):
    clock: int
    report: str
    description: str
    score: Dict[str, Optional[str]]
    period: int

class MatchCard(BaseModel):
    type: Literal["match"]
    id: int
    league: str
    season: int
    round: str
    date: datetime
    homeTeam: TeamInfo
    awayTeam: TeamInfo
    state: MatchState

class TextCard(BaseModel):
    type: Literal["text"]
    content: str

# Union type for all card types
Card = Union[ScoreCard, StatsCard, PlayerCard, ComparisonCard, TrendCard, HighlightVideoCard, ImageGalleryCard, TopPlayerCard, MatchCard, TextCard]

class ChatAnswer(BaseModel):
    """Structured response format for AI chat responses with rich content cards"""
    title: Optional[str] = None
    text: Optional[str] = None
    cards: List[Card] = Field(default_factory=list)
    debug: Optional[Dict[str, Any]] = None

# API Response Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChatWithMessages(BaseModel):
    chat: ChatResponse
    messages: List[MessageResponse]
    
class TrendingResponse(BaseModel):
    topics: List[SportsContentResponse]
    total: int
    
class SportsAnalyzeRequest(BaseModel):
    query: str
    sport: Optional[str] = None
    include_context: bool = True
    session_id: Optional[str] = None  # For maintaining conversation context

# ========================================
# DATA CACHING MODELS (Teams & Players)
# ========================================

class TeamCache(BaseModel):
    """Cached team data for quick lookups and reducing API calls"""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    sport: str  # "NFL", "NBA", "MLB", etc.
    team_id: Optional[str] = None  # External API team ID
    name: str  # Full name: "Kansas City Chiefs"
    short_name: Optional[str] = None  # "Chiefs"
    abbreviation: str  # "KC"
    aliases: List[str] = Field(default_factory=list)  # ["Chiefs", "KC", "Kansas City"]
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    conference: Optional[str] = None  # "AFC", "NFC", "Eastern", etc.
    division: Optional[str] = None  # "West", "East", "Central", etc.
    stadium: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    founded: Optional[int] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PlayerCache(BaseModel):
    """Cached player data for quick lookups and comparisons"""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    sport: str  # "NFL", "NBA", "MLB", etc.
    player_id: Optional[str] = None  # External API player ID
    full_name: str  # "Patrick Mahomes"
    first_name: str  # "Patrick"
    last_name: str  # "Mahomes"
    aliases: List[str] = Field(default_factory=list)  # ["Mahomes", "Patrick Mahomes II"]
    team: str  # "Kansas City Chiefs"
    team_abbreviation: str  # "KC"
    position: str  # "QB", "WR", "RB", etc.
    jersey_number: Optional[int] = None
    height: Optional[str] = None  # "6-3"
    weight: Optional[int] = None  # 225
    age: Optional[int] = None
    birth_date: Optional[str] = None
    college: Optional[str] = None
    experience: Optional[int] = None  # Years in league
    headshot_url: Optional[str] = None

    # Current season stats (updated regularly)
    season: str = "2024"  # "2024", "2024-25", etc.
    stats: Dict[str, Any] = Field(default_factory=dict)  # Position-specific stats

    # Metadata
    is_active: bool = True
    last_game_date: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PlayerStatsSnapshot(BaseModel):
    """Historical snapshot of player stats for trend analysis"""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    player_id: str  # Reference to PlayerCache
    sport: str
    season: str
    week: Optional[int] = None  # For weekly sports like NFL
    date: datetime
    stats: Dict[str, Any]  # Stats at this point in time
    created_at: datetime = Field(default_factory=datetime.utcnow)
