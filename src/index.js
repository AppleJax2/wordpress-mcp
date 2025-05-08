/**
 * WordPress MCP Server
 * Main entry point for the server
 */
const express = require('express');
const cors = require('cors');
const { wordpressTools, wordpressToolsMetadata } = require('./tools');
const config = require('./config');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'WordPress MCP Server',
    version: '1.0.0',
    description: 'MCP server for WordPress automation and management',
    tools: wordpressToolsMetadata
  });
});

// Tools metadata endpoint
app.get('/tools', (req, res) => {
  res.json(wordpressToolsMetadata);
});

// Main tool execution endpoint
app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const params = req.body;
  
  logger.info(`Tool execution request: ${toolName}`, { params });
  
  // Check if tool exists
  if (!wordpressTools[toolName]) {
    logger.error(`Tool not found: ${toolName}`);
    return res.status(404).json({
      success: false,
      error: `Tool '${toolName}' not found`
    });
  }
  
  try {
    // Execute the tool with the provided parameters
    const tool = wordpressTools[toolName];
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

// Start the server
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`WordPress MCP Server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.environment}`);
  logger.info(`WordPress site: ${config.wordpress.siteUrl}`);
  
  if (!config.wordpress.username || !config.wordpress.appPassword) {
    logger.warn('WordPress credentials not configured. Tool execution may fail.');
  }
});

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