import aiohttp
import json
from typing import Dict, Any, Optional, List
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class PerplexityService:
    """Perplexity AI service as alternative to Gemini"""
    
    def __init__(self):
        self.api_key = os.environ.get('PPLX_API_KEY')  # Updated to match .env key
        self.base_url = "https://api.perplexity.ai/chat/completions"
        self.session = None
        
    async def get_session(self):
        """Get or create aiohttp session"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
        
    async def close_session(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
    
    async def _make_request(self, messages: list, model: str = "sonar") -> str:
        """Make request to Perplexity API"""
        try:
            session = await self.get_session()

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.2
            }
            
            async with session.post(self.base_url, headers=headers, json=payload, timeout=30) as response:
                if response.status == 200:
                    result = await response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    error_text = await response.text()
                    print(f"❌ Perplexity API {response.status} error: {error_text}")
                    return f"Perplexity API error: {response.status} - {error_text}"
                    
        except Exception as e:
            return f"Perplexity request failed: {str(e)}"
    
    async def parse_sports_intent(self, query: str) -> Dict[str, Any]:
        """Parse user query to extract sports intent using Perplexity"""
        try:
            messages = [
                {
                    "role": "system",
                    "content": """You are a sports intent parser. Analyze user queries and return JSON with:
{
  "sport": "NFL|NBA|MLB|NHL|Soccer|Football|Tennis|Golf|General",
  "request_type": "schedule|standings|boxscore|roster|stats|news|general|player_stats|match_info|highlights",
  "confidence": 0.0-1.0,
  "parameters": {
    "team": "team_name_if_mentioned",
    "home_team": "home_team_if_mentioned",
    "away_team": "away_team_if_mentioned",
    "league": "league_if_mentioned (e.g., NFL)",
    "season": "season_year_if_mentioned (e.g., 2025)",
    "date": "YYYY-MM-DD if mentioned",
    "player": "player_name_if_mentioned"
  },
  "requires_api": true|false
}

Key Guidelines:
- For soccer/football players (like Ronaldo, Messi, Mbappe), use "Soccer" or "Football"
- Player stats queries should use "player_stats" request_type
- If the query contains a matchup, extract both teams and a normalized date:
  - Accept both formats: "YYYY-MM-DD" and "Month Day, Year" (normalize to YYYY-MM-DD)
  - Examples to parse correctly:
    - "Vikings vs Bengals on September 21, 2025" → {"home_team":"Vikings","away_team":"Bengals","league":"NFL","season":2025,"date":"2025-09-21"}
    - "Bengals at Vikings 2025-09-21" → home_team:"Vikings", away_team:"Bengals"
  - If the phrasing is "X at Y", then home_team=Y and away_team=X. If "X vs Y", leave as given.
  - Include "league" (e.g., NFL) and "season" (year) when the year is apparent.
- Famous football players include: Cristiano Ronaldo, Lionel Messi, Kylian Mbappe, Erling Haaland, Neymar, etc.
- If mentioning a player by name, always set requires_api: true
- Match highlights should use "highlights" request_type

Examples:
- "Lakers game tonight" → {"sport": "NBA", "request_type": "schedule", "confidence": 0.9, "parameters": {"team": "Lakers"}, "requires_api": true}
- "Cristiano Ronaldo stats" → {"sport": "Soccer", "request_type": "player_stats", "confidence": 0.95, "parameters": {"player": "Cristiano Ronaldo"}, "requires_api": true}
- "Messi highlights" → {"sport": "Soccer", "request_type": "highlights", "confidence": 0.9, "parameters": {"player": "Messi"}, "requires_api": true}
- "Warriors vs Rockets box score" → {"sport": "NBA", "request_type": "boxscore", "confidence": 0.9, "parameters": {"home_team": "Warriors", "away_team": "Rockets"}, "requires_api": true}
- "Vikings vs Bengals on September 21, 2025" → {"sport":"NFL","request_type":"match_info","confidence":0.9, "parameters":{"home_team":"Vikings","away_team":"Bengals","league":"NFL","season":2025,"date":"2025-09-21"},"requires_api": true}

