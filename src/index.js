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
  getFullToolMetadata
} = require('./tools');
const config = require('./config');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Enhanced CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ALLOW_ORIGIN || '*',
  methods: process.env.CORS_ALLOW_METHODS || 'GET,POST,OPTIONS',
  allowedHeaders: process.env.CORS_ALLOW_HEADERS || 'Content-Type,Authorization,Accept',
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware with config
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Key authentication middleware
const validateApiKey = (req, res, next) => {
  // Skip API key validation if disabled in config
  if (!config.auth.requireApiKey) {
    return next();
  }

  // Extract API key from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing API key. Please provide a valid API key in the Authorization header.'
    });
  }

  const apiKey = authHeader.split('Bearer ')[1];

  // Validate API key format
  if (!apiKey.startsWith('tn_live_')) {
    return res.status(401).json({ 
      error: 'Invalid API key format. API keys should start with tn_live_.'
    });
  }

  // TODO: In production, this would validate the API key against the database
  // For now, we're accepting all properly formatted keys for development
  
  // In production, we would:
  // 1. Check if the key exists in the database (hashed)
  // 2. Verify if the user account is active
  // 3. Check if the subscription is valid
  // 4. Track API usage for billing
  // 5. Apply rate limiting

  // Attach user info to request for later use
  req.user = {
    apiKey: apiKey,
    plan: 'development',
    operationsRemaining: 1000
  };

  // Track API usage
  logger.info(`API request with key: ${apiKey.substring(0, 8)}...`);
  
  next();
};

// Simple request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Active connections
let sessions = new Map();

// Home route
app.get('/', (req, res) => {
  res.json({
    name: 'Tanuki WordPress MCP Server',
    version: '1.0.0',
    description: 'Cloud-powered WordPress browser automation, magically transformed.',
    status: 'running'
  });
});

// Tools metadata endpoint - using lazy loading
app.get('/tools', validateApiKey, (req, res) => {
  // Return full metadata for tools endpoint
  res.json({
    tools: getBasicToolsMetadata(),
    isPartial: true,
    supportsLazyLoading: true,
    lazyLoadingEnabled: true
  });
});

