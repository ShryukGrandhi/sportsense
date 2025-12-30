import asyncio
import json
from backend.services.highlightly import get_highlightly_client
from backend.services.agent import SportradarAgent


async def main():
    """
    === TEAM COMPARISON AUDIT ===
    Purpose:
        Diagnose touchdown misalignment and normalization loss
        within Highlightly → Agent → UI pipeline.

    Checks:
        1️⃣ Verify Highlightly raw match data structure
        2️⃣ Extract touchdowns from match details
        3️⃣ Compare detailed vs normalized stats
        4️⃣ Detect touchdown overwrites
        5️⃣ Confirm TD data source (boxScores or matchStatistics)
    """

    match_id = 283324  # Example: Chargers vs Commanders
    print(f"\n[AUDIT][FETCH] Pulling match_id={match_id} from Highlightly...")

    # 1️⃣ Fetch match data
    hl = await get_highlightly_client()
    raw_data = await hl.get_match_details(match_id)

    # 2️⃣ Print the raw Highlightly output (for debugging)
    print("\n[AUDIT][RAW_RESPONSE_SAMPLE]")
    try:
        # Pretty-print if dict or list
        if isinstance(raw_data, (dict, list)):
            formatted = json.dumps(raw_data, indent=2)[:3000]  # limit to first 3k chars
            print(formatted)
            if len(json.dumps(raw_data)) > 3000:
                print("...[truncated]")
        else:
            print(f"Non-JSON type returned: {type(raw_data)} → {raw_data}")
    except Exception as e:
        print(f"[ERROR] Could not serialize Highlightly response: {e}")

    # 3️⃣ Normalize data shape
    print("\n[AUDIT][RAW_KEYS]")
    if isinstance(raw_data, list):
        print(f"Received list with {len(raw_data)} items")
        match_data = raw_data[0] if raw_data else {}
    elif isinstance(raw_data, dict):
        print(f"Top-level keys: {list(raw_data.keys())}")
        match_data = raw_data
    else:
        print(f"Unexpected type: {type(raw_data)}")
        match_data = {}

    if isinstance(match_data, dict):
        print(f"[AUDIT][MATCH_KEYS] {list(match_data.keys())}")
    else:
        print("[AUDIT][MATCH_KEYS] N/A")

    # 4️⃣ Extract detailed (raw) stats
    agent = SportradarAgent()
    home_detail, away_detail = agent._extract_stats_from_match_details(match_data)
    print("\n[AUDIT][EXTRACTED_STATS]")
    print(json.dumps({"home": home_detail, "away": away_detail}, indent=2))

    # 5️⃣ Extract normalized stats
    home_norm, away_norm = agent._extract_football_stats(match_data)
    print("\n[AUDIT][NORMALIZED]")
    print("HOME:", home_norm)
    print("AWAY:", away_norm)

    # 6️⃣ Compare touchdowns for overwrite detection
    if home_detail.get("touchdowns", 0) > 0 and home_norm.get("touchdowns", 0) == 0:
        print("\n❌ TD Overwrite Detected: home touchdowns lost during normalization")
    if away_detail.get("touchdowns", 0) > 0 and away_norm.get("touchdowns", 0) == 0:
        print("❌ TD Overwrite Detected: away touchdowns lost during normalization")

    # 7️⃣ Identify source of TD data
    print("\n[AUDIT][SOURCE_PATH]")
    if isinstance(match_data, dict) and "boxScores" in match_data:
        print("✅ boxScores found (primary TD source)")
    elif isinstance(match_data, dict) and "matchStatistics" in match_data:
        print("✅ matchStatistics found (secondary TD source)")
    else:
        print("⚠️ Neither boxScores nor matchStatistics present — TDs likely missing upstream")


if __name__ == "__main__":
    asyncio.run(main())