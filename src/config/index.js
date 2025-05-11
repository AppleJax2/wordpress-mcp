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
};

// Validate required configuration
const { wordpress, connections } = config;
if (!wordpress.siteUrl) {
  console.warn('WARNING: WordPress site URL is not configured');
}

if (!wordpress.username || !wordpress.appPassword) {
  console.warn('WARNING: WordPress credentials are not configured');
}

// Log API authentication status
if (config.auth.requireApiKey) {
  console.info('API Key authentication is ENABLED');
} else {
  console.warn('WARNING: API Key authentication is DISABLED. Enable it in production with REQUIRE_API_KEY=true');
}

// Log connection limits
console.info(`Connection limits: API=${connections.maxApiConnections}, Browser=${connections.maxBrowserConnections}`);

module.exports = config; 