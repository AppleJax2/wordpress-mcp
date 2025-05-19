/**
 * Design Document Tool
 * 
 * Handles creation, storage, retrieval, and versioning of master design documents
 * for WordPress sites. Works with the TanukiMCP_Master_Design_Doc class in the WordPress plugin.
 * 
 * @module tools/design-document-tool
 */

const { BaseTool } = require('./base-tool');
const { fetchPage, executeAction, executeRestRequest } = require('../browser/utils');
const { createErrorResponse, createSuccessResponse } = require('../utils/response-formatter');
const logger = require('../utils/logger');
const VisualPreviewTool = require('./visual-preview-tool');
const ThemeManagerTool = require('./theme-manager-tool');
const PluginManagerTool = require('./plugin-manager-tool');
const ContextManagerTool = require('./context-manager-tool');
const LRU = require('lru-cache');
const zlib = require('zlib');
const EventEmitter = require('events');

class DesignDocumentTool extends BaseTool {
  constructor() {
    super('design-document-tool', 'Manages and versions master design documents');
    
    // Register tool methods
    this.registerMethod('get', this.getDesignDoc.bind(this));
    this.registerMethod('save', this.saveDesignDoc.bind(this));
    this.registerMethod('update', this.updateDesignDoc.bind(this));
    this.registerMethod('version', this.createDocVersion.bind(this));
    this.registerMethod('list-versions', this.listDocVersions.bind(this));
    this.registerMethod('get-version', this.getDocVersion.bind(this));
    this.registerMethod('sync', this.syncDesignDoc.bind(this));
    this.registerMethod('validate', this.validateDesignDoc.bind(this));
    this.registerMethod('visual-diff', this.generateVersionVisualDiff.bind(this));
    this.registerMethod('version-timeline', this.getVersionTimeline.bind(this));
    // Event emitter for change listeners
    this.changeEmitter = new EventEmitter();
    // LRU cache for documents
    this.docCache = new LRU({ max: 50, ttl: 5 * 60 * 1000 });
  }

