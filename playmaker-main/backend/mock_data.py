"""
Mock data for testing visual responses without API keys
"""
from datetime import datetime
from typing import Dict, Any


def create_mock_game_response() -> Dict[str, Any]:
    """Create a mock NFL game response with scorecard and player stats"""
    return {
        "title": "Chicago Bears vs Cincinnati Bengals",
        "text": "Chicago Bears narrowly defeated Cincinnati Bengals 47-42. Both teams were evenly matched in yardage (576 vs 495). Chicago Bears found the end zone 6 times, showcasing efficient red zone execution.",
        "cards": [
            {
                "type": "scorecard",
                "title": "Match - Final",
                "teams": [
                    {
                        "name": "Cincinnati Bengals",
                        "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png",
                        "score": 42,
                        "stats": {
                            "touchdowns": 6,
                            "total_yards": 495,
                            "points": 42
                        }
                    },
                    {
                        "name": "Chicago Bears",
                        "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png",
                        "score": 47,
                        "stats": {
                            "touchdowns": 6,
                            "total_yards": 576,
                            "points": 47
                        }
                    }
                ],
                "meta": {
                    "status": "Final",
                    "date": datetime.now().isoformat(),
                    "sport": "NFL",
                    "venue": "Soldier Field"
                }
            },
            {
                "type": "top_player",
                "title": "Top Players",
                "teams": [
                    {
                        "name": "Cincinnati Bengals",
                        "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png",
                        "topPlayers": [
                            {
                                "playerName": "Joe Flacco",
                                "playerPosition": "QB",
                                "impact_score": 11.9,
                                "stats": {
                                    "CMP/ATT": "31/47",
                                    "YDS": "470",
                                    "TD": "4"
                                },
                                "categories": [
                                    {"name": "COMPLETION %", "value": "66.0%"}
                                ]
                            },
                            {
                                "playerName": "Chase Brown",
                                "playerPosition": "RB",
                                "impact_score": 9.5,
                                "stats": {
                                    "CAR": "11",
                                    "YDS": "37",
                                    "TD": "0"
                                },
                                "categories": [
                                    {"name": "YARDS/CARRY", "value": "3.4"}
                                ]
                            },
                            {
                                "playerName": "Tee Higgins",
                                "playerPosition": "WR",
                                "impact_score": 8.2,
                                "stats": {
                                    "REC": "7",
                                    "YDS": "121",
                                    "TD": "2"
                                },
                                "categories": [
                                    {"name": "YPR / CATCH RATE", "value": "17.3 / 78%"}
                                ]
                            }
                        ]
                    },
                    {
                        "name": "Chicago Bears",
                        "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png",
                        "topPlayers": [
                            {
                                "playerName": "Caleb Williams",
                                "playerPosition": "QB",
                                "impact_score": 10.8,
                                "stats": {
                                    "CMP/ATT": "20/34",
                                    "YDS": "280",
                                    "TD": "3"
                                },
                                "categories": [
                                    {"name": "COMPLETION %", "value": "58.8%"}
                                ]
                            },
                            {
                                "playerName": "Kyle Monangai",
                                "playerPosition": "RB",
                                "impact_score": 9.1,
                                "stats": {
                                    "CAR": "26",
                                    "YDS": "176",
                                    "TD": "0"
                                },
                                "categories": [
                                    {"name": "YARDS/CARRY", "value": "6.8"}
                                ]
                            },
                            {
                                "playerName": "Colston Loveland",
                                "playerPosition": "WR",
                                "impact_score": 8.5,
                                "stats": {
                                    "REC": "6",
                                    "YDS": "118",
                                    "TD": "2"
                                },
                                "categories": [
                                    {"name": "YPR / CATCH RATE", "value": "19.7 / 86%"}
                                ]
                            }
                        ]
                    }
                ]
            }
        ],
        "debug": {
            "response_type": "mock",
            "timestamp": datetime.utcnow().isoformat()
        }
    }


def create_mock_nba_response() -> Dict[str, Any]:
    """Create a mock NBA game response"""
    return {
        "title": "Lakers vs Warriors",
        "text": "Los Angeles Lakers defeated Golden State Warriors 120-115 in a high-scoring matchup. Both teams showcased excellent offense throughout the game.",
        "cards": [
            {
                "type": "scorecard",
                "title": "Game Result",
                "teams": [
                    {
                        "name": "Los Angeles Lakers",
                        "logo": "https://a.espncdn.com/i/teamlogos/nba/500/lal.png",
                        "score": 120,
                        "stats": {
                            "field_goals": "45/92",
                            "three_pointers": "12/35",
                            "free_throws": "18/22"
                        }
                    },
                    {
                        "name": "Golden State Warriors",
                        "logo": "https://a.espncdn.com/i/teamlogos/nba/500/gsw.png",
                        "score": 115,
                        "stats": {
                            "field_goals": "43/89",
                            "three_pointers": "15/38",
                            "free_throws": "14/16"
                        }
                    }
                ],
                "meta": {
                    "status": "Final",
                    "date": datetime.now().isoformat(),
                    "sport": "NBA"
                }
            }
        ],
        "debug": {
            "response_type": "mock",
            "timestamp": datetime.utcnow().isoformat()
        }
    }

