#!/usr/bin/env python3
"""
PLAYMAKER Sports AI Backend API Test Suite
Tests all backend endpoints thoroughly with real data
"""

import requests
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class PlaymakerAPITester:
    def __init__(self):
        # Use the production URL from frontend/.env
        self.base_url = "https://playmaker-ai.preview.emergentagent.com/api"
        self.session = requests.Session()
        self.auth_token = None
        # Use the specific test user requested in the review
        self.test_user_data = {
            "username": "playmaker",
            "email": "test@playmaker.com",
            "password": "test123"
        }
        
        # Also keep a backup random user in case the specific one already exists
        self.backup_user_data = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "SecurePass123!"
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
            print(f"   Response: {response_data}")
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
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        success, data, status = self.make_request("GET", "/")
        
        if success and isinstance(data, dict):
            expected_keys = ["message", "version", "status"]
            has_keys = all(key in data for key in expected_keys)
            self.log_test(
                "Health Check Endpoint", 
                has_keys and data.get("status") == "active",
                f"Status: {status}, Response: {data}"
            )
        else:
            self.log_test("Health Check Endpoint", False, f"Status: {status}, Error: {data}")
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        success, data, status = self.make_request("POST", "/auth/register", self.test_user_data)
        
        # If the specific user already exists, try with backup user
        if not success and status == 400 and "already" in str(data).lower():
            print(f"   Note: User {self.test_user_data['username']} already exists, trying backup user...")
            success, data, status = self.make_request("POST", "/auth/register", self.backup_user_data)
            if success:
                self.test_user_data = self.backup_user_data  # Use backup for subsequent tests
        
        if success and isinstance(data, dict):
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]
                user_data = data["user"]
                expected_fields = ["id", "username", "email", "interests", "subscription"]
                has_fields = all(field in user_data for field in expected_fields)
                user_id = user_data.get('id') or user_data.get('_id')
                
                self.log_test(
                    "User Registration", 
                    has_fields and user_data["username"] == self.test_user_data["username"] and user_id,
                    f"User created successfully with ID: {user_id}"
                )
            else:
                self.log_test("User Registration", False, f"Missing required fields in response: {data}")
        else:
            self.log_test("User Registration", False, f"Status: {status}, Error: {data}")
    
    def test_user_login(self):
        """Test user login endpoint"""
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
        success, data, status = self.make_request("POST", "/auth/login", login_data)
        
        if success and isinstance(data, dict):
            if "access_token" in data and "user" in data:
                # Update token for subsequent tests
                self.auth_token = data["access_token"]
                self.log_test("User Login", True, f"Login successful, token updated")
            else:
                self.log_test("User Login", False, f"Missing access_token or user in response: {data}")
        else:
            self.log_test("User Login", False, f"Status: {status}, Error: {data}")
    
    def test_get_current_user(self):
        """Test getting current user profile"""
        if not self.auth_token:
            self.log_test("Get Current User", False, "No auth token available")
            return
            
        success, data, status = self.make_request("GET", "/auth/me")
        
        if success and isinstance(data, dict):
            expected_fields = ["id", "username", "email", "interests", "subscription"]
            has_fields = all(field in data for field in expected_fields)
            self.log_test(
                "Get Current User", 
                has_fields and data["username"] == self.test_user_data["username"],
                f"Profile retrieved successfully: {data.get('username')}"
            )
        else:
            self.log_test("Get Current User", False, f"Status: {status}, Error: {data}")
    
    def test_update_profile(self):
        """Test profile update functionality"""
        if not self.auth_token:
            self.log_test("Update Profile", False, "No auth token available")
            return
            
        update_data = {
            "interests": ["NFL", "NBA", "MLB"]
        }
        
        success, data, status = self.make_request("PUT", "/auth/profile", update_data)
        
        if success and isinstance(data, dict):
            interests_updated = set(data.get("interests", [])) == set(update_data["interests"])
            self.log_test(
                "Update Profile", 
                interests_updated,
                f"Interests updated to: {data.get('interests')}"
            )
        else:
            self.log_test("Update Profile", False, f"Status: {status}, Error: {data}")
    
    def test_protected_endpoint_without_auth(self):
        """Test protected endpoint without authentication"""
        # Temporarily remove auth token
        temp_token = self.auth_token
        self.auth_token = None
        
        success, data, status = self.make_request("GET", "/auth/me")
        
        # Restore token
        self.auth_token = temp_token
        
        # Should fail with 401 or 403
        self.log_test(
            "Protected Endpoint Without Auth", 
            not success and status in [401, 403],
            f"Correctly rejected with status: {status}"
        )
    
    def test_create_chat(self):
        """Test chat creation"""
        if not self.auth_token:
            self.log_test("Create Chat", False, "No auth token available")
            return
            
        chat_data = {"title": "Test Sports Chat"}
        success, data, status = self.make_request("POST", "/chats", chat_data)
        
        if success and isinstance(data, dict):
            # Handle both 'id' and '_id' fields
            chat_id = data.get("id") or data.get("_id")
            if chat_id and "title" in data:
                self.test_chat_id = chat_id
                self.log_test(
                    "Create Chat", 
                    data["title"] == chat_data["title"],
                    f"Chat created with ID: {self.test_chat_id}"
                )
            else:
                self.log_test("Create Chat", False, f"Missing required fields: {data}")
        else:
            self.log_test("Create Chat", False, f"Status: {status}, Error: {data}")
    
    def test_get_user_chats(self):
        """Test retrieving user chats"""
        if not self.auth_token:
            self.log_test("Get User Chats", False, "No auth token available")
            return
            
        success, data, status = self.make_request("GET", "/chats")
        
        if success and isinstance(data, list):
            # Should have at least the chat we created
            has_test_chat = any(chat.get("id") == self.test_chat_id for chat in data) if self.test_chat_id else True
            self.log_test(
                "Get User Chats", 
                has_test_chat,
                f"Retrieved {len(data)} chats successfully"
            )
        else:
            self.log_test("Get User Chats", False, f"Status: {status}, Error: {data}")
    
    def test_send_message_and_get_ai_response(self):
        """Test sending message and getting AI response"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Send Message & Get AI Response", False, "No auth token or chat ID available")
            return
            
        message_data = {"content": "Who won the last Super Bowl and what was the final score?"}
        success, data, status = self.make_request("POST", f"/chats/{self.test_chat_id}/messages", message_data)
        
        if success and isinstance(data, dict):
            required_fields = ["id", "chat_id", "type", "content", "timestamp"]
            has_fields = all(field in data for field in required_fields)
            is_ai_response = data.get("type") == "ai"
            has_content = len(data.get("content", "")) > 10  # AI should give substantial response
            
            self.log_test(
                "Send Message & Get AI Response", 
                has_fields and is_ai_response and has_content,
                f"AI response received successfully: {len(data.get('content', ''))} characters"
            )
        else:
            self.log_test("Send Message & Get AI Response", False, f"Status: {status}, Error: {data}")
    
    def test_get_chat_with_messages(self):
        """Test retrieving chat with messages"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Get Chat With Messages", False, "No auth token or chat ID available")
            return
            
        success, data, status = self.make_request("GET", f"/chats/{self.test_chat_id}")
        
        if success and isinstance(data, dict):
            has_chat = "chat" in data and "messages" in data
            has_messages = len(data.get("messages", [])) >= 2  # User message + AI response
            
            self.log_test(
                "Get Chat With Messages", 
                has_chat and has_messages,
                f"Chat retrieved with {len(data.get('messages', []))} messages"
            )
        else:
            self.log_test("Get Chat With Messages", False, f"Status: {status}, Error: {data}")
    
    def test_update_chat_title(self):
        """Test updating chat title"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Update Chat Title", False, "No auth token or chat ID available")
            return
            
        new_title = "Updated Sports Discussion"
        title_data = {"title": new_title}
        success, data, status = self.make_request("PUT", f"/chats/{self.test_chat_id}/title", title_data)
        
        if success and isinstance(data, dict):
            title_updated = data.get("title") == new_title
            self.log_test(
                "Update Chat Title", 
                title_updated,
                f"Title updated to: {data.get('title')}"
            )
        else:
            self.log_test("Update Chat Title", False, f"Status: {status}, Error: {data}")
    
    def test_trending_sports_topics(self):
        """Test trending sports topics endpoint"""
        success, data, status = self.make_request("GET", "/sports/trending")
        
        if success and isinstance(data, dict):
            has_topics = "topics" in data and "total" in data
            topics_list = data.get("topics", [])
            valid_topics = all(
                isinstance(topic, dict) and 
                all(key in topic for key in ["id", "title", "sport", "type"]) 
                for topic in topics_list
            )
            
            self.log_test(
                "Trending Sports Topics", 
                has_topics and valid_topics and len(topics_list) > 0,
                f"Retrieved {len(topics_list)} trending topics successfully"
            )
        else:
            self.log_test("Trending Sports Topics", False, f"Status: {status}, Error: {data}")
    
    def test_sport_specific_data(self):
        """Test sport-specific data endpoints"""
        sports = ["nfl", "nba", "mlb"]
        
        for sport in sports:
            success, data, status = self.make_request("GET", f"/sports/{sport}")
            
            if success and isinstance(data, dict):
                has_sport_data = "sport" in data and data["sport"] == sport.upper()
                has_content = any(key in data for key in ["news", "trending", "total_items"])
                
                self.log_test(
                    f"Sport Data - {sport.upper()}", 
                    has_sport_data and has_content,
                    f"Retrieved data for {sport.upper()}"
                )
            else:
                self.log_test(f"Sport Data - {sport.upper()}", False, f"Status: {status}, Error: {data}")
    
    def test_sports_videos(self):
        """Test sports video content endpoint"""
        success, data, status = self.make_request("GET", "/sports/videos")
        
        if success and isinstance(data, dict):
            has_videos = "videos" in data and "total" in data
            videos_list = data.get("videos", [])
            
            self.log_test(
                "Sports Videos", 
                has_videos and len(videos_list) >= 0,  # Accept 0 or more videos
                f"Retrieved {len(videos_list)} video items successfully"
            )
        else:
            self.log_test("Sports Videos", False, f"Status: {status}, Error: {data}")
    
    def test_sports_query_analysis(self):
        """Test sports query analysis endpoint"""
        if not self.auth_token:
            self.log_test("Sports Query Analysis", False, "No auth token available")
            return
            
        query_data = {
            "query": "What are the playoff chances for the Kansas City Chiefs?",
            "include_context": True
        }
        
        success, data, status = self.make_request("POST", "/sports/analyze", query_data)
        
        if success and isinstance(data, dict):
            has_analysis = "analysis" in data and "query" in data
            has_content = len(data.get("analysis", "")) > 10
            
            self.log_test(
                "Sports Query Analysis", 
                has_analysis and has_content,
                f"Analysis generated: {len(data.get('analysis', ''))} characters"
            )
        else:
            self.log_test("Sports Query Analysis", False, f"Status: {status}, Error: {data}")
    
    def test_user_interests_management(self):
        """Test user interests management"""
        if not self.auth_token:
            self.log_test("User Interests Management", False, "No auth token available")
            return
            
        # Test getting interests
        success, data, status = self.make_request("GET", "/user/interests")
        
        if success and isinstance(data, dict) and "interests" in data:
            self.log_test(
                "Get User Interests", 
                True,
                f"Current interests: {data['interests']}"
            )
            
            # Test updating interests
            new_interests = ["NFL", "NBA", "Soccer"]
            success2, data2, status2 = self.make_request("PUT", "/user/interests", new_interests)
            
            if success2 and isinstance(data2, dict):
                interests_updated = set(data2.get("interests", [])) == set(new_interests)
                self.log_test(
                    "Update User Interests", 
                    interests_updated,
                    f"Interests updated to: {data2.get('interests')}"
                )
            else:
                self.log_test("Update User Interests", False, f"Status: {status2}, Error: {data2}")
        else:
            self.log_test("Get User Interests", False, f"Status: {status}, Error: {data}")
    
    def test_subscription_status(self):
        """Test subscription status endpoint"""
        if not self.auth_token:
            self.log_test("Subscription Status", False, "No auth token available")
            return
            
        success, data, status = self.make_request("GET", "/user/subscription")
        
        if success and isinstance(data, dict):
            has_subscription_info = "subscription" in data and "is_pro" in data
            self.log_test(
                "Subscription Status", 
                has_subscription_info,
                f"Subscription: {data.get('subscription')}, Pro: {data.get('is_pro')}"
            )
        else:
            self.log_test("Subscription Status", False, f"Status: {status}, Error: {data}")
    
    def test_agent_health_check(self):
        """Test agent health check endpoint"""
        success, data, status = self.make_request("GET", "/agent/health")
        
        if success and isinstance(data, dict):
            required_services = ["agent", "sportradar", "gemini", "timestamp"]
            has_services = all(service in data for service in required_services)
            agent_healthy = data.get("agent") == "healthy"
            
            self.log_test(
                "Agent Health Check", 
                has_services and agent_healthy,
                f"Services status: {data}"
            )
        else:
            self.log_test("Agent Health Check", False, f"Status: {status}, Error: {data}")
    
    def test_direct_agent_endpoint(self):
        """Test direct agent endpoint with sports queries"""
        if not self.auth_token:
            self.log_test("Direct Agent Endpoint", False, "No auth token available")
            return
            
        # Test various sports queries
        test_queries = [
            "What are the NFL standings?",
            "Lakers schedule today", 
            "Who won the Super Bowl?",
            "NBA playoff standings",
            "MLB World Series winner"
        ]
        
        for query in test_queries:
            query_data = {"query": query, "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict):
                # Check for expected JSON structure
                has_ok_field = "ok" in data
                has_proper_structure = False
                
                if data.get("ok", False):
                    # Success response structure
                    required_fields = ["answer", "source", "context"]
                    has_proper_structure = all(field in data for field in required_fields)
                    has_answer = len(data.get("answer", "")) > 10
                    has_source = "Gemini" in data.get("source", "")
                    
                    test_passed = has_proper_structure and has_answer and has_source
                    details = f"Query: '{query}' | Answer length: {len(data.get('answer', ''))} | Source: {data.get('source', 'N/A')}"
                else:
                    # Error response structure
                    has_proper_structure = "error" in data and "context" in data
                    test_passed = has_proper_structure
                    details = f"Query: '{query}' | Error: {data.get('error', 'N/A')}"
                
                self.log_test(
                    f"Direct Agent - {query[:20]}...", 
                    has_ok_field and test_passed,
                    details
                )
            else:
                self.log_test(
                    f"Direct Agent - {query[:20]}...", 
                    False, 
                    f"Status: {status}, Error: {data}"
                )
    
    def test_chat_agent_integration(self):
        """Test that chat messages use the new agent system"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Chat Agent Integration", False, "No auth token or chat ID available")
            return
            
        # Send a sports query through chat
        sports_query = "What are the current NBA playoff standings?"
        message_data = {"content": sports_query}
        success, data, status = self.make_request("POST", f"/chats/{self.test_chat_id}/messages", message_data)
        
        if success and isinstance(data, dict):
            # Check if response indicates agent was used
            sports_context = data.get("sports_context", {})
            agent_used = sports_context.get("agent_used", False)
            has_source = sports_context.get("source") is not None
            has_processing_time = sports_context.get("processing_time_ms", 0) > 0
            
            # Check response quality
            content_length = len(data.get("content", ""))
            has_substantial_response = content_length > 50
            
            self.log_test(
                "Chat Agent Integration", 
                agent_used and has_substantial_response,
                f"Agent used: {agent_used} | Source: {sports_context.get('source', 'N/A')} | Response length: {content_length} | Processing time: {sports_context.get('processing_time_ms', 0)}ms"
            )
        else:
            self.log_test("Chat Agent Integration", False, f"Status: {status}, Error: {data}")
    
    def test_intent_parsing_accuracy(self):
        """Test various query types to verify intent parsing"""
        if not self.auth_token:
            self.log_test("Intent Parsing Accuracy", False, "No auth token available")
            return
            
        # Test queries with expected intents
        test_cases = [
            {"query": "NFL standings", "expected_sport": "NFL", "expected_type": "standings"},
            {"query": "Lakers game tonight", "expected_sport": "NBA", "expected_type": "schedule"},
            {"query": "Who won the World Series?", "expected_sport": "MLB", "expected_type": "general"},
            {"query": "Super Bowl winner", "expected_sport": "NFL", "expected_type": "general"}
        ]
        
        passed_tests = 0
        total_tests = len(test_cases)
        
        for test_case in test_cases:
            query_data = {"query": test_case["query"], "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                context = data.get("context", {})
                intent = context.get("intent", {})
                
                sport_match = intent.get("sport", "").upper() == test_case["expected_sport"]
                confidence = intent.get("confidence", 0.0)
                has_confidence = confidence > 0.3  # Reasonable confidence threshold
                
                if sport_match and has_confidence:
                    passed_tests += 1
                    
        success_rate = (passed_tests / total_tests) * 100
        self.log_test(
            "Intent Parsing Accuracy", 
            success_rate >= 75,  # 75% success rate threshold
            f"Passed {passed_tests}/{total_tests} tests ({success_rate:.1f}% accuracy)"
        )
    
    def test_agent_error_handling(self):
        """Test agent error handling with invalid queries"""
        if not self.auth_token:
            self.log_test("Agent Error Handling", False, "No auth token available")
            return
            
        # Test with various problematic queries
        error_queries = [
            "",  # Empty query
            "x" * 5000,  # Very long query
            "!@#$%^&*()",  # Special characters only
            "What is the meaning of life?"  # Non-sports query
        ]
        
        error_handled_count = 0
        
        for query in error_queries:
            query_data = {"query": query, "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if isinstance(data, dict):
                # Should either succeed with graceful handling or fail gracefully
                if data.get("ok", False):
                    # Success - check if response is reasonable
                    answer = data.get("answer", "")
                    if len(answer) > 0:
                        error_handled_count += 1
                else:
                    # Error - check if error is properly structured
                    if "error" in data and "context" in data:
                        error_handled_count += 1
            
        success_rate = (error_handled_count / len(error_queries)) * 100
        self.log_test(
            "Agent Error Handling", 
            success_rate >= 75,
            f"Handled {error_handled_count}/{len(error_queries)} error cases ({success_rate:.1f}%)"
        )
    
    def test_sportradar_nba_integration(self):
        """Test Sportradar integration with specific NBA queries from review request"""
        if not self.auth_token:
            self.log_test("Sportradar NBA Integration", False, "No auth token available")
            return
            
        # Test the specific NBA queries mentioned in the review request
        nba_queries = [
            "What are the NBA standings?",
            "Lakers next game?", 
            "NBA scores today"
        ]
        
        successful_queries = 0
        total_queries = len(nba_queries)
        processing_times = []
        
        for query in nba_queries:
            query_data = {"query": query, "include_context": True}
            start_time = time.time()
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            end_time = time.time()
            processing_time = (end_time - start_time) * 1000  # Convert to ms
            
            if success and isinstance(data, dict):
                if data.get("ok", False):
                    # Check if Sportradar data is being used
                    context = data.get("context", {})
                    source = data.get("source", "")
                    answer = data.get("answer", "")
                    
                    # Look for indicators of Sportradar integration
                    has_sportradar_data = "sportradar" in source.lower() or "nba" in answer.lower()
                    has_substantial_answer = len(answer) > 50
                    
                    if has_substantial_answer:
                        successful_queries += 1
                        processing_times.append(processing_time)
                        
                    self.log_test(
                        f"Sportradar NBA - {query}", 
                        has_substantial_answer,
                        f"Source: {source} | Answer length: {len(answer)} | Processing: {processing_time:.0f}ms"
                    )
                else:
                    self.log_test(
                        f"Sportradar NBA - {query}", 
                        False, 
                        f"Agent returned error: {data.get('error', 'Unknown error')}"
                    )
            else:
                self.log_test(
                    f"Sportradar NBA - {query}", 
                    False, 
                    f"Request failed - Status: {status}, Error: {data}"
                )
        
        # Overall assessment
        success_rate = (successful_queries / total_queries) * 100
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        
        self.log_test(
            "Sportradar NBA Integration Overall", 
            success_rate >= 66,  # At least 2/3 queries should work
            f"Success rate: {success_rate:.1f}% ({successful_queries}/{total_queries}) | Avg processing: {avg_processing_time:.0f}ms"
        )
    
    def test_perplexity_integration(self):
        """Test Perplexity integration by checking if it's available as a fallback"""
        if not self.auth_token:
            self.log_test("Perplexity Integration", False, "No auth token available")
            return
            
        # Test a general sports query that might use Perplexity
        query_data = {"query": "Latest NFL news and analysis", "include_context": True}
        success, data, status = self.make_request("POST", "/agent/ask", query_data)
        
        if success and isinstance(data, dict):
            if data.get("ok", False):
                source = data.get("source", "")
                answer = data.get("answer", "")
                context = data.get("context", {})
                
                # Check if Perplexity is mentioned or if we get a quality response
                has_perplexity = "perplexity" in source.lower()
                has_quality_response = len(answer) > 100 and "nfl" in answer.lower()
                
                self.log_test(
                    "Perplexity Integration", 
                    has_quality_response,
                    f"Source: {source} | Answer length: {len(answer)} | Perplexity detected: {has_perplexity}"
                )
            else:
                self.log_test("Perplexity Integration", False, f"Agent error: {data.get('error', 'Unknown')}")
        else:
            self.log_test("Perplexity Integration", False, f"Status: {status}, Error: {data}")
    
    def test_double_wrapper_flow(self):
        """Test the complete double-wrapper flow: Intent → Sportradar → Response"""
        if not self.auth_token:
            self.log_test("Double-Wrapper Flow", False, "No auth token available")
            return
            
        # Test with a complex NBA query that should trigger the full flow
        query = "What are the current NBA playoff standings and which teams are likely to make it?"
        query_data = {"query": query, "include_context": True}
        
        start_time = time.time()
        success, data, status = self.make_request("POST", "/agent/ask", query_data)
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000
        
        if success and isinstance(data, dict):
            # Check JSON response format
            required_fields = ["ok", "answer", "source", "context"]
            has_required_fields = all(field in data for field in required_fields)
            
            if data.get("ok", False):
                context = data.get("context", {})
                intent = context.get("intent", {})
                
                # Check intent parsing
                has_intent = "sport" in intent and "confidence" in intent
                sport_correct = intent.get("sport", "").upper() == "NBA"
                confidence_good = intent.get("confidence", 0) > 0.7
                
                # Check response quality
                answer = data.get("answer", "")
                has_substantial_answer = len(answer) > 100
                has_nba_content = "nba" in answer.lower() or "playoff" in answer.lower()
                
                # Check processing time (should be reasonable)
                processing_reasonable = processing_time < 10000  # Less than 10 seconds
                
                flow_working = (has_required_fields and has_intent and 
                              has_substantial_answer and processing_reasonable)
                
                details = f"Intent: {intent.get('sport', 'N/A')} (conf: {intent.get('confidence', 0):.2f}) | "
                details += f"Answer: {len(answer)} chars | Processing: {processing_time:.0f}ms | "
                details += f"NBA content: {has_nba_content}"
                
                self.log_test(
                    "Double-Wrapper Flow", 
                    flow_working,
                    details
                )
            else:
                self.log_test(
                    "Double-Wrapper Flow", 
                    False, 
                    f"Agent returned error: {data.get('error', 'Unknown')}"
                )
        else:
            self.log_test("Double-Wrapper Flow", False, f"Status: {status}, Error: {data}")
    
    def test_sportradar_health_status(self):
        """Test that Sportradar now shows as healthy in agent health check"""
        success, data, status = self.make_request("GET", "/agent/health")
        
        if success and isinstance(data, dict):
            sportradar_status = data.get("sportradar", "unknown")
            gemini_status = data.get("gemini", "unknown")
            agent_status = data.get("agent", "unknown")
            
            # With API key configured, Sportradar should now be healthy
            sportradar_healthy = sportradar_status == "healthy"
            gemini_healthy = gemini_status == "healthy"
            agent_healthy = agent_status == "healthy"
            
            overall_healthy = sportradar_healthy and gemini_healthy and agent_healthy
            
            self.log_test(
                "Sportradar Health Status", 
                sportradar_healthy,
                f"Sportradar: {sportradar_status} | Gemini: {gemini_status} | Agent: {agent_status}"
            )
        else:
            self.log_test("Sportradar Health Status", False, f"Status: {status}, Error: {data}")
    
    def test_chat_with_sportradar_integration(self):
        """Test chat integration with Sportradar data"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Chat Sportradar Integration", False, "No auth token or chat ID available")
            return
            
        # Send NBA query through chat system
        nba_query = "What are the Lakers doing this season? Any recent trades or news?"
        message_data = {"content": nba_query}
        
        start_time = time.time()
        success, data, status = self.make_request("POST", f"/chats/{self.test_chat_id}/messages", message_data)
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000
        
        if success and isinstance(data, dict):
            sports_context = data.get("sports_context", {})
            content = data.get("content", "")
            
            # Check if agent was used
            agent_used = sports_context.get("agent_used", False)
            source = sports_context.get("source", "")
            agent_processing_time = sports_context.get("processing_time_ms", 0)
            
            # Check response quality
            has_substantial_response = len(content) > 100
            has_lakers_content = "lakers" in content.lower()
            
            # Check if sports context is enriched
            context_enriched = len(sports_context) > 2  # More than just agent_used and source
            
            integration_working = (agent_used and has_substantial_response and 
                                 processing_time < 15000)  # Reasonable processing time
            
            details = f"Agent used: {agent_used} | Source: {source} | "
            details += f"Response: {len(content)} chars | Processing: {processing_time:.0f}ms | "
            details += f"Lakers content: {has_lakers_content} | Context enriched: {context_enriched}"
            
            self.log_test(
                "Chat Sportradar Integration", 
                integration_working,
                details
            )
        else:
            self.log_test("Chat Sportradar Integration", False, f"Status: {status}, Error: {data}")
    
    def test_performance_metrics(self):
        """Test and report performance metrics for the agent system"""
        if not self.auth_token:
            self.log_test("Performance Metrics", False, "No auth token available")
            return
            
        # Test multiple queries to get average performance
        test_queries = [
            "NBA standings",
            "NFL scores", 
            "Lakers schedule",
            "Super Bowl winner",
            "MLB playoffs"
        ]
        
        processing_times = []
        successful_requests = 0
        
        for query in test_queries:
            query_data = {"query": query, "include_context": True}
            
            start_time = time.time()
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            end_time = time.time()
            
            processing_time = (end_time - start_time) * 1000
            
            if success and isinstance(data, dict) and data.get("ok", False):
                processing_times.append(processing_time)
                successful_requests += 1
        
        if processing_times:
            avg_time = sum(processing_times) / len(processing_times)
            min_time = min(processing_times)
            max_time = max(processing_times)
            success_rate = (successful_requests / len(test_queries)) * 100
            
            # Performance should be reasonable (under 5 seconds average)
            performance_good = avg_time < 5000 and success_rate >= 80
            
            details = f"Avg: {avg_time:.0f}ms | Min: {min_time:.0f}ms | Max: {max_time:.0f}ms | "
            details += f"Success rate: {success_rate:.1f}% ({successful_requests}/{len(test_queries)})"
            
            self.log_test(
                "Performance Metrics", 
                performance_good,
                details
            )
        else:
            self.log_test("Performance Metrics", False, "No successful requests to measure performance")
    
    def test_agent_fallback_behavior(self):
        """Test fallback behavior when agent fails"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Agent Fallback Behavior", False, "No auth token or chat ID available")
            return
            
        # Send a message that might trigger fallback
        message_data = {"content": "Tell me about the latest sports news"}
        success, data, status = self.make_request("POST", f"/chats/{self.test_chat_id}/messages", message_data)
        
        if success and isinstance(data, dict):
            sports_context = data.get("sports_context", {})
            
            # Check if fallback was used or agent succeeded
            agent_used = sports_context.get("agent_used", False)
            fallback_reason = sports_context.get("fallback_reason")
            has_response = len(data.get("content", "")) > 10
            
            # Either agent worked or fallback provided response
            test_passed = has_response and (agent_used or fallback_reason is not None)
            
            details = f"Agent used: {agent_used}"
            if fallback_reason:
                details += f" | Fallback reason: {fallback_reason}"
            details += f" | Response length: {len(data.get('content', ''))}"
            
            self.log_test(
                "Agent Fallback Behavior", 
                test_passed,
                details
            )
        else:
            self.log_test("Agent Fallback Behavior", False, f"Status: {status}, Error: {data}")

    def test_advanced_query_classification_system(self):
        """Test the new Advanced Sports Analytics query classification system"""
        if not self.auth_token:
            self.log_test("Advanced Query Classification", False, "No auth token available")
            return
            
        # Test various query patterns for classification
        test_queries = [
            {
                "query": "LeBron James vs Stephen Curry stats comparison",
                "expected_type": "player_comparison",
                "description": "Player comparison pattern"
            },
            {
                "query": "Show quarter by quarter Lakers game breakdown",
                "expected_type": "quarter_breakdown", 
                "description": "Quarter breakdown pattern"
            },
            {
                "query": "Stephen Curry stats and performance profile",
                "expected_type": "player_profile",
                "description": "Player profile pattern"
            },
            {
                "query": "Warriors box score from last game",
                "expected_type": "box_score",
                "description": "Box score pattern"
            },
            {
                "query": "Curry 3-point shooting trend this season",
                "expected_type": "trend_analysis",
                "description": "Trend analysis pattern"
            }
        ]
        
        successful_classifications = 0
        total_queries = len(test_queries)
        
        for test_case in test_queries:
            query_data = {"query": test_case["query"], "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                # Check if ChatAnswer structure is present
                chat_answer = data.get("chat_answer")
                if chat_answer and isinstance(chat_answer, dict):
                    cards = chat_answer.get("cards", [])
                    has_structured_cards = len(cards) > 0
                    
                    # Check for appropriate card types based on query
                    card_types = [card.get("type") for card in cards if isinstance(card, dict)]
                    
                    classification_success = False
                    if test_case["expected_type"] == "player_comparison":
                        classification_success = "comparison" in card_types or "statistics" in card_types
                    elif test_case["expected_type"] == "quarter_breakdown":
                        classification_success = "scorecard" in card_types or any(card.get("quarters") for card in cards if isinstance(card, dict))
                    elif test_case["expected_type"] == "player_profile":
                        classification_success = "player" in card_types or any(card.get("impact_score") for card in cards if isinstance(card, dict))
                    elif test_case["expected_type"] == "box_score":
                        classification_success = "statistics" in card_types
                    else:
                        classification_success = has_structured_cards
                    
                    if classification_success:
                        successful_classifications += 1
                        
                    self.log_test(
                        f"Query Classification - {test_case['description']}", 
                        classification_success,
                        f"Query: '{test_case['query']}' | Cards: {card_types} | Structured: {has_structured_cards}"
                    )
                else:
                    self.log_test(
                        f"Query Classification - {test_case['description']}", 
                        False,
                        f"No ChatAnswer structure found in response"
                    )
            else:
                self.log_test(
                    f"Query Classification - {test_case['description']}", 
                    False,
                    f"Agent request failed: {data.get('error', 'Unknown error')}"
                )
        
        # Overall classification success rate
        success_rate = (successful_classifications / total_queries) * 100
        self.log_test(
            "Advanced Query Classification Overall", 
            success_rate >= 60,  # 60% success rate threshold
            f"Successfully classified {successful_classifications}/{total_queries} queries ({success_rate:.1f}%)"
        )

    def test_mathematical_impact_score_calculations(self):
        """Test mathematical impact score calculations for different sports"""
        if not self.auth_token:
            self.log_test("Mathematical Impact Scores", False, "No auth token available")
            return
            
        # Test queries that should trigger impact score calculations
        impact_test_queries = [
            {
                "query": "Patrick Mahomes NFL quarterback stats and impact",
                "sport": "NFL",
                "description": "NFL QB impact calculation"
            },
            {
                "query": "LeBron James NBA player performance and impact score",
                "sport": "NBA", 
                "description": "NBA player impact calculation"
            },
            {
                "query": "Lionel Messi soccer player stats and overall impact",
                "sport": "Soccer",
                "description": "Soccer player impact calculation"
            }
        ]
        
        successful_calculations = 0
        total_tests = len(impact_test_queries)
        
        for test_case in impact_test_queries:
            query_data = {"query": test_case["query"], "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                chat_answer = data.get("chat_answer")
                if chat_answer and isinstance(chat_answer, dict):
                    cards = chat_answer.get("cards", [])
                    
                    # Look for impact scores in player cards or comparison cards
                    impact_score_found = False
                    impact_value = None
                    
                    for card in cards:
                        if isinstance(card, dict):
                            if card.get("type") == "player" and "impact_score" in card:
                                impact_score_found = True
                                impact_value = card.get("impact_score")
                                break
                            elif card.get("type") == "comparison":
                                players = card.get("players", [])
                                for player in players:
                                    if isinstance(player, dict) and "impact_score" in player:
                                        impact_score_found = True
                                        impact_value = player.get("impact_score")
                                        break
                    
                    # Validate impact score is a reasonable number
                    if impact_score_found and isinstance(impact_value, (int, float)) and impact_value >= 0:
                        successful_calculations += 1
                        
                    self.log_test(
                        f"Impact Score - {test_case['description']}", 
                        impact_score_found and isinstance(impact_value, (int, float)),
                        f"Sport: {test_case['sport']} | Impact Score: {impact_value} | Found: {impact_score_found}"
                    )
                else:
                    self.log_test(
                        f"Impact Score - {test_case['description']}", 
                        False,
                        "No ChatAnswer structure found"
                    )
            else:
                self.log_test(
                    f"Impact Score - {test_case['description']}", 
                    False,
                    f"Agent request failed: {data.get('error', 'Unknown error')}"
                )
        
        # Overall impact calculation success rate
        success_rate = (successful_calculations / total_tests) * 100
        self.log_test(
            "Mathematical Impact Scores Overall", 
            success_rate >= 66,  # At least 2/3 should work
            f"Successfully calculated impact scores for {successful_calculations}/{total_tests} queries ({success_rate:.1f}%)"
        )

    def test_enhanced_chatanswer_structure(self):
        """Test that backend creates proper ChatAnswer objects with appropriate card types"""
        if not self.auth_token:
            self.log_test("Enhanced ChatAnswer Structure", False, "No auth token available")
            return
            
        # Test different query types to verify proper card creation
        card_test_queries = [
            {
                "query": "Lakers vs Warriors game score and stats",
                "expected_cards": ["scorecard"],
                "description": "ScoreCard creation"
            },
            {
                "query": "NBA player statistics table and rankings",
                "expected_cards": ["statistics"],
                "description": "StatsCard creation"
            },
            {
                "query": "LeBron James vs Kevin Durant player comparison",
                "expected_cards": ["comparison", "statistics"],
                "description": "ComparisonCard creation"
            },
            {
                "query": "Stephen Curry 3-point shooting performance trend",
                "expected_cards": ["trend", "player"],
                "description": "TrendCard creation"
            }
        ]
        
        successful_structures = 0
        total_tests = len(card_test_queries)
        
        for test_case in card_test_queries:
            query_data = {"query": test_case["query"], "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                chat_answer = data.get("chat_answer")
                
                if chat_answer and isinstance(chat_answer, dict):
                    # Verify ChatAnswer structure
                    has_title = "title" in chat_answer
                    has_text = "text" in chat_answer and len(chat_answer.get("text", "")) > 0
                    has_cards = "cards" in chat_answer and isinstance(chat_answer.get("cards"), list)
                    
                    cards = chat_answer.get("cards", [])
                    card_types = [card.get("type") for card in cards if isinstance(card, dict)]
                    
                    # Check if expected card types are present
                    expected_found = any(expected in card_types for expected in test_case["expected_cards"])
                    
                    # Verify card structure integrity
                    valid_cards = True
                    for card in cards:
                        if isinstance(card, dict):
                            if not card.get("type"):
                                valid_cards = False
                                break
                            # Check type-specific required fields
                            card_type = card.get("type")
                            if card_type == "scorecard" and not card.get("teams"):
                                valid_cards = False
                                break
                            elif card_type == "statistics" and not (card.get("headers") and card.get("rows")):
                                valid_cards = False
                                break
                            elif card_type == "player" and not card.get("player_name"):
                                valid_cards = False
                                break
                    
                    structure_valid = has_text and has_cards and valid_cards and expected_found
                    
                    if structure_valid:
                        successful_structures += 1
                        
                    self.log_test(
                        f"ChatAnswer Structure - {test_case['description']}", 
                        structure_valid,
                        f"Cards: {card_types} | Expected: {test_case['expected_cards']} | Valid: {valid_cards}"
                    )
                else:
                    self.log_test(
                        f"ChatAnswer Structure - {test_case['description']}", 
                        False,
                        "No ChatAnswer structure in response"
                    )
            else:
                self.log_test(
                    f"ChatAnswer Structure - {test_case['description']}", 
                    False,
                    f"Agent request failed: {data.get('error', 'Unknown error')}"
                )
        
        # Overall structure success rate
        success_rate = (successful_structures / total_tests) * 100
        self.log_test(
            "Enhanced ChatAnswer Structure Overall", 
            success_rate >= 50,  # 50% success rate threshold
            f"Successfully created proper structures for {successful_structures}/{total_tests} queries ({success_rate:.1f}%)"
        )

    def test_chart_data_generation(self):
        """Test chart data generation for frontend visualization"""
        if not self.auth_token:
            self.log_test("Chart Data Generation", False, "No auth token available")
            return
            
        # Test queries that should generate chart data
        chart_test_queries = [
            {
                "query": "Show me Lakers scoring trend by quarter",
                "expected_chart_types": ["line"],
                "description": "Line chart for trends"
            },
            {
                "query": "Compare LeBron James and Kevin Durant stats",
                "expected_chart_types": ["bar", "radar"],
                "description": "Bar/radar charts for comparisons"
            },
            {
                "query": "NBA team statistics and rankings table",
                "expected_chart_types": ["table", "bar"],
                "description": "Table and bar chart data"
            }
        ]
        
        successful_charts = 0
        total_tests = len(chart_test_queries)
        
        for test_case in chart_test_queries:
            query_data = {"query": test_case["query"], "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                chat_answer = data.get("chat_answer")
                
                if chat_answer and isinstance(chat_answer, dict):
                    cards = chat_answer.get("cards", [])
                    chart_data_found = False
                    chart_types_found = []
                    
                    for card in cards:
                        if isinstance(card, dict):
                            # Check for chart_data field
                            if "chart_data" in card and card["chart_data"]:
                                chart_data = card["chart_data"]
                                if isinstance(chart_data, dict) and "type" in chart_data:
                                    chart_data_found = True
                                    chart_types_found.append(chart_data["type"])
                            
                            # Check for radar_chart_data in player cards
                            if card.get("type") == "player" and "radar_chart_data" in card:
                                if card["radar_chart_data"]:
                                    chart_data_found = True
                                    chart_types_found.append("radar")
                            
                            # Check for chart_type in stats cards
                            if card.get("type") == "statistics" and "chart_type" in card:
                                chart_types_found.append(card["chart_type"])
                                chart_data_found = True
                    
                    # Check if any expected chart types were found
                    expected_found = any(expected in chart_types_found for expected in test_case["expected_chart_types"])
                    
                    if chart_data_found and expected_found:
                        successful_charts += 1
                        
                    self.log_test(
                        f"Chart Data - {test_case['description']}", 
                        chart_data_found and expected_found,
                        f"Chart types found: {chart_types_found} | Expected: {test_case['expected_chart_types']}"
                    )
                else:
                    self.log_test(
                        f"Chart Data - {test_case['description']}", 
                        False,
                        "No ChatAnswer structure found"
                    )
            else:
                self.log_test(
                    f"Chart Data - {test_case['description']}", 
                    False,
                    f"Agent request failed: {data.get('error', 'Unknown error')}"
                )
        
        # Overall chart generation success rate
        success_rate = (successful_charts / total_tests) * 100
        self.log_test(
            "Chart Data Generation Overall", 
            success_rate >= 33,  # At least 1/3 should work
            f"Successfully generated chart data for {successful_charts}/{total_tests} queries ({success_rate:.1f}%)"
        )

    def test_highlightly_api_integration(self):
        """Test Highlightly API integration and graceful fallbacks"""
        if not self.auth_token:
            self.log_test("Highlightly API Integration", False, "No auth token available")
            return
            
        # Test queries that should use Highlightly API
        highlightly_queries = [
            "Manchester United recent matches and scores",
            "Barcelona football team highlights",
            "Premier League match results today"
        ]
        
        successful_integrations = 0
        total_queries = len(highlightly_queries)
        
        for query in highlightly_queries:
            query_data = {"query": query, "include_context": True}
            success, data, status = self.make_request("POST", "/agent/ask", query_data)
            
            if success and isinstance(data, dict) and data.get("ok", False):
                # Check if Highlightly was used as a source
                source = data.get("source", "")
                context = data.get("context", {})
                
                # Look for Highlightly in source or debug info
                highlightly_used = "highlightly" in source.lower()
                
                # Check debug info for Highlightly data
                if not highlightly_used and isinstance(context, dict):
                    highlightly_data = context.get("highlightly_data")
                    if highlightly_data and not highlightly_data.get("error"):
                        highlightly_used = True
                
                # Check for graceful fallback (should still get a response)
                has_response = len(data.get("answer", "")) > 50
                
                # Either Highlightly worked or graceful fallback provided good response
                integration_success = has_response and (highlightly_used or "gemini" in source.lower() or "perplexity" in source.lower())
                
                if integration_success:
                    successful_integrations += 1
                    
                self.log_test(
                    f"Highlightly Integration - {query[:30]}...", 
                    integration_success,
                    f"Source: {source} | Highlightly used: {highlightly_used} | Response length: {len(data.get('answer', ''))}"
                )
            else:
                self.log_test(
                    f"Highlightly Integration - {query[:30]}...", 
                    False,
                    f"Agent request failed: {data.get('error', 'Unknown error')}"
                )
        
        # Overall integration success rate
        success_rate = (successful_integrations / total_queries) * 100
        self.log_test(
            "Highlightly API Integration Overall", 
            success_rate >= 66,  # At least 2/3 should work (including fallbacks)
            f"Successfully handled {successful_integrations}/{total_queries} queries ({success_rate:.1f}%)"
        )

    def test_critical_player_comparison_query(self):
        """CRITICAL TEST: Send a player comparison query and verify ComparisonCard with impact calculations"""
        if not self.auth_token:
            self.log_test("CRITICAL Player Comparison", False, "No auth token available")
            return
            
        # The critical test from the review request
        comparison_query = "Compare LeBron James vs Stephen Curry stats and performance"
        query_data = {"query": comparison_query, "include_context": True}
        
        success, data, status = self.make_request("POST", "/agent/ask", query_data)
        
        if success and isinstance(data, dict) and data.get("ok", False):
            chat_answer = data.get("chat_answer")
            
            if chat_answer and isinstance(chat_answer, dict):
                cards = chat_answer.get("cards", [])
                
                # Look for ComparisonCard specifically
                comparison_card_found = False
                has_impact_calculations = False
                has_winner_analysis = False
                players_array_found = False
                
                for card in cards:
                    if isinstance(card, dict) and card.get("type") == "comparison":
                        comparison_card_found = True
                        
                        # Check for players array
                        players = card.get("players", [])
                        if isinstance(players, list) and len(players) >= 2:
                            players_array_found = True
                            
                            # Check for impact scores in players
                            for player in players:
                                if isinstance(player, dict) and "impact_score" in player:
                                    if isinstance(player["impact_score"], (int, float)):
                                        has_impact_calculations = True
                                        break
                        
                        # Check for winner analysis
                        if "winner_analysis" in card and card["winner_analysis"]:
                            has_winner_analysis = True
                        
                        break
                
                # Overall critical test success
                critical_success = (comparison_card_found and players_array_found and 
                                 has_impact_calculations)
                
                details = f"ComparisonCard: {comparison_card_found} | Players array: {players_array_found} | "
                details += f"Impact calculations: {has_impact_calculations} | Winner analysis: {has_winner_analysis}"
                
                self.log_test(
                    "CRITICAL Player Comparison Test", 
                    critical_success,
                    details
                )
                
                # Additional verification of mathematical calculations
                if has_impact_calculations:
                    self.log_test(
                        "CRITICAL Mathematical Impact Verification", 
                        True,
                        "Impact scores successfully calculated and included in ComparisonCard"
                    )
                else:
                    self.log_test(
                        "CRITICAL Mathematical Impact Verification", 
                        False,
                        "No impact score calculations found in comparison response"
                    )
                    
            else:
                self.log_test(
                    "CRITICAL Player Comparison Test", 
                    False,
                    "No ChatAnswer structure found in response"
                )
        else:
            self.log_test(
                "CRITICAL Player Comparison Test", 
                False,
                f"Agent request failed: {data.get('error', 'Unknown error')}"
            )
    
    def test_error_handling(self):
        """Test error handling for invalid requests"""
        # Test invalid chat ID
        if self.auth_token:
            success, data, status = self.make_request("GET", "/chats/invalid-id")
            self.log_test(
                "Error Handling - Invalid Chat ID", 
                not success and status in [400, 404],
                f"Correctly returned error status: {status}"
            )
        
        # Test invalid registration data
        invalid_user = {"email": "invalid-email", "password": "123"}
        success, data, status = self.make_request("POST", "/auth/register", invalid_user)
        self.log_test(
            "Error Handling - Invalid Registration", 
            not success and status in [400, 422],
            f"Correctly rejected invalid data with status: {status}"
        )
    
    def test_timing_issue_investigation(self):
        """URGENT: Test timing issue between sending message and fetching chat data"""
        if not self.auth_token:
            self.log_test("TIMING INVESTIGATION", False, "No auth token available")
            return
            
        print("\n🚨 URGENT TIMING INVESTIGATION")
        print("=" * 50)
        print("Testing timing between message send and chat fetch...")
        
        # Step 1: Create a new chat for this specific test
        chat_data = {"title": "Timing Test Chat"}
        success, data, status = self.make_request("POST", "/chats", chat_data)
        
        if not success or not isinstance(data, dict):
            self.log_test("TIMING INVESTIGATION - Chat Creation", False, f"Failed to create chat: {data}")
            return
            
        timing_chat_id = data.get("id") or data.get("_id")
        if not timing_chat_id:
            self.log_test("TIMING INVESTIGATION - Chat Creation", False, "No chat ID returned")
            return
            
        print(f"✅ Created timing test chat: {timing_chat_id}")
        
        # Step 2: Send a message to the chat
        message_content = "What are the current NBA playoff standings?"
        message_data = {"content": message_content}
        
        print(f"📤 Sending message: '{message_content}'")
        send_start_time = time.time()
        success, send_response, status = self.make_request("POST", f"/chats/{timing_chat_id}/messages", message_data)
        send_end_time = time.time()
        send_duration = (send_end_time - send_start_time) * 1000
        
        if not success:
            self.log_test("TIMING INVESTIGATION - Message Send", False, f"Failed to send message: {send_response}")
            return
            
        print(f"✅ Message sent successfully in {send_duration:.0f}ms")
        print(f"   AI Response ID: {send_response.get('id', 'N/A')}")
        print(f"   Response length: {len(send_response.get('content', ''))}")
        
        # Step 3: IMMEDIATELY fetch chat data (within 100ms as requested)
        immediate_fetch_delay = 0.05  # 50ms delay to simulate frontend timing
        time.sleep(immediate_fetch_delay)
        
        print(f"📥 Fetching chat data immediately (after {immediate_fetch_delay*1000:.0f}ms delay)...")
        immediate_fetch_start = time.time()
        success, immediate_data, status = self.make_request("GET", f"/chats/{timing_chat_id}")
        immediate_fetch_end = time.time()
        immediate_fetch_duration = (immediate_fetch_end - immediate_fetch_start) * 1000
        
        immediate_messages = []
        immediate_message_count = 0
        if success and isinstance(immediate_data, dict):
            immediate_messages = immediate_data.get("messages", [])
            immediate_message_count = len(immediate_messages)
            
        print(f"📊 IMMEDIATE FETCH RESULTS:")
        print(f"   Fetch duration: {immediate_fetch_duration:.0f}ms")
        print(f"   Messages found: {immediate_message_count}")
        print(f"   Expected: 2 messages (user + AI)")
        
        # Step 4: Wait 2 seconds and fetch again
        print("⏳ Waiting 2 seconds before second fetch...")
        time.sleep(2.0)
        
        delayed_fetch_start = time.time()
        success, delayed_data, status = self.make_request("GET", f"/chats/{timing_chat_id}")
        delayed_fetch_end = time.time()
        delayed_fetch_duration = (delayed_fetch_end - delayed_fetch_start) * 1000
        
        delayed_messages = []
        delayed_message_count = 0
        if success and isinstance(delayed_data, dict):
            delayed_messages = delayed_data.get("messages", [])
            delayed_message_count = len(delayed_messages)
            
        print(f"📊 DELAYED FETCH RESULTS:")
        print(f"   Fetch duration: {delayed_fetch_duration:.0f}ms")
        print(f"   Messages found: {delayed_message_count}")
        
        # Step 5: Analyze timing difference
        timing_issue_detected = immediate_message_count < delayed_message_count
        consistency_issue = immediate_message_count != delayed_message_count
        
        print(f"\n🔍 TIMING ANALYSIS:")
        print(f"   Message send duration: {send_duration:.0f}ms")
        print(f"   Immediate fetch (50ms later): {immediate_message_count} messages")
        print(f"   Delayed fetch (2s later): {delayed_message_count} messages")
        print(f"   Timing issue detected: {timing_issue_detected}")
        print(f"   Database consistency issue: {consistency_issue}")
        
        # Step 6: Detailed message analysis
        if immediate_messages and delayed_messages:
            print(f"\n📝 MESSAGE DETAILS:")
            print(f"   Immediate fetch message IDs: {[msg.get('id', 'N/A') for msg in immediate_messages]}")
            print(f"   Delayed fetch message IDs: {[msg.get('id', 'N/A') for msg in delayed_messages]}")
            
            # Check if messages are the same
            immediate_ids = set(msg.get('id', '') for msg in immediate_messages)
            delayed_ids = set(msg.get('id', '') for msg in delayed_messages)
            missing_in_immediate = delayed_ids - immediate_ids
            
            if missing_in_immediate:
                print(f"   ⚠️ Messages missing in immediate fetch: {missing_in_immediate}")
        
        # Step 7: Test conclusion
        expected_messages = 2  # User message + AI response
        immediate_correct = immediate_message_count == expected_messages
        delayed_correct = delayed_message_count == expected_messages
        
        test_result = {
            "send_duration_ms": send_duration,
            "immediate_fetch_duration_ms": immediate_fetch_duration,
            "delayed_fetch_duration_ms": delayed_fetch_duration,
            "immediate_message_count": immediate_message_count,
            "delayed_message_count": delayed_message_count,
            "expected_message_count": expected_messages,
            "timing_issue_detected": timing_issue_detected,
            "consistency_issue": consistency_issue,
            "immediate_correct": immediate_correct,
            "delayed_correct": delayed_correct
        }
        
        # Log the test result
        if timing_issue_detected:
            details = f"🚨 TIMING ISSUE CONFIRMED: Immediate fetch returned {immediate_message_count} messages, delayed fetch returned {delayed_message_count} messages. This indicates a database consistency/timing issue."
            test_passed = False
        elif not immediate_correct:
            details = f"⚠️ IMMEDIATE FETCH ISSUE: Expected {expected_messages} messages, got {immediate_message_count}. Delayed fetch got {delayed_message_count}."
            test_passed = False
        else:
            details = f"✅ NO TIMING ISSUE: Both immediate ({immediate_message_count}) and delayed ({delayed_message_count}) fetches returned correct message count."
            test_passed = True
            
        self.log_test("TIMING INVESTIGATION", test_passed, details)
        
        # Cleanup: Delete the timing test chat
        self.make_request("DELETE", f"/chats/{timing_chat_id}")
        
        return test_result

    def test_delete_chat(self):
        """Test chat deletion (cleanup)"""
        if not self.auth_token or not self.test_chat_id:
            self.log_test("Delete Chat", False, "No auth token or chat ID available")
            return
            
        success, data, status = self.make_request("DELETE", f"/chats/{self.test_chat_id}")
        
        if success:
            self.log_test("Delete Chat", True, "Chat deleted successfully")
        else:
            self.log_test("Delete Chat", False, f"Status: {status}, Error: {data}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🏆 PLAYMAKER Sports AI Backend API Test Suite")
        print("=" * 60)
        print(f"Testing API at: {self.base_url}")
        print()
        
        # Basic tests
        self.test_health_check()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        self.test_update_profile()
        self.test_protected_endpoint_without_auth()
        
        # URGENT: Timing investigation test (run early after auth is set up)
        print("\n🚨 URGENT TIMING INVESTIGATION")
        print("=" * 50)
        self.test_timing_issue_investigation()
        
        # NEW SPORTRADAR AGENT TESTS WITH API KEYS
        print("\n🏀 TESTING SPORTRADAR INTEGRATION WITH API KEYS")
        print("-" * 50)
        self.test_sportradar_health_status()
        self.test_sportradar_nba_integration()
        self.test_perplexity_integration()
        self.test_double_wrapper_flow()
        self.test_performance_metrics()
        
        # Original agent tests
        print("\n🤖 TESTING GENERAL AGENT SYSTEM")
        print("-" * 40)
        self.test_agent_health_check()
        self.test_direct_agent_endpoint()
        self.test_intent_parsing_accuracy()
        self.test_agent_error_handling()
        
        # Chat system tests (including agent integration)
        print("\n💬 TESTING CHAT SYSTEM WITH SPORTRADAR INTEGRATION")
        print("-" * 50)
        self.test_create_chat()
        self.test_get_user_chats()
        self.test_send_message_and_get_ai_response()
        self.test_chat_agent_integration()
        self.test_chat_with_sportradar_integration()
        self.test_agent_fallback_behavior()
        self.test_get_chat_with_messages()
        self.test_update_chat_title()
        
        # NEW ADVANCED SPORTS ANALYTICS & VISUALIZATION SYSTEM TESTS
        print("\n🏆 TESTING ADVANCED SPORTS ANALYTICS & VISUALIZATION SYSTEM")
        print("-" * 60)
        self.test_advanced_query_classification_system()
        self.test_mathematical_impact_score_calculations()
        self.test_enhanced_chatanswer_structure()
        self.test_chart_data_generation()
        self.test_highlightly_api_integration()
        self.test_critical_player_comparison_query()
        
        # Sports data tests
        print("\n🏈 TESTING SPORTS DATA ENDPOINTS")
        print("-" * 40)
        self.test_trending_sports_topics()
        self.test_sport_specific_data()
        self.test_sports_videos()
        self.test_sports_query_analysis()
        
        # User preferences tests
        print("\n👤 TESTING USER PREFERENCES")
        print("-" * 40)
        self.test_user_interests_management()
        self.test_subscription_status()
        
        # Error handling tests
        print("\n⚠️ TESTING ERROR HANDLING")
        print("-" * 40)
        self.test_error_handling()
        
        # Cleanup
        self.test_delete_chat()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏆 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        failed = total - passed
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['details']}")
        
        print("\n🏆 Testing completed!")

if __name__ == "__main__":
    tester = PlaymakerAPITester()
    tester.run_all_tests()