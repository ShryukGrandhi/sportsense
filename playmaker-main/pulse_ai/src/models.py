"""Pydantic models for data structures across layers"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class AudioFingerprint(BaseModel):
    """Audio input for ACR recognition"""
    audio_data: bytes
    duration_seconds: float
    sample_rate: int = 44100


class ACRResult(BaseModel):
    """Result from Layer 1 ACR"""
    game_id: str
    timestamp_offset: float  # seconds into the game
    confidence: float
    latency_ms: float


class GameContext(BaseModel):
    """Complete game state context"""
    quarter: int
    time_remaining: str
    score_home: int
    score_away: int
    score_differential: int
    game_phase: str  # "opening", "competitive", "close_game", "clutch_time", "blowout"
    momentum: str  # "home_surge", "away_surge", "neutral", "comeback"
    league: str = "NFL"
    season: str = "2024"


class GameFeatures(BaseModel):
    """Structured features for NLG (Layer 3 input)"""
    team_name: str
    opponent_name: str
    metric_id: str
    metric_value: Any
    situation: str  # e.g., "score_differential_leading"
    rank: Optional[str] = None
    game_context: Optional[GameContext] = None
    additional_context: Dict[str, Any] = Field(default_factory=dict)


class PlayByPlayEvent(BaseModel):
    """Individual play-by-play event"""
    event_id: str
    game_id: str
    timestamp: float  # seconds from game start
    event_type: str
    description: str
    team: str
    player: Optional[str] = None
    stats: Dict[str, Any] = Field(default_factory=dict)


class NarrativeScript(BaseModel):
    """Generated narrative from Layer 3"""
    text: str
    perplexity_score: Optional[float] = None
    latency_ms: float


class VoiceOutput(BaseModel):
    """Final TTS output from Layer 4"""
    audio_data: bytes
    format: str = "mp3"
    sample_rate: int = 44100
    latency_ms: float


class PulseAIResponse(BaseModel):
    """Complete end-to-end response"""
    acr_result: ACRResult
    features: GameFeatures
    narrative: NarrativeScript
    voice: VoiceOutput
    total_latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
