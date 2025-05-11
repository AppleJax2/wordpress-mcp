/**
 * MCP Wrapper Script for WordPress MCP Server
 * 
 * This script implements the MCP stdio transport protocol, bridging between
 * Cursor's stdio expectations and our HTTP server.
 * 
 * It also supports Smithery integration for local installation.
 */

const readline = require('readline');
const fetch = require('node-fetch');

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

const path = require('path');
const { smitheryToolsMetadata } = require(path.join(__dirname, 'src', 'tools', 'index.js'));

// Create an HTTP agent to enable connection reuse with better configuration
const http = require('http');
const https = require('https');
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

// Check for Smithery environment
const IS_SMITHERY = process.env.SMITHERY === 'true';
debug(`Running in ${IS_SMITHERY ? 'Smithery' : 'standard'} mode`);

// Print startup information
console.error(`Starting MCP wrapper for WordPress MCP Server (${IS_SMITHERY ? 'Smithery' : 'standard'} mode)`);
console.error(`Target URL: ${url}`);
console.error(`Node version: ${process.version}`);
console.error(`Debug mode: ${DEBUG ? 'enabled' : 'disabled'}`);

// Add port check before starting server
// Check if we're running in a deployment where HTTP server is already running
if (process.env.RENDER) {
  debug('Running on Render.com - assuming HTTP server is managed externally');
}

// Minimal tools list for ultra-fast Smithery response
const minimalToolsList = smitheryToolsMetadata;

// Immediately return a tools notification to signal readiness
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
if (IS_SMITHERY) {
  console.log(JSON.stringify(startupNotification));
}

