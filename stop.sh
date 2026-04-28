#!/bin/bash

# ============================================
# OpenClaw Server - Stop Script
# ============================================

set -e

echo "🦞 OpenClaw Server - Stopping all services..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Stop Hermes Gateway
stop_hermes() {
    if [ -f /tmp/hermes-gateway.pid ]; then
        PID=$(cat /tmp/hermes-gateway.pid)
        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}Stopping Hermes Gateway (PID: $PID)...${NC}"
            kill $PID
            sleep 2
            
            # Force kill if still running
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID
            fi
            
            echo -e "${GREEN}✅ Hermes Gateway stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Hermes Gateway not running${NC}"
        fi
        rm -f /tmp/hermes-gateway.pid
    else
        # Try to find by port
        if lsof -i :8080 &> /dev/null; then
            echo -e "${YELLOW}Stopping Hermes Gateway on port 8080...${NC}"
            lsof -ti :8080 | xargs kill
            sleep 2
            lsof -ti :8080 | xargs kill -9 2>/dev/null || true
            echo -e "${GREEN}✅ Hermes Gateway stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Hermes Gateway not running${NC}"
        fi
    fi
}

# Stop Server
stop_server() {
    if [ -f /tmp/openclaw-server.pid ]; then
        PID=$(cat /tmp/openclaw-server.pid)
        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}Stopping Server (PID: $PID)...${NC}"
            kill $PID
            sleep 2
            
            # Force kill if still running
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID
            fi
            
            echo -e "${GREEN}✅ Server stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Server not running${NC}"
        fi
        rm -f /tmp/openclaw-server.pid
    else
        # Try to find by port
        if lsof -i :3000 &> /dev/null; then
            echo -e "${YELLOW}Stopping Server on port 3000...${NC}"
            lsof -ti :3000 | xargs kill
            sleep 2
            lsof -ti :3000 | xargs kill -9 2>/dev/null || true
            echo -e "${GREEN}✅ Server stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Server not running${NC}"
        fi
    fi
}

# Stop Client
stop_client() {
    if [ -f /tmp/openclaw-client.pid ]; then
        PID=$(cat /tmp/openclaw-client.pid)
        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}Stopping Client (PID: $PID)...${NC}"
            kill $PID
            sleep 2
            
            # Force kill if still running
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID
            fi
            
            echo -e "${GREEN}✅ Client stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Client not running${NC}"
        fi
        rm -f /tmp/openclaw-client.pid
    else
        # Try to find by port
        if lsof -i :1420 &> /dev/null; then
            echo -e "${YELLOW}Stopping Client on port 1420...${NC}"
            lsof -ti :1420 | xargs kill
            sleep 2
            lsof -ti :1420 | xargs kill -9 2>/dev/null || true
            echo -e "${GREEN}✅ Client stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Client not running${NC}"
        fi
    fi
}

# Main execution
main() {
    stop_hermes
    stop_server
    stop_client
    
    echo ""
    echo -e "${GREEN}✅ All services stopped${NC}"
    echo ""
}

# Run main function
main
