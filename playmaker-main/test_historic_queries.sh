#!/bin/bash

echo "Testing Historic Game Queries"
echo "=============================="
echo ""

queries=(
    "falcons vs saints 2019"
    "falcons vs saints 2022"
    "cowboys vs eagles 2021"
    "chiefs vs raiders 2020"
    "packers vs bears 2023"
)

for query in "${queries[@]}"; do
    echo "Testing: $query"
    start_time=$(date +%s%N)

    response=$(curl -s -X POST "http://localhost:8000/api/chatbot/ask" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}" | jq -r '.response // "ERROR"')

    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

    # Truncate response to 100 chars
    short_response="${response:0:100}"

    echo "  Time: ${duration}ms"
    echo "  Response: $short_response..."
    echo ""
done

echo "=============================="
echo "Test Complete"
