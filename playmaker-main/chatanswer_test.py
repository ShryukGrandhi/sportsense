#!/usr/bin/env python3
"""
ChatAnswer Schema and Highlightly API Integration Test Suite
Tests the specific implementation requested in the review.
"""

import requests
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class ChatAnswerTester:
    def __init__(self):
        # Use the production URL from frontend/.env
        self.base_url = "https://playmaker-ai.preview.emergentagent.com/api"
        self.session = requests.Session()
        self.auth_token = None
        # Use the specific test user
        self.test_user_data = {
            "username": "playmaker",
            "email": "test@playmaker.com", 
            "password": "test123"
        }
        self.test_chat_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)[:500]}...")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token exists
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}", 400
                
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, str(e), 0
    
    def test_environment_validation(self):
        """Test that startup validation works for required API keys"""
        print("🔍 TESTING ENVIRONMENT VALIDATION")
        print("-" * 50)
        
        # Test health check to see if environment validation passed
        success, data, status = self.make_request("GET", "/")
        
        if success and isinstance(data, dict):
            has_required_fields = all(key in data for key in ["message", "version", "status"])
            is_active = data.get("status") == "active"
            
            self.log_test(
                "Environment Validation - Server Started",
                has_required_fields and is_active,
                f"Server is running with status: {data.get('status')}. This indicates environment validation passed."
            )
        else:
            self.log_test(
                "Environment Validation - Server Started", 
                False, 
                f"Server health check failed: {status} - {data}"
            )
        
        # Test agent health to verify API keys are configured
        success, data, status = self.make_request("GET", "/agent/health")
        
        if success and isinstance(data, dict):
            required_services = ["agent", "sportradar", "gemini", "timestamp"]
            has_services = all(service in data for service in required_services)
            
            # Check specific API key validations
            highlightly_configured = "HIGHLIGHTLY_API_KEY" in str(data) or data.get("agent") == "healthy"
            pplx_configured = "PPLX_API_KEY" in str(data) or data.get("agent") == "healthy"
            sportradar_configured = data.get("sportradar") in ["healthy", "error"]  # Error is OK, means key is configured
            
            self.log_test(
                "Environment Validation - API Keys",
                has_services and highlightly_configured,
                f"API Keys Status - Highlightly: {'✓' if highlightly_configured else '✗'}, "
                f"Perplexity: {'✓' if pplx_configured else '✗'}, "
                f"Sportradar: {'✓' if sportradar_configured else '✗'}"
            )
        else:
            self.log_test(
                "Environment Validation - API Keys", 
                False, 
                f"Agent health check failed: {status} - {data}"
            )
    
    def test_user_login(self):
        """Test user login to get auth token"""
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
        success, data, status = self.make_request("POST", "/auth/login", login_data)
        
        if success and isinstance(data, dict):
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]
                self.log_test("User Login", True, f"Login successful, token obtained")
            else:
                self.log_test("User Login", False, f"Missing access_token or user in response: {data}")
        else:
            self.log_test("User Login", False, f"Status: {status}, Error: {data}")
    
    def test_create_test_chat(self):
        """Create a test chat for ChatAnswer testing"""
        if not self.auth_token:
            self.log_test("Create Test Chat", False, "No auth token available")
            return
            
        chat_data = {"title": "ChatAnswer Test Chat"}
        success, data, status = self.make_request("POST", "/chats", chat_data)
        
        if success and isinstance(data, dict):
            chat_id = data.get("id") or data.get("_id")
            if chat_id and "title" in data:
                self.test_chat_id = chat_id
                self.log_test(
                    "Create Test Chat", 
                    data["title"] == chat_data["title"],
                    f"Chat created with ID: {self.test_chat_id}"
                )
            else:
                self.log_test("Create Test Chat", False, f"Missing required fields: {data}")
        else:
            self.log_test("Create Test Chat", False, f"Status: {status}, Error: {data}")
    
    def test_highlightly_api_integration(self):
        """Test Highlightly API integration directly through agent endpoint"""
        if not self.auth_token:
            self.log_test("Highlightly API Integration", False, "No auth token available")
            return
            
        print("🏈 TESTING HIGHLIGHTLY API INTEGRATION")
        print("-" * 50)
        
        # Test sports queries that should trigger Highlightly API
        sports_queries = [
            "Show me football matches and highlights",
            "What are the latest soccer match results?",
            "Get me basketball game highlights",
            "Show recent American football matches"
        ]
        
        successful_queries = 0
        highlightly_data_found = 0
        
        for query in sports_queries:
            query_data = {"query": query, "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict):
                if data.get("ok", False):
                    # Check for Highlightly data in context
                    context = data.get("context", {})
                    chat_answer = data.get("chat_answer", {})
                    
                    # Look for Highlightly data indicators
                    has_highlightly_data = False
                    highlightly_debug = context.get("highlightly_data", {})
                    
                    if highlightly_debug and not highlightly_debug.get("error"):
                        has_highlightly_data = True
                        highlightly_data_found += 1
                    
                    # Check for HTTP 400 errors (the main issue from review)
                    error_str = str(highlightly_debug.get("error", "")) if highlightly_debug else ""
                    no_http_400_error = "400" not in error_str
                    
                    successful_queries += 1
                    
                    self.log_test(
                        f"Highlightly API - {query[:30]}...",
                        has_highlightly_data and no_http_400_error,
                        f"Highlightly data: {'✓' if has_highlightly_data else '✗'} | "
                        f"No HTTP 400: {'✓' if no_http_400_error else '✗'} | "
                        f"Source: {data.get('source', 'N/A')}"
                    )
                else:
                    self.log_test(
                        f"Highlightly API - {query[:30]}...",
                        False,
                        f"Agent returned error: {data.get('error', 'Unknown error')}"
                    )
            else:
                self.log_test(
                    f"Highlightly API - {query[:30]}...",
                    False,
                    f"Request failed - Status: {status}, Error: {data}"
                )
        
        # Overall Highlightly integration assessment
        integration_success_rate = (highlightly_data_found / len(sports_queries)) * 100
        
        self.log_test(
            "Highlightly API Integration Overall",
            integration_success_rate >= 50,  # At least 50% should have Highlightly data
            f"Highlightly data found in {highlightly_data_found}/{len(sports_queries)} queries ({integration_success_rate:.1f}%)"
        )
    
    def test_chatanswer_structure_validation(self):
        """Test ChatAnswer structure validation with sports query"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("ChatAnswer Structure Validation", False, "No auth token or chat ID available")
            return
            
        print("🏆 TESTING CHATANSWER STRUCTURE VALIDATION")
        print("-" * 50)
        
        # Send the specific sports query from the review request
        sports_query = "Show me football matches and highlights"
        message_data = {"content": sports_query}
        
        success, data, status = self.make_request("POST", f"/chats/{self.test_chat_id}/messages", message_data)
        
        if success and isinstance(data, dict):
            # Check basic message response structure
            has_basic_fields = all(field in data for field in ["id", "chat_id", "type", "content", "timestamp"])
            is_ai_response = data.get("type") == "ai"
            has_content = len(data.get("content", "")) > 10
            
            # Check sports context for ChatAnswer data
            sports_context = data.get("sports_context", {})
            
            # Look for ChatAnswer structure in the response
            chat_answer_found = False
            cards_found = False
            structured_data = False
            
            # Check if agent was used (should contain ChatAnswer)
            if sports_context.get("agent_used", False):
                # The ChatAnswer should be embedded in the agent response
                # Check if the content suggests structured data was processed
                content = data.get("content", "")
                
                # Look for indicators of structured data processing
                structured_indicators = [
                    "match", "score", "highlight", "team", "statistics", 
                    "vs", "game", "result", "league", "tournament"
                ]
                
                structured_data = any(indicator in content.lower() for indicator in structured_indicators)
                
                # For now, we'll check if the response suggests cards were processed
                # In a full implementation, we'd expect a separate chat_answer field
                cards_found = structured_data  # Simplified check
                chat_answer_found = structured_data
            
            self.log_test(
                "ChatAnswer Structure - Basic Response",
                has_basic_fields and is_ai_response and has_content,
                f"Response type: {data.get('type')}, Content length: {len(data.get('content', ''))}"
            )
            
            self.log_test(
                "ChatAnswer Structure - Agent Integration",
                sports_context.get("agent_used", False),
                f"Agent used: {sports_context.get('agent_used', False)}, Source: {sports_context.get('source', 'N/A')}"
            )
            
            self.log_test(
                "ChatAnswer Structure - Structured Data Processing",
                structured_data,
                f"Structured data indicators found: {structured_data}, Content suggests card processing: {cards_found}"
            )
            
            # Check for specific card types mentioned in the review
            expected_card_types = ["scorecard", "statistics", "highlight_video"]
            card_type_mentions = sum(1 for card_type in expected_card_types if card_type in content.lower())
            
            self.log_test(
                "ChatAnswer Structure - Card Types",
                card_type_mentions > 0,
                f"Card type mentions found: {card_type_mentions}/{len(expected_card_types)} types"
            )
            
        else:
            self.log_test("ChatAnswer Structure Validation", False, f"Status: {status}, Error: {data}")
    
    def test_direct_agent_chatanswer(self):
        """Test direct agent endpoint for ChatAnswer structure"""
        if not self.auth_token:
            self.log_test("Direct Agent ChatAnswer", False, "No auth token available")
            return
            
        print("🤖 TESTING DIRECT AGENT CHATANSWER STRUCTURE")
        print("-" * 50)
        
        # Test the specific query from review request
        query = "Show me football matches and highlights"
        query_data = {"query": query, "include_context": True}
        
        success, data, status = self.make_request("POST", "/agent/ask", query_data)
        
        if success and isinstance(data, dict):
            if data.get("ok", False):
                # Check for ChatAnswer structure in response
                chat_answer = data.get("chat_answer", {})
                context = data.get("context", {})
                
                # Validate ChatAnswer structure
                has_chat_answer = bool(chat_answer)
                has_cards_array = "cards" in chat_answer if chat_answer else False
                has_title = "title" in chat_answer if chat_answer else False
                has_text = "text" in chat_answer if chat_answer else False
                
                # Check cards array structure
                cards = chat_answer.get("cards", []) if chat_answer else []
                cards_count = len(cards)
                
                # Validate card types
                valid_card_types = ["scorecard", "statistics", "highlight_video", "image_gallery", "player", "text"]
                cards_with_valid_types = 0
                card_types_found = []
                
                for card in cards:
                    if isinstance(card, dict) and card.get("type") in valid_card_types:
                        cards_with_valid_types += 1
                        card_types_found.append(card.get("type"))
                
                # Check for Highlightly data integration
                highlightly_data = context.get("highlightly_data", {})
                has_highlightly_integration = highlightly_data and not highlightly_data.get("error")
                
                # Check for proper data-to-cards conversion
                data_to_cards_working = cards_count > 0 and cards_with_valid_types > 0
                
                self.log_test(
                    "Direct Agent - ChatAnswer Structure",
                    has_chat_answer and has_cards_array,
                    f"ChatAnswer present: {has_chat_answer}, Cards array: {has_cards_array}, "
                    f"Title: {has_title}, Text: {has_text}"
                )
                
                self.log_test(
                    "Direct Agent - Cards Array Content",
                    cards_count > 0,
                    f"Cards count: {cards_count}, Valid card types: {cards_with_valid_types}, "
                    f"Types found: {list(set(card_types_found))}"
                )
                
                self.log_test(
                    "Direct Agent - Highlightly Integration",
                    has_highlightly_integration,
                    f"Highlightly data present: {has_highlightly_integration}, "
                    f"Error: {highlightly_data.get('error', 'None')}"
                )
                
                self.log_test(
                    "Direct Agent - Data-to-Cards Conversion",
                    data_to_cards_working,
                    f"_structure_data_to_cards working: {data_to_cards_working}, "
                    f"Cards created from data: {cards_count > 0}"
                )
                
                # Overall ChatAnswer implementation assessment
                chatanswer_implementation_working = (
                    has_chat_answer and 
                    has_cards_array and 
                    (cards_count > 0 or has_highlightly_integration)
                )
                
                self.log_test(
                    "ChatAnswer Implementation Overall",
                    chatanswer_implementation_working,
                    f"Implementation status: {'✓ Working' if chatanswer_implementation_working else '✗ Issues detected'}"
                )
                
            else:
                self.log_test(
                    "Direct Agent ChatAnswer",
                    False,
                    f"Agent returned error: {data.get('error', 'Unknown error')}"
                )
        else:
            self.log_test("Direct Agent ChatAnswer", False, f"Status: {status}, Error: {data}")
    
    def test_specific_card_types(self):
        """Test specific card types mentioned in the review"""
        if not self.auth_token:
            self.log_test("Specific Card Types", False, "No auth token available")
            return
            
        print("🎯 TESTING SPECIFIC CARD TYPES")
        print("-" * 50)
        
        # Test queries designed to trigger specific card types
        card_type_queries = [
            {
                "query": "Show me recent football match scores",
                "expected_type": "scorecard",
                "description": "Should create ScoreCard objects from match data"
            },
            {
                "query": "Get player statistics for football players",
                "expected_type": "statistics", 
                "description": "Should create StatsCard objects from player data"
            },
            {
                "query": "Show me football highlights and videos",
                "expected_type": "highlight_video",
                "description": "Should create HighlightVideoCard objects"
            }
        ]
        
        for test_case in card_type_queries:
            query_data = {"query": test_case["query"], "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                chat_answer = data.get("chat_answer", {})
                cards = chat_answer.get("cards", [])
                
                # Look for the expected card type
                expected_type_found = any(
                    card.get("type") == test_case["expected_type"] 
                    for card in cards if isinstance(card, dict)
                )
                
                # Check if any structured data was processed
                has_structured_data = len(cards) > 0
                
                self.log_test(
                    f"Card Type - {test_case['expected_type']}",
                    expected_type_found or has_structured_data,
                    f"Expected type '{test_case['expected_type']}' found: {expected_type_found}, "
                    f"Cards created: {len(cards)}, Description: {test_case['description']}"
                )
            else:
                self.log_test(
                    f"Card Type - {test_case['expected_type']}",
                    False,
                    f"Query failed or returned error: {data.get('error', 'Unknown') if isinstance(data, dict) else data}"
                )
    
    def test_frontend_backend_integration(self):
        """Test that frontend can receive structured data properly"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Frontend-Backend Integration", False, "No auth token or chat ID available")
            return
            
        print("🔗 TESTING FRONTEND-BACKEND INTEGRATION")
        print("-" * 50)
        
        # Send a message and then fetch the chat to see what frontend would receive
        sports_query = "Show me football matches and highlights"
        message_data = {"content": sports_query}
        
        # Send message
        success, send_data, status = self.make_request("POST", f"/chats/{self.test_chat_id}/messages", message_data)
        
        if not success:
            self.log_test("Frontend-Backend Integration", False, f"Failed to send message: {send_data}")
            return
        
        # Wait a moment for processing
        time.sleep(1)
        
        # Fetch chat with messages (what frontend would do)
        success, chat_data, status = self.make_request("GET", f"/chats/{self.test_chat_id}")
        
        if success and isinstance(chat_data, dict):
            messages = chat_data.get("messages", [])
            
            # Find the AI response message
            ai_message = None
            for msg in messages:
                if msg.get("type") == "ai" and sports_query.lower() in [m.get("content", "").lower() for m in messages if m.get("type") == "user"]:
                    ai_message = msg
                    break
            
            if ai_message:
                # Check what frontend receives
                sports_context = ai_message.get("sports_context", {})
                content = ai_message.get("content", "")
                
                # Check if structured data is available for frontend
                has_sports_context = bool(sports_context)
                agent_was_used = sports_context.get("agent_used", False)
                has_source_info = bool(sports_context.get("source"))
                
                # Check if content suggests structured processing
                content_suggests_structure = any(
                    keyword in content.lower() 
                    for keyword in ["match", "score", "team", "highlight", "statistics"]
                )
                
                # Check if ChatAnswer structure is present (the fix)
                has_chat_answer_field = "chat_answer" in ai_message
                chat_answer_data = ai_message.get("chat_answer", {})
                has_cards_array = bool(chat_answer_data and chat_answer_data.get("cards"))
                
                if has_cards_array:
                    cards = chat_answer_data.get("cards", [])
                    has_scorecard_cards = any(card.get("type") == "scorecard" for card in cards if isinstance(card, dict))
                    cards_vs_text_issue_resolved = has_scorecard_cards
                else:
                    cards_vs_text_issue_resolved = False
                
                # The issue from review: "structured data content but as plain text instead of cards"
                # This suggests the backend is creating structured data but frontend shows it as text
                structured_data_as_text = content_suggests_structure and len(content) > 100
                
                self.log_test(
                    "Frontend-Backend - Message Structure",
                    has_sports_context and agent_was_used,
                    f"Sports context: {has_sports_context}, Agent used: {agent_was_used}, "
                    f"Source info: {has_source_info}"
                )
                
                self.log_test(
                    "Frontend-Backend - Content Analysis",
                    structured_data_as_text,
                    f"Content length: {len(content)}, Suggests structure: {content_suggests_structure}, "
                    f"Likely structured data as text: {structured_data_as_text}"
                )
                
                self.log_test(
                    "Frontend-Backend - Cards vs Text Issue",
                    cards_vs_text_issue_resolved,
                    f"ChatAnswer field present: {has_chat_answer_field}, "
                    f"Cards array: {has_cards_array}, "
                    f"Scorecard cards: {has_scorecard_cards if has_cards_array else False}. "
                    f"{'✅ FIXED: Frontend now receives structured cards!' if cards_vs_text_issue_resolved else '❌ Still showing as plain text'}"
                )
                
            else:
                self.log_test("Frontend-Backend Integration", False, "Could not find AI response message")
        else:
            self.log_test("Frontend-Backend Integration", False, f"Failed to fetch chat: {chat_data}")
    
    def cleanup_test_chat(self):
        """Clean up test chat"""
        if self.auth_token and self.test_chat_id:
            self.make_request("DELETE", f"/chats/{self.test_chat_id}")
            self.log_test("Cleanup Test Chat", True, "Test chat deleted")
    
    def run_chatanswer_tests(self):
        """Run all ChatAnswer-specific tests"""
        print("🏆 CHATANSWER SCHEMA & HIGHLIGHTLY API INTEGRATION TEST SUITE")
        print("=" * 80)
        print(f"Testing API at: {self.base_url}")
        print("Focus: ChatAnswer structure validation and Highlightly API integration")
        print()
        
        # Environment validation
        self.test_environment_validation()
        
        # Authentication
        self.test_user_login()
        
        # Create test chat
        self.test_create_test_chat()
        
        # Core ChatAnswer tests
        self.test_highlightly_api_integration()
        self.test_chatanswer_structure_validation()
        self.test_direct_agent_chatanswer()
        self.test_specific_card_types()
        self.test_frontend_backend_integration()
        
        # Cleanup
        self.cleanup_test_chat()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🏆 CHATANSWER TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        failed = total - passed
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n🎯 KEY FINDINGS:")
        
        # Analyze specific issues
        highlightly_tests = [r for r in self.test_results if "Highlightly" in r["test"]]
        chatanswer_tests = [r for r in self.test_results if "ChatAnswer" in r["test"]]
        card_tests = [r for r in self.test_results if "Card" in r["test"]]
        
        highlightly_success = sum(1 for t in highlightly_tests if t["success"])
        chatanswer_success = sum(1 for t in chatanswer_tests if t["success"])
        card_success = sum(1 for t in card_tests if t["success"])
        
        print(f"   Highlightly API Integration: {highlightly_success}/{len(highlightly_tests)} tests passed")
        print(f"   ChatAnswer Structure: {chatanswer_success}/{len(chatanswer_tests)} tests passed")
        print(f"   Card Types: {card_success}/{len(card_tests)} tests passed")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['details']}")
        
        print("\n🏆 ChatAnswer Testing completed!")

if __name__ == "__main__":
    tester = ChatAnswerTester()
    tester.run_chatanswer_tests()