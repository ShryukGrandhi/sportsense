#!/usr/bin/env python3
"""
Debug ChatAnswer card creation - investigate why only text cards are created
"""

import requests
import json
from datetime import datetime

class ChatAnswerDebugger:
    def __init__(self):
        self.base_url = "https://playmaker-ai.preview.emergentagent.com/api"
        self.session = requests.Session()
        self.auth_token = None
        
        # Login first
        login_data = {
            "email": "test@playmaker.com",
            "password": "test123"
        }
        
        success, data, status = self.make_request("POST", "/auth/login", login_data)
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            print("✅ Authenticated successfully")
        else:
            print("❌ Authentication failed")
            
    def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            if method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}", 400
                
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, str(e), 0
    
    def debug_card_creation(self):
        """Debug why specific card types aren't being created"""
        print("\n🔍 DEBUGGING CARD CREATION")
        print("=" * 60)
        
        # Test query that should create scorecard from match data
        query = "Show me football matches and highlights"
        query_data = {"query": query, "include_context": True}
        
        success, data, status = self.make_request("POST", "/agent/ask", query_data)
        
        if success and isinstance(data, dict) and data.get("ok", False):
            print(f"✅ Agent response successful")
            print(f"📝 Query: {query}")
            print(f"🔗 Source: {data.get('source', 'N/A')}")
            
            # Examine the full response structure
            chat_answer = data.get("chat_answer", {})
            context = data.get("context", {})
            
            print(f"\n📊 CHATANSWER STRUCTURE:")
            print(f"   Title: {chat_answer.get('title', 'N/A')}")
            print(f"   Text length: {len(chat_answer.get('text', ''))}")
            print(f"   Cards count: {len(chat_answer.get('cards', []))}")
            
            # Examine cards in detail
            cards = chat_answer.get("cards", [])
            print(f"\n🎯 CARDS ANALYSIS:")
            for i, card in enumerate(cards):
                print(f"   Card {i+1}: Type = {card.get('type', 'N/A')}")
                if card.get('type') == 'text':
                    print(f"      Content length: {len(card.get('content', ''))}")
                elif card.get('type') == 'scorecard':
                    print(f"      Teams: {len(card.get('teams', []))}")
                    print(f"      Title: {card.get('title', 'N/A')}")
                elif card.get('type') == 'statistics':
                    print(f"      Headers: {card.get('headers', [])}")
                    print(f"      Rows: {len(card.get('rows', []))}")
            
            # Examine the raw data that should be converted to cards
            print(f"\n📡 RAW DATA ANALYSIS:")
            
            # Highlightly data
            highlightly_data = context.get("highlightly_data", {})
            if highlightly_data and not highlightly_data.get("error"):
                h_data = highlightly_data.get("data", [])
                print(f"   Highlightly data type: {type(h_data)}")
                print(f"   Highlightly data length: {len(h_data) if isinstance(h_data, list) else 'N/A'}")
                
                if isinstance(h_data, list) and len(h_data) > 0:
                    sample_match = h_data[0]
                    print(f"   Sample match keys: {list(sample_match.keys()) if isinstance(sample_match, dict) else 'N/A'}")
                    
                    # Check for match structure that should create scorecards
                    if isinstance(sample_match, dict):
                        has_home = 'home' in sample_match
                        has_away = 'away' in sample_match
                        has_scores = any(key in sample_match for key in ['home_score', 'away_score', 'score'])
                        
                        print(f"   Match structure - Home: {has_home}, Away: {has_away}, Scores: {has_scores}")
                        
                        if has_home and has_away:
                            print(f"   Home team: {sample_match.get('home', {})}")
                            print(f"   Away team: {sample_match.get('away', {})}")
                            print(f"   Scores: home_score={sample_match.get('home_score', 'N/A')}, away_score={sample_match.get('away_score', 'N/A')}")
                        
                        # Print full sample match for debugging
                        print(f"\n   📋 SAMPLE MATCH DATA:")
                        print(json.dumps(sample_match, indent=4)[:1000] + "..." if len(json.dumps(sample_match, indent=4)) > 1000 else json.dumps(sample_match, indent=4))
            else:
                error_msg = highlightly_data.get('error', 'No data') if highlightly_data else 'No data'
                print(f"   Highlightly data error: {error_msg}")
            
            # Sportradar data
            sportradar_data = context.get("sportradar_data", {})
            if sportradar_data and not sportradar_data.get("error"):
                s_data = sportradar_data.get("data", {})
                print(f"   Sportradar data type: {type(s_data)}")
                if isinstance(s_data, dict):
                    print(f"   Sportradar data keys: {list(s_data.keys())}")
            else:
                error_msg = sportradar_data.get('error', 'No data') if sportradar_data else 'No data'
                print(f"   Sportradar data error: {error_msg}")
            
            # Debug info
            debug_info = chat_answer.get("debug", {})
            if debug_info:
                print(f"\n🐛 DEBUG INFO:")
                print(f"   Response type: {debug_info.get('response_type', 'N/A')}")
                print(f"   Sources: {debug_info.get('sources', [])}")
                print(f"   Has structured data: {debug_info.get('response_type') == 'structured'}")
            
        else:
            print(f"❌ Agent request failed: {data}")
    
    def test_card_creation_logic(self):
        """Test the specific logic that should create cards"""
        print(f"\n🧪 TESTING CARD CREATION LOGIC")
        print("=" * 60)
        
        # Test multiple queries to see card creation patterns
        test_queries = [
            "Show me recent football match results with scores",
            "Get me basketball game statistics and player data", 
            "Show football highlights and video content",
            "What are the latest soccer match scores and results?"
        ]
        
        for query in test_queries:
            print(f"\n📝 Testing: {query}")
            query_data = {"query": query, "include_context": True}
            
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                chat_answer = data.get("chat_answer", {})
                cards = chat_answer.get("cards", [])
                context = data.get("context", {})
                
                # Analyze card types created
                card_types = [card.get("type") for card in cards if isinstance(card, dict)]
                unique_types = list(set(card_types))
                
                print(f"   Cards created: {len(cards)}")
                print(f"   Card types: {unique_types}")
                
                # Check if we have structured data but only text cards
                highlightly_data = context.get("highlightly_data", {})
                has_match_data = (
                    highlightly_data and 
                    not highlightly_data.get("error") and 
                    isinstance(highlightly_data.get("data"), list) and 
                    len(highlightly_data.get("data", [])) > 0
                )
                
                only_text_cards = all(card_type == "text" for card_type in card_types)
                
                if has_match_data and only_text_cards:
                    print(f"   ⚠️ ISSUE: Has match data but only created text cards")
                    print(f"   Match data count: {len(highlightly_data.get('data', []))}")
                elif has_match_data and not only_text_cards:
                    print(f"   ✅ SUCCESS: Has match data and created structured cards")
                else:
                    print(f"   ℹ️ No match data available for structured cards")
            else:
                print(f"   ❌ Query failed: {data}")

if __name__ == "__main__":
    debugger = ChatAnswerDebugger()
    debugger.debug_card_creation()
    debugger.test_card_creation_logic()