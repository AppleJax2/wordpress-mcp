#!/bin/bash
# Startup script for WordPress MCP Server

# Force Node.js to use a specific version
export NODE_VERSION=${NODE_VERSION:-18.12.1}

# Set default environment if not specified
export NODE_ENV=${NODE_ENV:-development}

# Set default port if not set
export PORT=${PORT:-3001}

# Set default log level if not set
export LOG_LEVEL=${LOG_LEVEL:-info}

# Set default browser mode (headless)
export HEADLESS=${HEADLESS:-true}

# Configure browser connection limits
export MAX_API_CONNECTIONS=${MAX_API_CONNECTIONS:-3}
export MAX_BROWSER_CONNECTIONS=${MAX_BROWSER_CONNECTIONS:-1}

# Enable or disable API key auth
export REQUIRE_API_KEY=${REQUIRE_API_KEY:-false}

# Control rate limiting settings
export RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-60000}
export RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-60}

echo "Starting WordPress MCP Server..."
echo "Environment: NODE_ENV=$NODE_ENV"
echo "Port: $PORT"
echo "Log Level: $LOG_LEVEL"
echo "Headless Mode: $HEADLESS"
echo "API Connections: $MAX_API_CONNECTIONS"
echo "Browser Connections: $MAX_BROWSER_CONNECTIONS"
echo "API Key Auth: $REQUIRE_API_KEY"
echo "Rate Limit Window: $RATE_LIMIT_WINDOW_MS ms"
echo "Rate Limit Requests: $RATE_LIMIT_MAX_REQUESTS"

# Check for override file and use it
if [ -f "/app/.env.override" ]; then
  echo "Found .env.override file, loading overrides..."
  # Read each line and export the variables
  while IFS= read -r line || [ -n "$line" ]; do
    if [ -n "$line" ] && [ "${line:0:1}" != "#" ]; then
      export "$line"
      echo "Override: $line"
    fi
  done < "/app/.env.override"
fi

# Explicitly disable Smithery mode
export SMITHERY=false
echo "Running with SMITHERY=$SMITHERY"

# Ensure we're in the correct directory
cd /app

# Check for required environment variables
if [ -z "$WP_SITE_URL" ]; then
  echo "WARNING: WP_SITE_URL not set, using default: https://visitingvet.com"
  export WP_SITE_URL="https://visitingvet.com"
fi

# Default connection settings for production use
export CONNECTION_TIMEOUT=${CONNECTION_TIMEOUT:-30000}
export CLEANUP_INTERVAL_MS=${CLEANUP_INTERVAL_MS:-300000}

# Start the HTTP server in the background
echo "Starting HTTP server on port $PORT..."
node src/index.js &
HTTP_SERVER_PID=$!

# Check if server started successfully
sleep 2
if ! kill -0 $HTTP_SERVER_PID 2>/dev/null; then
  echo "ERROR: HTTP server failed to start. Check logs for details."
  exit 1
fi

echo "HTTP server started with PID $HTTP_SERVER_PID"

# Start the MCP wrapper in the foreground
echo "Starting MCP wrapper..."
node mcp-wrapper.js

# Capture exit code of MCP wrapper
MCP_EXIT_CODE=$?

# If the MCP wrapper exited cleanly, keep the HTTP server running
# This is needed for long-running deployments on platforms like Render.com
if [ $MCP_EXIT_CODE -eq 0 ]; then
  echo "MCP wrapper exited successfully (code 0). HTTP server (PID $HTTP_SERVER_PID) will continue running."
  wait $HTTP_SERVER_PID
else
  echo "MCP wrapper exited with code $MCP_EXIT_CODE. Stopping HTTP server..."
  kill $HTTP_SERVER_PID
  exit $MCP_EXIT_CODE
fi