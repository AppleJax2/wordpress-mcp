/**
 * Context Manager Tool
 * 
 * A centralized tool for maintaining context across MCP operations.
 * Provides methods for tracking, updating, and managing context between tools.
 * 
 * @module tools/context-manager-tool
 */

const { BaseTool } = require('./base-tool');
const logger = require('../utils/logger');
const contextMiddleware = require('../utils/context-middleware');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const deepDiff = require('deep-diff');
const { validateContextSchema } = require('../utils/context-schema');

/**
 * Context Manager Tool Class
 * Manages context persistence, updating, and synchronization across tools
 */
class ContextManagerTool extends BaseTool {
  constructor() {
    super(
      'wordpress_context_manager',
      'Centralized tool for maintaining context across MCP operations'
    );
    
    // In-memory cache for context sessions
    this._contextCache = new Map();
    
    // Cache TTL in milliseconds (5 minutes default)
    this._cacheTTL = process.env.CONTEXT_CACHE_TTL || 5 * 60 * 1000;
    
    // Register API methods
    this.registerMethod('getContext', this.getContext.bind(this));
    this.registerMethod('updateContext', this.updateContext.bind(this));
    this.registerMethod('mergeContexts', this.mergeContexts.bind(this));
    this.registerMethod('trackChange', this.trackChange.bind(this));
    this.registerMethod('createContextCheckpoint', this.createContextCheckpoint.bind(this));
    this.registerMethod('rollbackToCheckpoint', this.rollbackToCheckpoint.bind(this));
    this.registerMethod('diffContexts', this.diffContexts.bind(this));
    this.registerMethod('validateContext', this.validateContext.bind(this));
    this.registerMethod('clearContextCache', this.clearContextCache.bind(this));
  }

