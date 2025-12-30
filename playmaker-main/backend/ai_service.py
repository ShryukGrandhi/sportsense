from typing import Dict, Any, Optional, List
import os
from datetime import datetime
import httpx
import logging

class SportsAIService:
    def __init__(self):
        # No heavy model initialization required for Perplexity HTTP API

        self.system_message = """You are PLAYMAKER, an AI sports assistant that specializes in:

🏆 **Core Expertise:**
- Live sports analysis and commentary
- Player statistics and performance insights
- Trade analysis and predictions
- Fantasy sports strategy and advice
- Historical sports data and comparisons
- Real-time game updates and breakdowns
- Team dynamics and coaching strategies

🎯 **Response Style:**
- Use relevant sports emojis for engagement
- Provide clear, structured information
- Include statistical context when relevant
- Offer multiple perspectives on complex topics
- Keep responses conversational but informative
- Focus on current sports seasons and events

📊 **Sports Coverage:**
- NFL (National Football League)
- NBA (National Basketball Association)
- MLB (Major League Baseball)
- College Football & Basketball
- Soccer/Football (Premier League, MLS, etc.)
- NHL (National Hockey League)
- Tennis, Golf, and other major sports

Always aim to provide accurate, engaging, and current sports information that helps fans understand the game better."""

    async def get_ai_response(
        self,
        user_message: str,
        session_id: str,
        sports_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Get AI response with sports context."""
        try:
            # Enhance message with sports context if available
            enhanced_message = user_message
            if sports_context:
                context_str = self._format_sports_context(sports_context)
                enhanced_message = f"Sports Context: {context_str}\n\nUser Question: {user_message}"

            # Create full prompt with system message
            full_prompt = f"{self.system_message}\n\nUser: {enhanced_message}"

            # Fallback lightweight behavior; this path isn't primary in current app flow
            return full_prompt[:1000]

        except Exception as e:
            print(f"❌ Error getting AI response: {e}")
            return "I'm experiencing some technical difficulties right now. Please try again in a moment! 🏈"

    def _format_sports_context(self, context: Dict[str, Any]) -> str:
        """Format sports context for AI prompt."""
        formatted_parts = []

        if context.get('trending_topics'):
            topics = ", ".join(context['trending_topics'][:5])
            formatted_parts.append(f"Trending: {topics}")

        if context.get('recent_news'):
            news = context['recent_news'][:3]
            news_str = "; ".join([f"{item.get('title', '')}" for item in news])
            formatted_parts.append(f"Recent News: {news_str}")

        if context.get('user_interests'):
            interests = ", ".join(context['user_interests'])
            formatted_parts.append(f"User Interests: {interests}")

        if context.get('current_season'):
            formatted_parts.append(f"Season: {context['current_season']}")

        return " | ".join(formatted_parts)

    async def generate_chat_title(self, first_message: str) -> Optional[str]:
        """Generate a concise chat title using Perplexity API.
        Returns None on failure or when API key is missing.
        """
        logger = logging.getLogger(__name__)
        api_key = os.getenv("PERPLEXITY_API_KEY") or os.getenv("PPLX_API_KEY")
        if not api_key:
            logger.warning("[AUDIT][TITLE_GEN_SKIP] Missing Perplexity key, skipping title generation.")
            return None

        # Skip if the source text is empty/whitespace
        if not first_message or len(first_message.strip()) == 0:
            logger.warning("[AUDIT][TITLE_GEN_SKIP] Empty text_response, skipping title generation")
            return None

        # Build compliant payload for Perplexity chat/completions
        payload = {
            "model": "sonar",
            "messages": [
                {
                    "role": "system",
                    "content": "You are PLAYMAKER, a concise sports AI that creates short, headline-style chat titles.",
                },
                {
                    "role": "user",
                    "content": f"Generate a concise 4-6 word title summarizing: {first_message[:180]}",
                },
            ],
            "max_tokens": 32,
            "temperature": 0.5,
        }

        try:
            res = httpx.post(
                "https://api.perplexity.ai/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10,
            )
            if res.status_code == 200:
                data = res.json()
                title = data["choices"][0]["message"]["content"].strip()
                logger.info("[AUDIT][TITLE_GEN] %s", title)
                return title
            else:
                logger.warning("[AUDIT][TITLE_GEN_ERR] Perplexity returned %s", res.status_code)
                return None
        except Exception as e:
            logger.error("[AUDIT][TITLE_GEN_FAIL] %s", str(e))
            return None

# Global AI service instance
ai_service = SportsAIService()
