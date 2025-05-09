/**
 * Base Tool Class
 * Foundation for all WordPress tools
 */
const logger = require('../utils/logger');

class BaseTool {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.logger = logger;
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