Return ONLY the JSON object, no other text."""
                },
                {
                    "role": "user",
                    "content": f"Parse this sports query: {query}"
                }
            ]
            
            response = await self._make_request(messages)
            
            # Try to parse JSON response
            try:
                intent = json.loads(response.strip())
                return intent
            except json.JSONDecodeError:
                # Fallback parsing
                return {
                    "sport": "General",
                    "request_type": "general",
                    "confidence": 0.3,
                    "parameters": {},
                    "requires_api": False
                }
                
        except Exception as e:
            print(f"❌ Perplexity intent parsing error: {e}")
            return {
                "sport": "General",
                "request_type": "general",
                "confidence": 0.1,
                "parameters": {},
                "requires_api": False,
                "error": str(e)
            }
    
    async def generate_final_response(
        self,
        query: str,
        combined_data: Dict[str, Any],
        intent: Dict[str, Any],
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Generate final response using query + structured cards snapshot.

        The agent now passes a combined payload which may include:
        - cards: a list of structured card dicts (ScoreCard/StatsCard/etc.) used by the frontend
        - raw: the raw source payloads (highlightly/sportradar) for traceability
        """
        try:
            # Prefer structured cards snapshot for strict consistency with frontend
            cards = combined_data.get("cards") or []
            raw_sources = combined_data.get("raw") or {}
            data_summary = self._summarize_structured_cards(cards, raw_sources)
            
            messages = [
                {
                    "role": "system",
                    "content": """You are PLAYMAKER, a sports AI assistant.

STRICT CONSISTENCY:
- Use ONLY the provided structured cards JSON when referencing scores, teams, stats, or dates.
- Do NOT invent or infer numbers; if a value is missing, acknowledge and avoid guessing.
- If both ScoreCard and other sources are present, the ScoreCard is the single source of truth.

Response Guidelines:
- Use relevant sports emojis.
- Be concise, friendly, and specific.
- Format scores, dates, and stats clearly.
- If data is empty or error, acknowledge gracefully."""
                }
            ]
            
            # Insert chat history if available
            if chat_history:
                # Filter out system messages just in case, though we only passed user/assistant
                valid_history = [msg for msg in chat_history if msg.get("role") in ("user", "assistant")]
                messages.extend(valid_history)
            
            messages.append({
                "role": "user",
                "content": f"""User Question: {query}

Structured Cards (frontend-rendered):
{data_summary}

Intent: {intent.get('sport', 'General')} - {intent.get('request_type', 'general')}

Please write a natural response that cites ONLY the values from the structured cards."""
            })
            
            response = await self._make_request(messages)
            return response
            
        except Exception as e:
            print(f"❌ Perplexity response generation error: {e}")
            return f"I'm having trouble accessing the latest sports data right now. Please try again in a moment! 🏈"
    
    def _summarize_structured_cards(self, cards: Any, raw_sources: Dict[str, Any]) -> str:
        """Create a concise JSON summary focusing on ScoreCard for strict consistency."""
        try:
            if not cards or not isinstance(cards, list):
                return json.dumps({
                    "cards": [],
                    "note": "No structured cards available",
                }, indent=2)

            # Find primary scorecard if present
            scorecards = [c for c in cards if isinstance(c, dict) and c.get("type") == "scorecard"]
            primary = scorecards[0] if scorecards else None

            summary = {"cards": cards[:3]}  # limit size
            if primary:
                summary["primary_scorecard"] = {
                    "title": primary.get("title"),
                    "teams": primary.get("teams"),
                    "meta": primary.get("meta"),
                    "quarters": primary.get("quarters"),
                }
            return json.dumps(summary, indent=2)
        except Exception:
            # As a last resort, return raw JSON limited in size
            raw = {k: v for k, v in (raw_sources or {}).items() if k in ("highlightly", "sportradar")}
            raw_str = json.dumps(raw, indent=2)[:1500]
            return raw_str

# Global instance
perplexity_service = PerplexityService()
