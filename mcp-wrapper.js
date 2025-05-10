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
const url = 'http://localhost:3001';

// Create an HTTP agent to enable connection reuse with better configuration
const http = require('http');
const https = require('https');
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 5,
  keepAliveMsecs: 3000,
  timeout: 10000
});
const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 5,
  keepAliveMsecs: 3000,
  timeout: 10000
});

// Debug mode - set to true to see more information
const DEBUG = true;

function debug(...args) {
  if (DEBUG) {
    console.error('[DEBUG]', ...args);
  }
}

// Check for Smithery environment
const IS_SMITHERY = process.env.SMITHERY === 'true';
debug(`Running in ${IS_SMITHERY ? 'Smithery' : 'standard'} mode`);

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
      tools: {}
    }
  }
};

// Print immediately so Cursor has something to initialize with
console.log(JSON.stringify(startupNotification));

// Retry configuration with exponential backoff
const MAX_RETRIES = 7;
const INITIAL_RETRY_DELAY = 500; // ms
const MAX_RETRY_DELAY = 10000; // ms

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

// Listen for input from stdin (JSON-RPC requests from Cursor)
rl.on('line', async (line) => {
  debug(`Received line: ${line}`);
  
  try {
    // Parse the JSON-RPC request
    const request = JSON.parse(line);
    debug('Parsed request:', request);
    
    // Handle the request
    if (request.method === 'initialize') {
      debug('Handling initialize request');
      
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
            tools: {}
          }
        }
      };
      
      // Send the response
      console.log(JSON.stringify(response));
      debug('Sent initialize response');
      
      // Fetch tools from the HTTP server with retries
      try {
        debug('Fetching tools...');
        const toolsResponse = await fetchWithRetry(`${url}/tools`);
        const tools = await toolsResponse.json();
        debug(`Fetched ${tools.length} tools`);
        
        // Send tools notification
        const notification = {
          jsonrpc: "2.0",
          method: "tools/refresh",
          params: {
            tools: tools || []
          }
        };
        
        console.log(JSON.stringify(notification));
        debug('Sent tools notification');
      } catch (error) {
        debug(`Error fetching tools: ${error.message}`);
        // Don't log to stdout as it would break the protocol
      }
    } 
    else if (request.method === 'callTool') {
      debug(`Handling callTool request for tool: ${request.params?.name}`);
      
      // Forward to the HTTP server
      try {
        const { name, parameters } = request.params;
        
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

// Keep the process alive
debug('Starting MCP wrapper...');

// Try to connect to the server and fetch tools in the background
(async () => {
  let retries = MAX_RETRIES;
  let success = false;
  
  while (retries > 0 && !success) {
    try {
      debug(`Checking if server is running (${retries} retries left)...`);
      
      const response = await fetch(`${url}`);
      if (response.ok) {
        debug('Server is running!');
        
        // Fetch tools
        const toolsResponse = await fetch(`${url}/tools`);
        const tools = await toolsResponse.json();
        debug(`Fetched ${tools.length} tools`);
        
        // Send tools notification
        const notification = {
          jsonrpc: "2.0",
          method: "tools/refresh",
          params: {
            tools: tools || []
          }
        };
        
        console.log(JSON.stringify(notification));
        debug('Sent tools notification, ready for requests');
        
        success = true;
      }
    } catch (error) {
      debug(`Server check failed: ${error.message}`);
      retries--;
      
      if (retries > 0) {
        const delay = getRetryDelay(MAX_RETRIES - retries);
        debug(`Waiting ${Math.round(delay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  if (!success) {
    debug('Failed to connect to the server after multiple retries. Please make sure the server is running with "npm start" in another terminal.');
    
    if (IS_SMITHERY) {
      debug('Starting server automatically for Smithery integration...');
      // Start the server automatically when running under Smithery
      const { spawn } = require('child_process');
      const server = spawn('node', ['src/index.js'], {
        stdio: 'pipe',
        detached: true
      });
      
      server.stderr.on('data', (data) => {
        debug(`Server output: ${data}`);
      });
      
      server.on('error', (err) => {
        debug(`Failed to start server: ${err.message}`);
      });
      
      // Wait a bit for the server to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
})(); 