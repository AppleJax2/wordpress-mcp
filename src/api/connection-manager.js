/**
 * Connection Manager
 * Singleton pattern for managing WordPress API and Browser connections
 * Prevents "max client connections reached" errors with Smithery and other services
 */
const WordPressAPI = require('./wordpress');
const WordPressBrowser = require('../browser/browser');
const logger = require('../utils/logger');
const config = require('../config');

class ConnectionManager {
  constructor() {
    this._apiClients = {};
    this._browserClients = {};
    this._activeConnections = {
      api: 0,
      browser: 0
    };
    
    // Connection pool settings from config
    this.maxPoolSize = {
      api: config.connections.maxApiConnections,      // From config
      browser: config.connections.maxBrowserConnections   // From config
    };
    
    // Add shared client for simple operations
    this._sharedApiClient = null;
    
    // Add timestamps for LRU (Least Recently Used) eviction
    this._apiClientTimestamps = {};
    this._browserClientTimestamps = {};
    
    this._apiRequestQueue = [];
    this._browserRequestQueue = [];
    this._apiActiveRequests = 0;
    this._browserActiveRequests = 0;
    this.maxConcurrentApiRequests = config.connections?.maxConcurrentApiRequests || 3;
    this.maxConcurrentBrowserRequests = config.connections?.maxConcurrentBrowserRequests || 1;
    
    logger.info('Connection manager initialized', {
      maxApiConnections: this.maxPoolSize.api,
      maxBrowserConnections: this.maxPoolSize.browser
    });
  }
  
  /**
   * Get WordPress API client
   * @param {Object} options - API client options (optional)
   * @returns {WordPressAPI} - API client instance
   */
  getApiClient(options = {}) {
    // For basic requests with no special options, use the shared client
    if (Object.keys(options).length === 0 && this._sharedApiClient) {
      logger.debug('Using shared API client');
      return this._sharedApiClient;
    }
    
    // Use options as a key for caching
    const key = JSON.stringify(options) || 'default';
    
    // Return existing client if available and update timestamp
    if (this._apiClients[key]) {
      logger.debug('Reusing existing API client', { key });
      this._apiClientTimestamps[key] = Date.now();
      return this._apiClients[key];
    }
    
    // Check if we've reached connection limit
    if (Object.keys(this._apiClients).length >= this.maxPoolSize.api) {
      logger.warn(`API client pool limit reached (${this.maxPoolSize.api}), replacing least recently used client`);
      
      // Find the least recently used client
      const timestamps = this._apiClientTimestamps;
      const oldestKey = Object.keys(timestamps).reduce((a, b) => timestamps[a] < timestamps[b] ? a : b);
      
      // Remove the oldest client
      logger.debug(`Removing least recently used API client: ${oldestKey}`);
      delete this._apiClients[oldestKey];
      delete this._apiClientTimestamps[oldestKey];
      this._activeConnections.api--;
    }
    
    // Create new client
    logger.info('Creating new WordPress API client', { key });
    this._apiClients[key] = new WordPressAPI(options);
    this._apiClientTimestamps[key] = Date.now();
    this._activeConnections.api++;
    
    // If this is the first client, also use it as the shared client
    if (!this._sharedApiClient && key === 'default') {
      this._sharedApiClient = this._apiClients[key];
    }
    
    return this._apiClients[key];
  }
  
  /**
   * Get WordPress Browser instance
   * @param {Object} options - Browser options (optional)
   * @returns {WordPressBrowser} - Browser instance
   */
  getBrowserClient(options = {}) {
    // Use options as a key for caching
    const key = JSON.stringify(options) || 'default';
    
    // Return existing browser if available and update timestamp
    if (this._browserClients[key]) {
      logger.debug('Reusing existing browser client', { key });
      this._browserClientTimestamps[key] = Date.now();
      return this._browserClients[key];
    }
    
    // Check if we've reached connection limit
    if (Object.keys(this._browserClients).length >= this.maxPoolSize.browser) {
      logger.warn(`Browser client pool limit reached (${this.maxPoolSize.browser}), replacing least recently used client`);
      
      // Find the least recently used browser client to replace
      const timestamps = this._browserClientTimestamps;
      if (Object.keys(timestamps).length > 0) {
        const oldestKey = Object.keys(timestamps).reduce((a, b) => timestamps[a] < timestamps[b] ? a : b);
        
        // Close and remove the oldest browser
        logger.debug(`Closing least recently used browser client: ${oldestKey}`);
        const oldBrowser = this._browserClients[oldestKey];
        if (oldBrowser) {
          try {
            oldBrowser.close().catch(err => logger.error(`Error closing browser: ${err.message}`));
          } catch (error) {
            logger.error(`Error closing browser: ${error.message}`);
          }
        }
        
        delete this._browserClients[oldestKey];
        delete this._browserClientTimestamps[oldestKey];
        this._activeConnections.browser--;
      }
    }
    
    // Create new browser
    logger.info('Creating new WordPress Browser client', { key });
    this._browserClients[key] = new WordPressBrowser(options);
    this._browserClientTimestamps[key] = Date.now();
    this._activeConnections.browser++;
    
    return this._browserClients[key];
  }
  
