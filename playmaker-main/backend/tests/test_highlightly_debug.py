import os
import sys
import json
import asyncio
from typing import Any, Dict, List, Optional

# Allow importing from backend/services without requiring package __init__ files
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

try:
    from services.highlightly import HighlightlyClient  # type: ignore
except Exception:
    HighlightlyClient = None  # type: ignore


def pretty_print(title: str, payload: Any) -> None:
    print(f"===== {title} =====")
    try:
        print(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True))
    except Exception:
        print(str(payload))


def parse_overall_statistics(details: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Extracts each team's overallStatistics into a dict keyed by team abbreviation.
    """
    overall = details.get("overallStatistics", [])
    if not isinstance(overall, list):
        return {}

    result: Dict[str, Dict[str, Any]] = {}
    for entry in overall:
        team = (entry.get("team") or {}).get("abbreviation")
        data = entry.get("data") or []
        if not team or not isinstance(data, list):
            continue
        flat: Dict[str, Any] = {}
        for item in data:
            name = item.get("displayName")
            value = item.get("value")
            if name:
                flat[name] = value
        result[team] = flat
    return result


def extract_match_ids(head2head_resp: Any) -> List[int]:
    """
    Extract a list of match IDs from a /head-2-head response.
    Handles a few common shapes: { data: [...] } or a raw list.
    """
    matches: List[Any] = []
    if isinstance(head2head_resp, dict):
        data = head2head_resp.get("data")
        if isinstance(data, list):
            matches = data
        elif isinstance(data, dict) and "matches" in data:
            # Some APIs nest further
            inner = data.get("matches")
            if isinstance(inner, list):
                matches = inner
    elif isinstance(head2head_resp, list):
        matches = head2head_resp

    ids: List[int] = []
    for m in matches:
        if isinstance(m, dict):
            # Typical: { id: 123, ... }
            mid = m.get("id")
            if isinstance(mid, int):
                ids.append(mid)
            else:
                # Sometimes wrapped: { match: { id: 123 } }
                match_obj = m.get("match") if isinstance(m.get("match"), dict) else None
                if match_obj and isinstance(match_obj.get("id"), int):
                    ids.append(match_obj["id"])
    # Deduplicate while preserving order
    seen = set()
    uniq: List[int] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            uniq.append(i)
    return uniq


async def run_debug_pipeline() -> None:
    # 1) Prompt Context
    prompt = "Vikings vs Bengals, last game"
    print(f"[DEBUG] Prompt: {prompt}")

    # 2) Resolve team IDs (use provided mock IDs for determinism)
    vikings_id = 92751
    bengals_id = 92730
    print(f"[DEBUG] Resolved team IDs: Vikings={vikings_id}, Bengals={bengals_id}")

    # Prepare Highlightly client if API key is available
    client: Optional[HighlightlyClient] = None  # type: ignore
    api_key = os.environ.get("HIGHLIGHTLY_API_KEY")
    if api_key and HighlightlyClient is not None:
        try:
            client = HighlightlyClient()  # type: ignore
        except Exception as e:
            client = None
            print(f"[WARN] Could not initialize HighlightlyClient: {e}")
    else:
        if not api_key:
            print("[WARN] HIGHLIGHTLY_API_KEY not set; live API calls will be skipped.")
        elif HighlightlyClient is None:
            print("[WARN] HighlightlyClient import failed; live API calls will be skipped.")

    # 3) /head-2-head call
    head2head_resp: Any = {}
    if client is not None:
        print("[DEBUG] Calling /head-2-head for Vikings vs Bengals")
        try:
            head2head_resp = await client.get_head2head(vikings_id, bengals_id)  # type: ignore
        except Exception as e:
            print(f"[ERROR] /head-2-head request failed: {e}")

    pretty_print("/head-2-head Response", head2head_resp or {})

    # 4) Extract match IDs
    match_ids: List[int] = extract_match_ids(head2head_resp) if head2head_resp else []
    print(f"[DEBUG] Retrieved match IDs: {match_ids}")

    # 5) For each match id, call /matches/{id} and parse overallStatistics
    if client is not None and match_ids:
        for mid in match_ids:
            print(f"[DEBUG] Fetching full match details for id={mid}")
            details: Dict[str, Any] = {}
            try:
                details = await client.get_match_by_id(mid)  # type: ignore
            except Exception as e:
                print(f"[ERROR] /matches/{{id}} request failed for id={mid}: {e}")
                continue

            pretty_print(f"/matches/{mid} Raw", details or {})

            # Normalize details to a dict in case the API returns a list wrapper
            normalized: Dict[str, Any] = {}
            if isinstance(details, dict):
                # Some shapes use { data: [...] }
                if isinstance(details.get("data"), list) and details.get("data"):
                    first = next((x for x in details["data"] if isinstance(x, dict)), None)
                    if isinstance(first, dict):
                        normalized = first
                else:
                    normalized = details
            elif isinstance(details, list):
                # Use first dict element
                first = next((x for x in details if isinstance(x, dict)), None)
                if isinstance(first, dict):
                    normalized = first
                print(f"[DEBUG] /matches/{mid} returned a list; using first element for parsing")

            parsed = parse_overall_statistics(normalized or {})
            print(f"[DEBUG] Parsed overallStatistics for match_id={mid}")
            pretty_print("Parsed overallStatistics", parsed)

    # Close client if used
    if client is not None:
        try:
            await client.close()  # type: ignore
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(run_debug_pipeline())
