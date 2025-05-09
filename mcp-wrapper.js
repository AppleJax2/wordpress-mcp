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
    type: "tools",
    tools: [] // Initial empty tools array, will be replaced by subsequent notification
  }
};

// Print immediately so Cursor has something to initialize with
console.log(JSON.stringify(startupNotification));

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // ms

// Global error handler to prevent crashes
process.on('uncaughtException', (err) => {
  debug('UNCAUGHT EXCEPTION:', err);
  // Don't exit - keep the process alive
});

// Set up readline interface to read from stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: null
});

// Try to fetch with retries
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  try {
    debug(`Fetching ${url}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      debug(`Fetch failed, retrying... (${retries} retries left):`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
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
          capabilities: {
            tools: true
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
            tools: tools
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

// Handle process termination
process.on('SIGINT', () => {
  debug('Received SIGINT, exiting...');
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  debug('Received SIGTERM, exiting...');
  rl.close();
  process.exit(0);
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
            tools: tools
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
        debug(`Waiting ${RETRY_DELAY}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
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