  /**
   * Release a browser client by closing it
   * @param {string} key - Client key
   */
  async releaseBrowserClient(key = 'default') {
    if (this._browserClients[key]) {
      try {
        logger.info('Closing browser client', { key });
        await this._browserClients[key].close();
        delete this._browserClients[key];
        this._activeConnections.browser--;
      } catch (error) {
        logger.error('Error closing browser client', { error: error.message, key });
      }
    }
  }
  
  /**
   * Release an API client (actually just removes from cache)
   * @param {string} key - Client key
   */
  releaseApiClient(key = 'default') {
    if (this._apiClients[key]) {
      logger.info('Releasing API client', { key });
      delete this._apiClients[key];
      this._activeConnections.api--;
    }
  }
  
  /**
   * Close all browser connections
   */
  async closeAllBrowsers() {
    logger.info('Closing all browser connections');
    
    for (const key in this._browserClients) {
      try {
        await this._browserClients[key].close();
        delete this._browserClients[key];
      } catch (error) {
        logger.error('Error closing browser', { error: error.message, key });
      }
    }
    
    this._activeConnections.browser = 0;
  }
  
  /**
   * Get connection stats
   */
  getStats() {
    return {
      activeApiConnections: Object.keys(this._apiClients).length,
      activeBrowserConnections: Object.keys(this._browserClients).length,
      maxApiConnections: this.maxPoolSize.api,
      maxBrowserConnections: this.maxPoolSize.browser,
      hasSharedApiClient: !!this._sharedApiClient,
      apiClientKeys: Object.keys(this._apiClients),
      browserClientKeys: Object.keys(this._browserClients)
    };
  }
  
  /**
   * Periodic cleanup of idle connections
   * Call this method periodically to close connections that haven't been used recently
   */
  async cleanupIdleConnections(maxIdleTimeMs = 5 * 60 * 1000) { // 5 minutes by default
    const now = Date.now();
    let closedCount = 0;
    
    // First clean up API clients (except shared client)
    for (const key of Object.keys(this._apiClientTimestamps)) {
      // Skip the shared client
      if (this._apiClients[key] === this._sharedApiClient) continue;
      
      if (now - this._apiClientTimestamps[key] > maxIdleTimeMs) {
        logger.info(`Cleaning up idle API client: ${key}`);
        delete this._apiClients[key];
        delete this._apiClientTimestamps[key];
        this._activeConnections.api--;
        closedCount++;
      }
    }
    
    // Then clean up browser clients
    for (const key of Object.keys(this._browserClientTimestamps)) {
      if (now - this._browserClientTimestamps[key] > maxIdleTimeMs) {
        logger.info(`Cleaning up idle browser client: ${key}`);
        
        // Close the browser
        try {
          await this._browserClients[key].close();
        } catch (error) {
          logger.error(`Error closing browser during cleanup: ${error.message}`);
        }
        
        delete this._browserClients[key];
        delete this._browserClientTimestamps[key];
        this._activeConnections.browser--;
        closedCount++;
      }
    }
    
    if (closedCount > 0) {
      logger.info(`Cleaned up ${closedCount} idle connections`);
    }
    
    return closedCount;
  }

  /**
   * Batch API requests with concurrency control
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>}
   */
  async batchApiRequest(fn) {
    return new Promise((resolve, reject) => {
      this._apiRequestQueue.push({ fn, resolve, reject });
      this._processApiQueue();
    });
  }

  async _processApiQueue() {
    if (this._apiActiveRequests >= this.maxConcurrentApiRequests) return;
    const next = this._apiRequestQueue.shift();
    if (!next) return;
    this._apiActiveRequests++;
    next.fn()
      .then(result => next.resolve(result))
      .catch(err => next.reject(err))
      .finally(() => {
        this._apiActiveRequests--;
        this._processApiQueue();
      });
  }

  /**
   * Batch browser requests with concurrency control
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>}
   */
  async batchBrowserRequest(fn) {
    return new Promise((resolve, reject) => {
      this._browserRequestQueue.push({ fn, resolve, reject });
      this._processBrowserQueue();
    });
  }

  async _processBrowserQueue() {
    if (this._browserActiveRequests >= this.maxConcurrentBrowserRequests) return;
    const next = this._browserRequestQueue.shift();
    if (!next) return;
    this._browserActiveRequests++;
    next.fn()
      .then(result => next.resolve(result))
      .catch(err => next.reject(err))
      .finally(() => {
        this._browserActiveRequests--;
        this._processBrowserQueue();
      });
  }
}

// Create singleton instance
const connectionManager = new ConnectionManager();

// Export the singleton
module.exports = connectionManager;