  /**
   * Main execute method for MCP protocol compatibility
   * Delegates to specific methods based on action
   * 
   * @param {Object} params - Tool parameters
   * @param {string} params.action - Action to perform (getContext, updateContext, etc.)
   * @param {Object} [params.context] - Current context
   * @param {string} [params.section] - Specific context section to act on
   * @param {Object} [params.data] - Data for updates
   * @param {string} [params.session_id] - Session ID for context caching
   * @param {boolean} [params.validate] - Whether to validate context updates
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Method response
   */
  async execute(params, context = {}) {
    const { action } = params;
    
    try {
      // Validate required parameters
      if (!action) {
        return this._createErrorResponse('Missing required parameter: action');
      }
      
      // Log invocation
      this.logger.debug(`ContextManagerTool executing action: ${action}`, {
        params: { ...params, context: 'HIDDEN' }
      });
      
      // Get a fresh context if needed
      const enhancedContext = await this.useContext(params, context);
      
      // Delegate to appropriate method
      switch (action) {
        case 'getContext':
          return await this.getContext(params, enhancedContext);
        
        case 'updateContext':
          return await this.updateContext(params, enhancedContext);
          
        case 'mergeContexts':
          return await this.mergeContexts(params, enhancedContext);
          
        case 'trackChange':
          return await this.trackChange(params, enhancedContext);
          
        case 'createContextCheckpoint':
          return await this.createContextCheckpoint(params, enhancedContext);
          
        case 'rollbackToCheckpoint':
          return await this.rollbackToCheckpoint(params, enhancedContext);
          
        case 'diffContexts':
          return await this.diffContexts(params, enhancedContext);
          
        case 'validateContext':
          return await this.validateContext(params, enhancedContext);
          
        case 'clearContextCache':
          return await this.clearContextCache(params, enhancedContext);
          
        default:
          return this._createErrorResponse(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error, 'execute');
    } finally {
      await this.releaseConnections();
    }
  }

  /**
   * Get current context or a specific section
   * 
   * @param {Object} params - Method parameters
   * @param {string} [params.section] - Specific context section to retrieve
   * @param {string} [params.session_id] - Session ID for context caching
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Context data
   */
  async getContext(params, context = {}) {
    try {
      const { section, session_id } = params;
      
      // Check if we should use cached context
      let contextData = context;
      if (session_id) {
        const cachedContext = this._getCachedContext(session_id);
        if (cachedContext) {
          contextData = cachedContext;
        }
      }
      
      // Validate context
      const contextValidation = validateContextSchema(contextData);
      if (!contextValidation.valid) {
        return this._createErrorResponse('Invalid context', {
          missing: contextValidation.missing,
          invalid: contextValidation.invalid
        });
      }
      
      // Return specific section if requested
      if (section) {
        if (!contextData || !contextData[section]) {
          return this._createErrorResponse(`Context section not found: ${section}`);
        }
        
        return this._createSuccessResponse({
          section,
          data: contextData[section]
        });
      }
      
      // Return full context
      return this._createSuccessResponse({
        data: contextData
      });
    } catch (error) {
      return this.handleError(error, 'getContext');
    }
  }

  /**
   * Update context with new values
   * 
   * @param {Object} params - Method parameters
   * @param {string} [params.section] - Specific context section to update
   * @param {Object} params.data - Data to update
   * @param {string} [params.session_id] - Session ID for context caching
   * @param {boolean} [params.validate] - Whether to validate the update
   * @param {string} [params.source] - Source of the update (tool, user, system)
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Updated context
   */
  async updateContext(params, context = {}) {
    try {
      const { section, data, session_id, validate = true, source = 'system' } = params;
      
      if (!data) {
        return this._createErrorResponse('Missing required parameter: data');
      }
      
      // Start with current context
      let updatedContext = { ...context };
      
      // If session_id provided, check cache first
      if (session_id) {
        const cachedContext = this._getCachedContext(session_id);
        if (cachedContext) {
          updatedContext = cachedContext;
        }
      }
      
      // Update specific section or full context
      if (section) {
        // Create section if it doesn't exist
        if (!updatedContext[section]) {
          updatedContext[section] = {};
        }
        
        // Update section with deep merge
        updatedContext[section] = _.merge({}, updatedContext[section], data);
      } else {
        // Update full context with deep merge
        updatedContext = _.merge({}, updatedContext, data);
      }
      
      // Validate if requested
      if (validate) {
        const contextValidation = validateContextSchema(updatedContext);
        if (!contextValidation.valid) {
          return this._createErrorResponse('Invalid context', {
            missing: contextValidation.missing,
            invalid: contextValidation.invalid
          });
        }
      }
      
      // Track the change
      await this.trackChange({
        context: updatedContext,
        changes: [{
          section: section || 'full',
          type: 'update',
          source
        }]
      }, updatedContext);
      
      // Update cache if session_id provided
      if (session_id) {
        this._cacheContext(session_id, updatedContext);
      }
      
      // If it's a master_doc update, persist to database
      if (section === 'master_doc' || (!section && updatedContext.master_doc)) {
        if (params.user_id && params.site_id) {
          const result = await contextMiddleware.updateContext(
            section === 'master_doc' ? data : updatedContext.master_doc,
            params,
            updatedContext
          );
          
          if (!result.success) {
            return this._createErrorResponse(
              'Failed to persist master_doc update',
              result.error
            );
          }
          
          // Use the context returned from middleware
          updatedContext = result.context;
        }
      }
      
      return this._createSuccessResponse({
        message: `Context ${section ? `section ${section}` : 'full'} updated successfully`,
        context: updatedContext
      });
    } catch (error) {
      return this.handleError(error, 'updateContext');
    }
  }

  /**
   * Merge multiple contexts with conflict resolution
   * 
   * @param {Object} params - Method parameters
   * @param {Object[]} params.contexts - Contexts to merge
   * @param {string} [params.strategy] - Merge strategy (latest, selective)
   * @param {Object} [params.resolution] - Custom resolutions for conflicts
   * @param {string} [params.session_id] - Session ID for context caching
   * @param {Object} context - Base context
   * @returns {Promise<Object>} - Merged context
   */
  async mergeContexts(params, context = {}) {
    try {
      const { contexts, strategy = 'latest', resolution = {}, session_id } = params;
      
      if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
        return this._createErrorResponse('Missing or invalid contexts array');
      }
      
      // Start with base context
      let mergedContext = { ...context };
      
      // Get cached context if session_id provided
      if (session_id) {
        const cachedContext = this._getCachedContext(session_id);
        if (cachedContext) {
          mergedContext = cachedContext;
        }
      }
      
      // Track conflicts
      const conflicts = [];
      
      // Apply each context based on strategy
      if (strategy === 'latest') {
        // Simple merge with latest values taking precedence
        for (const ctx of contexts) {
          mergedContext = _.merge({}, mergedContext, ctx);
        }
      } else if (strategy === 'selective') {
        // Apply contexts but detect conflicts
        for (const ctx of contexts) {
          // Find differences
          const differences = deepDiff.diff(mergedContext, ctx) || [];
          
          for (const diff of differences) {
            const path = diff.path.join('.');
            
            // Check if we have a resolution for this path
            if (resolution[path]) {
              // Apply custom resolution
              if (resolution[path] === 'keep') {
                // Keep current value, do nothing
              } else if (resolution[path] === 'replace') {
                // Replace with new value
                _.set(mergedContext, path, _.get(ctx, path));
              } else if (resolution[path] === 'merge' && typeof _.get(mergedContext, path) === 'object') {
                // Deep merge objects
                _.set(
                  mergedContext,
                  path,
                  _.merge({}, _.get(mergedContext, path), _.get(ctx, path))
                );
              }
            } else {
              // No resolution specified, track as conflict
              conflicts.push({
                path,
                type: diff.kind,
                leftValue: _.get(mergedContext, path),
                rightValue: _.get(ctx, path)
              });
              
              // Default to latest value
              _.set(mergedContext, path, _.get(ctx, path));
            }
          }
        }
      } else {
        return this._createErrorResponse(`Invalid merge strategy: ${strategy}`);
      }
      
      // Validate merged context
      const contextValidation = validateContextSchema(mergedContext);
      if (!contextValidation.valid) {
        return this._createErrorResponse('Invalid merged context', {
          missing: contextValidation.missing,
          invalid: contextValidation.invalid
        });
      }
      
      // Cache the result if session_id provided
      if (session_id) {
        this._cacheContext(session_id, mergedContext);
      }
      
      return this._createSuccessResponse({
        message: 'Contexts merged successfully',
        context: mergedContext,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      });
    } catch (error) {
      return this.handleError(error, 'mergeContexts');
    }
  }

