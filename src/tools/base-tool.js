/**
 * Base Tool Class
 * Foundation for all WordPress tools
 */
const logger = require('../utils/logger');
const connectionManager = require('../api/connection-manager');
const contextMiddleware = require('../utils/context-middleware');
const resourceTracker = require('../utils/resource-tracker');
const { 
  createSuccessResponse, 
  createErrorResponse, 
  validateParameters,
  withErrorHandling
} = require('../utils/response-formatter');
const { validateContextSchema } = require('../utils/context-schema');

class BaseTool {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.logger = logger;
    this._apiClient = null;
    this._browserClient = null;
    this._methods = new Map();
    this._setupStandardMethods();
  }
  
  /**
   * Set up standard methods with consistent naming and behavior
   * @private
   */
  _setupStandardMethods() {
    // Register standard method patterns for common operations
    // Tools should extend these with specific implementations
    this.registerMethod('get', this._notImplemented.bind(this, 'get'));
    this.registerMethod('list', this._notImplemented.bind(this, 'list'));
    this.registerMethod('create', this._notImplemented.bind(this, 'create'));
    this.registerMethod('update', this._notImplemented.bind(this, 'update'));
    this.registerMethod('delete', this._notImplemented.bind(this, 'delete'));
    this.registerMethod('validate', this._notImplemented.bind(this, 'validate'));
  }
  
  /**
   * Get WordPress API client (connection pooled)
   * @param {Object} options - Optional configuration
   * @returns {WordPressAPI} - WordPress API client
   */
  getApiClient(options = {}) {
    // Using connection manager to get a pooled client
    this._apiClient = connectionManager.getApiClient(options);
    
    // Wrap API methods to track resource usage
    if (this._apiClient && !this._apiClient._resourceTrackingEnabled) {
      this._wrapApiClientMethods(this._apiClient);
      this._apiClient._resourceTrackingEnabled = true;
    }
    
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
   * Standardized entry point for all tools
   * 
   * @param {Object} params - Tool parameters
   * @param {Object} [context] - Optional execution context 
   * @returns {Promise<Object>} - Tool execution result
   */
  async execute(params, context = {}) {
    // Start tracking resources for this operation
    const operationId = resourceTracker.startTracking(
      null, // Auto-generate ID
      this.name,
      params,
      context.userId || 'anonymous'
    );
    
    // Validate parameters against schema
    const validation = this.validateParams(params);
    if (!validation.valid) {
      // Stop tracking with failure
      resourceTracker.stopTracking(operationId, false, 'Invalid parameters');
      
      return createErrorResponse(
        'INVALID_PARAMETERS', 
        validation.message,
        { missing: validation.missing, invalid: validation.invalid }
      );
    }
    
    // Validate context against schema
    const contextValidation = validateContextSchema(context);
    if (!contextValidation.valid) {
      resourceTracker.stopTracking(operationId, false, 'Invalid context');
      return createErrorResponse(
        'INVALID_CONTEXT',
        contextValidation.message,
        { missing: contextValidation.missing, invalid: contextValidation.invalid }
      );
    }
    
    try {
      // Enhance context with master doc if needed
      const enhancedContext = await this.useContext(params, context);
      // Validate enhanced context as well
      const enhancedContextValidation = validateContextSchema(enhancedContext);
      if (!enhancedContextValidation.valid) {
        resourceTracker.stopTracking(operationId, false, 'Invalid enhanced context');
        return createErrorResponse(
          'INVALID_CONTEXT',
          enhancedContextValidation.message,
          { missing: enhancedContextValidation.missing, invalid: enhancedContextValidation.invalid }
        );
      }
      
      // Execute the tool implementation
      const result = await this._execute(params, enhancedContext);
      
      // Release connections
      await this.releaseConnections();
      
      // Stop tracking with success
      const trackingResult = resourceTracker.stopTracking(
        operationId, 
        !result.error, 
        result.error ? `Error: ${result.error}` : 'Success'
      );
      
      // Add resource usage data to result metadata
      if (result.metadata) {
        result.metadata.resourceUsage = trackingResult;
      } else if (result.data && !result.error) {
        if (!result.metadata) {
          result.metadata = {};
        }
        result.metadata.resourceUsage = trackingResult;
      }
      
      return result;
    } catch (error) {
      // Stop tracking with failure
      resourceTracker.stopTracking(operationId, false, `Exception: ${error.message}`);
      
      // Log and handle errors
      return this.handleError(error, 'execute');
    }
  }
  
  /**
   * Tool implementation method to be overridden by subclasses
   * 
   * @param {Object} params - Tool parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Tool execution result
   * @protected
   */
  async _execute(params, context) {
    throw new Error('Method not implemented: Each tool must implement its own _execute method');
  }
  
  /**
   * Get tool metadata for MCP
   * 
   * @returns {Object} - Tool metadata
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
   * 
   * @returns {Object} - Tool schema
   */
  getSchema() {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties: {
            context: {
              type: "object",
              description: "Standardized execution context (site, user, master_doc, etc.). See context-schema.js for details.",
              required: true
            }
          },
          required: ["context"]
        }
      }
    };
  }
  
  /**
   * Handle and log errors
   * 
   * @param {Error} error - The error to handle
   * @param {string} methodName - The name of the method where the error occurred
   * @returns {Object} - Standardized error response
   */
  handleError(error, methodName) {
    const errorMessage = error.message || 'Unknown error';
    this.logger.error(`Error in ${this.name}.${methodName || 'execute'}: ${errorMessage}`, {
      stack: error.stack,
      toolName: this.name
    });
    
    return createErrorResponse(
      'TOOL_EXECUTION_ERROR',
      errorMessage,
      { 
        toolName: this.name,
        methodName: methodName
      },
      error
    );
  }

  /**
   * Register a method for the tool
   * 
   * @param {string} name - Method name
   * @param {Function} handler - Method handler function
   * @param {boolean} [withErrorWrapper=true] - Whether to wrap with error handling
   */
  registerMethod(name, handler, withErrorWrapper = true) {
    // Store the method with standardized error handling
    if (withErrorWrapper) {
      this._methods.set(name, withErrorHandling(handler, name, this.name));
    } else {
      this._methods.set(name, handler);
    }
    
    // Also expose the method directly on the tool instance
    if (!this[name]) {
      this[name] = (...args) => this.callMethod(name, ...args);
    }
  }
  
  /**
   * Call a registered method
   * 
   * @param {string} methodName - The name of the method to call
   * @param {...any} args - Arguments to pass to the method
   * @returns {Promise<any>} - Method result
   */
  async callMethod(methodName, ...args) {
    const method = this._methods.get(methodName);
    if (!method) {
      return createErrorResponse(
        'UNSUPPORTED_OPERATION',
        `Method not implemented: ${methodName}`,
        { toolName: this.name }
      );
    }
    
    return method.apply(this, args);
  }
  
  /**
   * Default placeholder for not implemented methods
   * 
   * @param {string} methodName - The name of the method
   * @returns {Promise<Object>} - Error response
   * @private
   */
  async _notImplemented(methodName) {
    return createErrorResponse(
      'UNSUPPORTED_OPERATION',
      `Method not implemented: ${methodName}`,
      { toolName: this.name }
    );
  }

  /**
   * Ensure context for tool methods
   * This middleware ensures the master design doc is available in the context
   * 
   * @param {Object} args - Tool arguments
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Enhanced context with master doc
   */
  async useContext(args, context) {
    try {
      const enhancedContext = await contextMiddleware.ensureContext(args, context);
      // Validate enhanced context
      const contextValidation = validateContextSchema(enhancedContext);
      if (!contextValidation.valid) {
        this.logger.error(`Invalid context in useContext for ${this.name}`, {
          missing: contextValidation.missing,
          invalid: contextValidation.invalid
        });
        return context || {};
      }
      return enhancedContext;
    } catch (error) {
      this.logger.error(`Error ensuring context in ${this.name}`, {
        error: error.message,
        stack: error.stack
      });
      return context || {};
    }
  }

  /**
   * Update context with modified master doc
   * 
   * @param {Object} updatedDoc - The updated master design doc
   * @param {Object} args - Tool arguments
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Update result
   */
  async updateContext(updatedDoc, args, context) {
    try {
      return await contextMiddleware.updateContext(updatedDoc, args, context);
    } catch (error) {
      this.logger.error(`Error updating context in ${this.name}`, {
        error: error.message,
        stack: error.stack
      });
      
      return createErrorResponse(
        'CONTEXT_SYNC_ERROR',
        `Failed to update context: ${error.message}`,
        { toolName: this.name },
        error
      );
    }
  }
  
  /**
   * Validate parameters against the tool's schema
   * 
   * @param {Object} params - The parameters to validate
   * @returns {Object} - Validation result {valid, missing, invalid, message}
   */
  validateParams(params) {
    const schema = this.getSchema().function.parameters;
    return validateParameters(params, schema);
  }
  
  /**
   * Create a standardized success response
   * 
   * @param {*} data - The data to include in the response
   * @param {string} message - Success message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Formatted success response
   */
  createSuccessResponse(data, message, metadata) {
    return createSuccessResponse(data, message, metadata);
  }
  
  /**
   * Create a standardized error response
   * 
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {Object} - Formatted error response
   */
  createErrorResponse(code, message, details) {
    return createErrorResponse(code, message, details);
  }

  /**
   * Wrap API client methods to track resource usage
   * @param {WordPressAPI} apiClient - API client to wrap
   * @private
   */
  _wrapApiClientMethods(apiClient) {
    // Skip if already wrapped
    if (apiClient._resourceTrackingEnabled) return;
    
    // Get all methods to wrap
    const methodsToWrap = [
      'get', 'post', 'put', 'delete', 'request',
      'getPost', 'getPosts', 'createPost', 'updatePost', 'deletePost',
      'getPage', 'getPages', 'createPage', 'updatePage', 'deletePage',
      'getMedia', 'createMedia', 'updateMedia', 'deleteMedia',
      'getUser', 'getUsers', 'getCurrentUser',
      'getCategories', 'getTags', 'getComments'
    ];
    
    // Wrap each method
    methodsToWrap.forEach(methodName => {
      if (typeof apiClient[methodName] === 'function') {
        const originalMethod = apiClient[methodName];
        
        apiClient[methodName] = async (...args) => {
          // Get current operation ID from async local storage or similar
          // For simplicity, we'll extract from the last parameter if it's an object
          let operationId = null;
          if (args.length > 0 && typeof args[args.length - 1] === 'object') {
            operationId = args[args.length - 1]._resourceOperationId;
          }
          
          // Determine endpoint from method and args
          let endpoint = methodName;
          let method = 'GET';
          
          if (methodName === 'request' && args.length > 0) {
            endpoint = args[0].path || args[0].endpoint || methodName;
            method = args[0].method || 'GET';
          } else if (methodName.startsWith('get')) {
            method = 'GET';
          } else if (methodName.startsWith('create')) {
            method = 'POST';
          } else if (methodName.startsWith('update')) {
            method = 'PUT';
          } else if (methodName.startsWith('delete')) {
            method = 'DELETE';
          }
          
          // Don't track if no operation ID
          if (!operationId) {
            return originalMethod.apply(apiClient, args);
          }
          
          // Track API call
          const apiCallId = resourceTracker.trackApiCall(
            operationId,
            endpoint,
            method,
            args.length > 0 ? args[0] : {}
          );
          
          try {
            // Call original method
            const result = await originalMethod.apply(apiClient, args);
            
            // Complete API call tracking
            resourceTracker.completeApiCall(
              operationId,
              apiCallId,
              true,
              result?.status || 200
            );
            
            return result;
          } catch (error) {
            // Complete API call tracking with error
            resourceTracker.completeApiCall(
              operationId,
              apiCallId,
              false,
              error?.response?.status || 500,
              error.message
            );
            
            throw error;
          }
        };
      }
    });
  }
}

