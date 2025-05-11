/**
 * MCP Wrapper Script for WordPress MCP Server
 * 
 * This script implements the MCP stdio transport protocol, bridging between
 * Cursor's stdio expectations and our HTTP server.
 */

const readline = require('readline');
const fetch = require('node-fetch');
const path = require('path');
const http = require('http');
const https = require('https');

// Debug mode - controlled by environment variable
const DEBUG = process.env.DEBUG_MCP === 'true';

function debug(...args) {
  if (DEBUG) {
    console.error('[DEBUG]', ...args);
  }
}

// Determine the correct URL based on environment
let baseUrl = 'http://localhost:3001';
if (process.env.RENDER) {
  // Use 127.0.0.1 for Render to avoid IPv6 resolution issues with localhost
  baseUrl = `http://127.0.0.1:${process.env.PORT || 3001}`;
  debug(`Running on Render.com, forcing baseUrl to: ${baseUrl}`);
}
const url = baseUrl;

// Load tool metadata from server
const { smitheryToolsMetadata } = require(path.join(__dirname, 'src', 'tools', 'index.js'));

// Force Smithery mode to false
const IS_SMITHERY = false;

// Print startup information
console.error(`Starting MCP wrapper for WordPress MCP Server`);
console.error(`Target URL: ${url}`);
console.error(`Node version: ${process.version}`);
console.error(`Debug mode: ${DEBUG ? 'enabled' : 'disabled'}`);

// Add port check before starting server
// Check if we're running in a deployment where HTTP server is already running
if (process.env.RENDER) {
  debug('Running on Render.com - assuming HTTP server is managed externally');
}

// Send immediate tool notification to help Cursor initialize faster
debug('Sending initial tools notification');
const startupNotification = {
  jsonrpc: "2.0",
  id: "1",
  result: {
    protocolVersion: "2023-07-01",
    serverInfo: {
      name: "WordPress MCP Server",
      version: "1.0.0",
      description: "MCP server for WordPress automation and management"
    },
    capabilities: {
      tools: {
        supportsLazyLoading: true
      }
    }
  }
};

// Print immediately so Cursor has something to initialize with
console.log(JSON.stringify(startupNotification));

// Also send a tools refresh notification with available tools
const toolsNotification = {
  jsonrpc: "2.0",
  method: "tools/refresh",
  params: { 
    tools: smitheryToolsMetadata,
    isPartial: true, 
    supportsLazyLoading: true 
  }
};
console.log(JSON.stringify(toolsNotification));

// Create an HTTP agent to enable connection reuse with better configuration
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 3,
  keepAliveMsecs: 3000,
  timeout: 10000
});

const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 3,
  keepAliveMsecs: 3000,
  timeout: 10000
});

// Retry configuration with exponential backoff
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 500; // ms
const MAX_RETRY_DELAY = 8000; // ms

// Helper function to wait with jitter for more efficient retries
function getRetryDelay(attempt) {
  // Exponential backoff with jitter to prevent thundering herd
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  // Add random jitter of up to 30%
  const jitter = exponentialDelay * 0.3 * Math.random();
  return exponentialDelay + jitter;
}

// Global error handler to prevent crashes
process.on('uncaughtException', (err) => {
  debug('UNCAUGHT EXCEPTION:', err);
  // Log to stderr but don't exit - keep the process alive
  console.error(`[ERROR] Uncaught exception: ${err.message}`);
  console.error(err.stack);
});

// Handle promise rejections
process.on('unhandledRejection', (reason, promise) => {
  debug('UNHANDLED REJECTION:', reason);
  // Log to stderr but don't exit
  console.error(`[ERROR] Unhandled rejection: ${reason}`);
});

// Set up readline interface to read from stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: null
});

// Try to fetch with smarter retries
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let lastError;
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      debug(`Fetching ${url} (attempt ${attempt + 1}/${retries + 1})`);
      
      // Add appropriate agent based on URL protocol
      if (!options.agent) {
        options.agent = url.startsWith('https://') ? httpsAgent : httpAgent;
      }
      
      // Add timeout if not specified
      options.timeout = options.timeout || 10000; // 10 second timeout
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === 'ECONNREFUSED' && attempt >= 2) {
        debug(`Server connection refused after ${attempt + 1} attempts, service may be down`);
        break;
      }
      
      if (attempt < retries) {
        const delay = getRetryDelay(attempt);
        debug(`Fetch failed, retrying in ${Math.round(delay)}ms... (${retries - attempt} retries left):`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        debug(`Fetch failed after ${retries + 1} attempts:`, error.message);
        break;
      }
    }
  }
  
  throw lastError;
}

// Cached tool schemas - store schemas as they are retrieved
const toolSchemaCache = new Map();