  /**
   * Track changes to the context
   * 
   * @param {Object} params - Method parameters
   * @param {Object} params.context - Context to track changes for
   * @param {Array} params.changes - Array of change objects
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Updated context with change history
   */
  async trackChange(params, context = {}) {
    try {
      const { changes = [] } = params;
      const contextToUpdate = params.context || context;
      
      if (!contextToUpdate) {
        return this._createErrorResponse('No context provided');
      }
      
      // Ensure change history exists
      if (!contextToUpdate._changeHistory) {
        contextToUpdate._changeHistory = [];
      }
      
      // Add changes to history
      for (const change of changes) {
        contextToUpdate._changeHistory.push({
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          section: change.section || 'unknown',
          type: change.type || 'update',
          source: change.source || 'system',
          metadata: change.metadata || {}
        });
      }
      
      // Trim history if too large (keep last 100 changes)
      if (contextToUpdate._changeHistory.length > 100) {
        contextToUpdate._changeHistory = contextToUpdate._changeHistory.slice(-100);
      }
      
      return this._createSuccessResponse({
        message: 'Change tracked successfully',
        context: contextToUpdate
      });
    } catch (error) {
      return this.handleError(error, 'trackChange');
    }
  }

  /**
   * Create a named checkpoint for potential rollback
   * 
   * @param {Object} params - Method parameters
   * @param {string} params.name - Checkpoint name
   * @param {string} [params.description] - Checkpoint description
   * @param {string} [params.session_id] - Session ID for context caching
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Updated context with checkpoint
   */
  async createContextCheckpoint(params, context = {}) {
    try {
      const { name, description, session_id } = params;
      
      if (!name) {
        return this._createErrorResponse('Missing required parameter: name');
      }
      
      // Get context to checkpoint
      let contextToCheckpoint = { ...context };
      
      // Check cache if session_id provided
      if (session_id) {
        const cachedContext = this._getCachedContext(session_id);
        if (cachedContext) {
          contextToCheckpoint = cachedContext;
        }
      }
      
      // Ensure checkpoints exist
      if (!contextToCheckpoint._checkpoints) {
        contextToCheckpoint._checkpoints = {};
      }
      
      // Create deep clone of current context as checkpoint
      contextToCheckpoint._checkpoints[name] = {
        timestamp: new Date().toISOString(),
        description: description || `Checkpoint: ${name}`,
        data: _.cloneDeep(contextToCheckpoint)
      };
      
      // Update cache if using session
      if (session_id) {
        this._cacheContext(session_id, contextToCheckpoint);
      }
      
      return this._createSuccessResponse({
        message: `Checkpoint '${name}' created successfully`,
        checkpoint: name,
        context: contextToCheckpoint
      });
    } catch (error) {
      return this.handleError(error, 'createContextCheckpoint');
    }
  }

