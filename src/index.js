/**
 * WordPress MCP Server
 * Main entry point for the server
 */
const express = require('express');
const cors = require('cors');
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

// Simple route for checking server status
app.get('/', (req, res) => {
  res.json({
    name: 'WordPress MCP Server',
    version: '1.0.0',
    description: 'MCP server for WordPress automation and management',
    tools: IS_SMITHERY ? smitheryToolsMetadata : getBasicToolsMetadata()
  });
});

// Tools metadata endpoint - using lazy loading
app.get('/tools', (req, res) => {
  // In Smithery mode, return ultra-lightweight metadata
  if (IS_SMITHERY) {
    logger.info('Smithery scan detected - returning minimal metadata for fast scanning');
    return res.json(smitheryToolsMetadata);
  }
  
  // Return basic metadata (names and descriptions only) for quick response
  res.json(getBasicToolsMetadata());
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
          protocolVersion: "1.0",
          serverInfo: {
            name: "WordPress MCP Server",
            version: "1.0.0",
            description: "MCP server for WordPress automation and management"
          },
          capabilities: {
            tools: {}
          }
        }
      });
      
      logger.info('Sent initialize response', { id: message.id });
    } 
    else if (message.method === 'tools/list') {
      // Handle tools list request with lazy loading
      logger.info('Processing tools/list request', { id: message.id });
      
      // In Smithery mode, return ultra-lightweight metadata
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