try:
    import google.generativeai as genai
    GOOGLE_AI_AVAILABLE = True
except ImportError:
    print("Warning: google.generativeai not available")
    genai = None
    GOOGLE_AI_AVAILABLE = False

from typing import Dict, Any, Optional
import os
import json
from datetime import datetime

class GeminiService:
    """Gemini AI service for intent parsing and response generation"""

    def __init__(self):
        # Configure Gemini
        if not GOOGLE_AI_AVAILABLE:
            return
        genai.configure(api_key=os.environ.get('PERPLEXITY_API_KEY') or os.environ.get('PPLX_API_KEY'))
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def parse_sports_intent(self, query: str) -> Dict[str, Any]:
        """Parse user query to extract sports intent"""
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            prompt = f"""You are a sports intent parser. Analyze user queries and return JSON with:
{{
  "sport": "NFL|NBA|MLB|NHL|Soccer|Tennis|Golf",
  "request_type": "schedule|standings|boxscore|roster|stats|news|general|match_info|recent_game|head_to_head|player_stats|top_performers",
  "confidence": 0.0-1.0,
  "parameters": {{
    "team": "team_name_if_mentioned",
    "home_team": "home_team_if_mentioned",
    "away_team": "away_team_if_mentioned",
    "date": "date_if_mentioned (today is {today})",
    "player": "player_name_if_mentioned",
    "league": "league_if_mentioned"
  }},
  "requires_api": true|false
}}

REQUEST TYPES:
- "recent_game": Recent/latest game for a team (e.g., "Vikings game score", "Chiefs score", "Bengals game")
- "match_info": Specific matchup between two teams (e.g., "Chargers vs Colts", "49ers vs Seahawks score")
- "head_to_head": Team matchup history
- "player_stats": Player statistics
- "top_performers": Top players from a team or game
- "schedule": Upcoming games
- "standings": League standings
- "boxscore": Game box score

Examples:
- "Lakers game tonight" → {{"sport": "NBA", "request_type": "schedule", "confidence": 0.9, "parameters": {{"team": "Lakers"}}, "requires_api": true}}
- "Vikings game score" → {{"sport": "NFL", "request_type": "recent_game", "confidence": 0.95, "parameters": {{"team": "Minnesota Vikings", "league": "NFL"}}, "requires_api": true}}
- "Chiefs score" → {{"sport": "NFL", "request_type": "recent_game", "confidence": 0.95, "parameters": {{"team": "Kansas City Chiefs", "league": "NFL"}}, "requires_api": true}}
- "Chargers vs Colts" → {{"sport": "NFL", "request_type": "match_info", "confidence": 0.9, "parameters": {{"home_team": "Los Angeles Chargers", "away_team": "Indianapolis Colts", "league": "NFL"}}, "requires_api": true}}
- "Who won the Lakers game?" → {{"sport": "NBA", "request_type": "recent_game", "confidence": 0.85, "parameters": {{"team": "Lakers"}}, "requires_api": true}}

Return ONLY the JSON object, no other text.

Parse this sports query: {query}"""

            response = self.model.generate_content(prompt)

            # Try to parse JSON response
            try:
                # Clean the response - sometimes it has markdown formatting
                clean_response = response.text.strip()
                if clean_response.startswith('```json'):
                    clean_response = clean_response.replace('```json', '').replace('```', '').strip()
                elif clean_response.startswith('```'):
                    clean_response = clean_response.replace('```', '').strip()

                intent = json.loads(clean_response)
                return intent
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing failed for response: {response.text}")
                print(f"❌ JSON error: {e}")
                # Fallback parsing
                return {
                    "sport": "General",
                    "request_type": "general",
                    "confidence": 0.3,
                    "parameters": {},
                    "requires_api": False
                }

        except Exception as e:
            print(f"❌ Intent parsing error: {e}")
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
        intent: Dict[str, Any]
    ) -> str:
        """Generate final response using query + combined sports data"""
        try:
            # Create enhanced prompt with both data sources
            sportradar_summary = self._summarize_sportradar_data(combined_data.get('sportradar', {}))
            highlightly_summary = self._summarize_highlightly_data(combined_data.get('highlightly', {}))

            prompt = f"""You are PLAYMAKER, a sports AI assistant. Use the provided sports data to answer the user's question.

🏆 **Response Guidelines:**
- Use relevant sports emojis
- Be conversational and engaging
- Include specific data from the sports APIs
- Format scores, dates, and stats clearly
- If data is empty or error, acknowledge it gracefully
- Keep responses concise but informative
- Focus on the text response - structured data will be displayed separately

Example: "🏀 The Lakers are currently 15-10 this season, sitting at 3rd place in the Western Conference. Their next game is tomorrow against the Warriors at 7:30 PM PT."

User Question: {query}

Sports Data from Sportradar:
{sportradar_summary}

Football Data from Highlightly:
{highlightly_summary}

Intent: {intent.get('sport', 'General')} - {intent.get('request_type', 'general')}

Please provide a natural, helpful response using this data. Focus on the key information - detailed structured data will be displayed separately in cards."""

            response = self.model.generate_content(prompt)

            return response.text

        except Exception as e:
            return f"I apologize, but I encountered an issue generating a response. Error: {str(e)}"

    def _summarize_highlightly_data(self, highlightly_data: Dict[str, Any]) -> str:
        """Summarize Highlightly API data for LLM context"""
        if not highlightly_data or highlightly_data.get('error'):
            return "No Highlightly data available"

        data = highlightly_data.get('data', [])

        if not data:
            return "No Highlightly data available"

        summary_parts = []

        # Matches data
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            first_item = data[0]

            # Check if it's match data
            if 'homeTeam' in first_item or 'awayTeam' in first_item:
                summary_parts.append(f"Found {len(data)} matches")
                for i, match in enumerate(data[:3]):  # Show first 3 matches
                    home = match.get('homeTeam', {}).get('name', 'Unknown')
                    away = match.get('awayTeam', {}).get('name', 'Unknown')
                    date = match.get('date', 'Unknown date')
                    summary_parts.append(f"Match {i+1}: {home} vs {away} on {date}")

            # Check if it's highlights data
            elif 'embedUrl' in first_item or 'imgUrl' in first_item:
                summary_parts.append(f"Found {len(data)} highlights/media items")

        # Player data
        elif isinstance(data, dict) and 'name' in data:
            summary_parts.append(f"Player profile: {data.get('name')}")
            if 'position' in data:
                summary_parts.append(f"Position: {data.get('position')}")

        return "\n".join(summary_parts) if summary_parts else "Highlightly data structure not recognized"

    def _summarize_sportradar_data(self, data: Dict[str, Any]) -> str:
        """Create a concise summary of Sportradar data for the AI"""
        if not data or "error" in data:
            return "No data available or API error occurred."

        # Extract key information based on data structure
        summary_parts = []

        # Check for common Sportradar response structures
        if "games" in data:
            games_count = len(data["games"]) if isinstance(data["games"], list) else 0
            summary_parts.append(f"Found {games_count} games in schedule")

        if "standings" in data:
            summary_parts.append("Current standings data available")

        if "boxscore" in data:
            summary_parts.append("Game boxscore with detailed statistics")

        if "team" in data:
            team_name = data.get("team", {}).get("name", "Unknown")
            summary_parts.append(f"Team data for {team_name}")

        # Add raw data (truncated for context)
        data_str = json.dumps(data, indent=2)[:1500]  # Limit size
        if len(json.dumps(data)) > 1500:
            data_str += "... [truncated]"

        summary = " | ".join(summary_parts) if summary_parts else "Sports data received"

        return f"{summary}\n\nData: {data_str}"

# Global instance
gemini_service = GeminiService()