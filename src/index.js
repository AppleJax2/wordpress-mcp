/**
 * WordPress MCP Server
 * Main entry point for the server
 */
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { 
  wordpressTools, 
  wordpressToolsMetadata, 
  getBasicToolsMetadata, 
  getFullToolMetadata,
  smitheryToolsMetadata 
} = require('./tools');
const config = require('./config');
const logger = require('./utils/logger');

// Check if running in Smithery mode
const IS_SMITHERY = process.env.SMITHERY === 'true';
if (IS_SMITHERY) {
  logger.info('Running in Smithery compatibility mode - using ultra-lightweight tool scanning');
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Add API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers.authorization?.split('Bearer ')[1];
  
  // For now, pass through without validation
  // TODO: Implement API key validation once SaaS service is built
  next();
};

// We store sessions by sessionId => { sseRes, initialized: boolean }
const sessions = new Map();

// Simple route for checking server status
app.get('/', (req, res) => {
  res.json({
    name: 'WordPress MCP Server',
    version: '1.0.0',
    description: 'MCP server for WordPress automation and management',
    tools: IS_SMITHERY ? smitheryToolsMetadata : getBasicToolsMetadata(),
    isPartial: true,
    supportsLazyLoading: true,
    lazyLoadingEnabled: true
  });
});

// Tools metadata endpoint - using lazy loading
app.get('/tools', (req, res) => {
  // In Smithery mode, return ultra-lightweight metadata
  if (IS_SMITHERY) {
    logger.info('Smithery scan detected - returning minimal metadata for fast scanning');
    return res.json({
      tools: smitheryToolsMetadata,
      isPartial: true, 
      supportsLazyLoading: true,
      lazyLoadingEnabled: true
    });
  }
  
  // Return basic metadata (names and descriptions only) for quick response
  res.json({
    tools: getBasicToolsMetadata(),
    isPartial: true,
    supportsLazyLoading: true,
    lazyLoadingEnabled: true
  });
});

/* 
|--------------------------------------------------------------------------
| 1) Server-Sent Events (SSE) => GET /sse-cursor
|--------------------------------------------------------------------------
| Sets up Server-Sent Events connection
| Sends event:endpoint => /message?sessionId=XYZ
| Sends heartbeat every 10 seconds
*/
app.get('/sse-cursor', validateApiKey, (req, res) => {
  logger.info('[MCP] SSE => /sse-cursor connected');
  
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Generate a sessionId
  const sessionId = uuidv4();
  sessions.set(sessionId, { sseRes: res, initialized: false });
  logger.info('[MCP] Created sessionId:', sessionId);
  
  // event: endpoint => /message?sessionId=...
  res.write(`event: endpoint\n`);
  res.write(`data: /message?sessionId=${sessionId}\n\n`);
  
  // Heartbeat every 10 seconds
  const hb = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
  }, 10000);
  
  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(hb);
    sessions.delete(sessionId);
    logger.info('[MCP] SSE closed => sessionId=', sessionId);
  });
});

