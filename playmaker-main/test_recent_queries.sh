#!/bin/bash

echo "Testing Recent Game Queries"
echo "============================"
echo ""

queries=(
    "falcons game"
    "patriots last game"
    "chiefs game"
    "cowboys game"
    "packers game"
)

for query in "${queries[@]}"; do
    echo "Testing: $query"
    start_time=$(date +%s%N)

    response=$(curl -s -X POST "http://localhost:8000/api/chatbot/ask" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}" | jq -r '.response // "ERROR"')

    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

    # Truncate response to 80 chars
    short_response="${response:0:80}"

    echo "  Time: ${duration}ms"
    echo "  Response: $short_response..."
    echo ""
done

echo "============================"
echo "Average time should be under 2000ms for recent games"
