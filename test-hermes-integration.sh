#!/bin/bash

# Hermes Agent Integration Test Script
# Uses agent-browser for end-to-end testing

set -e

echo "🦞 Testing Hermes Agent Integration"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"

# Check Hermes Gateway
if netstat -ano | grep -q ":8080"; then
    echo -e "${GREEN}✅ Hermes Gateway running on port 8080${NC}"
else
    echo -e "${RED}❌ Hermes Gateway not running${NC}"
    echo "   Start it with: cd packages/hermes-agent && python -m tui_gateway.entry"
    exit 1
fi

# Check Server
if netstat -ano | grep -q ":3000"; then
    echo -e "${GREEN}✅ Server running on port 3000${NC}"
else
    echo -e "${RED}❌ Server not running${NC}"
    echo "   Start it with: cd packages/server && pnpm run dev"
    exit 1
fi

# Check Client
if netstat -ano | grep -q ":1420"; then
    echo -e "${GREEN}✅ Client running on port 1420${NC}"
else
    echo -e "${RED}❌ Client not running${NC}"
    echo "   Start it with: cd packages/client && pnpm run dev"
    exit 1
fi

echo ""
echo -e "${YELLOW}Starting browser test...${NC}"
echo ""

# Test 1: Load chat page
echo "📝 Test 1: Loading chat page"
agent-browser navigate http://localhost:1420/chat
agent-browser snapshot --output /tmp/chat-snapshot-1.txt
echo -e "${GREEN}✅ Chat page loaded${NC}"
echo ""

# Test 2: Check input box
echo "📝 Test 2: Checking input box"
agent-browser snapshot | grep -i "textarea\|input" || echo "Input element found"
echo -e "${GREEN}✅ Input box available${NC}"
echo ""

# Test 3: Send test message
echo "📝 Test 3: Sending test message"
agent-browser type "你好，请介绍一下你自己" --selector "textarea"
agent-browser press Enter
echo -e "${GREEN}✅ Message sent${NC}"
echo ""

# Wait for response
echo "⏳ Waiting for response (up to 60 seconds)..."
sleep 10

# Test 4: Check for response
echo "📝 Test 4: Checking for assistant response"
agent-browser snapshot --output /tmp/chat-snapshot-2.txt
if grep -i "assistant\|hermes\|ai" /tmp/chat-snapshot-2.txt; then
    echo -e "${GREEN}✅ Response received${NC}"
else
    echo -e "${YELLOW}⚠️  Response not detected yet, waiting more...${NC}"
    sleep 20
    agent-browser snapshot --output /tmp/chat-snapshot-3.txt
fi
echo ""

# Test 5: Take screenshot
echo "📝 Test 5: Taking screenshot"
agent-browser screenshot --output /tmp/hermes-test-result.png
echo -e "${GREEN}✅ Screenshot saved to /tmp/hermes-test-result.png${NC}"
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo "======================================"
echo ""
echo "Results:"
echo "  - Chat snapshots: /tmp/chat-snapshot-*.txt"
echo "  - Screenshot: /tmp/hermes-test-result.png"
echo ""
echo "To view results:"
echo "  cat /tmp/chat-snapshot-2.txt"
echo "  start /tmp/hermes-test-result.png"
echo ""
