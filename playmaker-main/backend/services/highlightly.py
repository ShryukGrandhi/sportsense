"""
Highlightly Football API client for sports data, highlights, and statistics.

This module provides async client functionality for the Highlightly Football API,
including match data, highlights, player statistics, and caching capabilities.
"""

import os
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import httpx
import json
import asyncio

# Set up logging
logger = logging.getLogger(__name__)

class HighlightlyAPIError(Exception):
    """Custom exception for Highlightly API errors"""
    pass

class HighlightlyClient:
    """
    Asynchronous client for Highlightly Football API.
    
    Provides comprehensive access to football match data, highlights, player statistics,
    and other sports-related information with built-in caching and error handling.
    """
    
    def __init__(self):
        self.base_url = os.environ.get("HIGHLIGHTLY_BASE_URL", "https://american-football.highlightly.net")
        self.api_key = os.environ.get("HIGHLIGHTLY_API_KEY")
        
        if not self.api_key:
            raise ValueError("HIGHLIGHTLY_API_KEY environment variable is required")
        
        # Configure HTTP client with proper headers and timeouts
        self.headers = {
            "x-rapidapi-key": self.api_key,
            "Content-Type": "application/json",
            "User-Agent": "PlayMaker-Sports-Bot/1.0"
        }
        
        # Create HTTP client with optimized connection pooling and timeouts
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.headers,
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(
                max_connections=100,  # Increased for better concurrency
                max_keepalive_connections=20,
                keepalive_expiry=30.0
            ),
            http2=True  # Enable HTTP/2 for better performance
        )
        
        # Simple in-memory cache for development (replace with Redis in production)
        self._cache = {}
        self._cache_expiry = {}
        # Lightweight team ID cache to avoid repeated /teams lookups
        self._team_id_cache: Dict[str, int] = {}
        # Persistent file cache directory (optional)
        self._cache_dir = os.environ.get("HIGHLIGHTLY_CACHE_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), ".cache", "highlightly"))
        try:
            os.makedirs(self._cache_dir, exist_ok=True)
        except Exception:
            # If directory cannot be created, continue with in-memory cache only
            pass

        logger.info(f"Highlightly client initialized with base URL: {self.base_url}")

        # Documented endpoints map
        self.ENDPOINTS = {
            "teams": "/teams",
            "team_stats": "/teams/statistics/{id}",
            "matches": "/matches",
            "highlights": "/highlights",
            "last_five": "/last-five-games",
            "head2head": "/head-2-head",
            "bookmakers": "/bookmakers",
            "odds": "/odds",
            "standings": "/standings",
            "lineups": "/lineups/{matchId}",
        }

        # In-memory team cache
        self._teams_cache: List[Dict[str, Any]] = []
        self._teams_loaded_at: Optional[datetime] = None
        # Cache for resolved match ids by (date, home_abbrev, away_abbrev)
        self._match_id_cache: Dict[str, int] = {}
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def close(self):
        """Close the HTTP client"""
        if self.client:
            await self.client.aclose()
    
    def _generate_cache_key(self, endpoint: str, params: Dict[str, Any] = None) -> str:
        """Generate a cache key based on endpoint and parameters"""
        cache_data = f"{endpoint}:{json.dumps(params or {}, sort_keys=True)}"
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[cache_key]
    
    def _cache_data(self, cache_key: str, data: Any, ttl_minutes: int = 10):
        """Cache data with TTL"""
        self._cache[cache_key] = data
        self._cache_expiry[cache_key] = datetime.now() + timedelta(minutes=ttl_minutes)
        # Persist to file cache
        try:
            path = os.path.join(self._cache_dir, f"{cache_key}.json")
            payload = {
                "expires_at": (datetime.now() + timedelta(minutes=ttl_minutes)).isoformat(),
                "data": data,
            }
            with open(path, "w", encoding="utf-8") as f:
                json.dump(payload, f)
        except Exception:
            pass
    
    def _get_cached_data(self, cache_key: str) -> Optional[Any]:
        """Retrieve cached data if valid"""
        if self._is_cache_valid(cache_key):
            return self._cache.get(cache_key)
        # Clean up expired cache
        if cache_key in self._cache:
            del self._cache[cache_key]
        if cache_key in self._cache_expiry:
            del self._cache_expiry[cache_key]
        # Try persistent file cache
        try:
            path = os.path.join(self._cache_dir, f"{cache_key}.json")
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    payload = json.load(f)
                expires_at = payload.get("expires_at")
                if expires_at and datetime.fromisoformat(expires_at) > datetime.now():
                    return payload.get("data")
                else:
                    # Expired - remove file
                    try:
                        os.remove(path)
                    except Exception:
                        pass
        except Exception:
            pass
        return None
    
    async def _make_request(self, endpoint: str, params: Dict[str, Any] = None, cache_ttl: int = 10) -> Dict[str, Any]:
        """HTTP request with caching and backoff only on 429; logs 4xx once."""
        clean_params = dict(params or {})
        # Remove invalid/redundant params (e.g., sport)
        clean_params.pop('sport', None)

        # Cache lookup
        cache_key = self._generate_cache_key(endpoint, clean_params)
        cached = self._get_cached_data(cache_key)
        if cached:
            logger.debug(f"Cache hit endpoint={endpoint} params={clean_params}")
            return cached

        max_attempts = 4
        for attempt in range(max_attempts):
            try:
                # AUDIT: request about to be made
                try:
                    logger.info("[AUDIT][HIGHLIGHTLY_REQ] endpoint=%s params=%s attempt=%s/%s", endpoint, clean_params, attempt+1, max_attempts)
                except Exception:
                    pass
                logger.info(f"Highlightly request endpoint={endpoint} attempt={attempt+1}/{max_attempts} params={clean_params}")
                resp = await self.client.get(endpoint, params=clean_params)

                if 200 <= resp.status_code < 300:
                    data = resp.json()
                    self._cache_data(cache_key, data, cache_ttl)
                    try:
                        keys = list(data.keys()) if isinstance(data, dict) else []
                        data_len = (len(data) if isinstance(data, list) else len(data.get('data', []) if isinstance(data, dict) else 0))
                        logger.info(f"[AUDIT][HIGHLIGHTLY_RESP] status=%s keys=%s len=%s", resp.status_code, keys, data_len)
                    except Exception:
                        pass
                    logger.debug(f"Highlightly success endpoint={endpoint} cached=True")
                    return data

                status = resp.status_code
                if status == 429:
                    delay = 2 ** attempt
                    logger.warning(f"429 Rate limit endpoint={endpoint}; retrying in {delay}s")
                    await asyncio.sleep(delay)
                    continue

                if 400 <= status < 500:
                    body = ''
                    try:
                        body = resp.text
                    except Exception:
                        pass
                    try:
                        logger.error("[AUDIT][HIGHLIGHTLY_ERR] endpoint=%s status=%s body=%s", endpoint, status, body)
                    except Exception:
                        pass
                    logger.error(f"Client error {status} endpoint={endpoint} params={clean_params} body={body}")
                    return {"error": f"Client error {status}", "status": status, "endpoint": endpoint, "data": []}

                # Server error backoff
                delay = 2 ** attempt
                logger.warning(f"Server error {status} endpoint={endpoint}; retrying in {delay}s")
                await asyncio.sleep(delay)
                continue

            except (httpx.RequestError, httpx.TimeoutException) as e:
                delay = 2 ** attempt
                logger.warning(f"Request error endpoint={endpoint}: {e}; retrying in {delay}s")
                await asyncio.sleep(delay)
                continue
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error endpoint={endpoint}: {e}")
                return {"error": "Invalid JSON response", "status": 500, "endpoint": endpoint, "data": []}
            except Exception as e:
                logger.error(f"Unexpected error endpoint={endpoint}: {e}")
                return {"error": f"Unexpected error: {e}", "status": 500, "endpoint": endpoint, "data": []}

        return {"error": "Request failed after retries", "status": 503, "endpoint": endpoint, "data": []}
    
    # MATCH DATA ENDPOINTS
    
    async def get_matches(self, 
                         date: Optional[str] = None,
                         league_id: Optional[int] = None,
                         league_name: Optional[str] = None,
                         team_name: Optional[str] = None,
                         sport: Optional[str] = None,
                         limit: int = 20) -> Dict[str, Any]:
        """
        Get matches with optional filtering for multiple sports
        
        Args:
            date: Date in YYYY-MM-DD format
            league_id: Specific league ID
            league_name: League name to filter by
            team_name: Team name to search for
            sport: Sport type (football, basketball, american_football, etc.)
            limit: Maximum number of matches to return
            
        Returns:
            Match data with pagination info
        """
        params = {"limit": limit}
        
        if date:
            params["date"] = date
        if league_id:
            params["leagueId"] = league_id
        if league_name:
            params["leagueName"] = league_name
        if team_name:
            params["homeTeamName"] = team_name
        # Do not include sport in params; subdomain defines it
        params.pop("sport", None)
        
        resp = await self._make_request("/matches", params, cache_ttl=5)
        try:
            keys = list(resp.keys()) if isinstance(resp, dict) else []
            data_len = len(resp.get('data', [])) if isinstance(resp, dict) else (len(resp) if isinstance(resp, list) else 0)
            logger.info(f"[AUDIT][HLT_MATCH] url=/matches params={params} keys={keys} len={data_len}")
        except Exception:
            pass
        # [AUDIT] Sample structure for match payload and nested team stats
        try:
            data = resp.get("data", []) if isinstance(resp, dict) else []
            if isinstance(data, list) and data:
                m = data[0]
                if isinstance(m, dict):
                    logger.info(f"[AUDIT] match keys: {list(m.keys())}")
                    ht = m.get("homeTeam", {}) or m.get("home", {}) or {}
                    at = m.get("awayTeam", {}) or m.get("away", {}) or {}
                    if isinstance(ht, dict):
                        logger.info(f"[AUDIT] homeTeam keys: {list(ht.keys())}")
                        logger.info(f"[AUDIT] stats shape home={ht.get('statistics') or ht.get('stats') or ht.get('totals')}")
                    if isinstance(at, dict):
                        logger.info(f"[AUDIT] awayTeam keys: {list(at.keys())}")
                        logger.info(f"[AUDIT] stats shape away={at.get('statistics') or at.get('stats') or at.get('totals')}")
        except Exception:
            pass
        return resp
    
    async def get_match_by_id(self, match_id: int) -> Dict[str, Any]:
        """
        Get detailed match information by ID
        
        Args:
            match_id: Unique match identifier
            
        Returns:
            Detailed match data including events, statistics, etc.
        """
        return await self._make_request(f"/matches/{match_id}", cache_ttl=60)

    async def get_match_details(self, match_id: int) -> Dict[str, Any]:
        """Fetch full match details for enrichment via /matches/{id}."""
        logger.info(f"[AUDIT] fetching match details for id={match_id}")
        try:
            resp = await self._make_request(f"/matches/{match_id}", cache_ttl=60)
            try:
                if isinstance(resp, dict):
                    logger.info(f"[AUDIT] fetched full match details for id={match_id}, keys={list(resp.keys())}")
            except Exception:
                pass
            return resp
        except Exception as e:
            logger.warning(f"get_match_details failed for id={match_id}: {e}")
            return {}

    async def search_matches_by_abbrev(
        self,
        *,
        league: str,
        date: str,
        season: int,
        home_abbrev: str,
        away_abbrev: str,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Query /matches using league, date, season, and team abbreviations.

        Uses the documented params template for NFL lookups.
        """
        params = {
            "league": league,
            "date": date,
            "season": season,
            "homeTeamAbbreviation": home_abbrev,
            "awayTeamAbbreviation": away_abbrev,
            "limit": limit,
            "offset": offset,
        }
        logger.info(
            f"Searching matches by abbrev league={league} date={date} season={season} home={home_abbrev} away={away_abbrev}"
        )
        return await self._make_request(self.ENDPOINTS["matches"], params, cache_ttl=5)

    async def find_match_id_by_abbrevs(
        self,
        *,
        league: str,
        date: str,
        season: int,
        home_abbrev: str,
        away_abbrev: str,
    ) -> Optional[int]:
        """Find a match id for the given date and team abbreviations.

        Tries (home, away), and if empty, swaps them once. Returns first id or None.
        Caches successful resolutions per (date, home, away).
        """
        cache_key = f"{date}:{home_abbrev}:{away_abbrev}:{season}:{league.upper()}"
        if cache_key in self._match_id_cache:
            return self._match_id_cache[cache_key]

        # First try as provided
        resp = await self.search_matches_by_abbrev(
            league=league,
            date=date,
            season=season,
            home_abbrev=home_abbrev,
            away_abbrev=away_abbrev,
        )
        items = resp.get("data", []) if isinstance(resp, dict) else []
        if isinstance(items, list) and items:
            mid = items[0].get("id")
            if isinstance(mid, int):
                self._match_id_cache[cache_key] = mid
                return mid

        # Retry with swapped abbreviations
        logger.info(
            f"No matches found; retrying with swapped abbreviations {away_abbrev} vs {home_abbrev}"
        )
        resp2 = await self.search_matches_by_abbrev(
            league=league,
            date=date,
            season=season,
            home_abbrev=away_abbrev,
            away_abbrev=home_abbrev,
        )
        items2 = resp2.get("data", []) if isinstance(resp2, dict) else []
        if isinstance(items2, list) and items2:
            mid = items2[0].get("id")
            if isinstance(mid, int):
                # Cache under original order for quicker future lookups
                self._match_id_cache[cache_key] = mid
                return mid

        return None

    async def search_team_matches(self, team_id: Union[int, str], days_back: int = 14) -> List[Dict[str, Any]]:
        """
        Fetch matches day-by-day (no dateRange), stop on first date with results,
        and filter locally by teamId.
        """
        try:
            today = datetime.utcnow().date()
            for i in range(days_back):
                date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
                params = {"limit": 100, "date": date_str}
                resp = await self._make_request(self.ENDPOINTS["matches"], params, cache_ttl=5)
                if not resp or (isinstance(resp, dict) and resp.get("error")):
                    # try next date
                    if i < days_back - 1:
                        await asyncio.sleep(0.25)
                    continue

                data_list: List[Dict[str, Any]] = resp.get("data", []) if isinstance(resp, dict) else (resp or [])
                if not isinstance(data_list, list):
                    data_list = []

                filtered = [
                    m for m in data_list
                    if team_id in (
                        m.get("homeTeamId"),
                        m.get("awayTeamId"),
                        ((m.get("homeTeam") or {}).get("id")),
                        ((m.get("awayTeam") or {}).get("id")),
                    )
                ]

                if filtered:
                    logger.info(
                        f"Fetched {len(data_list)} matches for {date_str}, {len(filtered)} matched team_id={team_id}"
                    )
                    return filtered

                # No matches for this team on this date; try previous day
                if i < days_back - 1:
                    await asyncio.sleep(0.25)

            logger.warning(f"No matches found for team_id={team_id} in last {days_back} days")
            return []
        except Exception as e:
            logger.error(f"search_team_matches failed: {e}")
            return []
    
    async def get_match_statistics(self, match_id: int) -> Dict[str, Any]:
        """
        Get match statistics by match ID
        
        Args:
            match_id: Unique match identifier
            
        Returns:
            Match statistics data for both teams
        """
        return await self._make_request(f"/statistics/{match_id}", cache_ttl=30)
    
    async def get_box_score(self, match_id: int) -> Dict[str, Any]:
        """
        Get detailed box score for a match
        
        Args:
            match_id: Unique match identifier
            
        Returns:
            Comprehensive box score with player statistics
        """
        return await self._make_request(f"/box-score/{match_id}", cache_ttl=60)
    
    # HIGHLIGHTS ENDPOINTS
    
    async def get_highlights(self,
                           match_id: Optional[int] = None,
                           league_name: Optional[str] = None,
                           team_name: Optional[str] = None,
                           date: Optional[str] = None,
                           sport: Optional[str] = None,
                           limit: int = 10) -> Dict[str, Any]:
        """
        Get match highlights and video content for multiple sports
        
        Args:
            match_id: Specific match to get highlights for
            league_name: Filter by league name
            team_name: Filter by team name
            date: Date in YYYY-MM-DD format
            sport: Sport type (football, basketball, american_football, etc.)
            limit: Maximum number of highlights
            
        Returns:
            Highlights data with video URLs and metadata
        """
        params = {"limit": limit}
        
        if match_id:
            params["matchId"] = match_id
        if league_name:
            params["leagueName"] = league_name
        if team_name:
            params["homeTeamName"] = team_name
        if date:
            params["date"] = date
        # Do not include sport in params; subdomain defines it
        params.pop("sport", None)
        
        return await self._make_request(self.ENDPOINTS["highlights"], params, cache_ttl=15)
    
    async def get_highlight_by_id(self, highlight_id: int) -> Dict[str, Any]:
        """
        Get specific highlight by ID
        
        Args:
            highlight_id: Unique highlight identifier
            
        Returns:
            Highlight data with video URL and metadata
        """
        return await self._make_request(f"/highlights/{highlight_id}", cache_ttl=60)
    
    # PLAYER DATA ENDPOINTS
    
    async def get_players(self, name: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        """
        Get players list with optional name filtering
        
        Args:
            name: Player name to search for
            limit: Maximum number of players to return
            
        Returns:
            Players data with basic information
        """
        params = {"limit": limit}
        if name:
            params["name"] = name
        
        return await self._make_request("/players", params, cache_ttl=30)

    async def get_player_by_name(self, name: str) -> Dict[str, Any]:
        """
        Search for a player by name and return the best match with details

        Args:
            name: Player name to search for

        Returns:
            Player data with statistics if found, None otherwise
        """
        try:
            # Search for player
            players = await self.get_players(name=name, limit=10)

            if not players or not isinstance(players, dict):
                return {"error": f"No player found for '{name}'", "data": None}

            data = players.get("data", [])
            if not isinstance(data, list) or len(data) == 0:
                return {"error": f"No player found for '{name}'", "data": None}

            # Get the first (best) match
            player = data[0]
            player_id = player.get("id")

            if player_id:
                # Fetch full player details including statistics
                player_details = await self.get_player_by_id(player_id)
                try:
                    player_stats = await self.get_player_statistics(player_id)
                    if isinstance(player_details, dict) and isinstance(player_stats, dict):
                        player_details["statistics"] = player_stats
                except Exception:
                    pass  # Stats may not be available for all players

                return player_details

            return player

        except Exception as e:
            logger.error(f"Error fetching player by name '{name}': {e}")
            return {"error": str(e), "data": None}

    async def get_player_by_id(self, player_id: int) -> Dict[str, Any]:
        """
        Get detailed player information by ID
        
        Args:
            player_id: Unique player identifier
            
        Returns:
            Detailed player profile with career information
        """
        return await self._make_request(f"/players/{player_id}", cache_ttl=60)
    
    async def get_player_statistics(self, player_id: int) -> Dict[str, Any]:
        """
        Get player statistics by player ID
        
        Args:
            player_id: Unique player identifier
            
        Returns:
            Player statistics across competitions and clubs
        """
        return await self._make_request(f"/players/{player_id}/statistics", cache_ttl=30)
    
    # ADDITIONAL ENDPOINTS
    
    async def get_standings(self, league_type: str = "NFL", year: int = 2025, limit: int = 5, offset: int = 0) -> Dict[str, Any]:
        """Standings using documented parameters: leagueType, year, limit, offset."""
        params = {
            "leagueType": league_type,
            "year": year,
            "limit": limit,
            "offset": offset,
        }
        return await self._make_request(self.ENDPOINTS["standings"], params, cache_ttl=60)
    
    async def get_leagues(self, country_name: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        """
        Get available leagues
        
        Args:
            country_name: Filter by country name
            limit: Maximum number of leagues
            
        Returns:
            Available leagues data
        """
        params = {"limit": limit}
        if country_name:
            params["countryName"] = country_name
        
        return await self._make_request("/leagues", params, cache_ttl=120)
    
    async def get_teams(self, name: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        """
        Get teams list
        
        Args:
            name: Team name to search for
            limit: Maximum number of teams
            
        Returns:
            Teams data
        """
        # Use only supported params; avoid invalid 'limit' for /teams
        params = {}
        if name:
            params["name"] = name
        
        return await self._make_request(self.ENDPOINTS["teams"], params, cache_ttl=60)

    async def get_all_teams(self, limit: int = 500, max_pages: int = 5) -> List[Dict[str, Any]]:
        """Bootstrap and cache all teams using pagination if needed."""
        if self._teams_cache:
            return self._teams_cache

        # Try persistent file first
        teams_path = os.path.join(self._cache_dir, "teams_all.json")
        try:
            if os.path.exists(teams_path):
                with open(teams_path, "r", encoding="utf-8") as f:
                    payload = json.load(f)
                expires_at = payload.get("expires_at")
                # 24h TTL for teams cache
                if expires_at and datetime.fromisoformat(expires_at) > datetime.now():
                    self._teams_cache = payload.get("data", [])
                    self._teams_loaded_at = datetime.now()
                    logger.info(f"Loaded {len(self._teams_cache)} teams from disk cache")
                    return self._teams_cache
        except Exception:
            pass

        # Fetch from API
        all_teams: List[Dict[str, Any]] = []
        offset = 0
        page = 0
        while page < max_pages:
            params = {"limit": limit, "offset": offset}
            logger.info(f"Fetching teams page={page+1} params={params}")
            resp = await self._make_request(self.ENDPOINTS["teams"], params, cache_ttl=120)
            data = resp.get("data", []) if isinstance(resp, dict) else []
            if not data:
                break
            all_teams.extend(data)
            if len(data) < limit:
                break
            offset += limit
            page += 1

        self._teams_cache = all_teams
        self._teams_loaded_at = datetime.now()
        logger.info(f"✅ Loaded {len(self._teams_cache)} teams into cache")
        try:
            logger.info("[AUDIT][CACHE_INIT] highlightly_team_count=%s", len(self._teams_cache))
        except Exception:
            pass

        # Persist to disk for 24h
        try:
            payload = {
                "expires_at": (datetime.now() + timedelta(hours=24)).isoformat(),
                "data": self._teams_cache,
            }
            with open(teams_path, "w", encoding="utf-8") as f:
                json.dump(payload, f)
        except Exception:
            pass

        return self._teams_cache

    async def bootstrap_team_cache(self) -> int:
        teams = await self.get_all_teams()
        return len(teams)

    async def resolve_team_id(
        self,
        name: str,
        display_name: Optional[str] = None,
        abbreviation: Optional[str] = None,
        league: str = "NFL",
    ) -> Optional[int]:
        """
        Resolve a team’s Highlightly ID given name/displayName/league via /teams.
        Returns None if no match found.
        """
        base_name = (name or "").strip()
        cache_key_parts = [league.upper(), base_name.lower()]
        if display_name:
            cache_key_parts.append((display_name or "").lower())
        if abbreviation:
            cache_key_parts.append((abbreviation or "").upper())
        cache_key = "|".join(cache_key_parts)

        logger.info(f"Resolving team ID for {base_name} ({display_name or ''}) in {league}")

        # If team cache is empty, attempt a warm fetch once (league-scoped)
        if not self._teams_cache:
            try:
                logger.warning("[AUDIT][CACHE_MISS] Empty team cache for %s, fetching live", league)
                # Try league-scoped warm
                params_warm = {"league": league}
                resp_warm = await self._make_request(self.ENDPOINTS["teams"], params=params_warm, cache_ttl=120)
                data_warm = resp_warm.get("data") if isinstance(resp_warm, dict) else (resp_warm if isinstance(resp_warm, list) else [])
                if isinstance(data_warm, list) and data_warm:
                    self._teams_cache = data_warm
                else:
                    await self.bootstrap_team_cache()
            except Exception as e:
                logger.warning("[AUDIT][CACHE_MISS_FAIL] could not warm cache: %s", e)

        # In-process cache first
        if cache_key in self._team_id_cache:
            team_id = self._team_id_cache[cache_key]
            try:
                logger.info("[AUDIT][TEAM_RESOLVE] input=%s → id=%s", base_name, team_id)
            except Exception:
                logger.info(f"Resolved team ID: {team_id}")
            return team_id

        params: Dict[str, Any] = {"name": base_name, "league": league}
        if display_name:
            params["displayName"] = display_name
        if abbreviation:
            params["abbreviation"] = abbreviation

        result = await self._make_request(self.ENDPOINTS["teams"], params=params, cache_ttl=120)
        # Handle either list or wrapped dict
        if isinstance(result, dict) and "data" in result:
            result = result.get("data", [])
        if isinstance(result, list) and len(result) > 0:
            team_id = result[0].get("id")
            if isinstance(team_id, int):
                self._team_id_cache[cache_key] = team_id
            try:
                logger.info("[AUDIT][TEAM_RESOLVE] input=%s → id=%s", base_name, team_id)
            except Exception:
                logger.info(f"Resolved team ID: {team_id}")
            return team_id if isinstance(team_id, int) else None
        try:
            logger.info("[AUDIT][TEAM_RESOLVE] input=%s → id=%s", base_name, None)
        except Exception:
            logger.warning(f"Could not resolve team ID for {base_name} in {league}")
        return None
    
    # UTILITY METHODS
    
    async def search_sport_matches(self, team_name: Optional[str] = None, sport: str = "american_football", days_back: int = 7) -> List[Dict[str, Any]]:
        """
        Search recent matches within the last N days by iterating dates (no dateRange).

        - Uses a per-day request with 'date' and stops on the first non-empty day.
        - Does not include 'sport' in params (subdomain defines it).
        - Filters locally by team name(s) if provided.
        """
        try:
            today = datetime.utcnow().date()
            for i in range(days_back):
                date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
                params = {"limit": 100, "date": date_str}
                resp = await self._make_request(self.ENDPOINTS["matches"], params, cache_ttl=5)
                if not resp or (isinstance(resp, dict) and resp.get("error")):
                    # try next date
                    if i < days_back - 1:
                        await asyncio.sleep(0.25)
                    continue

                all_matches: List[Dict[str, Any]] = resp.get("data", []) if isinstance(resp, dict) else (resp or [])
                if not isinstance(all_matches, list):
                    all_matches = []

                # No team filter: return first valid day's matches
                if not team_name:
                    logger.info(f"Fetched {len(all_matches)} matches for {date_str}, no team filter applied")
                    return all_matches

                # Support multiple names in a single string (comma or ' vs ')
                names = [n.strip() for n in (team_name or '').replace(' vs ', ',').split(',') if n.strip()]
                names_lower = [n.lower() for n in names]

                filtered: List[Dict[str, Any]] = []
                for m in all_matches:
                    # Try nested structures and flat fallbacks
                    h = (m.get('homeTeam') or m.get('home') or {}).get('name', '') or m.get('homeTeamName', '')
                    a = (m.get('awayTeam') or m.get('away') or {}).get('name', '') or m.get('awayTeamName', '')
                    hl = h.lower()
                    al = a.lower()
                    if any(n in hl or n in al for n in names_lower):
                        filtered.append(m)

                if filtered:
                    logger.info(
                        f"Fetched {len(all_matches)} matches for {date_str}, {len(filtered)} matched {team_name}"
                    )
                    return filtered

                if i < days_back - 1:
                    await asyncio.sleep(0.25)

            logger.warning(f"No matches found for {team_name or 'all teams'} in last {days_back} days")
            return []
        except Exception as e:
            logger.error(f"Ranged match search failed: {e}")
            return []
    
    async def get_sport_highlights(self, team_name: str, sport: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get highlights for a team in any sport
        
        Args:
            team_name: Team name to search for
            sport: Sport type (basketball for NBA, american_football for NFL, football for Soccer)
            limit: Maximum number of highlights
            
        Returns:
            List of highlights with video URLs
        """
        sport_mapping = {
            'nba': 'basketball',
            'basketball': 'basketball', 
            'nfl': 'american_football',
            'american_football': 'american_football',
            'football': 'football',
            'soccer': 'football'
        }
        
        api_sport = sport_mapping.get(sport.lower(), sport.lower())
        
        try:
            # Do not pass sport; subdomain defines it
            highlights_data = await self.get_highlights(
                team_name=team_name,
                limit=limit
            )
            items = highlights_data.get("data", [])
            try:
                # Audit original order (first 5)
                preview = [str((it or {}).get("title") or (it or {}).get("name") or (it or {}).get("match", {}).get("homeTeam", {}).get("name", "") + " vs " + (it or {}).get("match", {}).get("awayTeam", {}).get("name", "")) for it in items[:5]]
                logger.info(f"[AUDIT][HIGHLIGHTS_ORDER][svc] team={team_name} sport={sport} count={len(items)} first5={preview}")
            except Exception:
                pass
            # Sort newest-first by available timestamps
            def _ts(obj: Dict[str, Any]) -> int:
                try:
                    d = obj.get("date") or obj.get("createdAt") or obj.get("publishedAt") or ((obj.get("match") or {}).get("date"))
                    if not d:
                        return -1
                    from datetime import datetime as _dt
                    return int(_dt.fromisoformat(str(d).replace("Z", "+00:00")).timestamp())
                except Exception:
                    return -1
            items = sorted(items, key=_ts, reverse=True)
            try:
                preview2 = [str((it or {}).get("title") or (it or {}).get("name")) for it in items[:5]]
                logger.info(f"[AUDIT][HIGHLIGHTS_ORDER][svc] sorted_desc team={team_name} first5={preview2}")
            except Exception:
                pass
            return items
        except Exception as e:
            logger.error(f"Error getting highlights for {team_name} in {sport}: {str(e)}")
            return []
    
    async def get_nfl_ncaa_matches(self, team_id: Optional[str] = None, season: Optional[int] = None) -> Dict[str, Any]:
        """
        Get NFL/NCAA matches from Highlightly API
        
        Args:
            team_id: Specific team ID to filter by
            season: Season year to filter by
            
        Returns:
            NFL/NCAA match data with team info and scores
        """
        params = {}
        if team_id:
            params["teamId"] = team_id
        if season:
            params["season"] = season
            
        return await self._make_request("/nfl-ncaa/matches", params, cache_ttl=30)

    async def get_head2head(self, team_one_id: Union[int, str], team_two_id: Union[int, str]) -> Dict[str, Any]:
        """Head-to-head using teamIdOne and teamIdTwo."""
        params = {"teamIdOne": team_one_id, "teamIdTwo": team_two_id}
        return await self._make_request(self.ENDPOINTS["head2head"], params, cache_ttl=30)

    async def get_head_to_head(self, team_one_name: str, team_two_name: str, league: str = "NFL") -> Union[Dict[str, Any], List[Any]]:
        """
        Resolve team names to IDs then fetch head-to-head. Returns [] on resolution failure.
        """
        team_one_id = await self.resolve_team_id(name=team_one_name, league=league)
        team_two_id = await self.resolve_team_id(name=team_two_name, league=league)

        if not team_one_id or not team_two_id:
            logger.warning(f"Could not resolve team IDs for {team_one_name}, {team_two_name}")
            return []

        logger.info(f"Calling /head-2-head with IDs {team_one_id} and {team_two_id}")
        try:
            logger.info("[AUDIT][TRACE] CALLING get_head_to_head_match with IDs -> %s, %s", team_one_id, team_two_id)
        except Exception:
            pass
        params = {"teamIdOne": team_one_id, "teamIdTwo": team_two_id}
        try:
            logger.info("[AUDIT][HL_CALL] endpoint=/head-2-head params=%s", params)
        except Exception:
            pass
        resp = await self._make_request(self.ENDPOINTS["head2head"], params=params, cache_ttl=30)
        try:
            keys = list(resp.keys()) if isinstance(resp, dict) else []
            length = len(resp.get('data', [])) if isinstance(resp, dict) else (len(resp) if isinstance(resp, list) else 0)
            logger.info(f"[AUDIT][HLT_H2H] url=/head-2-head params={params} keys={keys} len={length}")
        except Exception:
            pass
        # Include audit metadata for upstream consumers
        try:
            audit = {"teamIdOne": team_one_id, "teamIdTwo": team_two_id, "params": params, "endpoint": "/head-2-head"}
            if isinstance(resp, list):
                return {"data": resp, "_audit": audit}
            elif isinstance(resp, dict):
                resp_copy = dict(resp)
                # avoid clobbering if API already uses _audit
                if "_audit" not in resp_copy:
                    resp_copy["_audit"] = audit
                return resp_copy
        except Exception:
            pass
        return resp

    async def get_odds(self, league_name: str = "NFL", bookmaker_id: int = 21454, odds_type: str = "prematch") -> Dict[str, Any]:
        """Fetch odds for a league/bookmaker."""
        params = {
            "oddsType": odds_type,
            "leagueName": league_name,
            "bookmakerId": bookmaker_id,
            "limit": 5,
            "offset": 0,
        }
        return await self._make_request(self.ENDPOINTS["odds"], params, cache_ttl=15)

    async def get_team_statistics(self, team_name: Union[str, int], league: str = "NFL", from_date: Optional[str] = None) -> Union[Dict[str, Any], List[Any]]:
        """
        Fetch team statistics. Accepts team name (str) OR team ID (int/str).
        If team_name is an int or numeric string, it's treated as an ID.
        Returns [] on resolution failure.
        """
        # Check if input is already an ID
        team_id = None
        if isinstance(team_name, int):
            team_id = team_name
        elif isinstance(team_name, str) and team_name.isdigit():
            team_id = int(team_name)
        
        # If not an ID, resolve it
        if team_id is None:
            team_id = await self.resolve_team_id(name=team_name, league=league)
            
        if not team_id:
            logger.warning(f"Could not resolve team ID for {team_name}")
            return []

        if not from_date:
            from_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

        endpoint = self.ENDPOINTS["team_stats"].format(id=team_id)
        params = {"fromDate": from_date, "timezone": "Europe/London"}
        return await self._make_request(endpoint, params=params, cache_ttl=30)
    
    async def get_nfl_team_info(self, team_name: str) -> Optional[Dict[str, Any]]:
        """
        Get NFL team information by name
        
        Args:
            team_name: Name of the NFL team
            
        Returns:
            Team information including ID, logo, etc.
        """
        try:
            # Search for team by name
            params = {"search": team_name, "type": "team"}
            teams = await self._make_request("/nfl-ncaa/teams", params, cache_ttl=60)
            
            if teams and teams.get("data"):
                # Return first matching team
                return teams["data"][0] if isinstance(teams["data"], list) else teams["data"]
                
            return None
            
        except Exception as e:
            logger.error(f"Error getting NFL team info for {team_name}: {str(e)}")
            return None
    
    async def get_match_highlights_by_teams(self, home_team: str, away_team: str) -> List[Dict[str, Any]]:
        """
        Get highlights for a match between specific teams
        
        Args:
            home_team: Home team name
            away_team: Away team name
            
        Returns:
            List of highlights for the match
        """
        try:
            highlights = []
            
            # Search for highlights with home team
            home_highlights = await self.get_highlights(team_name=home_team, limit=20)
            if home_highlights.get("data"):
                # Filter for matches involving both teams
                for highlight in home_highlights["data"]:
                    match_info = highlight.get("match", {})
                    home_team_name = match_info.get("homeTeam", {}).get("name", "")
                    away_team_name = match_info.get("awayTeam", {}).get("name", "")
                    
                    if (away_team.lower() in away_team_name.lower() or 
                        away_team.lower() in home_team_name.lower()):
                        highlights.append(highlight)
            
            # Sort newest-first
            def _ts(obj: Dict[str, Any]) -> int:
                try:
                    d = obj.get("date") or obj.get("createdAt") or obj.get("publishedAt") or ((obj.get("match") or {}).get("date"))
                    if not d:
                        return -1
                    from datetime import datetime as _dt
                    return int(_dt.fromisoformat(str(d).replace("Z", "+00:00")).timestamp())
                except Exception:
                    return -1
            highlights_sorted = sorted(highlights, key=_ts, reverse=True)
            try:
                p = [str((it or {}).get("title") or (it or {}).get("name")) for it in highlights_sorted[:5]]
                logger.info(f"[AUDIT][HIGHLIGHTS_ORDER][svc] match_teams={home_team}_vs_{away_team} first5={p}")
            except Exception:
                pass
            return highlights_sorted
            
        except Exception as e:
            logger.error(f"Error getting highlights for {home_team} vs {away_team}: {str(e)}")
            return []

# Global client instance
_highlightly_client: Optional[HighlightlyClient] = None

async def get_highlightly_client() -> HighlightlyClient:
    """
    Get or create a global Highlightly client instance
    
    Returns:
        Configured Highlightly client
    """
    global _highlightly_client
    
    if _highlightly_client is None:
        _highlightly_client = HighlightlyClient()
    
    return _highlightly_client

async def close_highlightly_client():
    """Close the global Highlightly client"""
    global _highlightly_client
    
    if _highlightly_client:
        await _highlightly_client.close()
        _highlightly_client = None

# Warm cache helper used by server startup or on-demand
async def warm_highlightly_cache(league: str = "NFL") -> int:
    """Preload teams cache for faster team resolution for a given league.

    Returns number of teams cached, or 0 on failure.
    """
    logger.info("🔄 Warming Highlightly cache for %s...", league)
    try:
        client = await get_highlightly_client()
        # Prefer a league-scoped warm where supported
        try:
            params = {"league": league}
            resp = await client._make_request(client.ENDPOINTS["teams"], params=params, cache_ttl=120)
            data = resp.get("data") if isinstance(resp, dict) else (resp if isinstance(resp, list) else [])
            if isinstance(data, list) and data:
                client._teams_cache = data
                logger.info("✅ Highlightly cache preloaded: %d %s teams", len(data), league)
                return len(data)
        except Exception:
            # Fallback to bootstrap (all teams)
            pass

        count = await client.bootstrap_team_cache()
        logger.info("✅ Highlightly teams cache loaded: %d teams", count)
        return count
    except Exception as e:
        logger.error("⚠️ Failed to warm Highlightly cache: %s", e)
        return 0
