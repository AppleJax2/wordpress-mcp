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
const { wordpress } = config;
if (!wordpress.siteUrl) {
  console.warn('WARNING: WordPress site URL is not configured');
}

if (!wordpress.username || !wordpress.appPassword) {
  console.warn('WARNING: WordPress credentials are not configured');
}

module.exports = config; 