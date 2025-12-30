import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Ensure project root is on path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.append(ROOT)

# Load .env from repo root so API keys are available when running this script directly
ENV_PATH = Path(ROOT) / '.env'
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
    print(f"[TEST] Loaded .env from {ENV_PATH}")
else:
    print(f"[TEST] No .env found at {ENV_PATH} — relying on process environment")

from backend.services.agent import SportradarAgent  # type: ignore


async def test_images_query(team1: str, team2: str):
    agent = SportradarAgent()

    query = f"{team1} vs {team2} highlights and images"
    print(f"[TEST] Query: {query}")

    # Parse intent
    intent = await agent.parse_sports_intent(query)
    print("[TEST] Intent:", intent.get("sport"), intent.get("request_type"))
    # Ensure team parameters exist to drive SportsDB and fallbacks
    params = intent.get("parameters") or {}
    if not any(params.get(k) for k in ("team", "home_team", "away_team", "team_one", "team_two")):
        params.update({"team": team1, "home_team": team1, "away_team": team2})
    intent["parameters"] = params

    # Print env presence for debugging
    print("[TEST][ENV] HIGHLIGHTLY_API_KEY=", bool(os.getenv("HIGHLIGHTLY_API_KEY")))
    print("[TEST][ENV] THESPORTSDB_API_KEY=", bool(os.getenv("THESPORTSDB_API_KEY")))
    print("[TEST][ENV] SCOREBAT_API_KEY=", bool(os.getenv("SCOREBAT_API_KEY")))

    # Fetch Highlightly data
    try:
        highlightly_data = await agent.fetch_highlightly_data(intent, query)
    except Exception as e:
        print("[TEST][ERR] fetch_highlightly_data:", e)
        highlightly_data = {"error": str(e)}

    data = {
        "highlightly_data": highlightly_data,
        # Keep sportradar empty in this focused test
        "sportradar_data": {},
    }

    # Build cards
    cards = await agent._structure_data_to_cards(data, intent, query)
    # Normalize to dicts for uniform printing
    def to_dict(card):
        if hasattr(card, "model_dump"):
            return card.model_dump()
        if hasattr(card, "dict"):
            return card.dict()
        return card

    d_cards = [to_dict(c) for c in cards]

    # Print Images
    imgs = [c for c in d_cards if isinstance(c, dict) and c.get("type") == "image_gallery"]
    print("\n=== IMAGE CARDS === count=", len(imgs))
    if not imgs:
        print("No image_gallery card emitted")
    for idx, card in enumerate(imgs):
        items = card.get("items") or []
        print(f"[Card {idx}] Title: {card.get('title')} items={len(items)}")
        for i, it in enumerate(items[:10]):
            print(f"  [{i}] url={it.get('url')} title={it.get('title') or it.get('caption')}")

    # Print Videos
    vids = [c for c in d_cards if isinstance(c, dict) and c.get("type") == "highlight_video"]
    print("\n=== VIDEO CARDS === count=", len(vids))
    if vids:
        v_items = vids[0].get("items") or []
        for i, v in enumerate(v_items[:5]):
            print(f"  [{i}] title={v.get('title')} url={v.get('url')} thumb={v.get('thumbnail')}")

    # Cleanup to avoid unclosed client warnings
    try:
        await agent.cleanup()
    except Exception:
        pass


if __name__ == "__main__":
    t1 = sys.argv[1] if len(sys.argv) > 1 else "Dolphins"
    t2 = sys.argv[2] if len(sys.argv) > 2 else "Jets"
    asyncio.run(test_images_query(t1, t2))
