#!/bin/bash

echo "Testing Edge Cases"
echo "=================="
echo ""

queries=(
    "falcons vs 49ers 2021"
    "patriots vs packers 2019"
    "falcons vs rams 2018"
)

for query in "${queries[@]}"; do
    echo "Testing: $query"
    response=$(curl -s -X POST "http://localhost:8000/api/chatbot/ask" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}")

    success=$(echo "$response" | jq -r '.chat_answer.cards[0].teams[0].name // "NONE"')
    text=$(echo "$response" | jq -r '.response' | head -c 150)

    echo "  Team found: $success"
    echo "  Response: $text..."
    echo ""
done

echo "=================="
echo "Test Complete"