// Tool details endpoint
app.get('/tools/:name', validateApiKey, (req, res) => {
  const { name } = req.params;
  
  // Find the tool by name
  const tool = wordpressTools.find(t => t.name === name);
  
  if (!tool) {
    return res.status(404).json({ error: `Tool '${name}' not found` });
  }
  
  // Return the full tool metadata
  res.json({
    tool: getFullToolMetadata(tool),
    isPartial: false
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
  sessions.set(sessionId, { 
    sseRes: res, 
    initialized: false,
    user: req.user
  });
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
app.post('/message', (req, res) => {
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
          protocolVersion: '2025-03-26',
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
            name: 'Tanuki WordPress MCP Server',
            version: '1.0.0',
            description: 'Cloud-powered WordPress browser automation, magically transformed.'
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
      // Get the tools metadata
      const toolsList = wordpressToolsMetadata;
      
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
      
      // Check operation limits
      if (sessionData.user && sessionData.user.operationsRemaining <= 0) {
        const errorMsg = {
          jsonrpc: '2.0',
          id: rpc.id,
          error: {
            code: -32000,
            message: 'Operation limit exceeded for your plan. Please upgrade your subscription.'
          }
        };
        
        sseRes.write(`event: message\n`);
        sseRes.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
        logger.error('[MCP] SSE => event: message => operation limit exceeded');
        return;
      }
      
      // Decrement operations count
      if (sessionData.user) {
        sessionData.user.operationsRemaining--;
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

// Standard MCP Protocol stream endpoint - per 2025-03-26 spec
app.get('/stream', validateApiKey, (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  logger.info('SSE connection established via GET - 2025-03-26 protocol compliant');
  
  // Generate a sessionId to track this connection
  const sessionId = uuidv4();
  sessions.set(sessionId, { 
    sseRes: res, 
    initialized: false,
    protocol: '2025-03-26',
    user: req.user
  });
  
  // Send the session ID as a message
  res.write(`event: info\n`);
  res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);
  
  // Heartbeat every 30 seconds
  const hb = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
  }, 30000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(hb);
    sessions.delete(sessionId);
    logger.info('SSE connection closed, sessionId=', sessionId);
  });
});

// POST endpoint for handling JSON-RPC messages (2025-03-26 spec)
app.post('/stream', validateApiKey, async (req, res) => {
  const message = req.body;
  logger.info('Received POST request to /stream', { messageId: message?.id, method: message?.method });
  
  try {
    // Find the session for this client
    // In the 2025-03-26 spec, we don't need a sessionId in the URL since we use cookies
    // This is a simplified version without cookies
    
    // Find the most recent session for this user (based on API key)
    let sessionId = null;
    let sessionData = null;
    
    for (const [id, data] of sessions.entries()) {
      if (data.user && data.user.apiKey === req.user.apiKey && data.protocol === '2025-03-26') {
        sessionId = id;
        sessionData = data;
        break;
      }
    }
    
    if (!sessionId || !sessionData) {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: message?.id || null,
        error: {
          code: -32000,
          message: "No active session found. Please establish an SSE connection first."
        }
      });
    }
    
    // Process the message based on method
    if (message.method === 'initialize') {
      sessionData.initialized = true;
      
      // Return initialization capabilities
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: "2025-03-26",
          serverInfo: {
            name: "Tanuki WordPress MCP Server",
            version: "1.0.0",
            description: "Cloud-powered WordPress browser automation, magically transformed."
          },
          capabilities: {
            tools: {
              supportsLazyLoading: true
            },
            resources: {
              subscribe: true
            },
            prompts: {
              listChanged: true
            }
          }
        }
      });
    } 
    else if (message.method === 'tools/list') {
      // Return the list of available tools
      return res.json({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: wordpressToolsMetadata
        }
      });
    }
    else if (message.method === 'tools/getSchema') {
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
    else if (message.method === 'tools/call') {
      const { name, arguments: toolArgs } = message.params || {};
      
      if (!name) {
        return res.status(400).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32602,
            message: "Missing tool name in request"
          }
        });
      }
      
      // Find the tool in our WordPress tools
      const tool = wordpressTools[name];
      
      if (!tool) {
        return res.status(404).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `No such tool '${name}'`
          }
        });
      }
      
      // Check operation limits
      if (sessionData.user && sessionData.user.operationsRemaining <= 0) {
        return res.status(429).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32000,
            message: 'Operation limit exceeded for your plan. Please upgrade your subscription.'
          }
        });
      }
      
      // Decrement operations count
      if (sessionData.user) {
        sessionData.user.operationsRemaining--;
      }
      
      try {
        // Execute the tool
        const result = await tool.execute(toolArgs || {});
        
        return res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            result
          }
        });
      } catch (error) {
        return res.status(500).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32000,
            message: error.message || 'Error executing tool'
          }
        });
      }
    } 
    else {
      // Handle unsupported methods
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
    logger.error('Error processing /stream request', { error: error.message, stack: error.stack });
    
    return res.status(500).json({
      jsonrpc: "2.0",
      id: message?.id || null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: error.message
      }
    });
  }
});

// API key management endpoint - for testing during development
if (process.env.NODE_ENV !== 'production') {
  app.post('/dev/generate-api-key', (req, res) => {
    const { label } = req.body || {};
    
    // Generate a new API key
    const keyId = uuidv4().replace(/-/g, '').substring(0, 24);
    const apiKey = `tn_live_${keyId}`;
    
    res.json({
      success: true,
      apiKey,
      label: label || 'Development Key',
      message: 'This key is for development purposes only. In production, keys will be managed through the Tanuki dashboard.'
    });
  });
}

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Tanuki MCP Server running on port ${PORT}`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Development mode active');
    if (!config.auth.requireApiKey) {
      logger.warn('API key validation is DISABLED. Enable it by setting REQUIRE_API_KEY=true in .env');
    } else {
      logger.info('API key validation is enabled. Use the /dev/generate-api-key endpoint to create a test key.');
    }
  }
}); 