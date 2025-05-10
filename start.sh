#!/bin/sh
# Startup script for WordPress MCP Server

echo "Starting WordPress MCP Server..."
echo "Environment: NODE_ENV=$NODE_ENV"
echo "Running with SMITHERY=$SMITHERY"

# Ensure we're in the correct directory
cd /app

# Check for required environment variables
if [ -z "$WP_SITE_URL" ]; then
  echo "WARNING: WP_SITE_URL not set, using default: https://visitingvet.com"
  export WP_SITE_URL="https://visitingvet.com"
fi

# Start the HTTP server in the background
echo "Starting HTTP server on port $PORT..."
node src/index.js &
HTTP_SERVER_PID=$!

# Check if server started successfully
sleep 3
if ! kill -0 $HTTP_SERVER_PID 2>/dev/null; then
  echo "ERROR: HTTP server failed to start. Check logs for details."
  exit 1
fi

echo "HTTP server started with PID $HTTP_SERVER_PID"

# Start the MCP wrapper in the foreground
echo "Starting MCP wrapper..."
SMITHERY=true node mcp-wrapper.js

# Capture exit code of MCP wrapper
MCP_EXIT_CODE=$?

# If the wrapper exits, kill the HTTP server too
echo "MCP wrapper exited with code $MCP_EXIT_CODE, shutting down HTTP server..."
kill $HTTP_SERVER_PID

# Wait for HTTP server to terminate
wait $HTTP_SERVER_PID 2>/dev/null || true

echo "WordPress MCP Server shutdown complete."
exit $MCP_EXIT_CODE