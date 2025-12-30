import asyncio
import json
from typing import Any, Dict

from backend.services.highlightly import get_highlightly_client
from backend.services.agent import SportradarAgent


async def main():
    match_id = int(os.getenv("AUDIT_MATCH_ID", "283324"))
    print(f"\n[AUDIT][FETCH] Pulling match_id={match_id} from Highlightly...")
    hl = await get_highlightly_client()
    raw = await hl.get_match_details(match_id)

    # Normalize response shape
    if isinstance(raw, list) and raw:
        print("\n[AUDIT][RAW_KEYS]\nReceived list with", len(raw), "items")
        match = next((x for x in raw if isinstance(x, dict)), raw[0])
    elif isinstance(raw, dict):
        print("\n[AUDIT][RAW_KEYS]")
        print(list(raw.keys()))
        match = raw
    else:
        print("\n[AUDIT][RAW_KEYS] Unexpected type:", type(raw))
        return

    print("\n[AUDIT][MATCH_KEYS]", list(match.keys()))

    agent = SportradarAgent()

    # Extract derived stats (detail path)
    home_d, away_d = agent._extract_stats_from_match_details(match)
    print("\n[AUDIT][EXTRACTED_STATS]")
    print(json.dumps({"home": home_d, "away": away_d}, indent=2))

    # Normalize for UI scorecard
    home_n, away_n = agent._extract_football_stats(match)
    print("\n[AUDIT][NORMALIZED]")
    print("HOME:", home_n)
    print("AWAY:", away_n)

    # Overwrite detection
    if (home_d or {}).get("touchdowns", 0) > 0 and home_n.get("touchdowns", 0) == 0:
        print("\n❌ TD Overwrite Detected: home touchdowns lost during normalization")
    if (away_d or {}).get("touchdowns", 0) > 0 and away_n.get("touchdowns", 0) == 0:
        print("❌ TD Overwrite Detected: away touchdowns lost during normalization")

    # Source path
    print("\n[AUDIT][SOURCE_PATH]")
    if isinstance(match, dict) and "boxScores" in match:
        print("✅ boxScores found (primary TD source)")
    elif isinstance(match, dict) and "matchStatistics" in match:
        print("✅ matchStatistics found (secondary TD source)")
    else:
        print("⚠️ Neither boxScores nor matchStatistics present — TDs likely missing upstream")


if __name__ == "__main__":
    import os
    asyncio.run(main())

