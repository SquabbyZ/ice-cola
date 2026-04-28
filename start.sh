#!/bin/bash

# ============================================
# OpenClaw Server - Quick Start Script
# ============================================
# This script starts all required services:
# 1. Hermes Agent TUI Gateway
# 2. NestJS Server
# 3. React Client (optional)

set -e

echo "🦞 OpenClaw Server - Starting all services..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Hermes Agent is installed
check_hermes() {
    if ! command -v hermes &> /dev/null; then
        echo -e "${RED}❌ Hermes Agent not found${NC}"
        echo ""
        echo "Please install Hermes Agent first:"
        echo "  cd packages/hermes-agent"
        echo "  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash"
        echo ""
        exit 1
    fi
    echo -e "${GREEN}✅ Hermes Agent found${NC}"
}

# Check if Hermes is configured
check_hermes_config() {
    if [ ! -f ~/.hermes/config.yaml ]; then
        echo -e "${YELLOW}⚠️  Hermes not configured${NC}"
        echo ""
        echo "Running Hermes setup wizard..."
        echo ""
        cd packages/hermes-agent
        hermes setup
        cd ../..
    else
        echo -e "${GREEN}✅ Hermes configured${NC}"
    fi
}

# Start Hermes TUI Gateway
start_hermes_gateway() {
    echo ""
    echo -e "${YELLOW}🚀 Starting Hermes TUI Gateway...${NC}"
    echo "   WebSocket: ws://localhost:8080/api/ws"
    echo ""
    
    cd packages/hermes-agent
    
    # Check if already running
    if lsof -i :8080 &> /dev/null; then
        echo -e "${GREEN}✅ Hermes Gateway already running on port 8080${NC}"
    else
        # Start in background
        python -m tui_gateway.entry > /tmp/hermes-gateway.log 2>&1 &
        HERMES_PID=$!
        echo $HERMES_PID > /tmp/hermes-gateway.pid
        
        # Wait for it to start
        echo "   Waiting for gateway to start..."
        sleep 3
        
        if lsof -i :8080 &> /dev/null; then
            echo -e "${GREEN}✅ Hermes Gateway started (PID: $HERMES_PID)${NC}"
        else
            echo -e "${RED}❌ Failed to start Hermes Gateway${NC}"
            echo "   Check logs: cat /tmp/hermes-gateway.log"
            exit 1
        fi
    fi
    
    cd ../..
}

# Start NestJS Server
start_server() {
    echo ""
    echo -e "${YELLOW}🚀 Starting NestJS Server...${NC}"
    echo "   HTTP: http://localhost:3000"
    echo "   WebSocket: ws://localhost:3001"
    echo ""
    
    cd packages/server
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env not found, copying from .env.example${NC}"
        cp .env.example .env
        echo "   Please edit packages/server/.env with your configuration"
        echo ""
    fi
    
    # Install dependencies
    if [ ! -d node_modules ]; then
        echo "   Installing dependencies..."
        pnpm install
    fi
    
    # Start in background
    pnpm run dev > /tmp/openclaw-server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > /tmp/openclaw-server.pid
    
    # Wait for it to start
    echo "   Waiting for server to start..."
    sleep 5
    
    if lsof -i :3000 &> /dev/null; then
        echo -e "${GREEN}✅ Server started (PID: $SERVER_PID)${NC}"
    else
        echo -e "${RED}❌ Failed to start Server${NC}"
        echo "   Check logs: cat /tmp/openclaw-server.log"
        exit 1
    fi
    
    cd ../..
}

# Start React Client (optional)
start_client() {
    echo ""
    echo -e "${YELLOW}🚀 Starting React Client...${NC}"
    echo "   Web: http://localhost:1420"
    echo ""
    
    cd packages/client
    
    # Install dependencies
    if [ ! -d node_modules ]; then
        echo "   Installing dependencies..."
        pnpm install
    fi
    
    # Start in background
    pnpm run dev > /tmp/openclaw-client.log 2>&1 &
    CLIENT_PID=$!
    echo $CLIENT_PID > /tmp/openclaw-client.pid
    
    # Wait for it to start
    echo "   Waiting for client to start..."
    sleep 5
    
    if lsof -i :1420 &> /dev/null; then
        echo -e "${GREEN}✅ Client started (PID: $CLIENT_PID)${NC}"
    else
        echo -e "${RED}❌ Failed to start Client${NC}"
        echo "   Check logs: cat /tmp/openclaw-client.log"
        exit 1
    fi
    
    cd ../..
}

# Show status
show_status() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✅ All services started successfully!${NC}"
    echo "=========================================="
    echo ""
    echo "Services:"
    echo "  🧠 Hermes Gateway:  ws://localhost:8080/api/ws"
    echo "  🖥️  Server:          http://localhost:3000"
    echo "  🌐 Client:           http://localhost:1420"
    echo ""
    echo "Logs:"
    echo "  Hermes:  cat /tmp/hermes-gateway.log"
    echo "  Server:  cat /tmp/openclaw-server.log"
    echo "  Client:  cat /tmp/openclaw-client.log"
    echo ""
    echo "To stop all services:"
    echo "  ./stop.sh"
    echo ""
    echo "Open your browser: http://localhost:1420/chat"
    echo ""
}

# Main execution
main() {
    check_hermes
    check_hermes_config
    start_hermes_gateway
    start_server
    
    # Ask if user wants to start client
    read -p "Start React Client? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_client
    fi
    
    show_status
}

# Run main function
main
