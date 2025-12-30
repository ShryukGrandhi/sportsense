"""
Data Cache Service - Manages caching of team and player data
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from backend.database import db
from backend.models import TeamCache, PlayerCache, PlayerStatsSnapshot
from backend.services.espn import get_espn_client
from backend.services.sportradar import get_sportradar_client
import logging

logger = logging.getLogger(__name__)

# ========================================
# TEAM CACHING
# ========================================

async def cache_nfl_teams():
    """Fetch and cache all NFL teams from ESPN"""
    try:
        espn = await get_espn_client()

        # Get NFL teams from ESPN
        url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams"
        data = await espn.fetch(url)

        if not data or 'sports' not in data:
            logger.error("Failed to fetch NFL teams from ESPN")
            return 0

        teams = data['sports'][0]['leagues'][0]['teams']
        cached_count = 0

        for team_data in teams:
            team = team_data['team']

            # Build aliases list
            aliases = [
                team['displayName'],
                team['name'],
                team['abbreviation'],
                team.get('shortDisplayName', team['name'])
            ]
            # Add unique aliases
            aliases = list(set(aliases))

            team_cache = {
                "sport": "NFL",
                "team_id": str(team['id']),
                "name": team['displayName'],
                "short_name": team['name'],
                "abbreviation": team['abbreviation'],
                "aliases": aliases,
                "logo_url": team.get('logos', [{}])[0].get('href'),
                "primary_color": team.get('color'),
                "secondary_color": team.get('alternateColor'),
                "conference": team.get('groups', {}).get('conference', {}).get('name'),
                "division": team.get('groups', {}).get('division', {}).get('name'),
                "city": team.get('location'),
                "updated_at": datetime.utcnow()
            }

            # Upsert to database
            await db.team_cache.update_one(
                {"sport": "NFL", "team_id": str(team['id'])},
                {"$set": team_cache},
                upsert=True
            )
            cached_count += 1

        logger.info(f"✅ Cached {cached_count} NFL teams")
        return cached_count

    except Exception as e:
        logger.error(f"❌ Error caching NFL teams: {e}")
        return 0

async def get_team_by_name(sport: str, team_name: str) -> Optional[Dict[str, Any]]:
    """Look up team by name or alias"""
    try:
        # Try exact match first
        team = await db.team_cache.find_one({
            "sport": sport,
            "$or": [
                {"name": {"$regex": team_name, "$options": "i"}},
                {"short_name": {"$regex": team_name, "$options": "i"}},
                {"abbreviation": {"$regex": team_name, "$options": "i"}},
                {"aliases": {"$regex": team_name, "$options": "i"}}
            ]
        })
        return team
    except Exception as e:
        logger.error(f"Error looking up team {team_name}: {e}")
        return None

# ========================================
# PLAYER CACHING
# ========================================

async def cache_nfl_team_roster(team_id: str):
    """Cache all players from an NFL team"""
    try:
        espn = await get_espn_client()

        # Get team roster from ESPN
        url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}/roster"
        data = await espn.fetch(url)

        if not data or 'athletes' not in data:
            logger.error(f"Failed to fetch roster for team {team_id}")
            return 0

        # Get team info for abbreviation
        team_info = await db.team_cache.find_one({"sport": "NFL", "team_id": team_id})
        team_abbr = team_info['abbreviation'] if team_info else "UNK"
        team_name = team_info['name'] if team_info else "Unknown"

        cached_count = 0

        for athlete in data['athletes']:
            try:
                # Build player data
                full_name = athlete.get('fullName', '')
                display_name = athlete.get('displayName', full_name)

                # Parse name
                name_parts = full_name.split(' ', 1)
                first_name = name_parts[0] if len(name_parts) > 0 else ''
                last_name = name_parts[1] if len(name_parts) > 1 else name_parts[0]

                # Build aliases
                aliases = [full_name, display_name, last_name]
                if athlete.get('shortName'):
                    aliases.append(athlete['shortName'])
                aliases = list(set(filter(None, aliases)))

                player_cache = {
                    "sport": "NFL",
                    "player_id": str(athlete['id']),
                    "full_name": full_name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "aliases": aliases,
                    "team": team_name,
                    "team_abbreviation": team_abbr,
                    "position": athlete.get('position', {}).get('abbreviation', 'UNK'),
                    "jersey_number": athlete.get('jersey'),
                    "headshot_url": athlete.get('headshot', {}).get('href'),
                    "season": "2024",
                    "stats": {},  # Will be populated separately
                    "is_active": True,
                    "updated_at": datetime.utcnow()
                }

                # Upsert to database
                await db.player_cache.update_one(
                    {"sport": "NFL", "player_id": str(athlete['id'])},
                    {"$set": player_cache},
                    upsert=True
                )
                cached_count += 1

            except Exception as e:
                logger.error(f"Error caching player {athlete.get('fullName')}: {e}")
                continue

        logger.info(f"✅ Cached {cached_count} players for team {team_id}")
        return cached_count

    except Exception as e:
        logger.error(f"❌ Error caching roster for team {team_id}: {e}")
        return 0

async def cache_all_nfl_players():
    """Cache all NFL players from all teams"""
    try:
        # Get all NFL teams
        teams = await db.team_cache.find({"sport": "NFL"}).to_list(length=None)

        if not teams:
            logger.warning("No NFL teams in cache. Run cache_nfl_teams() first.")
            return 0

        total_players = 0
        for team in teams:
            team_id = team.get('team_id')
            if team_id:
                count = await cache_nfl_team_roster(team_id)
                total_players += count
                await asyncio.sleep(0.5)  # Rate limiting

        logger.info(f"✅ Cached {total_players} total NFL players")
        return total_players

    except Exception as e:
        logger.error(f"❌ Error caching all NFL players: {e}")
        return 0

async def get_player_by_name(sport: str, player_name: str, team: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Look up player by name or alias"""
    try:
        query = {
            "sport": sport,
            "$or": [
                {"full_name": {"$regex": player_name, "$options": "i"}},
                {"last_name": {"$regex": player_name, "$options": "i"}},
                {"aliases": {"$regex": player_name, "$options": "i"}}
            ]
        }

        # Filter by team if provided
        if team:
            query["$or"].extend([
                {"team": {"$regex": team, "$options": "i"}},
                {"team_abbreviation": {"$regex": team, "$options": "i"}}
            ])

        player = await db.player_cache.find_one(query)
        return player
    except Exception as e:
        logger.error(f"Error looking up player {player_name}: {e}")
        return None

