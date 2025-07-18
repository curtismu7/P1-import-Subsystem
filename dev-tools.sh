#!/bin/bash

# Development Tools for PingOne Import Tool
# This script provides common development tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default port
PORT=${PORT:-4000}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if port is in use
check_port() {
    if lsof -i :$PORT > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill process on port
kill_port() {
    print_status "Killing process on port $PORT..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
    if check_port; then
        print_error "Failed to kill process on port $PORT"
        return 1
    else
        print_status "Successfully killed process on port $PORT"
        return 0
    fi
}

# Start server
start_server() {
    print_header "Starting PingOne Import Tool Server"
    
    if check_port; then
        print_warning "Port $PORT is already in use"
        read -p "Do you want to kill the existing process? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port
        else
            print_error "Cannot start server - port is in use"
            return 1
        fi
    fi
    
    print_status "Starting server on port $PORT..."
    print_status "Server will be available at: http://localhost:$PORT"
    print_status "Swagger UI: http://localhost:$PORT/swagger.html"
    print_status "Press Ctrl+C to stop the server"
    echo
    
    node server.js
}

# Check server status
check_status() {
    print_header "Server Status Check"
    
    if check_port; then
        print_status "Server is running on port $PORT"
        
        # Test health endpoint
        if curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; then
            print_status "Health endpoint is responding"
            HEALTH=$(curl -s http://localhost:$PORT/api/health | jq -r '.status' 2>/dev/null || echo "unknown")
            print_status "Health status: $HEALTH"
        else
            print_warning "Health endpoint is not responding"
        fi
    else
        print_warning "Server is not running on port $PORT"
    fi
}

# Clean up processes
cleanup() {
    print_header "Cleaning Up"
    
    if check_port; then
        print_status "Found process on port $PORT"
        kill_port
    else
        print_status "No process found on port $PORT"
    fi
    
    # Kill any other node processes that might be related
    print_status "Killing any remaining node processes..."
    pkill -f "node server.js" 2>/dev/null || true
    pkill -f "pingone-import" 2>/dev/null || true
    
    print_status "Cleanup complete"
}

# Build the application
build() {
    print_header "Building Application"
    
    print_status "Installing dependencies..."
    npm install
    
    print_status "Building bundle..."
    npm run build
    
    print_status "Build complete!"
}

# Show help
show_help() {
    print_header "PingOne Import Tool - Development Tools"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start     Start the server (default)"
    echo "  stop      Stop the server"
    echo "  restart   Restart the server"
    echo "  status    Check server status"
    echo "  cleanup   Kill all related processes"
    echo "  build     Build the application"
    echo "  help      Show this help message"
    echo
    echo "Environment variables:"
    echo "  PORT      Port to use (default: 4000)"
    echo
}

# Main script logic
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        cleanup
        ;;
    restart)
        cleanup
        sleep 2
        start_server
        ;;
    status)
        check_status
        ;;
    cleanup)
        cleanup
        ;;
    build)
        build
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 