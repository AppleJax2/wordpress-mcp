/**
 * Response Formatter Utility
 * 
 * Provides standardized methods for formatting success and error responses
 * across all MCP tools. This ensures consistency in response format, error
 * handling, and documentation.
 * 
 * @module utils/response-formatter
 */

const logger = require('./logger');

/**
 * Standard error codes with descriptions
 * Used for consistent error reporting across tools
 * 
 * @type {Object}
 */
const ERROR_CODES = {
  // General errors
  INVALID_PARAMETERS: 'Invalid or missing parameters',
  UNAUTHORIZED: 'Unauthorized access or insufficient permissions',
  NOT_FOUND: 'Resource not found',
  SYSTEM_ERROR: 'Internal system error',
  
  // WordPress specific errors
  WP_API_ERROR: 'WordPress API error',
  WP_CONNECTION_ERROR: 'Failed to connect to WordPress site',
  WP_AUTHENTICATION_ERROR: 'WordPress authentication error',
  
  // Context and document errors
  INVALID_CONTEXT: 'Invalid or corrupt context',
  CONTEXT_SYNC_ERROR: 'Context synchronization error',
  DOCUMENT_NOT_FOUND: 'Design document not found',
  VERSION_CONFLICT: 'Document version conflict',
  
  // Tool-specific errors
  TOOL_EXECUTION_ERROR: 'Error during tool execution',
  INVALID_TOOL_STATE: 'Invalid tool state',
  UNSUPPORTED_OPERATION: 'Unsupported operation',
  
  // Browser automation errors
  BROWSER_ERROR: 'Browser automation error',
  SCREENSHOT_ERROR: 'Failed to generate screenshot',
  
  // Rate limiting and throttling
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  QUOTA_EXCEEDED: 'Resource quota exceeded'
};

/**
 * Creates a standardized success response
 * 
 * @param {*} data - The data to include in the response
 * @param {string} message - Success message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Formatted success response
 */
function createSuccessResponse(data, message = 'Operation completed successfully', metadata = {}) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  };
}

/**
 * Creates a standardized error response
 * 
 * @param {string} code - Error code (preferably from ERROR_CODES)
 * @param {string} message - Detailed error message
 * @param {Object} details - Additional error details
 * @param {Error} [originalError] - Original error object for logging
 * @returns {Object} - Formatted error response
 */
function createErrorResponse(code, message, details = {}, originalError = null) {
  // Get standard error message if only code provided
  const errorMessage = message || ERROR_CODES[code] || 'Unknown error';
  
  // Log the error with original stack trace if available
  if (originalError) {
    logger.error(`${code}: ${errorMessage}`, {
      code,
      details,
      stack: originalError.stack
    });
  }
  
  return {
    success: false,
    error: {
      code,
      message: errorMessage,
      details
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Validates required parameters against a schema
 * 
 * @param {Object} params - The parameters to validate
 * @param {Object} schema - Schema defining required parameters and types
 * @returns {Object} - Validation result {valid, missing, invalid}
 */
function validateParameters(params, schema) {
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      missing: [],
      invalid: ['params'],
      message: 'Parameters must be an object'
    };
  }
  
  if (!schema || !schema.properties) {
    return {
      valid: true,
      missing: [],
      invalid: []
    };
  }
  
  const missing = [];
  const invalid = [];
  
  // Check required parameters
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredParam of schema.required) {
      if (params[requiredParam] === undefined) {
        missing.push(requiredParam);
      }
    }
  }
  
  // Validate parameter types
  for (const [paramName, paramValue] of Object.entries(params)) {
    const paramSchema = schema.properties[paramName];
    
    if (!paramSchema) {
      // Skip validation for parameters not in schema
      continue;
    }
    
    if (paramSchema.type) {
      let isValid = true;
      
      switch (paramSchema.type) {
        case 'string':
          isValid = typeof paramValue === 'string';
          break;
        case 'number':
        case 'integer':
          isValid = typeof paramValue === 'number';
          break;
        case 'boolean':
          isValid = typeof paramValue === 'boolean';
          break;
        case 'array':
          isValid = Array.isArray(paramValue);
          break;
        case 'object':
          isValid = paramValue !== null && typeof paramValue === 'object' && !Array.isArray(paramValue);
          break;
      }
      
      if (!isValid) {
        invalid.push(paramName);
      }
    }
    
    // Validate enum if specified
    if (paramSchema.enum && Array.isArray(paramSchema.enum) && !paramSchema.enum.includes(paramValue)) {
      invalid.push(paramName);
    }
  }
  
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    message: missing.length > 0 
      ? `Missing required parameters: ${missing.join(', ')}` 
      : invalid.length > 0 
        ? `Invalid parameter types: ${invalid.join(', ')}` 
        : ''
  };
}

/**
 * Wraps a tool method with standard error handling
 * 
 * @param {Function} method - The tool method to wrap
 * @param {string} methodName - Name of the method for logging
 * @param {string} toolName - Name of the tool for logging
 * @returns {Function} - Wrapped method with error handling
 */
function withErrorHandling(method, methodName, toolName) {
  return async function(...args) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      logger.error(`Error in ${toolName}.${methodName}`, {
        error: error.message,
        stack: error.stack
      });
      
      return createErrorResponse(
        'TOOL_EXECUTION_ERROR',
        `Error executing ${methodName}: ${error.message}`,
        { toolName, methodName },
        error
      );
    }
  };
}

module.exports = {
  ERROR_CODES,
  createSuccessResponse,
  createErrorResponse,
  validateParameters,
  withErrorHandling
}; 