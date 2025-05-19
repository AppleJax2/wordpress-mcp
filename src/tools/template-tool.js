/**
 * Template Tool
 * 
 * This is a production-ready template for creating new MCP tools.
 * It follows all standardized patterns and conventions defined in the API standards.
 * Use this as a starting point when implementing new tools.
 * 
 * @module tools/template-tool
 */

const BaseTool = require('./base-tool');
const logger = require('../utils/logger');
const { ERROR_CODES } = require('../utils/response-formatter');

class TemplateTool extends BaseTool {
  /**
   * Creates an instance of TemplateTool.
   */
  constructor() {
    super('wordpress_template_tool', 'Template tool demonstrating standardized patterns');
    
    // Register additional methods
    this.registerMethod('getItem', this.getItem.bind(this));
    this.registerMethod('listItems', this.listItems.bind(this));
    this.registerMethod('createItem', this.createItem.bind(this));
    this.registerMethod('updateItem', this.updateItem.bind(this));
    this.registerMethod('deleteItem', this.deleteItem.bind(this));
    this.registerMethod('validateItem', this.validateItem.bind(this));
    this.registerMethod('analyzeItems', this.analyzeItems.bind(this));
  }
  
  /**
   * Main execute implementation
   * 
   * @param {Object} params - Tool parameters
   * @param {string} params.action - Action to perform
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async _execute(params, context) {
    // Validate required parameters
    if (!params.action) {
      return this.createErrorResponse(
        'INVALID_PARAMETERS',
        'Action parameter is required',
        { toolName: this.name }
      );
    }
    
    // Dispatch to appropriate method based on action
    switch (params.action) {
      case 'get':
        return this.getItem(params, context);
      case 'list':
        return this.listItems(params, context);
      case 'create':
        return this.createItem(params, context);
      case 'update':
        return this.updateItem(params, context);
      case 'delete':
        return this.deleteItem(params, context);
      case 'validate':
        return this.validateItem(params, context);
      case 'analyze':
        return this.analyzeItems(params, context);
      default:
        return this.createErrorResponse(
          'INVALID_PARAMETERS',
          `Unsupported action: ${params.action}`,
          { 
            supportedActions: ['get', 'list', 'create', 'update', 'delete', 'validate', 'analyze'] 
          }
        );
    }
  }
  
  /**
   * Get a single item by ID
   * 
   * @param {Object} params - Method parameters
   * @param {string|number} params.id - Item ID
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Item data
   */
  async getItem(params, context) {
    try {
      // Validate required parameters
      if (!params.id) {
        return this.createErrorResponse(
          'INVALID_PARAMETERS',
          'ID parameter is required',
          { toolName: this.name, method: 'getItem' }
        );
      }
      
      logger.debug(`Getting item with ID: ${params.id}`, {
        toolName: this.name,
        method: 'getItem'
      });
      
      // Get API client
      const client = this.getApiClient({
        siteUrl: params.site_url,
        username: params.username,
        password: params.password
      });
      
      // Example API call
      const response = await client.get(`/wp-json/wp/v2/items/${params.id}`);
      
      return this.createSuccessResponse(
        response.data,
        `Retrieved item: ${params.id}`
      );
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return this.createErrorResponse(
          'NOT_FOUND',
          `Item with ID ${params.id} not found`,
          { id: params.id }
        );
      }
      
      return this.handleError(error, 'getItem');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * List items with optional filtering
   * 
   * @param {Object} params - Method parameters
   * @param {number} [params.per_page=10] - Items per page
   * @param {number} [params.page=1] - Page number
   * @param {Object} [params.filter] - Filter criteria
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - List of items
   */
  async listItems(params, context) {
    try {
      const perPage = params.per_page || 10;
      const page = params.page || 1;
      
      logger.debug(`Listing items (page ${page}, per_page ${perPage})`, {
        toolName: this.name,
        method: 'listItems'
      });
      
      // Get API client
      const client = this.getApiClient({
        siteUrl: params.site_url,
        username: params.username,
        password: params.password
      });
      
      // Build query parameters
      const queryParams = {
        per_page: perPage,
        page: page
      };
      
      // Add filter criteria if provided
      if (params.filter && typeof params.filter === 'object') {
        Object.assign(queryParams, params.filter);
      }
      
      // Example API call
      const response = await client.get('/wp-json/wp/v2/items', {
        params: queryParams
      });
      
      return this.createSuccessResponse({
        items: response.data,
        page,
        per_page: perPage,
        total: parseInt(response.headers['x-wp-total'] || 0, 10),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || 0, 10)
      });
    } catch (error) {
      return this.handleError(error, 'listItems');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Create a new item
   * 
   * @param {Object} params - Method parameters
   * @param {Object} params.data - Item data
   * @param {string} params.data.title - Item title
   * @param {string} [params.data.content] - Item content
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Created item
   */
  async createItem(params, context) {
    try {
      // Validate required parameters
      if (!params.data || !params.data.title) {
        return this.createErrorResponse(
          'INVALID_PARAMETERS',
          'Item data with title is required',
          { toolName: this.name, method: 'createItem' }
        );
      }
      
      logger.debug('Creating new item', {
        toolName: this.name,
        method: 'createItem'
      });
      
      // Get API client
      const client = this.getApiClient({
        siteUrl: params.site_url,
        username: params.username,
        password: params.password
      });
      
      // Example API call
      const response = await client.post('/wp-json/wp/v2/items', params.data);
      
      // Update context if needed
      if (context.master_doc && context.master_doc.items) {
        const updatedDoc = { ...context.master_doc };
        updatedDoc.items = updatedDoc.items || [];
        updatedDoc.items.push({
          id: response.data.id,
          title: response.data.title.rendered,
          date_created: response.data.date
        });
        
        await this.updateContext(updatedDoc, params, context);
      }
      
      return this.createSuccessResponse(
        response.data,
        `Item created successfully with ID: ${response.data.id}`
      );
    } catch (error) {
      return this.handleError(error, 'createItem');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Update an existing item
   * 
   * @param {Object} params - Method parameters
   * @param {string|number} params.id - Item ID
   * @param {Object} params.data - Updated item data
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Updated item
   */
  async updateItem(params, context) {
    try {
      // Validate required parameters
      if (!params.id || !params.data) {
        return this.createErrorResponse(
          'INVALID_PARAMETERS',
          'ID and data parameters are required',
          { toolName: this.name, method: 'updateItem' }
        );
      }
      
      logger.debug(`Updating item with ID: ${params.id}`, {
        toolName: this.name,
        method: 'updateItem'
      });
      
      // Get API client
      const client = this.getApiClient({
        siteUrl: params.site_url,
        username: params.username,
        password: params.password
      });
      
      // Example API call
      const response = await client.put(`/wp-json/wp/v2/items/${params.id}`, params.data);
      
      // Update context if needed
      if (context.master_doc && context.master_doc.items) {
        const updatedDoc = { ...context.master_doc };
        const itemIndex = updatedDoc.items.findIndex(item => item.id === params.id);
        
        if (itemIndex !== -1) {
          updatedDoc.items[itemIndex] = {
            ...updatedDoc.items[itemIndex],
            title: response.data.title.rendered,
            date_modified: response.data.modified
          };
          
          await this.updateContext(updatedDoc, params, context);
        }
      }
      
      return this.createSuccessResponse(
        response.data,
        `Item updated successfully: ${params.id}`
      );
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return this.createErrorResponse(
          'NOT_FOUND',
          `Item with ID ${params.id} not found`,
          { id: params.id }
        );
      }
      
      return this.handleError(error, 'updateItem');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Delete an item
   * 
   * @param {Object} params - Method parameters
   * @param {string|number} params.id - Item ID
   * @param {boolean} [params.force=false] - Whether to force deletion
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteItem(params, context) {
    try {
      // Validate required parameters
      if (!params.id) {
        return this.createErrorResponse(
          'INVALID_PARAMETERS',
          'ID parameter is required',
          { toolName: this.name, method: 'deleteItem' }
        );
      }
      
      logger.debug(`Deleting item with ID: ${params.id}`, {
        toolName: this.name,
        method: 'deleteItem'
      });
      
      // Get API client
      const client = this.getApiClient({
        siteUrl: params.site_url,
        username: params.username,
        password: params.password
      });
      
      // Example API call
      const response = await client.delete(`/wp-json/wp/v2/items/${params.id}`, {
        params: {
          force: params.force === true
        }
      });
      
      // Update context if needed
      if (context.master_doc && context.master_doc.items) {
        const updatedDoc = { ...context.master_doc };
        updatedDoc.items = updatedDoc.items.filter(item => item.id !== params.id);
        
        await this.updateContext(updatedDoc, params, context);
      }
      
      return this.createSuccessResponse(
        { id: params.id, deleted: true },
        `Item deleted successfully: ${params.id}`
      );
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return this.createErrorResponse(
          'NOT_FOUND',
          `Item with ID ${params.id} not found`,
          { id: params.id }
        );
      }
      
      return this.handleError(error, 'deleteItem');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Validate item data without saving
   * 
   * @param {Object} params - Method parameters
   * @param {Object} params.data - Item data to validate
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Validation result
   */
  async validateItem(params, context) {
    try {
      // Validate required parameters
      if (!params.data) {
        return this.createErrorResponse(
          'INVALID_PARAMETERS',
          'Data parameter is required',
          { toolName: this.name, method: 'validateItem' }
        );
      }
      
      logger.debug('Validating item data', {
        toolName: this.name,
        method: 'validateItem'
      });
      
      // Validation logic
      const validationResults = {
        valid: true,
        issues: []
      };
      
      // Example validation checks
      if (!params.data.title || params.data.title.trim() === '') {
        validationResults.valid = false;
        validationResults.issues.push({
          field: 'title',
          message: 'Title is required'
        });
      }
      
      if (params.data.title && params.data.title.length > 200) {
        validationResults.valid = false;
        validationResults.issues.push({
          field: 'title',
          message: 'Title exceeds maximum length of 200 characters'
        });
      }
      
      return this.createSuccessResponse(
        validationResults,
        validationResults.valid
          ? 'Item data is valid'
          : `Item data has ${validationResults.issues.length} validation issues`
      );
    } catch (error) {
      return this.handleError(error, 'validateItem');
    }
  }
  
  /**
   * Analyze items and provide insights
   * 
   * @param {Object} params - Method parameters
   * @param {Array<string|number>} [params.ids] - Specific item IDs to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeItems(params, context) {
    try {
      logger.debug('Analyzing items', {
        toolName: this.name,
        method: 'analyzeItems'
      });
      
      // Get API client
      const client = this.getApiClient({
        siteUrl: params.site_url,
        username: params.username,
        password: params.password
      });
      
      // Example: Fetch items to analyze
      let items;
      if (params.ids && Array.isArray(params.ids)) {
        // Fetch specific items
        const responses = await Promise.all(
          params.ids.map(id => client.get(`/wp-json/wp/v2/items/${id}`).catch(err => null))
        );
        items = responses.filter(Boolean).map(response => response.data);
      } else {
        // Fetch all items
        const response = await client.get('/wp-json/wp/v2/items', {
          params: { per_page: 100 }
        });
        items = response.data;
      }
      
      // Perform analysis
      const analysis = {
        count: items.length,
        byStatus: {},
        averageWordCount: 0,
        recommendations: []
      };
      
      // Calculate metrics
      let totalWordCount = 0;
      
      items.forEach(item => {
        // Count by status
        analysis.byStatus[item.status] = (analysis.byStatus[item.status] || 0) + 1;
        
        // Calculate word count (example)
        const content = item.content?.rendered || '';
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        totalWordCount += wordCount;
        
        // Generate recommendations (example)
        if (wordCount < 300) {
          analysis.recommendations.push({
            id: item.id,
            title: item.title?.rendered,
            recommendation: 'Content is too short. Consider adding more details.'
          });
        }
      });
      
      // Calculate average word count
      analysis.averageWordCount = items.length > 0 ? Math.round(totalWordCount / items.length) : 0;
      
      return this.createSuccessResponse(
        analysis,
        `Analyzed ${items.length} items with ${analysis.recommendations.length} recommendations`
      );
    } catch (error) {
      return this.handleError(error, 'analyzeItems');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Get the tool's schema
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
              description: "Action to perform (get, list, create, update, delete, validate, analyze)",
              enum: ["get", "list", "create", "update", "delete", "validate", "analyze"]
            },
            id: {
              type: "string",
              description: "Item ID for get, update, delete operations"
            },
            data: {
              type: "object",
              description: "Item data for create, update, validate operations"
            },
            filter: {
              type: "object",
              description: "Filter criteria for list operation"
            },
            ids: {
              type: "array",
              description: "Item IDs for batch operations",
              items: {
                type: "string"
              }
            },
            site_url: {
              type: "string",
              description: "WordPress site URL"
            },
            username: {
              type: "string",
              description: "WordPress username"
            },
            password: {
              type: "string",
              description: "WordPress password or application password"
            }
          },
          required: ["action"]
        }
      }
    };
  }
}

module.exports = TemplateTool; 