async def search_players(sport: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Search for players by name (fuzzy search)"""
    try:
        results = await db.player_cache.find({
            "sport": sport,
            "is_active": True,
            "$or": [
                {"full_name": {"$regex": query, "$options": "i"}},
                {"last_name": {"$regex": query, "$options": "i"}},
                {"aliases": {"$regex": query, "$options": "i"}}
            ]
        }).limit(limit).to_list(length=limit)

        return results
    except Exception as e:
        logger.error(f"Error searching players: {e}")
        return []

# ========================================
# STATS UPDATES
# ========================================

async def update_player_stats(sport: str, player_id: str, stats: Dict[str, Any]):
    """Update player stats and create a snapshot"""
    try:
        # Update current stats
        await db.player_cache.update_one(
            {"sport": sport, "player_id": player_id},
            {
                "$set": {
                    "stats": stats,
                    "updated_at": datetime.utcnow(),
                    "last_game_date": datetime.utcnow()
                }
            }
        )

        # Create stats snapshot for historical tracking
        snapshot = {
            "player_id": player_id,
            "sport": sport,
            "season": "2024",
            "date": datetime.utcnow(),
            "stats": stats,
            "created_at": datetime.utcnow()
        }

        await db.player_stats_snapshots.insert_one(snapshot)

        return True
    except Exception as e:
        logger.error(f"Error updating player stats: {e}")
        return False

# ========================================
# SCHEDULED UPDATES
# ========================================

async def refresh_all_data():
    """Refresh all cached team and player data"""
    logger.info("🔄 Starting scheduled data refresh...")

    try:
        # Refresh NFL teams
        team_count = await cache_nfl_teams()
        logger.info(f"Refreshed {team_count} NFL teams")

        # Refresh NFL players (only if teams were cached)
        if team_count > 0:
            player_count = await cache_all_nfl_players()
            logger.info(f"Refreshed {player_count} NFL players")

        logger.info("✅ Data refresh completed")
        return True

    except Exception as e:
        logger.error(f"❌ Error during data refresh: {e}")
        return False

async def get_cache_stats() -> Dict[str, Any]:
    """Get statistics about cached data"""
    try:
        stats = {
            "teams": {
                "total": await db.team_cache.count_documents({}),
                "nfl": await db.team_cache.count_documents({"sport": "NFL"}),
                "last_updated": None
            },
            "players": {
                "total": await db.player_cache.count_documents({}),
                "nfl": await db.player_cache.count_documents({"sport": "NFL"}),
                "active": await db.player_cache.count_documents({"is_active": True}),
                "last_updated": None
            },
            "snapshots": {
                "total": await db.player_stats_snapshots.count_documents({})
            }
        }

        # Get last update times
        latest_team = await db.team_cache.find_one(
            {},
            sort=[("updated_at", -1)]
        )
        if latest_team:
            stats["teams"]["last_updated"] = latest_team.get("updated_at")

        latest_player = await db.player_cache.find_one(
            {},
            sort=[("updated_at", -1)]
        )
        if latest_player:
            stats["players"]["last_updated"] = latest_player.get("updated_at")

        return stats
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {}
