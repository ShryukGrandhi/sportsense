import aiohttp
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class SportradarClient:
    """Clean Sportradar API client for fetching sports data"""
    
    def __init__(self):
        self.api_key = os.environ.get('SPORTRADAR_API_KEY', 'demo_key')
        self.base_url = "https://api.sportradar.us"
        self.session = None
        self.logger = logging.getLogger(__name__)
        
        # Rate limiting
        self.last_request_time = {}
        self.min_request_interval = 1.2  # 1.2 seconds between requests
        
    async def get_session(self):
        """Get or create aiohttp session with optimized settings"""
        if self.session is None:
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            connector = aiohttp.TCPConnector(
                limit=50,
                limit_per_host=20,
                ttl_dns_cache=300,
                enable_cleanup_closed=True
            )
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector
            )
        return self.session
        
    async def close_session(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
            
    async def _rate_limit(self, endpoint: str):
        """Simple rate limiting"""
        current_time = datetime.now().timestamp()
        last_time = self.last_request_time.get(endpoint, 0)
        
        time_diff = current_time - last_time
        if time_diff < self.min_request_interval:
            sleep_time = self.min_request_interval - time_diff
            await asyncio.sleep(sleep_time)
            
        self.last_request_time[endpoint] = datetime.now().timestamp()
        
    async def _make_request(self, endpoint: str, params: Dict = None) -> Dict[str, Any]:
        """Make API request with error handling"""
        try:
            await self._rate_limit(endpoint)
            session = await self.get_session()
            
            url = f"{self.base_url}{endpoint}"
            request_params = {"api_key": self.api_key}
            if params:
                request_params.update(params)
            try:
                self.logger.info("[AUDIT][SPORTRADAR_REQ] api_key_present=%s endpoint=%s params=%s", bool(self.api_key and self.api_key != 'demo_key'), endpoint, params or {})
            except Exception:
                pass
            async with session.get(url, params=request_params, timeout=10) as response:
                text = await response.text()
                try:
                    self.logger.info("[AUDIT][SPORTRADAR_RESP] status=%s len=%s endpoint=%s", response.status, len(text or ''), endpoint)
                except Exception:
                    pass
                if response.status == 200:
                    try:
                        return await response.json()
                    except Exception:
                        return {"error": "Invalid JSON", "status": 500, "raw": text[:500]}
                elif response.status == 429:
                    return {"error": "Rate limit exceeded", "status": 429}
                else:
                    try:
                        self.logger.error("[AUDIT][SPORTRADAR_ERR] endpoint=%s status=%s body=%s", endpoint, response.status, text[:500])
                    except Exception:
                        pass
                    return {"error": f"API error: {response.status}", "status": response.status, "raw": text[:500]}
                    
        except asyncio.TimeoutError:
            return {"error": "Request timeout", "status": 408}
        except Exception as e:
            return {"error": f"Request failed: {str(e)}", "status": 500}
    
    # ================================
    # NFL METHODS
    # ================================
    
    async def get_nfl_schedule(self, date: str = None) -> Dict[str, Any]:
        """Get NFL schedule for a specific date"""
        if not date:
            from datetime import datetime
            date = datetime.now().strftime("%Y-%m-%d")
        endpoint = f"/nfl/official/trial/v7/en/games/{date}/schedule.json"
        return await self._make_request(endpoint)
        
    async def get_nfl_standings(self, season: str = "2024") -> Dict[str, Any]:
        """Get NFL standings"""
        endpoint = f"/nfl/official/trial/v7/en/seasons/{season}/standings.json"
        return await self._make_request(endpoint)
        
    async def get_nfl_boxscore(self, game_id: str) -> Dict[str, Any]:
        """Get NFL game boxscore"""
        endpoint = f"/nfl/official/trial/v7/en/games/{game_id}/boxscore.json"
        return await self._make_request(endpoint)
        
    async def get_nfl_team_roster(self, team_id: str) -> Dict[str, Any]:
        """Get NFL team roster"""
        endpoint = f"/nfl/official/trial/v7/en/teams/{team_id}/full_roster.json"
        return await self._make_request(endpoint)

    async def get_nfl_team_schedule(self, team_id: str, season: str = "2025", season_type: str = "REG") -> Dict[str, Any]:
        """Get NFL team schedule for a season"""
        endpoint = f"/nfl/official/trial/v7/en/teams/{team_id}/schedule.json"
        return await self._make_request(endpoint, {"season": season, "season_type": season_type})

    async def get_nfl_recent_games(self, lookback_days: int = 7) -> Dict[str, Any]:
        """Get NFL games from the past N days"""
        games = []
        current_date = datetime.now()

        # Check each day going back
        for i in range(lookback_days):
            date = (current_date - timedelta(days=i)).strftime("%Y-%m-%d")
            schedule = await self.get_nfl_schedule(date)

            if schedule.get("error"):
                continue

            # Extract games from response
            day_games = schedule.get("games", [])
            if day_games:
                games.extend(day_games)

        return {"games": games, "lookback_days": lookback_days}

    # ================================
    # NBA METHODS
    # ================================
    
    async def get_nba_schedule(self, date: str = None) -> Dict[str, Any]:
        """Get NBA schedule for a specific date"""
        if not date:
            from datetime import datetime
            date = datetime.now().strftime("%Y-%m-%d")
        endpoint = f"/nba/trial/v8/en/games/{date}/schedule.json"
        return await self._make_request(endpoint)
        
    async def get_nba_standings(self, season: str = "2024") -> Dict[str, Any]:
        """Get NBA standings"""
        endpoint = f"/nba/trial/v8/en/seasons/{season}/standings.json"
        return await self._make_request(endpoint)
        
    async def get_nba_boxscore(self, game_id: str) -> Dict[str, Any]:
        """Get NBA game boxscore"""
        endpoint = f"/nba/trial/v8/en/games/{game_id}/boxscore.json"
        return await self._make_request(endpoint)
        
    async def get_nba_team_roster(self, team_id: str) -> Dict[str, Any]:
        """Get NBA team roster"""
        endpoint = f"/nba/trial/v8/en/teams/{team_id}/profile.json"
        return await self._make_request(endpoint)
        
    # ================================
    # MLB METHODS
    # ================================
    
    async def get_mlb_schedule(self, season: str = "2024") -> Dict[str, Any]:
        """Get MLB schedule"""
        endpoint = f"/mlb/trial/v7/en/games/{season}/schedule.json"
        return await self._make_request(endpoint)
        
    async def get_mlb_standings(self, season: str = "2024") -> Dict[str, Any]:
        """Get MLB standings"""
        endpoint = f"/mlb/trial/v7/en/seasons/{season}/standings.json"
        return await self._make_request(endpoint)
        
    async def get_mlb_boxscore(self, game_id: str) -> Dict[str, Any]:
        """Get MLB game boxscore"""
        endpoint = f"/mlb/trial/v7/en/games/{game_id}/boxscore.json"
        return await self._make_request(endpoint)
        
    # ================================
    # GENERIC DATA FETCHER
    # ================================
    
    async def fetch_data_by_intent(self, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch data based on parsed intent"""
        sport = intent.get("sport", "").upper()
        request_type = intent.get("request_type", "").lower()
        params = intent.get("parameters", {})

        try:
            if sport == "NFL":
                if request_type in ["schedule", "games"]:
                    return await self.get_nfl_schedule()
                elif request_type in ["standings", "rankings"]:
                    return await self.get_nfl_standings()
                elif request_type in ["boxscore", "score", "game_details"]:
                    game_id = params.get("game_id")
                    if game_id:
                        return await self.get_nfl_boxscore(game_id)
                elif request_type in ["roster", "team", "players"]:
                    team_id = params.get("team_id")
                    if team_id:
                        return await self.get_nfl_team_roster(team_id)
                elif request_type in ["recent_game", "last_game", "previous_game"]:
                    # Fetch recent games and filter by team if specified
                    team_name = params.get("team", "").lower()
                    recent_data = await self.get_nfl_recent_games(lookback_days=14)

                    if team_name:
                        # Filter for the specific team
                        team_games = []
                        for game in recent_data.get("games", []):
                            home = game.get("home", {}).get("name", "").lower()
                            away = game.get("away", {}).get("name", "").lower()

                            # Check if team name is in either home or away team
                            if team_name in home or team_name in away:
                                # Only include completed games
                                if game.get("status") in ["closed", "complete"]:
                                    team_games.append(game)

                        # Sort by scheduled time, most recent first
                        team_games.sort(key=lambda g: g.get("scheduled", ""), reverse=True)
                        return {"games": team_games[:5], "team": params.get("team")}

                    return recent_data
                        
            elif sport == "NBA":
                if request_type in ["schedule", "games"]:
                    return await self.get_nba_schedule()
                elif request_type in ["standings", "rankings"]:
                    return await self.get_nba_standings()
                elif request_type in ["boxscore", "score", "game_details"]:
                    game_id = params.get("game_id")
                    if game_id:
                        return await self.get_nba_boxscore(game_id)
                elif request_type in ["roster", "team", "players"]:
                    team_id = params.get("team_id")
                    if team_id:
                        return await self.get_nba_team_roster(team_id)
                        
            elif sport == "MLB":
                if request_type in ["schedule", "games"]:
                    return await self.get_mlb_schedule()
                elif request_type in ["standings", "rankings"]:
                    return await self.get_mlb_standings()
                elif request_type in ["boxscore", "score", "game_details"]:
                    game_id = params.get("game_id")
                    if game_id:
                        return await self.get_mlb_boxscore(game_id)
                        
            return {"error": f"Unsupported request: {sport} {request_type}", "status": 400}
            
        except Exception as e:
            return {"error": f"Data fetch failed: {str(e)}", "status": 500}

# Global instance
sportradar_client = SportradarClient()
