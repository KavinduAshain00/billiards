#!/bin/bash

# API Test Script for Billiards Server
# Tests the REST API endpoints

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
GAME_UUID="test-game-$(date +%s)"
PLAYER1_UUID="player1-$(date +%s)"
PLAYER2_UUID="player2-$(date +%s)"

echo "🎱 Testing Billiards Server API"
echo "================================"
echo "Server: $SERVER_URL"
echo "Game UUID: $GAME_UUID"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "${BLUE}Test 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "$SERVER_URL/health")
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo "${GREEN}✓ Health check passed${NC}"
else
    echo "${RED}✗ Health check failed${NC}"
    exit 1
fi
echo ""

# Test 2: Create Room
echo "${BLUE}Test 2: Create Room${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/createRoom" \
  -H "Content-Type: application/json" \
  -d "{
    \"room\": {
      \"gameSessionUuid\": \"$GAME_UUID\",
      \"name\": \"Test Room\",
      \"ruletype\": \"eightball\"
    },
    \"players\": [
      {
        \"uuid\": \"$PLAYER1_UUID\",
        \"name\": \"Test Player 1\"
      },
      {
        \"uuid\": \"$PLAYER2_UUID\",
        \"name\": \"Test Player 2\"
      }
    ]
  }")

echo "Response: $CREATE_RESPONSE"
if echo "$CREATE_RESPONSE" | grep -q '"status":true'; then
    echo "${GREEN}✓ Room created successfully${NC}"
    # Extract links
    LINK1=$(echo "$CREATE_RESPONSE" | grep -o '"link1":"[^"]*"' | cut -d'"' -f4)
    LINK2=$(echo "$CREATE_RESPONSE" | grep -o '"link2":"[^"]*"' | cut -d'"' -f4)
    echo "Player 1 Link: $LINK1"
    echo "Player 2 Link: $LINK2"
else
    echo "${RED}✗ Room creation failed${NC}"
    exit 1
fi
echo ""

# Test 3: Get Game Details
echo "${BLUE}Test 3: Get Game Details${NC}"
DETAILS_RESPONSE=$(curl -s "$SERVER_URL/api/getGameDetails?gameSessionUuid=$GAME_UUID")
echo "Response: $DETAILS_RESPONSE"
if echo "$DETAILS_RESPONSE" | grep -q '"status":true'; then
    echo "${GREEN}✓ Game details retrieved successfully${NC}"
else
    echo "${RED}✗ Failed to retrieve game details${NC}"
    exit 1
fi
echo ""

# Test 4: Get Rooms List
echo "${BLUE}Test 4: Get Rooms List${NC}"
ROOMS_RESPONSE=$(curl -s "$SERVER_URL/rooms")
echo "Response: $ROOMS_RESPONSE"
if echo "$ROOMS_RESPONSE" | grep -q '"rooms"'; then
    echo "${GREEN}✓ Rooms list retrieved successfully${NC}"
else
    echo "${RED}✗ Failed to retrieve rooms list${NC}"
    exit 1
fi
echo ""

# Test 5: User Back (Player Leaves)
echo "${BLUE}Test 5: User Back (Player Leaves)${NC}"
USERBACK_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/userBack" \
  -H "Content-Type: application/json" \
  -d "{
    \"gameSessionUuid\": \"$GAME_UUID\",
    \"uuid\": \"$PLAYER1_UUID\"
  }")

echo "Response: $USERBACK_RESPONSE"
if echo "$USERBACK_RESPONSE" | grep -q '"status":true'; then
    echo "${GREEN}✓ Player left successfully${NC}"
else
    echo "${RED}✗ Player leave failed${NC}"
    exit 1
fi
echo ""

# Test 6: Verify Game Status Changed
echo "${BLUE}Test 6: Verify Game Status Changed${NC}"
FINAL_DETAILS=$(curl -s "$SERVER_URL/api/getGameDetails?gameSessionUuid=$GAME_UUID")
echo "Response: $FINAL_DETAILS"
if echo "$FINAL_DETAILS" | grep -q '"gameStatus":"DROPPED"'; then
    echo "${GREEN}✓ Game status correctly updated to DROPPED${NC}"
else
    echo "${RED}✗ Game status not updated${NC}"
fi
echo ""

# Test 7: Try to Create Duplicate Room (Should Fail)
echo "${BLUE}Test 7: Try to Create Duplicate Room (Should Fail)${NC}"
DUPLICATE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/createRoom" \
  -H "Content-Type: application/json" \
  -d "{
    \"room\": {
      \"gameSessionUuid\": \"$GAME_UUID\",
      \"name\": \"Duplicate Room\",
      \"ruletype\": \"nineball\"
    },
    \"players\": [
      {
        \"uuid\": \"player-x\",
        \"name\": \"Player X\"
      },
      {
        \"uuid\": \"player-y\",
        \"name\": \"Player Y\"
      }
    ]
  }")

echo "Response: $DUPLICATE_RESPONSE"
if echo "$DUPLICATE_RESPONSE" | grep -q '"errorCode":"GAME_SESSION_EXISTS"'; then
    echo "${GREEN}✓ Duplicate room correctly rejected${NC}"
else
    echo "${RED}✗ Duplicate room should have been rejected${NC}"
fi
echo ""

echo "================================"
echo "${GREEN}All tests completed!${NC}"
echo ""
echo "You can manually test the game by opening these URLs in two browsers:"
echo "Player 1: $LINK1"
echo "Player 2: $LINK2"
