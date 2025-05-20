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

# MCP Protocol version
export MCP_PROTOCOL_VERSION=${MCP_PROTOCOL_VERSION:-2025-03-26}

echo "Starting Tanuki MCP Server"
echo "Environment: NODE_ENV=$NODE_ENV"
echo "Port: $PORT"
echo "Log Level: $LOG_LEVEL"
echo "Headless Mode: $HEADLESS"
echo "API Connections: $MAX_API_CONNECTIONS"
echo "Browser Connections: $MAX_BROWSER_CONNECTIONS"
echo "API Key Auth: $REQUIRE_API_KEY"
echo "Rate Limit Window: $RATE_LIMIT_WINDOW_MS ms"
echo "Rate Limit Requests: $RATE_LIMIT_MAX_REQUESTS"
echo "MCP Protocol Version: $MCP_PROTOCOL_VERSION"

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

# Check for required environment variables - without hardcoded defaults
if [ -z "$WP_SITE_URL" ]; then
  echo "Note: WP_SITE_URL not set. Site URLs should be passed dynamically by clients."
fi

# Default connection settings for production use
export CONNECTION_TIMEOUT=${CONNECTION_TIMEOUT:-30000}
export CLEANUP_INTERVAL_MS=${CLEANUP_INTERVAL_MS:-300000}

# Start the HTTP server
echo "Starting HTTP server on port $PORT..."
node src/index.js

# The script now runs the HTTP server in the foreground instead of running the interactive CLI
# This makes it suitable for long-running deployments on platforms like Render.com