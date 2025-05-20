/**
 * Configuration loader for Tanuki MCP Server
 */
require('dotenv').config();
const defaultConfig = require('./default');

/**
 * Loads configuration from env variables and defaults
 */
const config = {
  ...defaultConfig,
  
  // Override with custom configuration logic if needed
  connections: {
    maxApiConnections: process.env.MAX_API_CONNECTIONS ? parseInt(process.env.MAX_API_CONNECTIONS, 10) : 3,
    maxBrowserConnections: process.env.MAX_BROWSER_CONNECTIONS ? parseInt(process.env.MAX_BROWSER_CONNECTIONS, 10) : 1,
    maxConcurrentApiRequests: process.env.MAX_CONCURRENT_API_REQUESTS ? parseInt(process.env.MAX_CONCURRENT_API_REQUESTS, 10) : 5,
    maxConcurrentBrowserRequests: process.env.MAX_CONCURRENT_BROWSER_REQUESTS ? parseInt(process.env.MAX_CONCURRENT_BROWSER_REQUESTS, 10) : 2,
    timeout: process.env.CONNECTION_TIMEOUT ? parseInt(process.env.CONNECTION_TIMEOUT, 10) : 5000
  },

  dataStreaming: {
    defaultBatchSize: process.env.DEFAULT_BATCH_SIZE ? parseInt(process.env.DEFAULT_BATCH_SIZE, 10) : 50,
    defaultBufferSize: process.env.DEFAULT_BUFFER_SIZE ? parseInt(process.env.DEFAULT_BUFFER_SIZE, 10) : 16,
    defaultConcurrency: process.env.DEFAULT_CONCURRENCY ? parseInt(process.env.DEFAULT_CONCURRENCY, 10) : 3,
    defaultPageSize: process.env.DEFAULT_PAGE_SIZE ? parseInt(process.env.DEFAULT_PAGE_SIZE, 10) : 100,
    enableStreamCompression: process.env.ENABLE_STREAM_COMPRESSION === 'true'
  },
};

// Validate required configuration
const { wordpress, connections } = config;
if (!wordpress.siteUrl) {
  console.info('Note: No default WP_SITE_URL set. Expected to be provided by client on each request.');
}

// WordPress credentials warning suppressed since they are provided per-request by the plugin

// Log API authentication status
if (config.auth.requireApiKey) {
  console.info('API Key authentication is ENABLED');
} else {
  console.warn('WARNING: API Key authentication is DISABLED. Enable it in production with REQUIRE_API_KEY=true');
}

// Log connection limits
console.info(`Connection limits: API=${connections.maxApiConnections}, Browser=${connections.maxBrowserConnections}`);

module.exports = config; 