  /**
   * Roll back to a specific checkpoint
   * 
   * @param {Object} params - Method parameters
   * @param {string} params.name - Checkpoint name to roll back to
   * @param {boolean} [params.keepCheckpoint=true] - Whether to keep the checkpoint after rollback
   * @param {string} [params.session_id] - Session ID for context caching
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Restored context from checkpoint
   */
  async rollbackToCheckpoint(params, context = {}) {
    try {
      const { name, keepCheckpoint = true, session_id } = params;
      
      if (!name) {
        return this._createErrorResponse('Missing required parameter: name');
      }
      
      // Get current context
      let currentContext = { ...context };
      
      // Check cache if session_id provided
      if (session_id) {
        const cachedContext = this._getCachedContext(session_id);
        if (cachedContext) {
          currentContext = cachedContext;
        }
      }
      
      // Check if checkpoint exists
      if (!currentContext._checkpoints || !currentContext._checkpoints[name]) {
        return this._createErrorResponse(`Checkpoint not found: ${name}`);
      }
      
      // Get checkpoint data
      const checkpoint = currentContext._checkpoints[name];
      
      // Create a new context from the checkpoint
      const restoredContext = _.cloneDeep(checkpoint.data);
      
      // Track the rollback
      await this.trackChange({
        context: restoredContext,
        changes: [{
          section: 'full',
          type: 'rollback',
          source: 'system',
          metadata: {
            checkpoint: name,
            timestamp: new Date().toISOString()
          }
        }]
      }, restoredContext);
      
      // Remove the checkpoint if not keeping it
      if (!keepCheckpoint) {
        delete restoredContext._checkpoints[name];
      }
      
      // Update cache if using session
      if (session_id) {
        this._cacheContext(session_id, restoredContext);
      }
      
      return this._createSuccessResponse({
        message: `Successfully rolled back to checkpoint '${name}'`,
        context: restoredContext
      });
    } catch (error) {
      return this.handleError(error, 'rollbackToCheckpoint');
    }
  }

  /**
   * Compare two contexts and identify differences
   * 
   * @param {Object} params - Method parameters
   * @param {Object} params.left - First context to compare
   * @param {Object} params.right - Second context to compare
   * @param {Array<string>} [params.ignorePaths] - Paths to ignore in diff
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Diff result
   */
  async diffContexts(params, context = {}) {
    try {
      const { left, right, ignorePaths = [] } = params;
      
      if (!left || !right) {
        return this._createErrorResponse('Missing required parameters: left and right contexts');
      }
      
      // Deep clone to prevent modifications
      const leftClone = _.cloneDeep(left);
      const rightClone = _.cloneDeep(right);
      
      // Remove ignored paths
      for (const path of ignorePaths) {
        _.unset(leftClone, path);
        _.unset(rightClone, path);
      }
      
      // Calculate differences
      const differences = deepDiff.diff(leftClone, rightClone) || [];
      
      // Format differences for readability
      const formattedDiffs = differences.map(diff => {
        return {
          path: diff.path.join('.'),
          type: diff.kind,
          detail: this._formatDiffDetail(diff)
        };
      });
      
      return this._createSuccessResponse({
        differences: formattedDiffs,
        count: formattedDiffs.length
      });
    } catch (error) {
      return this.handleError(error, 'diffContexts');
    }
  }

  /**
   * Validate a context against defined schemas
   * 
   * @param {Object} params - Method parameters
   * @param {Object} params.context - Context to validate
   * @param {string} [params.section] - Specific section to validate
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Validation result
   */
  async validateContext(params, context = {}) {
    try {
      const contextToValidate = params.context || context;
      const contextValidation = validateContextSchema(contextToValidate);
      if (!contextValidation.valid) {
        return this._createErrorResponse('Invalid context', {
          missing: contextValidation.missing,
          invalid: contextValidation.invalid
        });
      }
      return this._createSuccessResponse({
        message: 'Context is valid',
        context: contextToValidate
      });
    } catch (error) {
      return this.handleError(error, 'validateContext');
    }
  }

  /**
   * Clear the context cache
   * 
   * @param {Object} params - Method parameters
   * @param {string} [params.session_id] - Specific session to clear, or all if omitted
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Result
   */
  async clearContextCache(params, context = {}) {
    try {
      const { session_id } = params;
      
      if (session_id) {
        // Clear specific session
        this._contextCache.delete(session_id);
        this.logger.debug(`Cleared context cache for session: ${session_id}`);
      } else {
        // Clear all sessions
        this._contextCache.clear();
        this.logger.debug('Cleared entire context cache');
      }
      
      return this._createSuccessResponse({
        message: session_id
          ? `Context cache cleared for session: ${session_id}`
          : 'Entire context cache cleared'
      });
    } catch (error) {
      return this.handleError(error, 'clearContextCache');
    }
  }

