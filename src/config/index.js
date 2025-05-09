/**
 * Configuration loader for WordPress MCP Server
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

// Log connection limits for Smithery compatibility
console.info(`Connection limits: API=${connections.maxApiConnections}, Browser=${connections.maxBrowserConnections}`);
if (connections.maxApiConnections > 3 || connections.maxBrowserConnections > 1) {
  console.warn('WARNING: Connection limits may be too high for Smithery. Consider reducing MAX_API_CONNECTIONS and MAX_BROWSER_CONNECTIONS in .env');
}

module.exports = config; 