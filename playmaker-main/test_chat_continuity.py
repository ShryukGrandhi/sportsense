import asyncio
import httpx
import random
import string

BASE_URL = "http://localhost:8001/api"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

async def test_continuity():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Register to get token
        print("Registering new user...")
        username = f"user_{random_string()}"
        email = f"{username}@example.com"
        password = "password123"
        
        reg_res = await client.post(f"{BASE_URL}/auth/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        
        if reg_res.status_code != 200:
            print(f"Registration failed: {reg_res.text}")
            return
            
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create chat
        print("Creating chat...")
        chat_res = await client.post(f"{BASE_URL}/chats", headers=headers, json={"title": "Continuity Test"})
        if chat_res.status_code != 200:
            print(f"Chat creation failed: {chat_res.text}")
            return
        print(f"Chat response: {chat_res.json()}")
        chat_data = chat_res.json()
        chat_id = chat_data.get("id") or chat_data.get("_id")

        # 3. First Question
        q1 = "Who is the quarterback for the Kansas City Chiefs?"
        print(f"\nSending Q1: '{q1}'")
        res1 = await client.post(f"{BASE_URL}/chats/{chat_id}/messages", headers=headers, json={"content": q1})
        print(f"A1: {res1.json()['content']}")

        # 4. Follow-up Question
        q2 = "How old is he?"
        print(f"\nSending Q2: '{q2}'")
        res2 = await client.post(f"{BASE_URL}/chats/{chat_id}/messages", headers=headers, json={"content": q2})
        answer2 = res2.json()['content']
        print(f"A2: {answer2}")

        # 5. Verification
        if "Patrick Mahomes" in res1.json()['content'] and ("28" in answer2 or "29" in answer2 or "years" in answer2):
            print("\nSUCCESS: Context was preserved!")
        else:
            print("\nWARNING: Context might not have been preserved. Check answers above.")

if __name__ == "__main__":
    asyncio.run(test_continuity())