// Send a simplified static tool list immediately in Smithery mode
if (IS_SMITHERY) {
  debug('Sending static tools list for Smithery compatibility');
  const simpleTools = minimalToolsList; // Use all available tools from smitheryToolsMetadata
  const quickToolsNotification = {
    jsonrpc: "2.0",
    method: "tools/refresh",
    params: { tools: simpleTools, isPartial: true, supportsLazyLoading: true }
  };
  console.log(JSON.stringify(quickToolsNotification));
}

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
      
      // Add Smithery marker if in Smithery mode
      if (IS_SMITHERY && options.headers) {
        options.headers['User-Agent'] = (options.headers['User-Agent'] || '') + ' smithery';
      }
      
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
      
      // Send initialize response
      const response = {
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
      };
      
      // Send the response
      console.log(JSON.stringify(response));
      debug('Sent initialize response');
      
      // In Smithery mode, use the minimal tools list with lazy loading
      if (IS_SMITHERY) {
        const notification = {
          jsonrpc: "2.0",
          method: "tools/refresh",
          params: {
            tools: minimalToolsList,
            isPartial: true,
            supportsLazyLoading: true,
            lazyLoadingEnabled: true
          }
        };
        
        console.log(JSON.stringify(notification));
        debug('Sent minimal tools notification for Smithery with lazy loading support');
        return;
      }
      
      // Fetch basic tool metadata (names and descriptions only) from the HTTP server with retries
      try {
        debug('Fetching tool metadata...');
        const toolsResponse = await fetchWithRetry(`${url}/tools`);
        const tools = await toolsResponse.json();
        debug(`Fetched basic metadata for ${tools.length} tools`);
        
        // Send tools notification with basic metadata and lazy loading support
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
        debug('Sent tools notification with basic metadata and lazy loading support');
      } catch (error) {
        debug(`Error fetching tool metadata: ${error.message}`);
        console.error(`[ERROR] Could not fetch tool metadata: ${error.message}`);
        
        // If fetch fails, still send a minimal tools list in Smithery mode with lazy loading
        if (IS_SMITHERY) {
          const fallbackNotification = {
            jsonrpc: "2.0",
            method: "tools/refresh",
            params: {
              tools: minimalToolsList,
              isPartial: true,
              supportsLazyLoading: true,
              lazyLoadingEnabled: true
            }
          };
          
          console.log(JSON.stringify(fallbackNotification));
          debug('Sent fallback minimal tools notification for Smithery with lazy loading support');
        }
      }
    } 
    else if (request.method === 'callTool') {
      debug(`Handling callTool request for tool: ${request.params?.name}`);
      
      // Check if we need to fetch tool schema first
      const toolName = request.params?.name;
      
      // Only fetch the schema if we don't have it cached
      if (toolName && !toolSchemaCache.has(toolName)) {
        try {
          debug(`Fetching schema for tool: ${toolName}`);
          
          // Make a request to get the tool schema
          const schemaResponse = await fetchWithRetry(`${url}/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: `schema-${Date.now()}`,
              method: "tools/getSchema",
              params: {
                name: toolName
              }
            })
          });
          
          const schemaResult = await schemaResponse.json();
          
          if (schemaResult.result?.schema) {
            debug(`Received schema for tool: ${toolName}`);
            toolSchemaCache.set(toolName, schemaResult.result.schema);
          }
        } catch (error) {
          debug(`Error fetching tool schema: ${error.message}`);
          // Continue with the tool call even if schema fetch fails
        }
      }
      
      // Forward to the HTTP server
      try {
        const { name, parameters } = request.params;
        
        // Make the tool call
        const toolResponse = await fetchWithRetry(`${url}/tools/${name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(parameters)
        });
        
        const result = await toolResponse.json();
        debug(`Got tool result:`, result);
        
        // Send the response
        const response = {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            result: result
          }
        };
        
        console.log(JSON.stringify(response));
        debug('Sent tool response');
      } catch (error) {
        debug(`Error calling tool: ${error.message}`);
        
        // Send error response
        const errorResponse = {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32000,
            message: error.message
          }
        };
        
        console.log(JSON.stringify(errorResponse));
      }
    } 
    else {
      debug(`Unsupported method: ${request.method}`);
      
      // Unsupported method
      const errorResponse = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: `Method '${request.method}' not supported`
        }
      };
      
      console.log(JSON.stringify(errorResponse));
    }
  } catch (error) {
    debug(`Error processing line: ${error.message}`);
    
    // JSON parse error or other unexpected error
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
        data: error.message
      }
    };
    
    console.log(JSON.stringify(errorResponse));
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
  // In Smithery mode, we've already sent a minimal tools list, no need for immediate connection
  if (IS_SMITHERY) {
    debug('Smithery mode: Skipping immediate server connection check');
    // Start server in the background but don't block on it
    setTimeout(async () => {
      try {
        debug('Checking server status in the background...');
        await fetch(`${url}`, { timeout: 5000 });
        debug('Server is running in the background');
      } catch (error) {
        debug(`Background server check failed: ${error.message}`);
        // Try to start the server if needed
        if (!process.env.RENDER) {
          startServerForSmithery();
        }
      }
    }, 100);
    return;
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
    
    if (IS_SMITHERY && !process.env.RENDER) {
      startServerForSmithery();
    }
  }
})();

// Helper function to start server for Smithery
async function startServerForSmithery() {
  debug('Starting server automatically for Smithery integration...');
  // Start the server automatically when running under Smithery
  try {
    const { spawn } = require('child_process');
    console.error('[INFO] Attempting to start HTTP server in Smithery mode...');
    
    const server = spawn('node', ['src/index.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: {
        ...process.env,
        SMITHERY: 'true'
      }
    });
    
    server.stdout.on('data', (data) => {
      console.error(`[SERVER] ${data.toString().trim()}`);
    });
    
    server.stderr.on('data', (data) => {
      console.error(`[SERVER-ERR] ${data.toString().trim()}`);
    });
    
    server.on('error', (err) => {
      console.error(`[ERROR] Failed to start server: ${err.message}`);
    });
    
    // Wait a bit for the server to start
    console.error('[INFO] Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to connect to the server again
    let retries = 2;
    while (retries > 0) {
      try {
        const response = await fetch(`${url}`, { timeout: 5000 });
        if (response.ok) {
          console.error('[INFO] Server started successfully');
          break;
        }
      } catch (error) {
        console.error(`[ERROR] Server check failed: ${error.message}`);
      }
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error(`[ERROR] Failed to start server: ${error.message}`);
  }
} 