/*
|--------------------------------------------------------------------------
| 2) JSON-RPC => POST /message?sessionId=...
|--------------------------------------------------------------------------
| Handle JSON-RPC messages with proper MCP protocol flow:
| => "initialize" => minimal ack => SSE => capabilities
| => "tools/list" => minimal ack => SSE => array of tools
| => "tools/call" => minimal ack => SSE => result of the call
*/
app.post('/message', validateApiKey, (req, res) => {
  logger.info('[MCP] POST /message => body:', req.body, ' query:', req.query);
  
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId in ?sessionId=...' });
  }
  
  const sessionData = sessions.get(sessionId);
  if (!sessionData) {
    return res.status(404).json({ error: 'No SSE session with that sessionId' });
  }
  
  const rpc = req.body;
  
  // Check JSON-RPC formatting
  if (!rpc || rpc.jsonrpc !== '2.0' || !rpc.method) {
    return res.json({
      jsonrpc: '2.0',
      id: rpc?.id ?? null,
      error: {
        code: -32600,
        message: 'Invalid JSON-RPC request'
      }
    });
  }
  
  // Minimal HTTP ack
  res.json({
    jsonrpc: '2.0',
    id: rpc.id,
    result: {
      ack: `Received ${rpc.method}`
    }
  });
  
  // The actual response => SSE
  const sseRes = sessionData.sseRes;
  if (!sseRes) {
    logger.error('[MCP] No SSE response found => sessionId=', sessionId);
    return;
  }
  
  switch (rpc.method) {
    // -- initialize
    case 'initialize': {
      sessionData.initialized = true;
      
      // SSE => event: message => capabilities
      const initCaps = {
        jsonrpc: '2.0',
        id: rpc.id, // Use the same ID to prevent "unknown ID" errors
        result: {
          protocolVersion: '2023-07-01',
          capabilities: {
            tools: {
              listChanged: true,
              supportsLazyLoading: true
            },
            resources: {
              subscribe: true,
              listChanged: true
            },
            prompts: {
              listChanged: true
            },
            logging: {}
          },
          serverInfo: {
            name: 'WordPress MCP Server',
            version: '1.0.0',
            description: 'MCP server for WordPress automation and management'
          }
        }
      };
      
      sseRes.write(`event: message\n`);
      sseRes.write(`data: ${JSON.stringify(initCaps)}\n\n`);
      logger.info('[MCP] SSE => event: message => init caps => sessionId=', sessionId);
      return;
    }
    
    // -- tools/list
    case 'tools/list': {
      // Determine which tools list to send based on mode
      const toolsList = IS_SMITHERY ? smitheryToolsMetadata : getBasicToolsMetadata();
      
      const toolsMsg = {
        jsonrpc: '2.0',
        id: rpc.id, // same ID to prevent "unknown ID" errors
        result: {
          tools: toolsList,
          count: toolsList.length
        }
      };
      
      sseRes.write(`event: message\n`);
      sseRes.write(`data: ${JSON.stringify(toolsMsg)}\n\n`);
      logger.info('[MCP] SSE => event: message => tools/list => sessionId=', sessionId);
      return;
    }
    
    // -- tools/call: Run a WordPress tool
    case 'tools/call': {
      const toolName = rpc.params?.name;
      const args = rpc.params?.arguments || {};
      
      logger.info('[MCP] tools/call => name=', toolName, 'args=', args);
      
      if (!toolName) {
        const errorMsg = {
          jsonrpc: '2.0',
          id: rpc.id,
          error: {
            code: -32602,
            message: 'Missing tool name in request'
          }
        };
        
        sseRes.write(`event: message\n`);
        sseRes.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
        return;
      }
      
      // Find the tool in our WordPress tools
      const tool = wordpressTools[toolName];
      
      if (!tool) {
        const errorMsg = {
          jsonrpc: '2.0',
          id: rpc.id,
          error: {
            code: -32601,
            message: `No such tool '${toolName}'`
          }
        };
        
        sseRes.write(`event: message\n`);
        sseRes.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
        logger.error('[MCP] SSE => event: message => unknown tool call');
        return;
      }
      
      // Execute the tool (asynchronously)
      tool.execute(args)
        .then(result => {
          const callMsg = {
            jsonrpc: '2.0',
            id: rpc.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result)
                }
              ]
            }
          };
          
          sseRes.write(`event: message\n`);
          sseRes.write(`data: ${JSON.stringify(callMsg)}\n\n`);
          logger.info('[MCP] SSE => event: message => tools/call success');
        })
        .catch(error => {
          const errorMsg = {
            jsonrpc: '2.0',
            id: rpc.id,
            error: {
              code: -32000,
              message: error.message || 'Error executing tool'
            }
          };
          
          sseRes.write(`event: message\n`);
          sseRes.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
          logger.error('[MCP] SSE => event: message => tools/call error:', error);
        });
      
      return;
    }
    
    // -- notifications/initialized (acknowledge client ready state)
    case 'notifications/initialized': {
      logger.info('[MCP] notifications/initialized => sessionId=', sessionId);
      // No SSE response needed
      return;
    }
    
    // -- Handle unknown methods
    default: {
      logger.warn('[MCP] unknown method =>', rpc.method);
      
      const errorMsg = {
        jsonrpc: '2.0',
        id: rpc.id,
        error: {
          code: -32601,
          message: `Method '${rpc.method}' not recognized`
        }
      };
      
      sseRes.write(`event: message\n`);
      sseRes.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
      return;
    }
  }
});

