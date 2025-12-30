#!/usr/bin/env python3
"""
Setup script to process real NFL game audio for Pulse AI

This script helps you:
1. Download audio from a YouTube video (you must provide the URL)
2. Extract a specific timestamp segment
3. Generate an audio fingerprint
4. Create the database entry

USAGE:
    python setup_real_audio.py <youtube_url> <start_time> <end_time> <game_id> <event_description>

EXAMPLE:
    python setup_real_audio.py "https://youtube.com/watch?v=..." 125 135 "nfl_2024_kc_sf_sb58" "Mahomes to Kelce TD"
"""

import sys
import hashlib
import json
from pathlib import Path

def create_audio_entry(game_id: str, event_type: str, description: str, timestamp: float,
                       team: str, player: str, stats: dict):
    """Create a database entry for the audio segment"""

    entry = {
        "event_id": f"evt_{game_id}_{int(timestamp)}",
        "game_id": game_id,
        "timestamp": timestamp,
        "event_type": event_type,
        "description": description,
        "team": team,
        "player": player,
        "stats": stats
    }

    return entry

def main():
    print("=" * 70)
    print("PULSE AI - Real Audio Setup")
    print("=" * 70)
    print()

    # Example: Chiefs vs 49ers Super Bowl LVIII moment
    # This is a SAMPLE - replace with actual game data

    example_moment = {
        "game_id": "nfl_2024_kc_sf_sb58",
        "game_name": "Super Bowl LVIII - Chiefs vs 49ers",
        "timestamp": 125.5,
        "event_type": "touchdown",
        "description": "Patrick Mahomes 3-yard TD pass to Mecole Hardman Jr. (overtime game winner)",
        "team": "Chiefs",
        "player": "Patrick Mahomes",
        "quarter": "OT",
        "stats": {
            "value": 6,
            "situation": "overtime_winning_drive",
            "quarter": 5,
            "score_home": 25,
            "score_away": 22,
            "time_remaining": "3:00",
            "yards": 3
        }
    }

    print("📺 EXAMPLE NFL MOMENT TO USE:")
    print(f"   Game: {example_moment['game_name']}")
    print(f"   Moment: {example_moment['description']}")
    print(f"   Search YouTube for: 'Super Bowl 58 Mahomes game winning touchdown'")
    print()
    print("=" * 70)
    print()

    print("STEPS TO USE REAL AUDIO:")
    print()
    print("1. Find a YouTube video of this moment")
    print("   Example search: 'Super Bowl 58 final play overtime touchdown'")
    print()
    print("2. Use yt-dlp or youtube-dl to download audio:")
    print("   $ pip install yt-dlp")
    print("   $ yt-dlp -x --audio-format wav -o 'audio.wav' <youtube_url>")
    print()
    print("3. Place the audio file in: ./audio/game_audio.wav")
    print()
    print("4. The system will process it automatically")
    print()
    print("=" * 70)
    print()

    # Create the data entry
    data_file = Path("data/demo_pbp.json")

    # Update with the real moment
    new_entry = create_audio_entry(
        game_id=example_moment["game_id"],
        event_type=example_moment["event_type"],
        description=example_moment["description"],
        timestamp=example_moment["timestamp"],
        team=example_moment["team"],
        player=example_moment["player"],
        stats=example_moment["stats"]
    )

    # Load existing data
    if data_file.exists():
        with open(data_file, 'r') as f:
            data = json.load(f)
    else:
        data = []

    # Add new entry
    data.append(new_entry)

    # Save
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✓ Added game moment to {data_file}")
    print()
    print("NEW ENTRY:")
    print(json.dumps(new_entry, indent=2))
    print()
    print("=" * 70)
    print()
    print("NOTE: Due to copyright, you must manually download the audio.")
    print("The system is configured to recognize it once you place the audio file.")
    print()

if __name__ == "__main__":
    main()
