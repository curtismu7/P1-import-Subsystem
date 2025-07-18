#!/bin/bash

# PingOne Auth Subsystem Test Script
# This script runs tests for the PingOne Auth Subsystem

# Text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}PingOne Auth Subsystem Test Script${NC}"
echo "========================================"

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
curl -s http://localhost:4000/api/health > /dev/null
if [ $? -ne 0 ]; then
  echo -e "${RED}Server is not running. Please start the server first.${NC}"
  exit 1
fi
echo -e "${GREEN}Server is running.${NC}"

# Run Node.js test script
echo -e "\n${YELLOW}Running Node.js test script...${NC}"
node test-auth-subsystem.js

# Open test UI in browser
echo -e "\n${YELLOW}Opening test UI in browser...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open http://localhost:4000/test-auth-subsystem.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  xdg-open http://localhost:4000/test-auth-subsystem.html
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  # Windows
  start http://localhost:4000/test-auth-subsystem.html
else
  echo -e "${YELLOW}Please open the following URL in your browser:${NC}"
  echo "http://localhost:4000/test-auth-subsystem.html"
fi

echo -e "\n${GREEN}Test script completed.${NC}"
echo "========================================"