// Add Smithery MCP endpoint to handle protocol requests
// This maintains backward compatibility
app.post('/mcp', async (req, res) => {
  const message = req.body;
  logger.info('Received POST request to /mcp', { messageId: message?.id, method: message?.method });
  
  try {
    // Handle initialize request
    if (message.method === 'initialize') {
      logger.info('Processing initialize request', { id: message.id });
      
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
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
      });
    } 
    // Handle tools/list request
    else if (message.method === 'tools/list') {
      logger.info('Processing tools/list request from Smithery', { id: message.id });
      
      // Simplified response format for Smithery compatibility
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: smitheryToolsMetadata
        }
      });
    }
    // Handle tool schema requests
    else if (message.method === 'tools/getSchema') {
      logger.info('Processing tools/getSchema request', { id: message.id, tool: message.params?.name });
      
      if (!message.params?.name) {
        return res.status(400).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32602,
            message: "Invalid params: tool name required"
          }
        });
      }
      
      const toolSchema = getFullToolMetadata(message.params.name);
      
      if (!toolSchema) {
        return res.status(404).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Tool '${message.params.name}' not found`
          }
        });
      }
      
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          schema: toolSchema
        }
      });
    }
    // Handle tool call requests
    else if (message.method === 'callTool') {
      const { name, parameters } = message.params;
      logger.info('Processing callTool request via /mcp', { id: message.id, tool: name });
      
      const tool = wordpressTools[name];
      if (!tool) {
        logger.error(`Tool not found: ${name}`);
        return res.status(404).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Tool '${name}' not found`
          }
        });
      }
      
      try {
        // Execute the tool with the provided parameters
        const result = await tool.execute(parameters);
        
        logger.info(`Tool execution complete: ${name}`, { success: result.success, id: message.id });
        
        // Send the response
        return res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            result: result
          }
        });
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, { error: error.message, id: message.id });
        
        return res.status(500).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32000,
            message: error.message,
            data: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        });
      }
    } else {
      // Handle unsupported methods
      logger.warn(`Unsupported method: ${message.method}`, { id: message.id });
      
      return res.status(400).json({
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32601,
          message: `Method '${message.method}' not supported`
        }
      });
    }
  } catch (error) {
    logger.error('Error processing /mcp request', { error: error.message, stack: error.stack });
    
    return res.status(500).json({
      jsonrpc: "2.0",
      id: message?.id || null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// REVISED MCP Protocol Implementation
// GET endpoint for establishing SSE connection
app.get('/stream', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  logger.info('SSE connection established via GET - protocol compliant, waiting for client POST');
  
  // Keep the connection open but don't send anything yet
  // Client should POST its initialize request separately
  
  // Handle client disconnect
  req.on('close', () => {
    logger.info('SSE connection closed');
  });
});

// POST endpoint for handling JSON-RPC messages
app.post('/stream', async (req, res) => {
  const message = req.body;
  logger.info('Received POST request to /stream', { messageId: message?.id, method: message?.method });
  
  try {
    // Regular JSON response (no streaming)
    if (message.method === 'initialize') {
      logger.info('Processing initialize request', { id: message.id });
      
      // Send initialize response
      res.json({
        jsonrpc: "2.0",
        id: message.id,
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
      });
      
      logger.info('Sent initialize response', { id: message.id });
    } 
    else if (message.method === 'tools/list') {
      // Handle tools list request with lazy loading
      logger.info('Processing tools/list request', { id: message.id });
      
      if (IS_SMITHERY || (req.headers['user-agent'] && req.headers['user-agent'].includes('smithery'))) {
        logger.info('Smithery scan detected - returning minimal metadata for fast scanning');
        return res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            tools: smitheryToolsMetadata
          }
        });
      }
      
      // Only send basic metadata (names and descriptions) for quick response
      res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: getBasicToolsMetadata()
        }
      });
      
      logger.info('Sent tools list response with basic metadata', { id: message.id });
    }
    // Add a new endpoint for getting detailed tool schema - on demand
    else if (message.method === 'tools/getSchema') {
      logger.info('Processing tools/getSchema request', { id: message.id, tool: message.params?.name });
      
      if (!message.params?.name) {
        return res.status(400).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32602,
            message: "Invalid params: tool name required"
          }
        });
      }
      
      const toolSchema = getFullToolMetadata(message.params.name);
      
      if (!toolSchema) {
        return res.status(404).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Tool '${message.params.name}' not found`
          }
        });
      }
      
      res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          schema: toolSchema
        }
      });
      
      logger.info('Sent tool schema', { id: message.id, tool: message.params.name });
    }
    else if (message.method === 'callTool') {
      // Process tool call
      const { name, parameters } = message.params;
      logger.info('Processing callTool request', { id: message.id, tool: name });
      
      const tool = wordpressTools[name];
      if (!tool) {
        logger.error(`Tool not found: ${name}`);
        return res.status(404).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Tool '${name}' not found`
          }
        });
      }
      
      try {
        // Execute the tool with the provided parameters
        const result = await tool.execute(parameters);
        
        logger.info(`Tool execution complete: ${name}`, { success: result.success, id: message.id });
        
        // Send the response
        res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            result: result
          }
        });
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, { error: error.message, id: message.id });
        
        res.status(500).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32000,
            message: error.message,
            data: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        });
      }
    } else {
      // Handle unsupported methods
      logger.warn(`Unsupported method: ${message.method}`, { id: message.id });
      
      res.status(400).json({
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32601,
          message: `Method '${message.method}' not supported`
        }
      });
    }
  } catch (error) {
    logger.error('Error processing request', { error: error.message, stack: error.stack });
    
    res.status(500).json({
      jsonrpc: "2.0",
      id: message?.id || null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// Legacy tool invocation endpoint - still supported
app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const params = req.body;
  
  logger.info(`Tool execution request: ${toolName}`, { params });
  
  // Check if tool exists
  const tool = wordpressTools[toolName];
  if (!tool) {
    logger.error(`Tool not found: ${toolName}`);
    return res.status(404).json({
      success: false,
      error: `Tool '${toolName}' not found`
    });
  }
  
  try {
    // Execute the tool with the provided parameters
    const result = await tool.execute(params);
    
    logger.info(`Tool execution complete: ${toolName}`, {
      success: result.success,
      params
    });
    
    res.json(result);
  } catch (error) {
    logger.error(`Error executing tool ${toolName}:`, {
      error: error.message,
      stack: error.stack,
      params
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start the server on all interfaces
const PORT = config.server.port;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`WordPress MCP Server running on port ${PORT}, listening on all interfaces`);
  logger.info(`Environment: ${config.server.environment}`);
  logger.info(`WordPress site: ${config.wordpress.siteUrl}`);
  logger.info(`Smithery mode: ${IS_SMITHERY ? 'enabled' : 'disabled'}`);
  
  if (!config.wordpress.username || !config.wordpress.appPassword) {
    logger.warn('WordPress credentials not configured. Tool execution may fail.');
  }
});

// Initialize connection manager
const connectionManager = require('./api/connection-manager');

// Log connection pool status
logger.info('Connection pool initialized', connectionManager.getStats());

// Set up periodic cleanup of idle connections to prevent "max client connections" errors
// Clean up idle connections based on configured interval
const cleanupIntervalMs = config.connections.cleanupIntervalMs;
const maxIdleTimeMs = config.connections.connectionTimeout * 3; // 3x the connection timeout

logger.info(`Setting up connection cleanup every ${cleanupIntervalMs/1000} seconds, max idle time: ${maxIdleTimeMs/1000} seconds`);

const connectionCleanupInterval = setInterval(async () => {
  try {
    const closedCount = await connectionManager.cleanupIdleConnections(maxIdleTimeMs);
    if (closedCount > 0) {
      logger.info(`Periodic cleanup closed ${closedCount} idle connections`, connectionManager.getStats());
    }
  } catch (error) {
    logger.error('Error during periodic connection cleanup:', { error: error.message });
  }
}, cleanupIntervalMs);

// Make sure the interval doesn't keep the process alive
connectionCleanupInterval.unref();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Give logger a chance to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  try {
    // Close all browser connections
    await connectionManager.closeAllBrowsers();
    logger.info('All browser connections closed');
  } catch (error) {
    logger.error('Error closing browser connections:', { error: error.message });
  }
  
  // Exit process
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  
  try {
    // Close all browser connections
    await connectionManager.closeAllBrowsers();
    logger.info('All browser connections closed');
  } catch (error) {
    logger.error('Error closing browser connections:', { error: error.message });
  }
  
  // Exit process
  setTimeout(() => process.exit(0), 1000);
});

// Export for testing
module.exports = app; 