// Listen for input from stdin (JSON-RPC requests from Cursor)
rl.on('line', async (line) => {
  debug(`Received line: ${line}`);
  
  try {
    // Parse the JSON-RPC request
    const request = JSON.parse(line);
    debug('Parsed request:', request);
    
    // Handle the request
    if (request.method === 'initialize') {
      debug('Handling initialize request with protocol version 1.0');
      
      // Fetch server info and capabilities
      try {
        const sseRes = await fetchWithRetry(`${url}/sse-cursor`, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${process.env.API_KEY || ''}`
          }
        });
        
        debug('SSE connection established');
        
        // Process SSE stream
        let sessionId = null;
        const reader = sseRes.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          debug('SSE chunk:', chunk);
          
          // Parse SSE events
          const events = chunk.split('\n\n');
          for (const event of events) {
            if (!event.trim()) continue;
            
            const lines = event.split('\n');
            const eventType = lines.find(line => line.startsWith('event:'))?.substring(7)?.trim();
            const data = lines.find(line => line.startsWith('data:'))?.substring(5)?.trim();
            
            if (eventType === 'endpoint' && data) {
              const endpoint = data;
              sessionId = endpoint.match(/sessionId=([^&]+)/)?.[1];
              debug('Got sessionId:', sessionId);
              
              if (sessionId) {
                // Send initialize request to the message endpoint
                const initResponse = await fetchWithRetry(`${url}/message?sessionId=${sessionId}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.API_KEY || ''}`
                  },
                  body: JSON.stringify(request)
                });
                
                // Send the response
                console.log(JSON.stringify({
                  jsonrpc: "2.0",
                  id: request.id,
                  result: {
                    protocolVersion: "2023-07-01",
                    serverInfo: {
                      name: "WordPress MCP Server",
                      version: "1.0.0",
                      description: "MCP server for WordPress automation and management"
                    },
                    capabilities: {
                      tools: {
                        supportsLazyLoading: true
                      }
                    }
                  }
                }));
      
                // Continue monitoring the SSE stream for tool notifications
                break;
              }
            } else if (eventType === 'message' && data) {
              try {
                const message = JSON.parse(data);
                debug('Received message:', message);
        
                // Forward message to Cursor
                console.log(JSON.stringify(message));
              } catch (e) {
                debug('Error parsing message JSON:', e);
              }
            }
          }
        }
      } catch (error) {
        debug('Error establishing SSE connection:', error);
        
        // Send a minimal response to avoid Cursor freezing
        console.log(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2023-07-01",
            serverInfo: {
              name: "WordPress MCP Server",
              version: "1.0.0",
              description: "MCP server for WordPress automation and management"
            },
            capabilities: {
              tools: {
                supportsLazyLoading: true
              }
            }
          }
        }));
      }
    } else if (request.method === 'tools/list' || request.method === 'tools/call') {
      // These requests will be handled by the SSE connection
      debug(`Request '${request.method}' will be handled by SSE connection`);
    } else {
      debug(`Unhandled method: ${request.method}`);
      
      // Send a generic error response
      console.log(JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: `Method '${request.method}' not implemented in MCP wrapper`
        }
      }));
    }
  } catch (error) {
    debug('Error processing request:', error);
    
    // Send a parse error response
    console.log(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error"
      }
    }));
  }
});

// Handle process termination with graceful shutdown
process.on('SIGINT', () => {
  debug('Received SIGINT, gracefully shutting down...');
  // Perform cleanup
  rl.close();
  
  // Notify any client that we're shutting down
  try {
    const shutdownNotification = {
      jsonrpc: "2.0",
      method: "system/shutdown",
      params: {
        reason: "Server is shutting down gracefully"
      }
    };
    console.log(JSON.stringify(shutdownNotification));
  } catch (err) {
    debug('Error sending shutdown notification:', err);
  }
  
  // Allow any pending operations to complete (max 3 seconds)
  setTimeout(() => {
    debug('Exiting...');
    process.exit(0);
  }, 3000);
});

process.on('SIGTERM', () => {
  debug('Received SIGTERM, gracefully shutting down...');
  // Perform cleanup
  rl.close();
  
  // Notify any client that we're shutting down
  try {
    const shutdownNotification = {
      jsonrpc: "2.0",
      method: "system/shutdown",
      params: {
        reason: "Server is shutting down gracefully"
      }
    };
    console.log(JSON.stringify(shutdownNotification));
  } catch (err) {
    debug('Error sending shutdown notification:', err);
  }
  
  // Allow any pending operations to complete (max 3 seconds)
  setTimeout(() => {
    debug('Exiting...');
    process.exit(0);
  }, 3000);
});

// Try to connect to the server and fetch tool metadata in the background with better error handling
(async () => {
  debug('Checking server status in the background...');
  
  // Check if server is running
  try {
    await fetch(`${url}`, { timeout: 5000 });
    debug('Server is running in the background');
  } catch (error) {
    debug(`Background server check failed: ${error.message}`);
  }
  
  let retries = MAX_RETRIES;
  let success = false;
  
  while (retries > 0 && !success) {
    try {
      debug(`Checking if server is running (${retries} retries left)...`);
      
      const response = await fetch(`${url}`, { 
        timeout: 5000,
        agent: httpAgent
      });
      
      if (response.ok) {
        debug('Server is running!');
        
        // Fetch basic tool metadata
        const toolsResponse = await fetch(`${url}/tools`, {
          timeout: 5000,
          agent: httpAgent
        });
        
        if (!toolsResponse.ok) {
          throw new Error(`HTTP error ${toolsResponse.status} getting tool metadata`);
        }
        
        const tools = await toolsResponse.json();
        debug(`Fetched basic metadata for ${tools.length} tools`);
        
        // Send tools notification with lazy loading support
        const notification = {
          jsonrpc: "2.0",
          method: "tools/refresh",
          params: {
            tools: tools || [],
            isPartial: true,
            supportsLazyLoading: true,
            lazyLoadingEnabled: true
          }
        };
        
        console.log(JSON.stringify(notification));
        debug('Sent tools notification with lazy loading support, ready for requests');
        
        success = true;
      } else {
        throw new Error(`HTTP error ${response.status} checking server`);
      }
    } catch (error) {
      debug(`Server check failed: ${error.message}`);
      retries--;
      
      if (retries > 0) {
        const delay = getRetryDelay(MAX_RETRIES - retries);
        debug(`Waiting ${Math.round(delay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[ERROR] Failed to connect to HTTP server at ${url}: ${error.message}`);
      }
    }
  }
  
  if (!success) {
    debug('Failed to connect to the server after multiple retries.');
    console.error('[ERROR] Failed to connect to the HTTP server after multiple retries.');
  }
})();