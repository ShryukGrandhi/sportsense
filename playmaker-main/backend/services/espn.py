"""
ESPN API Service - Free fallback for sports data
No API key required!
"""
import aiohttp
import asyncio
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ESPNService:
    """ESPN API client for sports data - no API key required"""

    def __init__(self):
        self.base_url = "http://site.api.espn.com/apis/site/v2/sports"
        self._db = None

    async def _get_db(self):
        """Lazy load database connection"""
        if self._db is None:
            from backend.database import db
            self._db = db
        return self._db

    async def _get_cached_team(self, team_name: str, sport: str = "NFL") -> Optional[Dict[str, Any]]:
        """Get team data from cache if available and fresh"""
        try:
            db = await self._get_db()
            cached = await db.team_cache.find_one({
                "name": team_name,
                "sport": sport
            })

            if cached:
                # Check if cache is less than 7 days old
                updated_at = cached.get("updated_at")
                if updated_at and (datetime.utcnow() - updated_at) < timedelta(days=7):
                    logger.info(f"✅ Using cached team data for {team_name}")
                    return cached
            return None
        except Exception as e:
            logger.warning(f"Cache lookup failed: {e}")
            return None

    async def _cache_team(self, team_name: str, abbreviation: str, logo: str, sport: str = "NFL"):
        """Store team data in cache"""
        try:
            db = await self._get_db()
            await db.team_cache.update_one(
                {"name": team_name, "sport": sport},
                {
                    "$set": {
                        "name": team_name,
                        "abbreviation": abbreviation,
                        "logo": logo,
                        "sport": sport,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            logger.info(f"💾 Cached team data for {team_name}")
        except Exception as e:
            logger.warning(f"Failed to cache team data: {e}")

    async def get_nfl_scoreboard(self, date: str = None) -> Dict[str, Any]:
        """Get NFL games and scores for a specific date (YYYYMMDD format) or current date"""
        try:
            # ESPN uses YYYYMMDD format for dates
            if date:
                # Convert from YYYY-MM-DD to YYYYMMDD if needed
                if "-" in date:
                    date = date.replace("-", "")
                url = f"{self.base_url}/football/nfl/scoreboard?dates={date}"
            else:
                url = f"{self.base_url}/football/nfl/scoreboard"

            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return {"data": data.get("events", []), "error": None}
                    else:
                        return {"data": None, "error": f"ESPN API returned {resp.status}"}
        except asyncio.TimeoutError:
            return {"data": None, "error": "ESPN API timeout"}
        except Exception as e:
            logger.error(f"ESPN API error: {e}")
            return {"data": None, "error": str(e)}

    async def find_team_game(self, team_name: str, date: str = None) -> Optional[Dict[str, Any]]:
        """Find a specific team's game from the scoreboard (current or specific date)"""
        try:
            result = await self.get_nfl_scoreboard(date)
            if result.get("error") or not result.get("data"):
                return None

            team_lower = team_name.lower()
            events = result["data"]

            for event in events:
                competition = event.get("competitions", [{}])[0]
                competitors = competition.get("competitors", [])

                # Check if either team matches
                for comp in competitors:
                    team = comp.get("team", {})
                    if team_lower in team.get("displayName", "").lower() or \
                       team_lower in team.get("shortDisplayName", "").lower():
                        # Found the game!
                        return await self._parse_game_event(event)

            return None
        except Exception as e:
            logger.error(f"Error finding team game: {e}")
            return None

    async def find_matchup_in_season(self, team1: str, team2: str, year: int) -> Optional[Dict[str, Any]]:
        """Find a matchup between two teams in a specific season (year)"""
        try:
            team1_lower = team1.lower()
            team2_lower = team2.lower()

            logger.info(f"🔍 Searching for {team1} vs {team2} in {year} season")

            # NFL regular season runs from September to January
            # For division rivals (who play twice), check high-probability dates first:
            # Week 1-4 (Sept), Week 13-17 (Dec/Jan)
            # This minimizes API calls for most queries

            priority_weeks = [
                # Early season (Sept)
                (datetime(year, 9, 8), datetime(year, 10, 1)),
                # Late season (Dec/Jan)
                (datetime(year, 12, 1), datetime(year + 1, 1, 10)),
                # Mid season (Oct/Nov) - if not found in priority dates
                (datetime(year, 10, 1), datetime(year, 12, 1)),
            ]

            for start_date, end_date in priority_weeks:
                current_date = start_date

                while current_date <= end_date:
                    # NFL games are typically on Thursday (3), Sunday (6), Monday (0)
                    weekday = current_date.weekday()

                    if weekday in [0, 3, 6]:  # Monday, Thursday, Sunday
                        search_date = current_date.strftime("%Y%m%d")

                        result = await self.get_nfl_scoreboard(search_date)
                        if result.get("data"):
                            events = result["data"]

                            for event in events:
                                competition = event.get("competitions", [{}])[0]
                                competitors = competition.get("competitors", [])

                                if len(competitors) >= 2:
                                    team_names = [
                                        comp.get("team", {}).get("displayName", "").lower()
                                        for comp in competitors
                                    ]

                                    # Check if both teams are in this game
                                    has_team1 = any(team1_lower in name for name in team_names)
                                    has_team2 = any(team2_lower in name for name in team_names)

                                    if has_team1 and has_team2:
                                        # Found a matchup! Process and return immediately
                                        game_date = event.get("date", "")
                                        logger.info(f"✅ Found {team1} vs {team2} on {game_date}")

                                        status = event.get("status", {})
                                        if status.get("type", {}).get("completed", False):
                                            logger.info(f"🏈 Returning completed matchup")
                                            game_data = await self._parse_game_event(event)

                                            # Enrich with detailed stats
                                            game_id = event.get("id")
                                            if game_id and game_data:
                                                home_team_id = game_data.get("home_team", {}).get("id")
                                                away_team_id = game_data.get("away_team", {}).get("id")

                                                detailed_stats = await self.get_game_stats(game_id, home_team_id, away_team_id)
                                                if detailed_stats:
                                                    game_data["home_team"]["statistics"].update(detailed_stats.get("home", {}))
                                                    game_data["away_team"]["statistics"].update(detailed_stats.get("away", {}))

                                                    if detailed_stats.get("home_players"):
                                                        game_data["home_team"]["players"] = detailed_stats.get("home_players")
                                                    if detailed_stats.get("away_players"):
                                                        game_data["away_team"]["players"] = detailed_stats.get("away_players")

                                                    logger.info(f"✅ Enriched historic game with detailed stats")

                                            return game_data

                    # Move forward 1 day to check next potential game day
                    current_date += timedelta(days=1)

            # If we get here, no completed game was found
            if False:
                # Return the first completed game found, or the most recent game
                for game in games_found:
                    status = game.get("status", {})
                    if status.get("type", {}).get("completed", False):
                        logger.info(f"🏈 Returning completed matchup")
                        game_data = await self._parse_game_event(game)

                        # Enrich with detailed stats
                        game_id = game.get("id")
                        if game_id and game_data:
                            home_team_id = game_data.get("home_team", {}).get("id")
                            away_team_id = game_data.get("away_team", {}).get("id")

                            detailed_stats = await self.get_game_stats(game_id, home_team_id, away_team_id)
                            if detailed_stats:
                                game_data["home_team"]["statistics"].update(detailed_stats.get("home", {}))
                                game_data["away_team"]["statistics"].update(detailed_stats.get("away", {}))

                                if detailed_stats.get("home_players"):
                                    game_data["home_team"]["players"] = detailed_stats.get("home_players")
                                if detailed_stats.get("away_players"):
                                    game_data["away_team"]["players"] = detailed_stats.get("away_players")

                                logger.info(f"✅ Enriched historic game with detailed stats")

                        return game_data

                # If no completed games, return the most recent one
                logger.info(f"⚠️ No completed games found, returning most recent")
                return await self._parse_game_event(games_found[-1])

            logger.info(f"❌ No matchup found between {team1} and {team2} in {year}")
            return None

        except Exception as e:
            logger.error(f"Error finding matchup in season: {e}")
            return None

    async def find_recent_completed_game(self, team_name: str, days_back: int = 14, search_historical: bool = True) -> Optional[Dict[str, Any]]:
        """Find the most recent completed game for a team by searching back N days, then historical seasons if needed"""
        try:
            team_lower = team_name.lower()
            current_date = datetime.now()

            # First, search backwards through recent dates (last N days)
            for i in range(days_back):
                search_date = (current_date - timedelta(days=i)).strftime("%Y%m%d")

                result = await self.get_nfl_scoreboard(search_date)
                if result.get("error") or not result.get("data"):
                    continue

                events = result["data"]

                # Look for completed games for this team
                for event in events:
                    competition = event.get("competitions", [{}])[0]
                    competitors = competition.get("competitors", [])

                    # Check if this is the team we're looking for
                    is_team_game = False
                    for comp in competitors:
                        team = comp.get("team", {})
                        if team_lower in team.get("displayName", "").lower() or \
                           team_lower in team.get("shortDisplayName", "").lower():
                            is_team_game = True
                            break

                    if is_team_game:
                        # Check if game is completed
                        status = event.get("status", {})
                        if status.get("type", {}).get("completed", False):
                            logger.info(f"✅ Found completed game for {team_name} on {search_date}")
                            game_data = await self._parse_game_event(event)

                            # Enrich with detailed stats if available
                            game_id = event.get("id")
                            if game_id and game_data:
                                # Extract team IDs from the event to pass to get_game_stats
                                home_team_id = game_data.get("home_team", {}).get("id")
                                away_team_id = game_data.get("away_team", {}).get("id")

                                detailed_stats = await self.get_game_stats(game_id, home_team_id, away_team_id)
                                if detailed_stats:
                                    # Merge detailed stats
                                    game_data["home_team"]["statistics"].update(detailed_stats.get("home", {}))
                                    game_data["away_team"]["statistics"].update(detailed_stats.get("away", {}))

                                    # Add player stats if available
                                    if detailed_stats.get("home_players"):
                                        game_data["home_team"]["players"] = detailed_stats.get("home_players")
                                    if detailed_stats.get("away_players"):
                                        game_data["away_team"]["players"] = detailed_stats.get("away_players")

                                    logger.info(f"✅ Enriched game with detailed stats")

                            return game_data

            # If no recent games found and historical search is enabled, search previous seasons
            if search_historical:
                logger.info(f"🔄 No games found in last {days_back} days, searching historical seasons (2019-2024)")
                return await self._find_team_in_historical_seasons(team_name)

            logger.info(f"❌ No completed games found for {team_name} in last {days_back} days")
            return None
        except Exception as e:
            logger.error(f"Error finding recent completed game: {e}")
            return None

    async def _find_team_in_historical_seasons(self, team_name: str) -> Optional[Dict[str, Any]]:
        """Search for a team's most recent game in previous seasons (2024 back to 2019)"""
        try:
            team_lower = team_name.lower()
            current_year = datetime.now().year

            # Search from previous year back to 2019
            for year in range(current_year - 1, 2018, -1):
                logger.info(f"🔍 Searching {year} season for {team_name}")

                # Search key weeks of the season (playoffs, late season, early season)
                search_periods = [
                    # Playoffs/Late season (Jan-Feb of next year)
                    (datetime(year + 1, 1, 1), datetime(year + 1, 2, 15)),
                    # End of regular season (Dec)
                    (datetime(year, 12, 15), datetime(year, 12, 31)),
                    # Mid-late season (Nov)
                    (datetime(year, 11, 15), datetime(year, 11, 30)),
                    # Mid season (Oct)
                    (datetime(year, 10, 15), datetime(year, 10, 31)),
                    # Early season (Sept)
                    (datetime(year, 9, 1), datetime(year, 9, 30)),
                ]

                for start_date, end_date in search_periods:
                    current_date = start_date

                    while current_date <= end_date:
                        # Only check game days (Mon/Thu/Sun)
                        weekday = current_date.weekday()

                        if weekday in [0, 3, 6]:
                            search_date = current_date.strftime("%Y%m%d")

                            result = await self.get_nfl_scoreboard(search_date)
                            if result.get("data"):
                                events = result["data"]

                                for event in events:
                                    competition = event.get("competitions", [{}])[0]
                                    competitors = competition.get("competitors", [])

                                    # Check if this is the team we're looking for
                                    is_team_game = False
                                    for comp in competitors:
                                        team = comp.get("team", {})
                                        if team_lower in team.get("displayName", "").lower() or \
                                           team_lower in team.get("shortDisplayName", "").lower():
                                            is_team_game = True
                                            break

                                    if is_team_game:
                                        status = event.get("status", {})
                                        if status.get("type", {}).get("completed", False):
                                            logger.info(f"✅ Found historical game for {team_name} on {search_date}")
                                            game_data = await self._parse_game_event(event)

                                            # Enrich with stats
                                            game_id = event.get("id")
                                            if game_id and game_data:
                                                home_team_id = game_data.get("home_team", {}).get("id")
                                                away_team_id = game_data.get("away_team", {}).get("id")

                                                detailed_stats = await self.get_game_stats(game_id, home_team_id, away_team_id)
                                                if detailed_stats:
                                                    game_data["home_team"]["statistics"].update(detailed_stats.get("home", {}))
                                                    game_data["away_team"]["statistics"].update(detailed_stats.get("away", {}))

                                                    if detailed_stats.get("home_players"):
                                                        game_data["home_team"]["players"] = detailed_stats.get("home_players")
                                                    if detailed_stats.get("away_players"):
                                                        game_data["away_team"]["players"] = detailed_stats.get("away_players")

                                                    logger.info(f"✅ Enriched historical game with detailed stats")

                                            return game_data

                        current_date += timedelta(days=1)

            logger.info(f"❌ No historical games found for {team_name} (2019-2024)")
            return None
        except Exception as e:
            logger.error(f"Error searching historical seasons: {e}")
            return None

    async def get_game_stats(self, game_id: str, home_team_id: str = None, away_team_id: str = None) -> Optional[Dict[str, Any]]:
        """Fetch detailed game statistics/boxscore including player stats"""
        try:
            url = f"{self.base_url}/football/nfl/summary?event={game_id}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                    if resp.status == 200:
                        data = await resp.json()

                        # Extract team stats
                        boxscore = data.get("boxscore", {})
                        teams = boxscore.get("teams", [])
                        players = boxscore.get("players", [])

                        result = {}

                        # Match teams by ID (passed from scoreboard API)
                        home_team_stats = None
                        away_team_stats = None
                        home_players_data = None
                        away_players_data = None

                        if len(teams) >= 2 and home_team_id and away_team_id:
                            for i, team in enumerate(teams):
                                team_info = team.get("team", {})
                                team_id = str(team_info.get("id"))
                                stats = team.get("statistics", [])

                                logger.info(f"Boxscore team {i}: {team_info.get('displayName')} - id={team_id}")

                                if team_id == str(home_team_id):
                                    home_team_stats = stats
                                    logger.info(f"✅ Matched as HOME team (id: {team_id})")
                                elif team_id == str(away_team_id):
                                    away_team_stats = stats
                                    logger.info(f"✅ Matched as AWAY team (id: {team_id})")

                            if home_team_stats:
                                result["home"] = self._parse_team_stats(home_team_stats)
                            if away_team_stats:
                                result["away"] = self._parse_team_stats(away_team_stats)

                        # Match players by team ID
                        if players and home_team_id and away_team_id:
                            for player_group in players:
                                team_info = player_group.get("team", {})
                                team_id = str(team_info.get("id"))

                                if team_id == str(home_team_id):
                                    home_players_data = player_group
                                    logger.info(f"✅ Matched home players for team id {team_id}")
                                elif team_id == str(away_team_id):
                                    away_players_data = player_group
                                    logger.info(f"✅ Matched away players for team id {team_id}")

                        # Extract player stats with correct home/away matching
                        if home_players_data:
                            result["home_players"] = self._parse_player_stats(home_players_data)
                        if away_players_data:
                            result["away_players"] = self._parse_player_stats(away_players_data)

                        return result if result else None

                    return None
        except Exception as e:
            logger.warning(f"Error fetching game stats: {e}")
            return None

    def _parse_player_stats(self, team_players: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract top players (QB, RB, WR) from team player stats"""
        top_players = []

        try:
            # Get all stat categories
            stat_categories = team_players.get("statistics", [])

            # Get passing stats (QB)
            for stat_category in stat_categories:
                if stat_category.get("name") == "passing":
                    athletes = stat_category.get("athletes", [])
                    for athlete in athletes[:1]:  # Top QB
                        stats_list = athlete.get("stats", [])
                        labels = stat_category.get("labels", [])

                        # Build stats dict from labels and values
                        player_stats = {}
                        if isinstance(stats_list, list) and isinstance(labels, list):
                            for i, label in enumerate(labels):
                                if i < len(stats_list):
                                    stat_name = label.lower().replace(" ", "_").replace("/", "_")
                                    # Only include relevant stats: yards, touchdowns, completions, attempts
                                    if any(x in stat_name for x in ["yards", "yds", "touchdown", "td", "comp", "att"]):
                                        try:
                                            # Try to convert to number
                                            value = stats_list[i]
                                            if isinstance(value, str):
                                                # Handle formats like "15/25" for completions/attempts
                                                if "/" in value:
                                                    player_stats[stat_name] = value
                                                else:
                                                    player_stats[stat_name] = int(value) if value.isdigit() else value
                                            else:
                                                player_stats[stat_name] = value
                                        except (ValueError, IndexError):
                                            pass

                        if player_stats:
                            top_players.append({
                                "playerName": athlete.get("athlete", {}).get("displayName", "Unknown"),
                                "playerPosition": "QB",
                                "stats": player_stats
                            })

            # Get rushing stats (Top rusher only)
            for stat_category in stat_categories:
                if stat_category.get("name") == "rushing":
                    athletes = stat_category.get("athletes", [])
                    if athletes:  # Only get top rusher
                        athlete = athletes[0]
                        stats_list = athlete.get("stats", [])
                        labels = stat_category.get("labels", [])

                        player_stats = {}
                        if isinstance(stats_list, list) and isinstance(labels, list):
                            for i, label in enumerate(labels):
                                if i < len(stats_list):
                                    stat_name = label.lower().replace(" ", "_").replace("/", "_")
                                    # Only include: yards, touchdowns, carries
                                    if any(x in stat_name for x in ["yards", "yds", "touchdown", "td", "car", "rush"]):
                                        try:
                                            value = stats_list[i]
                                            if isinstance(value, str) and value.isdigit():
                                                player_stats[stat_name] = int(value)
                                            else:
                                                player_stats[stat_name] = value
                                        except (ValueError, IndexError):
                                            pass

                        if player_stats:
                            top_players.append({
                                "playerName": athlete.get("athlete", {}).get("displayName", "Unknown"),
                                "playerPosition": "RB",
                                "stats": player_stats
                            })
                    break

            # Get receiving stats (Top pass catcher by yards - WR or TE)
            best_receiver = None
            best_yards = 0

            for stat_category in stat_categories:
                if stat_category.get("name") == "receiving":
                    athletes = stat_category.get("athletes", [])
                    for athlete in athletes[:5]:  # Check top 5 receivers
                        stats_list = athlete.get("stats", [])
                        labels = stat_category.get("labels", [])

                        player_stats = {}
                        yards = 0

                        if isinstance(stats_list, list) and isinstance(labels, list):
                            for i, label in enumerate(labels):
                                if i < len(stats_list):
                                    stat_name = label.lower().replace(" ", "_").replace("/", "_")
                                    # Only include: yards, touchdowns, receptions
                                    if any(x in stat_name for x in ["yards", "yds", "touchdown", "td", "rec", "tgt", "target"]):
                                        try:
                                            value = stats_list[i]
                                            if isinstance(value, str) and value.isdigit():
                                                player_stats[stat_name] = int(value)
                                                # Track yards for comparison
                                                if "yds" in stat_name or "yards" in stat_name:
                                                    yards = int(value)
                                            else:
                                                player_stats[stat_name] = value
                                        except (ValueError, IndexError):
                                            pass

                        # Keep the receiver with most yards
                        if player_stats and yards > best_yards:
                            best_yards = yards
                            position = athlete.get("athlete", {}).get("position", {}).get("abbreviation", "WR")
                            best_receiver = {
                                "playerName": athlete.get("athlete", {}).get("displayName", "Unknown"),
                                "playerPosition": position,
                                "stats": player_stats
                            }
                    break

            # Add the best receiver if found
            if best_receiver:
                top_players.append(best_receiver)

        except Exception as e:
            logger.warning(f"Error parsing player stats: {e}")

        return top_players

    async def _parse_game_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Parse ESPN event into our standard format"""
        try:
            competition = event.get("competitions", [{}])[0]
            competitors = competition.get("competitors", [])

            # ESPN returns [home, away] order
            home_data = competitors[0] if len(competitors) > 0 else {}
            away_data = competitors[1] if len(competitors) > 1 else {}

            home_team = home_data.get("team", {})
            away_team = away_data.get("team", {})

            status = event.get("status", {})

            # Cache team data for faster future lookups
            home_name = home_team.get("displayName")
            home_abbr = home_team.get("abbreviation")
            home_logo = home_team.get("logo")
            home_id = home_team.get("id")

            away_name = away_team.get("displayName")
            away_abbr = away_team.get("abbreviation")
            away_logo = away_team.get("logo")
            away_id = away_team.get("id")

            # Cache teams asynchronously (don't wait for completion)
            if home_name and home_abbr and home_logo:
                asyncio.create_task(self._cache_team(home_name, home_abbr, home_logo))
            if away_name and away_abbr and away_logo:
                asyncio.create_task(self._cache_team(away_name, away_abbr, away_logo))

            # Extract team stats if available
            home_stats = home_data.get("statistics", [])
            away_stats = away_data.get("statistics", [])

            return {
                "id": event.get("id"),
                "home_team": {
                    "id": home_id,
                    "name": home_name,
                    "abbreviation": home_abbr,
                    "logo": home_logo,
                    "score": int(home_data.get("score", 0)),
                    "statistics": self._parse_team_stats(home_stats)
                },
                "away_team": {
                    "id": away_id,
                    "name": away_name,
                    "abbreviation": away_abbr,
                    "logo": away_logo,
                    "score": int(away_data.get("score", 0)),
                    "statistics": self._parse_team_stats(away_stats)
                },
                "status": status.get("type", {}).get("name", "unknown"),
                "status_detail": status.get("type", {}).get("detail", ""),
                "period": status.get("period"),
                "clock": status.get("displayClock"),
                "completed": status.get("type", {}).get("completed", False)
            }
        except Exception as e:
            logger.error(f"Error parsing game event: {e}")
            return None

    def _parse_team_stats(self, statistics: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Parse team statistics from ESPN format"""
        stats = {}
        try:
            for stat in statistics:
                if isinstance(stat, dict):
                    name = stat.get("name", "").lower()
                    value = stat.get("displayValue", "0")

                    # Map to common stat names
                    if "total yards" in name or name == "totalyards":
                        stats["yards"] = int(value.replace(",", ""))
                    elif "passing yards" in name:
                        stats["passing_yards"] = int(value.replace(",", ""))
                    elif "rushing yards" in name:
                        stats["rushing_yards"] = int(value.replace(",", ""))
                    elif "turnovers" in name:
                        stats["turnovers"] = int(value)
                    elif "possession" in name or "time of possession" in name:
                        stats["possession"] = value
                    elif "first downs" in name:
                        stats["first_downs"] = int(value)
                    elif "third down" in name and "conv" in name:
                        stats["third_down_efficiency"] = value
                    elif "penalties" in name:
                        # Format like "5-45" (number-yards)
                        stats["penalties"] = value
                    elif "sacks" in name or "sack" in name:
                        # Handle formats like "3" or "3-21" (sacks-yards)
                        if "-" in value:
                            stats["sacks"] = int(value.split("-")[0])
                        else:
                            stats["sacks"] = int(value)
        except Exception as e:
            logger.warning(f"Error parsing team stats: {e}")

        return stats

    async def get_player_season_stats(self, player_name: str, year: int = None) -> Optional[Dict[str, Any]]:
        """Fetch season stats for an NFL player by name"""
        try:
            # Use current year if not specified
            if year is None:
                year = datetime.now().year

            # Search for player using ESPN's player search
            # Note: ESPN doesn't have a direct player search API, so we'll search through recent games
            # and extract player stats from boxscores

            # Get recent scoreboard to find games
            scoreboard = await self.get_nfl_scoreboard()
            if not scoreboard.get("data"):
                logger.warning(f"No scoreboard data available for player search: {player_name}")
                return None

            player_stats_aggregated = {
                "playerName": player_name,
                "playerPosition": None,
                "team": None,
                "seasonStats": {},
                "gamesPlayed": 0
            }

            # Search through recent games for this player
            games = scoreboard.get("data", [])
            for event in games:
                try:
                    game_id = event.get("id")
                    if not game_id:
                        continue

                    # Get game stats
                    competitions = event.get("competitions", [])
                    if not competitions:
                        continue

                    competitors = competitions[0].get("competitors", [])
                    if len(competitors) < 2:
                        continue

                    home_team_id = competitors[0].get("team", {}).get("id")
                    away_team_id = competitors[1].get("team", {}).get("id")

                    game_stats = await self.get_game_stats(game_id, home_team_id, away_team_id)
                    if not game_stats:
                        continue

                    # Check both home and away players
                    for player_list_key in ["home_players", "away_players"]:
                        players = game_stats.get(player_list_key, [])
                        for player in players:
                            if player.get("playerName", "").lower() == player_name.lower():
                                # Found the player! Aggregate their stats
                                if not player_stats_aggregated["playerPosition"]:
                                    player_stats_aggregated["playerPosition"] = player.get("playerPosition")
                                    # Get team info
                                    team_idx = 0 if player_list_key == "home_players" else 1
                                    player_stats_aggregated["team"] = competitors[team_idx].get("team", {}).get("displayName")

                                player_stats_aggregated["gamesPlayed"] += 1

                                # Aggregate stats
                                stats = player.get("stats", {})
                                for stat_key, stat_value in stats.items():
                                    if isinstance(stat_value, (int, float)):
                                        current = player_stats_aggregated["seasonStats"].get(stat_key, 0)
                                        player_stats_aggregated["seasonStats"][stat_key] = current + stat_value

                except Exception as e:
                    logger.warning(f"Error processing game for player stats: {e}")
                    continue

            # If we found the player, return their aggregated stats
            if player_stats_aggregated["gamesPlayed"] > 0:
                return player_stats_aggregated

            logger.warning(f"Player not found in recent games: {player_name}")
            return None

        except Exception as e:
            logger.warning(f"Error fetching player season stats: {e}")
            return None


# Global instance
espn_service = ESPNService()
