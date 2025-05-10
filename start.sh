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

# Ensure correct protocol version for Smithery
export MCP_PROTOCOL_VERSION="2023-07-01"

# For Smithery deployments, ensure compatibility mode is active
if [ "$SMITHERY" = "true" ]; then
  echo "Enabling Smithery compatibility mode for faster scanning"
  export SMITHERY="true"
  export CONNECTION_TIMEOUT=5000
  export CLEANUP_INTERVAL_MS=60000
  export MAX_API_CONNECTIONS=1
  export MAX_BROWSER_CONNECTIONS=1
fi

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

# Send immediate response for Smithery tool scanning
if [ "$SMITHERY" = "true" ]; then
  echo "Generating immediate response for Smithery scanning..."
  # We'll let mcp-wrapper.js handle the immediate response
fi

# Start the MCP wrapper in the foreground
echo "Starting MCP wrapper..."
SMITHERY=true node mcp-wrapper.js

# Capture exit code of MCP wrapper
MCP_EXIT_CODE=$?

# If the wrapper exits, decide whether to kill the HTTP server
if [ "$SMITHERY" = "true" ] && [ "$MCP_EXIT_CODE" -eq 0 ]; then
  echo "MCP wrapper exited successfully in Smithery mode (code $MCP_EXIT_CODE). HTTP server (PID $HTTP_SERVER_PID) will continue running."
  # Wait for the HTTP server process. This keeps the script (and container) alive.
  # Render will send a SIGTERM to this script to stop the container, which will then propagate.
  wait $HTTP_SERVER_PID
  # Store the exit code of the wait command (which is the exit code of HTTP_SERVER_PID)
  HTTP_SERVER_EXIT_CODE=$?
  echo "HTTP server process ended with code $HTTP_SERVER_EXIT_CODE."
  exit $HTTP_SERVER_EXIT_CODE
else
  echo "MCP wrapper exited with code $MCP_EXIT_CODE. Shutting down HTTP server (PID $HTTP_SERVER_PID)..."
  kill $HTTP_SERVER_PID
  wait $HTTP_SERVER_PID 2>/dev/null || true # Wait for it to actually stop
  echo "WordPress MCP Server shutdown complete (wrapper initiated)."
  exit $MCP_EXIT_CODE # Exit with the wrapper's error code if it wasn't a clean Smithery exit
fi

# This part should ideally not be reached if the logic above is correct,
# but keeping it as a fallback or for clarity that the script intends to exit based on prior conditions.
# echo "WordPress MCP Server shutdown complete."
# exit $MCP_EXIT_CODE