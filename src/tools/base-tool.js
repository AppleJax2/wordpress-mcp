/**
 * Base Tool Class
 * Foundation for all WordPress tools
 */
const logger = require('../utils/logger');
const connectionManager = require('../api/connection-manager');

class BaseTool {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.logger = logger;
    this._apiClient = null;
    this._browserClient = null;
  }
  
  /**
   * Get WordPress API client (connection pooled)
   * @param {Object} options - Optional configuration
   * @returns {WordPressAPI} - WordPress API client
   */
  getApiClient(options = {}) {
    // Using connection manager to get a pooled client
    this._apiClient = connectionManager.getApiClient(options);
    return this._apiClient;
  }
  
  /**
   * Get WordPress Browser client (connection pooled)
   * @param {Object} options - Optional configuration
   * @returns {WordPressBrowser} - WordPress Browser client
   */
  getBrowserClient(options = {}) {
    // Using connection manager to get a pooled client
    this._browserClient = connectionManager.getBrowserClient(options);
    return this._browserClient;
  }
  
  /**
   * Release connections after tool execution
   * Should be called at the end of execute() methods
   */
  async releaseConnections() {
    // If we got a browser, release it back to the pool
    if (this._browserClient) {
      // Instead of actually closing, we just flag it as available for reuse
      this.logger.debug(`Releasing browser connection for tool: ${this.name}`);
      // No need to close browser, it will be reused or cleaned up by connection manager
      this._browserClient = null;
    }
    
    // API clients don't need explicit closing as they're stateless HTTP clients
    // But we should clear the reference to indicate it's no longer in use by this tool
    this._apiClient = null;
  }
  
  /**
   * Execute the tool
   * Should be implemented by subclasses
   */
  async execute(params) {
    throw new Error('Method not implemented: Each tool must implement its own execute method');
  }
  
  /**
   * Get tool metadata for MCP
   */
  getMetadata() {
    return {
      name: this.name,
      description: this.description
    };
  }
  
  /**
   * Default schema implementation for MCP compatibility
   * This should be overridden by subclasses with their specific schemas
   */
  getSchema() {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    };
  }
  
  /**
   * Handle and log errors
   */
  handleError(error, methodName) {
    const errorMessage = error.message || 'Unknown error';
    this.logger.error(`Error in ${this.name}.${methodName || 'execute'}: ${errorMessage}`, {
      stack: error.stack,
      toolName: this.name
    });
    
    return {
      success: false,
      error: errorMessage,
      details: error.stack
    };
  }
}

module.exports = BaseTool; 