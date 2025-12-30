import aiohttp
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import feedparser
import json
import os
from backend.models import SportsContent
from backend.database import db

class SportsDataService:
    def __init__(self):
        self.session = None
        
    async def get_session(self):
        """Get or create aiohttp session with optimized settings."""
        if self.session is None:
            # Create session with connection pooling and timeouts
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            connector = aiohttp.TCPConnector(
                limit=100,  # Max concurrent connections
                limit_per_host=30,  # Max per host
                ttl_dns_cache=300,  # DNS cache TTL
                enable_cleanup_closed=True
            )
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector
            )
        return self.session
        
    async def close_session(self):
        """Close aiohttp session."""
        if self.session:
            await self.session.close()

    async def get_trending_topics(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending sports topics from database."""
        try:
            cursor = db.sports_content.find().sort("trending_score", -1).limit(limit)
            topics = []
            async for doc in cursor:
                topics.append({
                    "id": str(doc["_id"]),
                    "title": doc["title"],
                    "sport": doc["sport"],
                    "type": doc["type"],
                    "engagement": doc["engagement"],
                    "trending_score": doc["trending_score"],
                    "source": doc["source"],
                    "url": doc.get("url"),
                    "created_at": doc["created_at"]
                })
            return topics
        except Exception as e:
            print(f"❌ Error getting trending topics: {e}")
            return self.get_mock_trending_topics()

    def get_mock_trending_topics(self) -> List[Dict[str, Any]]:
        """Mock trending topics for fallback."""
        return [
            {
                "id": "1",
                "title": "NFL Trade Deadline Moves Shake Up Playoff Race",
                "sport": "NFL",
                "type": "news",
                "engagement": 1250,
                "trending_score": 95.5,
                "source": "ESPN",
                "created_at": datetime.utcnow()
            },
            {
                "id": "2", 
                "title": "NBA MVP Race Heating Up",
                "sport": "NBA",
                "type": "analysis",
                "engagement": 980,
                "trending_score": 87.2,
                "source": "The Athletic",
                "created_at": datetime.utcnow()
            },
            {
                "id": "3",
                "title": "College Football Playoff Rankings Released",
                "sport": "Football",
                "type": "news",
                "engagement": 850,
                "trending_score": 78.9,
                "source": "Sports Illustrated",
                "created_at": datetime.utcnow()
            }
        ]

    async def scrape_espn_news(self, sport: str = "general") -> List[Dict[str, Any]]:
        """Scrape ESPN RSS feeds for sports news."""
        try:
            rss_urls = {
                "nfl": "https://www.espn.com/espn/rss/nfl/news",
                "nba": "https://www.espn.com/espn/rss/nba/news", 
                "mlb": "https://www.espn.com/espn/rss/mlb/news",
                "general": "https://www.espn.com/espn/rss/news"
            }
            
            url = rss_urls.get(sport.lower(), rss_urls["general"])
            
            # Parse RSS feed
            feed = feedparser.parse(url)
            articles = []
            
            for entry in feed.entries[:10]:  # Limit to 10 articles
                articles.append({
                    "title": entry.title,
                    "content": entry.summary if hasattr(entry, 'summary') else entry.title,
                    "url": entry.link,
                    "published": datetime.now(),
                    "source": "ESPN"
                })
                
            return articles
            
        except Exception as e:
            print(f"❌ Error scraping ESPN: {e}")
            return []

    async def scrape_sports_videos(self) -> List[Dict[str, Any]]:
        """Scrape sports video content from free sources."""
        try:
            # This would implement scraping from YouTube, social media etc.
            # For now, return mock data
            return [
                {
                    "title": "Best NFL Highlights This Week",
                    "type": "video",
                    "sport": "NFL", 
                    "url": "https://youtube.com/watch?v=example1",
                    "thumbnail": "https://img.youtube.com/vi/example1/maxresdefault.jpg",
                    "duration": "5:32",
                    "views": 125000,
                    "source": "NFL Official"
                },
                {
                    "title": "NBA Top 10 Plays",
                    "type": "video",
                    "sport": "NBA",
                    "url": "https://youtube.com/watch?v=example2", 
                    "thumbnail": "https://img.youtube.com/vi/example2/maxresdefault.jpg",
                    "duration": "3:15",
                    "views": 89000,
                    "source": "NBA"
                }
            ]
            
        except Exception as e:
            print(f"❌ Error scraping videos: {e}")
            return []

    async def get_sports_context(self, query: str, user_interests: List[str]) -> Dict[str, Any]:
        """Get relevant sports context for AI queries."""
        try:
            context = {}
            
            # Get trending topics
            trending = await self.get_trending_topics(5)
            context["trending_topics"] = [topic["title"] for topic in trending]
            
            # Get recent news for user interests
            recent_news = []
            for interest in user_interests[:3]:
                news = await self.scrape_espn_news(interest.lower())
                recent_news.extend(news[:2])
            
            context["recent_news"] = recent_news
            context["user_interests"] = user_interests
            context["current_season"] = self.get_current_season()
            
            return context
            
        except Exception as e:
            print(f"❌ Error getting sports context: {e}")
            return {}

    def get_current_season(self) -> str:
        """Get current sports season info."""
        now = datetime.now()
        month = now.month
        
        if 9 <= month <= 12:
            return "NFL Regular Season, NBA/NHL Preseason"
        elif 1 <= month <= 3:
            return "NFL Playoffs, NBA/NHL Regular Season"
        elif 4 <= month <= 6:
            return "NBA/NHL Playoffs, MLB Regular Season"
        else:
            return "MLB Regular Season, NFL Offseason"

    async def update_trending_scores(self):
        """Update trending scores based on engagement."""
        try:
            # This would implement algorithm to calculate trending scores
            # based on engagement, recency, user interactions etc.
            await db.sports_content.update_many(
                {"created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}},
                {"$inc": {"trending_score": -1}}  # Decay old content
            )
            print("✅ Updated trending scores")
        except Exception as e:
            print(f"❌ Error updating trending scores: {e}")

    async def store_sports_content(self, content_list: List[Dict[str, Any]], content_type: str, sport: str):
        """Store scraped sports content in database."""
        try:
            for content in content_list:
                sports_content = SportsContent(
                    type=content_type,
                    sport=sport,
                    title=content["title"],
                    content=content.get("content", content["title"]),
                    source=content["source"],
                    url=content.get("url"),
                    engagement=content.get("views", 0),
                    trending_score=50.0  # Base score
                )
                
                # Check if content already exists
                existing = await db.sports_content.find_one({
                    "title": content["title"],
                    "source": content["source"]
                })
                
                if not existing:
                    await db.sports_content.insert_one(sports_content.dict(exclude={"id"}))
                    
            print(f"✅ Stored {len(content_list)} {sport} {content_type} items")
        except Exception as e:
            print(f"❌ Error storing sports content: {e}")

# Global sports service instance
sports_service = SportsDataService()