  /**
   * Format diff detail for readability
   * 
   * @private
   * @param {Object} diff - Deep-diff object
   * @returns {Object} - Formatted diff detail
   */
  _formatDiffDetail(diff) {
    switch (diff.kind) {
      case 'N': // New
        return {
          message: 'Property added',
          value: diff.rhs
        };
      case 'D': // Deleted
        return {
          message: 'Property deleted',
          value: diff.lhs
        };
      case 'E': // Edited
        return {
          message: 'Property edited',
          oldValue: diff.lhs,
          newValue: diff.rhs
        };
      case 'A': // Array
        return {
          message: `Array index ${diff.index} modified`,
          detail: this._formatDiffDetail(diff.item)
        };
      default:
        return {
          message: 'Unknown change type'
        };
    }
  }

  /**
   * Get cached context by session ID
   * 
   * @private
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Cached context or null if not found/expired
   */
  _getCachedContext(sessionId) {
    if (!sessionId) return null;
    
    const cached = this._contextCache.get(sessionId);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this._cacheTTL) {
      this._contextCache.delete(sessionId);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Cache context with session ID
   * 
   * @private
   * @param {string} sessionId - Session ID
   * @param {Object} context - Context to cache
   */
  _cacheContext(sessionId, context) {
    if (!sessionId) return;
    
    this._contextCache.set(sessionId, {
      timestamp: Date.now(),
      data: _.cloneDeep(context)
    });
    
    // Cleanup old entries if cache is too large (>100 entries)
    if (this._contextCache.size > 100) {
      const oldestEntry = [...this._contextCache.entries()]
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      
      if (oldestEntry) {
        this._contextCache.delete(oldestEntry[0]);
      }
    }
  }

  /**
   * Create success response object
   * 
   * @private
   * @param {Object} data - Response data
   * @returns {Object} - Formatted success response
   */
  _createSuccessResponse(data) {
    return {
      success: true,
      ...data
    };
  }

  /**
   * Create error response object
   * 
   * @private
   * @param {string} message - Error message
   * @param {*} [details] - Error details
   * @returns {Object} - Formatted error response
   */
  _createErrorResponse(message, details) {
    return {
      success: false,
      error: message,
      details
    };
  }

  /**
   * Get tool schema for MCP compatibility
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
            action: {
              type: "string",
              description: "Action to perform (getContext, updateContext, mergeContexts, trackChange, createContextCheckpoint, rollbackToCheckpoint, diffContexts, validateContext, clearContextCache)",
              enum: ["getContext", "updateContext", "mergeContexts", "trackChange", "createContextCheckpoint", "rollbackToCheckpoint", "diffContexts", "validateContext", "clearContextCache"]
            },
            section: {
              type: "string",
              description: "Specific context section to act on"
            },
            data: {
              type: "object",
              description: "Data for context updates"
            },
            session_id: {
              type: "string",
              description: "Session ID for context caching"
            },
            user_id: {
              type: "string",
              description: "User ID for database operations"
            },
            site_id: {
              type: "string",
              description: "Site ID for database operations"
            },
            validate: {
              type: "boolean",
              description: "Whether to validate context updates"
            },
            contexts: {
              type: "array",
              description: "Array of contexts to merge",
              items: {
                type: "object"
              }
            },
            strategy: {
              type: "string",
              description: "Merge strategy (latest, selective)",
              enum: ["latest", "selective"]
            },
            resolution: {
              type: "object",
              description: "Custom resolutions for conflicts"
            },
            name: {
              type: "string",
              description: "Checkpoint name for create/rollback operations"
            },
            description: {
              type: "string",
              description: "Checkpoint description"
            },
            keepCheckpoint: {
              type: "boolean",
              description: "Whether to keep checkpoint after rollback"
            },
            left: {
              type: "object",
              description: "First context to compare in diff"
            },
            right: {
              type: "object",
              description: "Second context to compare in diff"
            },
            ignorePaths: {
              type: "array",
              description: "Paths to ignore in diff comparison",
              items: {
                type: "string"
              }
            },
            changes: {
              type: "array",
              description: "Array of change objects to track",
              items: {
                type: "object"
              }
            }
          },
          required: ["action"]
        }
      }
    };
  }
}

module.exports = ContextManagerTool; 