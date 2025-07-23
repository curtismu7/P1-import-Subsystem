#!/bin/bash

# PingOne Import Tool - Background Server Starter
# 
# This script automatically starts the server in background mode
# with proper logging and process management.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_NAME="PingOne Import Tool"
LOG_DIR="./logs"
PID_FILE="./server.pid"
PORT=${PORT:-4000}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server is already running
check_server_status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0  # Running
        else
            rm -f "$PID_FILE"
            return 1  # Not running
        fi
    else
        return 1  # Not running
    fi
}

# Start server in background
start_server() {
    log_info "Starting $SERVER_NAME in background..."
    
    # Check if already running
    if check_server_status; then
        PID=$(cat "$PID_FILE")
        log_warning "Server is already running (PID: $PID)"
        log_info "Use 'npm run stop:background' to stop the server"
        return 0
    fi
    
    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    
    # Start server using npm script
    npm run start:background
    
    # Wait a moment for startup
    sleep 2
    
    # Check if server started successfully
    if check_server_status; then
        PID=$(cat "$PID_FILE")
        log_success "Server started successfully!"
        log_info "PID: $PID"
        log_info "Port: $PORT"
        log_info "Logs: $LOG_DIR/server-background.log"
        log_info "URL: http://localhost:$PORT"
        echo
        log_info "Server management commands:"
        log_info "  Stop:    npm run stop:background"
        log_info "  Restart: npm run restart:background"
        log_info "  Status:  npm run status:background"
    else
        log_error "Failed to start server"
        log_info "Check logs in $LOG_DIR/ for details"
        exit 1
    fi
}

# Main execution
main() {
    echo "🚀 $SERVER_NAME - Background Startup Script"
    echo "=============================================="
    echo
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Start the server
    start_server
}

# Run main function
main "$@"