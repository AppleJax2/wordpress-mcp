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
    port: process.env.PORT || 3000,
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
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'console'
  }
}; 