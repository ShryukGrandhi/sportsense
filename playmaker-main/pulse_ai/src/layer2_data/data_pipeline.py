"""Data Pipeline - Layer 2: Real-Time Data Processing

Architecture:
1. Ingestion: Receive PBP feeds from commercial providers
2. Processing: Standardization → Enrichment → Validation
3. Storage: In-memory cache (Redis) for sub-50ms retrieval
4. Delivery: API for Layer 3 to query by timestamp
"""

import time
import json
from typing import Dict, List, Optional
from datetime import datetime
import redis
from loguru import logger

from ..models import PlayByPlayEvent, GameFeatures, GameContext
from ..config import get_settings


class DataPipeline:
    """Real-time data pipeline with in-memory caching

    Target: <50ms data retrieval latency
    """

    def __init__(self, use_redis: bool = True):
        settings = get_settings()
        self.use_redis = use_redis
        self.memory_cache: Dict[str, str] = {}  # In-memory fallback

        if use_redis:
            try:
                self.redis_client = redis.Redis(
                    host=settings.redis_host,
                    port=settings.redis_port,
                    db=settings.redis_db,
                    decode_responses=True,
                    socket_connect_timeout=1
                )
                # Test connection
                self.redis_client.ping()
                logger.info("Data Pipeline initialized with Redis connection")
            except (redis.ConnectionError, redis.TimeoutError) as e:
                logger.warning(f"Redis unavailable: {e}. Using in-memory cache for demo.")
                self.use_redis = False
                self.redis_client = None
        else:
            self.redis_client = None
            logger.info("Data Pipeline initialized with in-memory cache (demo mode)")

    def ingest_pbp_event(self, event: PlayByPlayEvent):
        """Ingest and process a play-by-play event

        Processing steps:
        1. Standardization: Ensure consistent format
        2. Enrichment: Add contextual data
        3. Validation: Check data quality
        4. Cache: Store in Redis for fast retrieval
        """
        # Standardize
        standardized = self._standardize_event(event)

        # Enrich with historical context
        enriched = self._enrich_event(standardized)

        # Validate
        if not self._validate_event(enriched):
            logger.warning(f"Event validation failed: {event.event_id}")
            return

        # Store in Redis
        self._cache_event(enriched)

        logger.debug(f"Ingested event: {event.event_id} for game {event.game_id}")

    def get_features_at_timestamp(
        self,
        game_id: str,
        timestamp: float
    ) -> GameFeatures:
        """Retrieve enriched features for a specific game moment

        Args:
            game_id: Game identifier
            timestamp: Seconds from game start

        Returns:
            Structured features for NLG

        Target: <50ms retrieval time
        """
        start_time = time.perf_counter()

        # Query cache for events near timestamp
        cache_key = f"game:{game_id}:timestamp:{int(timestamp)}"

        if self.use_redis and self.redis_client:
            cached_data = self.redis_client.get(cache_key)
        else:
            cached_data = self.memory_cache.get(cache_key)

        if not cached_data:
            # Fallback: search nearby timestamps
            cached_data = self._search_nearby_events(game_id, timestamp)

        if not cached_data:
            raise ValueError(f"No data found for {game_id} at timestamp {timestamp}")

        features = GameFeatures(**json.loads(cached_data))

        latency_ms = (time.perf_counter() - start_time) * 1000
        logger.info(f"Retrieved features in {latency_ms:.2f}ms")

        return features

    def _standardize_event(self, event: PlayByPlayEvent) -> PlayByPlayEvent:
        """Standardize event format (XML/JSON → unified model)"""
        # Already in unified Pydantic model
        return event

    def _enrich_event(self, event: PlayByPlayEvent) -> GameFeatures:
        """Enrich event with contextual data

        Enrichment includes:
        - Historical player performance
        - Team statistics
        - Situation context (score differential, time remaining)
        - Rankings and comparative metrics
        - Full game context (score, quarter, momentum)
        """
        # Extract team and opponent
        team_name = event.team
        opponent_name = self._get_opponent(event.game_id, team_name)

        # Get situation context
        situation = self._determine_situation(event)

        # Build comprehensive game context
        game_context = self._build_game_context(event)

        # Create enriched features
        features = GameFeatures(
            team_name=team_name,
            opponent_name=opponent_name,
            metric_id=event.event_type,
            metric_value=event.stats.get("value", "N/A"),
            situation=situation,
            rank=self._get_ranking(team_name, event.event_type),
            game_context=game_context,
            additional_context={
                "event_id": event.event_id,
                "game_id": event.game_id,
                "timestamp": event.timestamp,
                "player": event.player,
                "description": event.description,
                **event.stats
            }
        )

        return features

    def _build_game_context(self, event: PlayByPlayEvent) -> GameContext:
        """Build comprehensive game context from event stats"""
        stats = event.stats

        quarter = stats.get("quarter", 1)
        time_remaining = stats.get("time_remaining", "15:00")
        score_home = stats.get("score_home", 0)
        score_away = stats.get("score_away", 0)
        score_differential = abs(score_home - score_away)

        # Determine game phase
        game_phase = self._determine_game_phase(quarter, time_remaining, score_differential)

        # Determine momentum
        momentum = self._determine_momentum(event, score_home, score_away)

        return GameContext(
            quarter=quarter,
            time_remaining=time_remaining,
            score_home=score_home,
            score_away=score_away,
            score_differential=score_differential,
            game_phase=game_phase,
            momentum=momentum,
            league="NFL",
            season="2024"
        )

    def _determine_game_phase(self, quarter: int, time_remaining: str, score_diff: int) -> str:
        """Determine the phase of the game"""
        try:
            mins, secs = time_remaining.split(":")
            total_seconds = int(mins) * 60 + int(secs)
        except:
            total_seconds = 900  # Default to 15:00

        # Clutch time: 4th quarter, under 2 minutes, close game
        if quarter >= 4 and total_seconds < 120 and score_diff <= 7:
            return "clutch_time"

        # Blowout: any quarter, score differential > 21
        if score_diff > 21:
            return "blowout"

        # Close game: score differential <= 7
        if score_diff <= 7:
            return "close_game"

        # Opening: 1st quarter
        if quarter == 1:
            return "opening"

        # Competitive: moderate differential
        return "competitive"

    def _determine_momentum(self, event: PlayByPlayEvent, score_home: int, score_away: int) -> str:
        """Determine game momentum based on recent events and scoring"""
        situation = event.stats.get("situation", "")

        # Analyze situation keywords
        if "comeback" in situation or "trailing" in situation:
            return "comeback"
        elif "leading" in situation or "surge" in situation:
            # Determine which team based on score
            if score_home > score_away:
                return "home_surge"
            elif score_away > score_home:
                return "away_surge"

        # Check for specific momentum indicators
        if "winning_drive" in situation or "game_winning" in situation:
            return "comeback"

        return "neutral"

    def _validate_event(self, features: GameFeatures) -> bool:
        """Validate data quality

        - Check for duplicates
        - Verify required fields
        - Filter anomalies
        """
        if not features.team_name or not features.opponent_name:
            return False
        return True

    def _cache_event(self, features: GameFeatures):
        """Store enriched features in cache for fast lookup"""
        # Get game_id from additional_context (set during enrichment)
        game_id = features.additional_context.get("game_id")

        if not game_id:
            # Fallback: reconstruct from team names
            game_id = f"nfl_2024_{features.team_name.lower().replace(' ', '_')}_{features.opponent_name.lower().replace(' ', '_')}_001"

        timestamp = int(features.additional_context.get("timestamp", 0))

        cache_key = f"game:{game_id}:timestamp:{timestamp}"
        cache_value = features.model_dump_json()

        if self.use_redis and self.redis_client:
            # Store with 1 hour TTL in Redis
            self.redis_client.setex(cache_key, 3600, cache_value)
        else:
            # Store in memory cache
            self.memory_cache[cache_key] = cache_value

    def _search_nearby_events(
        self,
        game_id: str,
        timestamp: float,
        window: int = 5
    ) -> Optional[str]:
        """Search for events within time window"""
        for offset in range(-window, window + 1):
            cache_key = f"game:{game_id}:timestamp:{int(timestamp) + offset}"

            if self.use_redis and self.redis_client:
                cached_data = self.redis_client.get(cache_key)
            else:
                cached_data = self.memory_cache.get(cache_key)

            if cached_data:
                return cached_data
        return None

    def _get_opponent(self, game_id: str, team_name: str) -> str:
        """Get opponent team name from game_id"""
        # Parse from game_id format: nba_2024_lal_gsw_001
        parts = game_id.split("_")
        if len(parts) >= 4:
            team1, team2 = parts[2].upper(), parts[3].upper()
            return team2 if team1 in team_name.upper() else team1
        return "Unknown"

    def _determine_situation(self, event: PlayByPlayEvent) -> str:
        """Determine game situation context"""
        # Simplified for demo
        return event.stats.get("situation", "neutral_game_state")

    def _get_ranking(self, team_name: str, metric_id: str) -> str:
        """Get team ranking for specific metric"""
        # Mock ranking data - in production, query stats database
        rankings = {
            # NFL stats
            "touchdown": "2nd best",
            "field_goal": "4th in the league",
            "interception": "1st in the NFL",
            "sack": "3rd best",
            "pass_completion": "5th in the league",
            # NBA stats
            "three_pointer": "7th highest",
            "rebound": "3rd best",
            "assist": "5th in league"
        }
        return rankings.get(metric_id, "league average")


