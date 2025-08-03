#!/bin/bash

# Script to run the enhanced logging demonstration

# Set colors for script output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}🚀 Starting Enhanced Logging Demonstration${NC}"
echo -e "${BLUE}======================================================${NC}"

# Navigate to project root (assuming script is in project root)
# cd "$(dirname "$0")"

# Run the logging demonstration
echo -e "${YELLOW}Running logging demonstration...${NC}"
node --experimental-modules --es-module-specifier-resolution=node ./test/run-logging-demo.js

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}✅ Logging demonstration completed${NC}"
echo -e "${BLUE}======================================================${NC}"
