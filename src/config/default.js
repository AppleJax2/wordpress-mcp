/**
 * Default configuration for WordPress MCP Server
 */
module.exports = {
  // WordPress Site Configuration
  wordpress: {
    siteUrl: process.env.WP_SITE_URL || 'https://example.com',
    username: process.env.WP_USERNAME || '',
    appPassword: process.env.WP_APP_PASSWORD || '',
    adminPath: '/wp-admin'
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    environment: process.env.NODE_ENV || 'development',
  },
  
  // Browser Automation Configuration
  browser: {
    headless: process.env.HEADLESS === 'true',
    slowMo: parseInt(process.env.SLOWMO || '0', 10),
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  },
  
  // Connection Configuration
  connections: {
    maxApiConnections: parseInt(process.env.MAX_API_CONNECTIONS || '3', 10),
    maxBrowserConnections: parseInt(process.env.MAX_BROWSER_CONNECTIONS || '1', 10),
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '10000', 10),
    cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '120000', 10) // 2 minutes default
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'console'
  }
}; 