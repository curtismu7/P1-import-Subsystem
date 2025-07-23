#!/bin/bash

# PingOne Import Tool - Auto Background Starter
# 
# This script automatically starts the server in background mode
# with proper logging and process management.

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 PingOne Import Tool - Auto Background Starter${NC}"
echo "=================================================="
echo

# Check if running with sudo (not recommended)
if [ "$(id -u)" = "0" ]; then
  echo -e "${YELLOW}⚠️  Warning: Running as root/sudo is not recommended${NC}"
  echo
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Error: Node.js is not installed or not in PATH${NC}"
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ Error: npm is not installed or not in PATH${NC}"
  exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
  exit 1
fi

# Start the server in background mode
echo -e "${BLUE}Starting server in background mode...${NC}"
npm run start:background

# Check if server started successfully
if [ $? -eq 0 ]; then
  echo
  echo -e "${GREEN}✅ Server started successfully in background mode${NC}"
  echo
  echo -e "${BLUE}Server management commands:${NC}"
  echo "  Status:  npm run status:background"
  echo "  Stop:    npm run stop:background"
  echo "  Restart: npm run restart:background"
  echo
  echo -e "${BLUE}To view logs:${NC}"
  echo "  tail -f logs/server-background.log"
  echo
else
  echo -e "${RED}❌ Failed to start server in background mode${NC}"
  exit 1
fi