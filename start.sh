#!/bin/sh
# Startup script for WordPress MCP Server

echo "Starting WordPress MCP Server..."

# Start the HTTP server in the background
node src/index.js &
HTTP_SERVER_PID=$!

# Give it a moment to start up
echo "Waiting for HTTP server to start..."
sleep 3

# Start the MCP wrapper in the foreground
echo "Starting MCP wrapper..."
SMITHERY=true node mcp-wrapper.js

# If the wrapper exits, kill the HTTP server too
kill $HTTP_SERVER_PID