/**
 * StepwiseExecutionMixin
 * Provides reusable stepwise execution logic for tools that perform multi-step tasks.
 */
const EventEmitter = require('events');
class StepwiseExecutionMixin extends EventEmitter {
  constructor() {
    super();
    this._steps = [];
    this._currentStep = 0;
    this._stepContext = {};
    this._stepProgress = [];
    this._stepwiseSessionId = null;
  }

  /**
   * Initialize stepwise execution
   * @param {Array} steps - List of step descriptors
   * @param {Object} context - Initial context
   * @param {string} [sessionId] - Optional session ID
   */
  initStepwiseExecution(steps, context = {}, sessionId = null) {
    this._steps = steps;
    this._currentStep = 0;
    this._stepContext = { ...context };
    this._stepProgress = [];
    this._stepwiseSessionId = sessionId || Date.now().toString();
    this.emit('stepwise:init', { sessionId: this._stepwiseSessionId, steps });
  }

  /**
   * Execute all steps sequentially
   * @param {Function} stepExecutor - Function(step, context, stepIndex) => Promise<stepResult>
   * @returns {Promise<Object>} Final context/result
   */
  async executeSteps(stepExecutor) {
    for (let i = this._currentStep; i < this._steps.length; i++) {
      const step = this._steps[i];
      this.emit('stepwise:progress', { sessionId: this._stepwiseSessionId, stepIndex: i, step, context: this._stepContext });
      try {
        const result = await stepExecutor(step, this._stepContext, i);
        this._stepProgress.push({ step, result });
        if (result && result.context) {
          this._stepContext = { ...this._stepContext, ...result.context };
        }
        if (result && result.error) {
          this.emit('stepwise:error', { sessionId: this._stepwiseSessionId, stepIndex: i, error: result.error });
          break;
        }
      } catch (error) {
        this._stepProgress.push({ step, error: error.message });
        this.emit('stepwise:error', { sessionId: this._stepwiseSessionId, stepIndex: i, error: error.message });
        break;
      }
      this._currentStep = i + 1;
    }
    this.emit('stepwise:complete', { sessionId: this._stepwiseSessionId, progress: this._stepProgress, context: this._stepContext });
    return { context: this._stepContext, progress: this._stepProgress };
  }

  /**
   * Get current stepwise progress
   */
  getStepwiseProgress() {
    return {
      sessionId: this._stepwiseSessionId,
      currentStep: this._currentStep,
      steps: this._steps,
      progress: this._stepProgress,
      context: this._stepContext
    };
  }

  /**
   * Clean up stepwise session
   */
  cleanupStepwiseSession() {
    this._steps = [];
    this._currentStep = 0;
    this._stepContext = {};
    this._stepProgress = [];
    this._stepwiseSessionId = null;
    this.emit('stepwise:cleanup');
  }
}

module.exports = { BaseTool, StepwiseExecutionMixin }; 