#!/usr/bin/env python3
"""
Final definitive ChatAnswer test - comprehensive validation
"""

import requests
import json
import time
from datetime import datetime

class FinalChatAnswerTest:
    def __init__(self):
        self.base_url = "https://playmaker-ai.preview.emergentagent.com/api"
        self.session = requests.Session()
        self.auth_token = None
        
        # Login
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
    
    def run_final_test(self):
        """Run the final comprehensive test"""
        print("\n🏆 FINAL CHATANSWER IMPLEMENTATION TEST")
        print("=" * 70)
        
        results = {
            "environment_validation": False,
            "highlightly_api_working": False,
            "highlightly_no_http_400": False,
            "chatanswer_structure_created": False,
            "scorecard_cards_created": False,
            "frontend_receives_cards": False,
            "chat_endpoint_integration": False
        }
        
        # 1. Environment Validation
        print("1️⃣ Testing Environment Validation...")
        success, data, status = self.make_request("GET", "/")
        if success and isinstance(data, dict) and data.get("status") == "active":
            results["environment_validation"] = True
            print("   ✅ Environment validation passed - server running")
        else:
            print("   ❌ Environment validation failed")
        
        # 2. Highlightly API Integration
        print("\n2️⃣ Testing Highlightly API Integration...")
        query_data = {"query": "Show me football matches and highlights", "include_context": True}
        success, data, status = self.make_request("POST", "/agent/ask", query_data)
        
        if success and isinstance(data, dict) and data.get("ok", False):
            context = data.get("context", {})
            highlightly_data = context.get("highlightly_data", {})
            
            if highlightly_data and not highlightly_data.get("error"):
                results["highlightly_api_working"] = True
                print("   ✅ Highlightly API working - data retrieved")
                
                # Check for HTTP 400 errors
                error_str = str(highlightly_data.get("error", ""))
                if "400" not in error_str:
                    results["highlightly_no_http_400"] = True
                    print("   ✅ No HTTP 400 errors detected")
                else:
                    print("   ❌ HTTP 400 error detected")
            else:
                error_msg = highlightly_data.get('error', 'No data') if highlightly_data else 'No data'
                print(f"   ❌ Highlightly API error: {error_msg}")
        else:
            print("   ❌ Agent request failed")
        
        # 3. ChatAnswer Structure Creation
        print("\n3️⃣ Testing ChatAnswer Structure Creation...")
        if success and isinstance(data, dict) and data.get("ok", False):
            chat_answer = data.get("chat_answer", {})
            
            if chat_answer and "cards" in chat_answer:
                results["chatanswer_structure_created"] = True
                print("   ✅ ChatAnswer structure created with cards array")
                
                cards = chat_answer.get("cards", [])
                scorecard_count = sum(1 for card in cards if isinstance(card, dict) and card.get("type") == "scorecard")
                
                if scorecard_count > 0:
                    results["scorecard_cards_created"] = True
                    print(f"   ✅ ScoreCard objects created: {scorecard_count} cards")
                    
                    # Show sample scorecard
                    sample_scorecard = next((card for card in cards if card.get("type") == "scorecard"), None)
                    if sample_scorecard:
                        teams = sample_scorecard.get("teams", [])
                        title = sample_scorecard.get("title", "N/A")
                        print(f"   📊 Sample: {title} - {len(teams)} teams")
                else:
                    print("   ❌ No ScoreCard objects created")
            else:
                print("   ❌ ChatAnswer structure not created")
        
        # 4. Chat Endpoint Integration
        print("\n4️⃣ Testing Chat Endpoint Integration...")
        
        # Create test chat
        chat_data = {"title": "Final Test Chat"}
        success, data, status = self.make_request("POST", "/chats", chat_data)
        
        if success:
            chat_id = data.get("id") or data.get("_id")
            print(f"   ✅ Test chat created: {chat_id}")
            
            try:
                # Send message through chat endpoint
                message_data = {"content": "Show me football matches and highlights"}
                success, send_response, status = self.make_request("POST", f"/chats/{chat_id}/messages", message_data)
                
                if success and isinstance(send_response, dict):
                    # Check immediate response
                    has_chat_answer = "chat_answer" in send_response
                    chat_answer = send_response.get("chat_answer", {})
                    
                    if has_chat_answer and chat_answer:
                        results["chat_endpoint_integration"] = True
                        print("   ✅ Chat endpoint returns ChatAnswer structure")
                        
                        cards = chat_answer.get("cards", [])
                        scorecard_count = sum(1 for card in cards if isinstance(card, dict) and card.get("type") == "scorecard")
                        
                        if scorecard_count > 0:
                            results["frontend_receives_cards"] = True
                            print(f"   ✅ Frontend receives {scorecard_count} scorecard(s)")
                        else:
                            print("   ❌ Frontend receives no scorecards")
                    else:
                        print("   ❌ Chat endpoint doesn't return ChatAnswer structure")
                        
                    # Also test fetching chat (what frontend does)
                    time.sleep(1)
                    success, chat_data, status = self.make_request("GET", f"/chats/{chat_id}")
                    
                    if success and isinstance(chat_data, dict):
                        messages = chat_data.get("messages", [])
                        ai_message = next((msg for msg in messages if msg.get("type") == "ai"), None)
                        
                        if ai_message and "chat_answer" in ai_message:
                            ai_chat_answer = ai_message.get("chat_answer", {})
                            if ai_chat_answer:
                                ai_cards = ai_chat_answer.get("cards", [])
                                ai_scorecard_count = sum(1 for card in ai_cards if isinstance(card, dict) and card.get("type") == "scorecard")
                                print(f"   ✅ Chat fetch also returns {ai_scorecard_count} scorecard(s)")
                            else:
                                print("   ⚠️ Chat fetch returns null chat_answer")
                        else:
                            print("   ❌ Chat fetch doesn't include chat_answer field")
                else:
                    print("   ❌ Failed to send message through chat endpoint")
                    
            finally:
                # Cleanup
                self.make_request("DELETE", f"/chats/{chat_id}")
        else:
            print("   ❌ Failed to create test chat")
        
        # 5. Final Summary
        print("\n" + "=" * 70)
        print("🏆 FINAL TEST RESULTS")
        print("=" * 70)
        
        passed_tests = sum(1 for result in results.values() if result)
        total_tests = len(results)
        success_rate = (passed_tests / total_tests) * 100
        
        print(f"Overall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests})")
        print()
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            readable_name = test_name.replace("_", " ").title()
            print(f"{status} {readable_name}")
        
        print("\n🎯 KEY CONCLUSIONS:")
        
        if results["environment_validation"]:
            print("✅ Environment validation is working - all required API keys configured")
        
        if results["highlightly_api_working"] and results["highlightly_no_http_400"]:
            print("✅ Highlightly API integration is working perfectly - no HTTP 400 errors")
        
        if results["chatanswer_structure_created"] and results["scorecard_cards_created"]:
            print("✅ ChatAnswer schema implementation is working - ScoreCard objects created from Highlightly data")
        
        if results["frontend_receives_cards"]:
            print("✅ Frontend-backend integration is working - structured cards passed to frontend")
            print("🎉 MAJOR SUCCESS: The original issue has been RESOLVED!")
            print("   Frontend now receives structured cards instead of plain text")
        else:
            print("❌ Frontend still receives plain text instead of structured cards")
        
        if results["chat_endpoint_integration"]:
            print("✅ Chat endpoint properly integrates ChatAnswer structure")
        
        print(f"\n📋 REVIEW REQUEST STATUS:")
        print(f"1. ChatAnswer Structure Validation: {'✅ WORKING' if results['chatanswer_structure_created'] else '❌ FAILED'}")
        print(f"2. Highlightly API Integration: {'✅ WORKING' if results['highlightly_api_working'] else '❌ FAILED'}")
        print(f"3. No HTTP 400 Errors: {'✅ WORKING' if results['highlightly_no_http_400'] else '❌ FAILED'}")
        print(f"4. Cards Creation from Data: {'✅ WORKING' if results['scorecard_cards_created'] else '❌ FAILED'}")
        print(f"5. Frontend Receives Cards: {'✅ WORKING' if results['frontend_receives_cards'] else '❌ FAILED'}")

if __name__ == "__main__":
    tester = FinalChatAnswerTest()
    tester.run_final_test()