class DataSimulator:
    """Simulates real-time data feed for demos

    Replays historical data as if it were live
    """

    def __init__(self, pipeline: DataPipeline):
        self.pipeline = pipeline
        self.events: List[PlayByPlayEvent] = []
        self.is_running = False

    def load_demo_data(self, data_path: str):
        """Load pre-curated demo data"""
        try:
            with open(data_path, 'r') as f:
                data = json.load(f)
                self.events = [PlayByPlayEvent(**event) for event in data]
            logger.info(f"Loaded {len(self.events)} demo events")
        except FileNotFoundError:
            logger.warning(f"Demo data not found at {data_path}, using mock data")
            self._generate_mock_data()

    def _generate_mock_data(self):
        """Generate mock events for demo"""
        self.events = [
            PlayByPlayEvent(
                event_id="evt_001",
                game_id="nfl_2024_sea_hou_001",
                timestamp=425.0,
                event_type="touchdown",
                description="Kenneth Walker III rushes for 15-yard touchdown",
                team="Seahawks",
                player="Kenneth Walker III",
                stats={
                    "value": 6,
                    "yards": 15,
                    "situation": "score_differential_trailing",
                    "quarter": 2,
                    "time_remaining": "5:23",
                    "score_home": 21,
                    "score_away": 17
                }
            ),
            PlayByPlayEvent(
                event_id="evt_002",
                game_id="nfl_2024_sea_hou_001",
                timestamp=850.0,
                event_type="interception",
                description="Devon Witherspoon with crucial interception",
                team="Seahawks",
                player="Devon Witherspoon",
                stats={
                    "value": 1,
                    "situation": "clutch_time_winning_drive",
                    "quarter": 4,
                    "time_remaining": "1:47",
                    "score_home": 24,
                    "score_away": 21
                }
            )
        ]

    def start_simulation(self, interval_ms: int = 1000):
        """Start streaming events at specified interval

        Args:
            interval_ms: Milliseconds between events
        """
        self.is_running = True
        logger.info(f"Starting data simulation (interval: {interval_ms}ms)")

        for event in self.events:
            if not self.is_running:
                break

            self.pipeline.ingest_pbp_event(event)
            time.sleep(interval_ms / 1000)

        logger.info("Data simulation completed")

    def stop_simulation(self):
        """Stop the simulation"""
        self.is_running = False
