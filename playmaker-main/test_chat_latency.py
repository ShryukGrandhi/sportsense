import asyncio
import time
import httpx
import random
import string
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

async def test_latency():
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

        # 2. Create a chat
        print("Creating chat...")
        chat_res = await client.post(f"{BASE_URL}/chats", headers=headers, json={"title": "Latency Test"})
        if chat_res.status_code != 200:
            print(f"Chat creation failed: {chat_res.text}")
            return
        print(f"Chat response: {chat_res.json()}")
        chat_data = chat_res.json()
        chat_id = chat_data.get("id") or chat_data.get("_id")

        # 3. Send a message (First run - uncached)
        query = "How are the Chiefs doing?"
        print(f"\nSending query (Run 1 - Uncached): '{query}'")
        start_time = time.time()
        res1 = await client.post(f"{BASE_URL}/chats/{chat_id}/messages", headers=headers, json={"content": query})
        end_time = time.time()
        duration1 = end_time - start_time
        print(f"Run 1 Duration: {duration1:.2f}s")
        
        if res1.status_code == 200:
            print("Response 1 received successfully.")
        else:
            print(f"Error in Run 1: {res1.text}")

        # 4. Send the same message (Run 2 - Cached Intent)
        print(f"\nSending query (Run 2 - Cached Intent): '{query}'")
        start_time = time.time()
        res2 = await client.post(f"{BASE_URL}/chats/{chat_id}/messages", headers=headers, json={"content": query})
        end_time = time.time()
        duration2 = end_time - start_time
        print(f"Run 2 Duration: {duration2:.2f}s")
        
        if res2.status_code == 200:
            print("Response 2 received successfully.")
            print(f"Improvement: {duration1 - duration2:.2f}s ({(duration1 - duration2)/duration1*100:.1f}%)")
        else:
            print(f"Error in Run 2: {res2.text}")

if __name__ == "__main__":
    asyncio.run(test_latency())
