/**
 * Default configuration for Tanuki MCP Server
 */
module.exports = {
  // WordPress Site Configuration
  wordpress: {
    siteUrl: process.env.WP_SITE_URL || 'https://example.com',
    username: process.env.WP_USERNAME || '',
    appPassword: process.env.WP_APP_PASSWORD || '',
    mainPassword: process.env.WP_MAIN_PASSWORD || '',
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
  
  // API Authentication Configuration
  auth: {
    requireApiKey: process.env.REQUIRE_API_KEY === 'true',
    apiKeyCacheTtl: parseInt(process.env.API_KEY_CACHE_TTL || '300000', 10), // 5 minutes in ms
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute in ms
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10), // 60 requests per minute
  },
  
  // OpenAI API Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: process.env.OPENAI_MODEL || 'gpt-4.1',
    advancedModel: process.env.OPENAI_ADVANCED_MODEL || 'gpt-4.1',
    basicModel: process.env.OPENAI_BASIC_MODEL || 'gpt-4.1-mini',
    nanoModel: process.env.OPENAI_NANO_MODEL || 'gpt-4.1-nano',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxContextTokens: parseInt(process.env.OPENAI_MAX_CONTEXT_TOKENS || '128000', 10),
  },
  
  // Resource Tracking Configuration
  resourceTracking: {
    enabled: process.env.RESOURCE_TRACKING_ENABLED !== 'false',
    saveIntervalMs: parseInt(process.env.RESOURCE_SAVE_INTERVAL_MS || '300000', 10), // 5 minutes in ms
    samplingIntervalMs: parseInt(process.env.RESOURCE_SAMPLING_INTERVAL_MS || '1000', 10), // 1 second in ms
    maxOperations: parseInt(process.env.RESOURCE_MAX_OPERATIONS || '1000', 10), // Max operations to track
    thresholds: {
      cpu: parseInt(process.env.RESOURCE_THRESHOLD_CPU || '80', 10), // CPU usage percentage
      memory: parseInt(process.env.RESOURCE_THRESHOLD_MEMORY || '80', 10), // Memory usage percentage
      responseTime: parseInt(process.env.RESOURCE_THRESHOLD_RESPONSE_TIME || '1000', 10), // Response time in ms
      operationTime: parseInt(process.env.RESOURCE_THRESHOLD_OPERATION_TIME || '10000', 10) // Operation time in ms
    }
  },
  
  // Subscription Plans
  plans: {
    shapeshiftBasic: {
      name: 'Shapeshift Basic',
      monthlyPrice: 0,
      monthlyOperations: 100,
      concurrentJobs: 1,
      dataRetentionDays: 7
    },
    tricksterPro: {
      name: 'Trickster Pro',
      monthlyPrice: 29,
      monthlyOperations: 2000,
      concurrentJobs: 2,
      dataRetentionDays: 30
    },
    yokaiMaster: {
      name: 'Yokai Master',
      monthlyPrice: 99,
      monthlyOperations: 10000,
      concurrentJobs: 5,
      dataRetentionDays: 90
    },
    legendaryTanuki: {
      name: 'Legendary Tanuki',
      monthlyPrice: null, // Custom pricing
      monthlyOperations: null, // Custom limit
      concurrentJobs: null, // Custom limit
      dataRetentionDays: null // Custom retention
    }
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'console'
  },
  
  // Analytics Configuration
  analytics: {
    trackTokenUsage: true,
    saveIntervalMs: parseInt(process.env.ANALYTICS_SAVE_INTERVAL_MS || '300000', 10), // 5 minutes in ms
    detailedLogging: process.env.ANALYTICS_DETAILED_LOGGING === 'true',
  }
}; 