  /**
   * Get a design document for a specific user and site
   * 
   * @param {Object} args - The arguments for retrieving a design document
   * @param {string} args.user_id - WordPress user ID
   * @param {string} args.site_id - The site identifier
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - The design document or error
   */
  async getDesignDoc(args, context) {
    const cacheKey = `${args.user_id}:${args.site_id}`;
    if (this.docCache.has(cacheKey)) {
      const compressed = this.docCache.get(cacheKey);
      const doc = JSON.parse(zlib.gunzipSync(compressed).toString());
      return createSuccessResponse(doc);
    }
    try {
      logger.debug('Getting design document', { userId: args.user_id, siteId: args.site_id });
      
      if (!args.user_id || !args.site_id) {
        return createErrorResponse('INVALID_ARGUMENTS', 'User ID and Site ID are required');
      }
      
      // Execute WordPress AJAX request to get the document
      const response = await executeRestRequest({
        site: context.site,
        endpoint: 'wp/v2/tanukimcp/design-document',
        method: 'GET',
        data: {
          user_id: args.user_id,
          site_id: args.site_id
        }
      });
      
      if (!response || response.error) {
        logger.error('Failed to get design document', {
          error: response?.error || 'Unknown error',
          userId: args.user_id,
          siteId: args.site_id
        });
        return createErrorResponse('RETRIEVAL_FAILED', response?.error || 'Failed to get design document');
      }
      
      // Compress and cache
      const compressed = zlib.gzipSync(JSON.stringify(response.data));
      this.docCache.set(cacheKey, compressed);
      return createSuccessResponse(response.data);
    } catch (error) {
      logger.error('Error getting design document', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * Save a new design document for a specific user and site
   * 
   * @param {Object} args - The arguments for saving a design document
   * @param {string} args.user_id - WordPress user ID
   * @param {string} args.site_id - The site identifier
   * @param {Object} args.doc_data - The design document data to save
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Success status or error
   */
  async saveDesignDoc(args, context) {
    try {
      logger.debug('Saving design document', { userId: args.user_id, siteId: args.site_id });
      
      if (!args.user_id || !args.site_id || !args.doc_data) {
        return createErrorResponse('INVALID_ARGUMENTS', 'User ID, Site ID, and document data are required');
      }
      
      // Execute WordPress AJAX request to save the document
      const response = await executeRestRequest({
        site: context.site,
        endpoint: 'wp/v2/tanukimcp/design-document',
        method: 'POST',
        data: {
          user_id: args.user_id,
          site_id: args.site_id,
          doc_data: args.doc_data
        }
      });
      
      if (!response || response.error) {
        logger.error('Failed to save design document', {
          error: response?.error || 'Unknown error',
          userId: args.user_id,
          siteId: args.site_id
        });
        return createErrorResponse('SAVE_FAILED', response?.error || 'Failed to save design document');
      }
      
      // Create initial version history if this is a new document
      if (!args.doc_data.version_history) {
        await this.createDocVersion({
          user_id: args.user_id,
          site_id: args.site_id,
          version_label: 'Initial version',
          version_notes: 'Initial creation of master design document'
        }, context);
      }
      
      return createSuccessResponse({
        success: true,
        message: 'Design document saved successfully',
        doc_id: response.data.doc_id
      });
    } catch (error) {
      logger.error('Error saving design document', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * Update an existing design document
   * 
   * @param {Object} args - The arguments for updating a design document
   * @param {string} args.user_id - WordPress user ID
   * @param {string} args.site_id - The site identifier
   * @param {Object} args.doc_data - The updated design document data
   * @param {boolean} args.create_version - Whether to create a new version
   * @param {string} args.version_label - Label for the new version (if creating)
   * @param {string} args.version_notes - Notes for the new version (if creating)
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Success status or error
   */
  async updateDesignDoc(args, context) {
    try {
      logger.debug('Updating design document', {
        userId: args.user_id,
        siteId: args.site_id,
        createVersion: args.create_version
      });
      
      if (!args.user_id || !args.site_id || !args.doc_data) {
        return createErrorResponse('INVALID_ARGUMENTS', 'User ID, Site ID, and document data are required');
      }
      
      // Ensure context is properly initialized
      context = await this.useContext(args, context);
      
      // Update the document version
      const currentVersion = args.doc_data.version || '1.0.0';
      const versionParts = currentVersion.split('.');
      versionParts[2] = (parseInt(versionParts[2], 10) + 1).toString();
      args.doc_data.version = versionParts.join('.');
      args.doc_data.last_updated = new Date().toISOString();
      
      // Execute WordPress AJAX request to update the document
      const response = await executeRestRequest({
        site: context.site,
        endpoint: 'wp/v2/tanukimcp/design-document',
        method: 'PUT',
        data: {
          user_id: args.user_id,
          site_id: args.site_id,
          doc_data: args.doc_data
        }
      });
      
      if (!response || response.error) {
        logger.error('Failed to update design document', {
          error: response?.error || 'Unknown error',
          userId: args.user_id,
          siteId: args.site_id
        });
        return createErrorResponse('UPDATE_FAILED', response?.error || 'Failed to update design document');
      }
      
      // Create a new version if requested
      if (args.create_version) {
        await this.createDocVersion({
          user_id: args.user_id,
          site_id: args.site_id,
          version_label: args.version_label || `Version ${args.doc_data.version}`,
          version_notes: args.version_notes || 'Document updated'
        }, context);
      }
      
      // Update the context with the new doc data
      const contextUpdateResult = await this.updateContext(args.doc_data, args, context);
      if (!contextUpdateResult.success) {
        logger.warn('Failed to update context after design document update', {
          error: contextUpdateResult.error
        });
      } else {
        context = contextUpdateResult.context;
        context.context_update_type = 'major';
      }
      
      return createSuccessResponse({
        success: true,
        message: 'Design document updated successfully',
        version: args.doc_data.version,
        context: context
      });
    } catch (error) {
      logger.error('Error updating design document', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * Create a new version of a design document
   * 
   * @param {Object} args - The arguments for creating a version
   * @param {string} args.user_id - WordPress user ID
   * @param {string} args.site_id - The site identifier
   * @param {string} args.version_label - Label for the version
   * @param {string} args.version_notes - Notes for the version
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Success status or error
   */
  async createDocVersion(args, context) {
    try {
      logger.debug('Creating design document version', {
        userId: args.user_id,
        siteId: args.site_id,
        label: args.version_label
      });
      
      if (!args.user_id || !args.site_id) {
        return createErrorResponse('INVALID_ARGUMENTS', 'User ID and Site ID are required');
      }
      
      // Get the current document first
      const docResponse = await this.getDesignDoc({
        user_id: args.user_id,
        site_id: args.site_id
      }, context);
      
      if (!docResponse.success) {
        return docResponse; // Return the error from getDesignDoc
      }
      
      const doc = docResponse.data;
      
      // Create version entry
      const versionEntry = {
        version: doc.version || '1.0.0',
        timestamp: new Date().toISOString(),
        label: args.version_label || `Version ${doc.version || '1.0.0'}`,
        notes: args.version_notes || '',
        snapshot: JSON.stringify(doc) // Store snapshot of the entire document
      };
      
      // Initialize or update version history
      if (!doc.version_history) {
        doc.version_history = [];
      }
      
      doc.version_history.push(versionEntry);
      
      // Limit version history to last 20 versions to prevent excessive growth
      if (doc.version_history.length > 20) {
        doc.version_history = doc.version_history.slice(-20);
      }
      
      // Save the updated document with version history
      const response = await executeRestRequest({
        site: context.site,
        endpoint: 'wp/v2/tanukimcp/design-document',
        method: 'PUT',
        data: {
          user_id: args.user_id,
          site_id: args.site_id,
          doc_data: doc
        }
      });
      
      if (!response || response.error) {
        logger.error('Failed to create document version', {
          error: response?.error || 'Unknown error',
          userId: args.user_id,
          siteId: args.site_id
        });
        return createErrorResponse('VERSION_FAILED', response?.error || 'Failed to create document version');
      }
      
      return createSuccessResponse({
        success: true,
        message: 'Document version created successfully',
        version: doc.version,
        version_entry: versionEntry
      });
    } catch (error) {
      logger.error('Error creating document version', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * List all versions of a design document
   * 
   * @param {Object} args - The arguments for listing versions
   * @param {string} args.user_id - WordPress user ID
   * @param {string} args.site_id - The site identifier
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - List of versions or error
   */
  async listDocVersions(args, context) {
    try {
      logger.debug('Listing design document versions', {
        userId: args.user_id,
        siteId: args.site_id
      });
      
      if (!args.user_id || !args.site_id) {
        return createErrorResponse('INVALID_ARGUMENTS', 'User ID and Site ID are required');
      }
      
      // Get the current document with version history
      const docResponse = await this.getDesignDoc({
        user_id: args.user_id,
        site_id: args.site_id
      }, context);
      
      if (!docResponse.success) {
        return docResponse; // Return the error from getDesignDoc
      }
      
      const doc = docResponse.data;
      
      if (!doc.version_history || !Array.isArray(doc.version_history)) {
        return createSuccessResponse({
          versions: [],
          message: 'No version history found for this document'
        });
      }
      
      // Return version information without the full snapshot data
      const versions = doc.version_history.map(version => ({
        version: version.version,
        timestamp: version.timestamp,
        label: version.label,
        notes: version.notes
      }));
      
      return createSuccessResponse({
        versions,
        current_version: doc.version
      });
    } catch (error) {
      logger.error('Error listing document versions', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * Get a specific version of a design document
   * 
   * @param {Object} args - The arguments for getting a version
   * @param {string} args.user_id - WordPress user ID
   * @param {string} args.site_id - The site identifier
   * @param {string} args.version - The version to retrieve
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - The versioned document or error
   */
  async getDocVersion(args, context) {
    try {
      logger.debug('Getting specific design document version', {
        userId: args.user_id,
        siteId: args.site_id,
        version: args.version
      });
      
      if (!args.user_id || !args.site_id || !args.version) {
        return createErrorResponse('INVALID_ARGUMENTS', 'User ID, Site ID, and version are required');
      }
      
      // Get the current document with version history
      const docResponse = await this.getDesignDoc({
        user_id: args.user_id,
        site_id: args.site_id
      }, context);
      
      if (!docResponse.success) {
        return docResponse; // Return the error from getDesignDoc
      }
      
      const doc = docResponse.data;
      
      if (!doc.version_history || !Array.isArray(doc.version_history)) {
        return createErrorResponse('VERSION_NOT_FOUND', 'No version history found for this document');
      }
      
      // Find the requested version
      const versionEntry = doc.version_history.find(v => v.version === args.version);
      
      if (!versionEntry) {
        return createErrorResponse('VERSION_NOT_FOUND', `Version ${args.version} not found in document history`);
      }
      
      // Parse the snapshot to get the document at that version
      const versionedDoc = JSON.parse(versionEntry.snapshot);
      
      return createSuccessResponse({
        doc: versionedDoc,
        version_info: {
          version: versionEntry.version,
          timestamp: versionEntry.timestamp,
          label: versionEntry.label,
          notes: versionEntry.notes
        }
      });
    } catch (error) {
      logger.error('Error getting document version', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * Sync a design document between client and server
   * Handles merging, conflict resolution, and atomic updates
   * 
   * @param {Object} args - The arguments for syncing a document
   * @param {string} args.user_id - WordPress user ID
   * @param {string} args.site_id - The site identifier
   * @param {Object} args.client_doc - The client-side document state
   * @param {string} args.base_version - The base version the client started with
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - The synced document or error with conflicts
   */
  async syncDesignDoc(args, context) {
    try {
      logger.debug('Syncing design document', {
        userId: args.user_id,
        siteId: args.site_id,
        baseVersion: args.base_version
      });
      
      if (!args.user_id || !args.site_id || !args.client_doc || !args.base_version) {
        return createErrorResponse('INVALID_ARGUMENTS', 'User ID, Site ID, client document, and base version are required');
      }
      
      // Get the current server document
      const serverDocResponse = await this.getDesignDoc({
        user_id: args.user_id,
        site_id: args.site_id
      }, context);
      
      if (!serverDocResponse.success) {
        return serverDocResponse; // Return the error from getDesignDoc
      }
      
      const serverDoc = serverDocResponse.data;
      
      // Check for version mismatch
      if (serverDoc.version !== args.base_version) {
        // Attempt to merge changes
        const mergeResult = this.mergeDocuments(serverDoc, args.client_doc, args.base_version);
        
        if (mergeResult.conflicts) {
          return createErrorResponse('SYNC_CONFLICT', 'Document sync conflicts detected', {
            server_version: serverDoc.version,
            client_base_version: args.base_version,
            conflicts: mergeResult.conflicts
          });
        }
        
        // Update with merged document
        const updateResponse = await this.updateDesignDoc({
          user_id: args.user_id,
          site_id: args.site_id,
          doc_data: mergeResult.merged_doc,
          create_version: true,
          version_label: 'Merge sync',
          version_notes: `Merged changes from client (base: ${args.base_version}) and server (version: ${serverDoc.version})`
        }, context);
        
        if (!updateResponse.success) {
          return updateResponse; // Return the error from updateDesignDoc
        }
        
        return createSuccessResponse({
          success: true,
          message: 'Document synced successfully (merged)',
          doc: mergeResult.merged_doc,
          was_merged: true
        });
      }
      
      // No version mismatch, simple update
      const updateResponse = await this.updateDesignDoc({
        user_id: args.user_id,
        site_id: args.site_id,
        doc_data: args.client_doc,
        create_version: false
      }, context);
      
      if (!updateResponse.success) {
        return updateResponse; // Return the error from updateDesignDoc
      }
      
      return createSuccessResponse({
        success: true,
        message: 'Document synced successfully',
        doc: args.client_doc,
        was_merged: false
      });
    } catch (error) {
      logger.error('Error syncing document', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * Merge two versions of a document, handling conflicts
   * 
   * @param {Object} serverDoc - The server-side document
   * @param {Object} clientDoc - The client-side document
   * @param {string} baseVersion - The base version the client started with
   * @returns {Object} - Merged document and any conflicts
   */
  mergeDocuments(serverDoc, clientDoc, baseVersion) {
    // Start with a deep copy of the server document
    const mergedDoc = JSON.parse(JSON.stringify(serverDoc));
    const conflicts = [];
    
    // Get base version snapshot if available
    let baseDoc = null;
    if (serverDoc.version_history) {
      const baseVersionEntry = serverDoc.version_history.find(v => v.version === baseVersion);
      if (baseVersionEntry) {
        baseDoc = JSON.parse(baseVersionEntry.snapshot);
      }
    }
    
    // Define sections to merge
    const sectionsToMerge = [
      'sitemap',
      'wireframe',
      'design_tokens',
      'theme_inventory',
      'plugin_inventory',
      'block_inventory',
      'page_structure',
      'user_notes',
      'ai_notes'
    ];
    
    // For each section, apply three-way merge if possible, otherwise use client changes
    sectionsToMerge.forEach(section => {
      // Simple text fields
      if (section === 'user_notes' || section === 'ai_notes') {
        if (clientDoc[section] !== serverDoc[section]) {
          // If base is available, do a three-way merge
          if (baseDoc && baseDoc[section] === serverDoc[section]) {
            // Server hasn't changed, take client version
            mergedDoc[section] = clientDoc[section];
          } else if (baseDoc && baseDoc[section] === clientDoc[section]) {
            // Client hasn't changed, keep server version
            // (already in mergedDoc)
          } else {
            // Both changed or no base available, report conflict
            conflicts.push({
              section,
              server_value: serverDoc[section],
              client_value: clientDoc[section],
              resolution: 'server_preserved'
            });
          }
        }
        return;
      }
      
      // Array-based sections
      if (Array.isArray(clientDoc[section]) && Array.isArray(serverDoc[section])) {
        // Merge inventory arrays by slug/id
        if (section.includes('inventory') || section === 'sitemap' || section === 'page_structure') {
          const idField = section === 'sitemap' || section === 'page_structure' ? 'id' : 'slug';
          
          // Create maps for faster lookup
          const serverMap = new Map(serverDoc[section].map(item => [item[idField], item]));
          const clientMap = new Map(clientDoc[section].map(item => [item[idField], item]));
          const baseMap = baseDoc && Array.isArray(baseDoc[section]) 
            ? new Map(baseDoc[section].map(item => [item[idField], item]))
            : new Map();
          
          const mergedArray = [];
          const processedIds = new Set();
          
          // Process all server items
          for (const [id, serverItem] of serverMap.entries()) {
            const clientItem = clientMap.get(id);
            const baseItem = baseMap.get(id);
            
            processedIds.add(id);
            
            if (!clientItem) {
              // Item exists on server but not client
              if (!baseItem) {
                // New on server, keep it
                mergedArray.push(serverItem);
              } else {
                // Deleted on client, keep the deletion
                // (don't add to mergedArray)
              }
            } else {
              // Item exists on both sides
              // Keep most recent version (client)
              mergedArray.push(clientItem);
            }
          }
          
          // Add items that are only in client
          for (const [id, clientItem] of clientMap.entries()) {
            if (!processedIds.has(id)) {
              mergedArray.push(clientItem);
            }
          }
          
          mergedDoc[section] = mergedArray;
        } else {
          // For complex nested structures like wireframe, override with client version
          // and flag potential conflict
          if (JSON.stringify(clientDoc[section]) !== JSON.stringify(serverDoc[section])) {
            mergedDoc[section] = clientDoc[section];
            conflicts.push({
              section,
              message: `Complex structure in ${section} may have conflicts`,
              resolution: 'client_version_used'
            });
          }
        }
      }
    });
    
    // Add version and last updated from the server doc
    mergedDoc.version = serverDoc.version;
    mergedDoc.last_updated = serverDoc.last_updated;
    
    // For each conflict, add a suggestion
    if (conflicts.length > 0) {
      conflicts.forEach(conflict => {
        conflict.suggestion = `Review changes in section '${conflict.section}'. Consider using server, client, or manual merge.`;
        conflict.resolution_options = ['server', 'client', 'manual'];
      });
    }
    return {
      merged_doc: mergedDoc,
      conflicts: conflicts.length > 0 ? conflicts : null
    };
  }

  /**
   * Validate a design document against the schema
   * 
   * @param {Object} args - The arguments for validation
   * @param {Object} args.doc_data - The document data to validate
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Validation results
   */
  async validateDesignDoc(args, context) {
    try {
      logger.debug('Validating design document');
      
      if (!args.doc_data) {
        return createErrorResponse('INVALID_ARGUMENTS', 'Document data is required');
      }
      
      const validationIssues = [];
      
      // Basic structure validation
      const requiredFields = [
        'version',
        'last_updated',
        'sitemap',
        'wireframe',
        'design_tokens',
        'theme_inventory',
        'plugin_inventory',
        'block_inventory',
        'page_structure'
      ];
      
      requiredFields.forEach(field => {
        if (!args.doc_data.hasOwnProperty(field)) {
          validationIssues.push({
            field,
            issue: 'missing_field',
            message: `Required field ${field} is missing`
          });
        }
      });
      
      // Array validation
      const arrayFields = [
        'sitemap',
        'wireframe',
        'theme_inventory',
        'plugin_inventory',
        'block_inventory',
        'page_structure'
      ];
      
      arrayFields.forEach(field => {
        if (args.doc_data.hasOwnProperty(field) && !Array.isArray(args.doc_data[field])) {
          validationIssues.push({
            field,
            issue: 'invalid_type',
            message: `Field ${field} must be an array`
          });
        }
      });
      
      // Object validation
      if (args.doc_data.hasOwnProperty('design_tokens') && typeof args.doc_data.design_tokens !== 'object') {
        validationIssues.push({
          field: 'design_tokens',
          issue: 'invalid_type',
          message: 'design_tokens must be an object'
        });
      }
      
      // Version format validation
      if (args.doc_data.hasOwnProperty('version')) {
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(args.doc_data.version)) {
          validationIssues.push({
            field: 'version',
            issue: 'invalid_format',
            message: 'Version must be in semver format (e.g., 1.0.0)'
          });
        }
      }
      
      // Enhanced: Validate themes, plugins, blocks
      const { doc_data } = args;
      if (doc_data) {
        // Validate themes
        if (Array.isArray(doc_data.theme_inventory)) {
          for (const theme of doc_data.theme_inventory) {
            const themeResult = await ThemeManagerTool.execute({ action: 'get', data: { themeSlug: theme.slug } });
            if (!themeResult.success) {
              validationIssues.push({
                field: 'theme_inventory',
                issue: 'theme_not_found',
                message: `Theme '${theme.slug}' not found or not compatible.`
              });
            }
          }
        }
        // Validate plugins
        if (Array.isArray(doc_data.plugin_inventory)) {
          for (const plugin of doc_data.plugin_inventory) {
            const pluginResult = await PluginManagerTool.execute({ action: 'get', data: { pluginSlug: plugin.slug } });
            if (!pluginResult.success) {
              validationIssues.push({
                field: 'plugin_inventory',
                issue: 'plugin_not_found',
                message: `Plugin '${plugin.slug}' not found or not compatible.`
              });
            }
          }
        }
        // TODO: Validate blocks if block manager exists
      }
      
      return createSuccessResponse({
        valid: validationIssues.length === 0,
        issues: validationIssues.length > 0 ? validationIssues : null
      });
    } catch (error) {
      logger.error('Error validating document', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  // --- VERSION VISUALIZATION ---
  /**
   * Generate a visual diff between two document versions
   * @param {Object} args - { user_id, site_id, version_a, version_b, url, viewport }
   * @param {Object} context
   */
  async generateVersionVisualDiff(args, context) {
    try {
      const { user_id, site_id, version_a, version_b, url, viewport = 'desktop' } = args;
      if (!user_id || !site_id || !version_a || !version_b || !url) {
        return createErrorResponse('INVALID_ARGUMENTS', 'user_id, site_id, version_a, version_b, and url are required');
      }
      // Get both versions
      const docA = await this.getDocVersion({ user_id, site_id, version: version_a }, context);
      const docB = await this.getDocVersion({ user_id, site_id, version: version_b }, context);
      if (!docA.success || !docB.success) {
        return createErrorResponse('VERSION_NOT_FOUND', 'One or both versions not found');
      }
      // Generate screenshots for both versions
      const before = await VisualPreviewTool.generateScreenshot({ url, viewport }, context);
      const after = await VisualPreviewTool.generateScreenshot({ url, viewport }, context);
      if (!before.success || !after.success) {
        return createErrorResponse('SCREENSHOT_ERROR', 'Failed to generate screenshots for visual diff');
      }
      // Generate visual diff
      const diff = await VisualPreviewTool.generateDiff({ beforeImage: before.data.screenshot, afterImage: after.data.screenshot }, context);
      if (!diff.success) {
        return createErrorResponse('DIFF_ERROR', 'Failed to generate visual diff');
      }
      return createSuccessResponse({
        diff: diff.data.diff,
        diffMap: diff.data.diffMap,
        metadata: diff.data.metadata
      });
    } catch (error) {
      logger.error('Error generating version visual diff', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  /**
   * Get a graphical timeline of version history
   * @param {Object} args - { user_id, site_id }
   * @param {Object} context
   */
  async getVersionTimeline(args, context) {
    try {
      const { user_id, site_id } = args;
      if (!user_id || !site_id) {
        return createErrorResponse('INVALID_ARGUMENTS', 'user_id and site_id are required');
      }
      const docResponse = await this.getDesignDoc({ user_id, site_id }, context);
      if (!docResponse.success) {
        return docResponse;
      }
      const doc = docResponse.data;
      if (!doc.version_history || !Array.isArray(doc.version_history)) {
        return createSuccessResponse({ timeline: [] });
      }
      // Build timeline structure
      const timeline = doc.version_history.map((v, idx) => ({
        version: v.version,
        timestamp: v.timestamp,
        label: v.label,
        notes: v.notes,
        parent: idx > 0 ? doc.version_history[idx - 1].version : null
      }));
      return createSuccessResponse({ timeline });
    } catch (error) {
      logger.error('Error generating version timeline', { error: error.message });
      return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
    }
  }

  // --- INTEGRATION ENHANCEMENTS ---
  // Register a change listener
  onChange(listener) {
    this.changeEmitter.on('change', listener);
  }
  // Emit change event
  emitChange(change) {
    this.changeEmitter.emit('change', change);
  }
  // WebSocket support (stub, to be integrated with server)
  setWebSocketServer(wss) {
    this.wss = wss;
  }
  notifyWebSocketClients(message) {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }
}

module.exports = DesignDocumentTool; 