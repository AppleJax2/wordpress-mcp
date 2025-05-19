/**
 * Context Middleware
 * 
 * Handles extraction, validation, and management of master design doc context
 * for WordPress MCP tools. This ensures that all tool actions have access to
 * the current master doc and can update it consistently.
 * 
 * @module utils/context-middleware
 */

const logger = require('./logger');
const { createErrorResponse } = require('./response-formatter');

/**
 * Validates that a design doc has the required structure
 * 
 * @param {Object} docData - The design document to validate
 * @returns {boolean} - Whether the doc is valid
 */
function isValidDesignDoc(docData) {
  if (!docData || typeof docData !== 'object') {
    return false;
  }
  
  // Check for minimum required fields
  const requiredFields = [
    'version',
    'last_updated'
  ];
  
  for (const field of requiredFields) {
    if (!docData.hasOwnProperty(field)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extracts master design doc from request context
 * 
 * @param {Object} args - Tool arguments
 * @returns {Object|null} - The master design doc or null if not present
 */
function extractDesignDocFromArgs(args) {
  if (!args || !args.context || !args.context.master_doc) {
    return null;
  }
  
  return args.context.master_doc;
}

/**
 * Middleware to ensure master design doc is present in context
 * If not provided, attempts to fetch it from the database
 * 
 * @param {Object} args - Tool arguments
 * @param {Object} context - Request context
 * @returns {Promise<Object>} - Enhanced context with master doc
 */
async function ensureContext(args, context) {
  // Skip if context already has master_doc
  if (context && context.master_doc && isValidDesignDoc(context.master_doc)) {
    logger.debug('Context already contains valid master_doc');
    return context;
  }
  
  // Extract doc from args if present
  const argsMasterDoc = extractDesignDocFromArgs(args);
  if (argsMasterDoc && isValidDesignDoc(argsMasterDoc)) {
    logger.debug('Using master_doc from args');
    if (!context) {
      context = {};
    }
    context.master_doc = argsMasterDoc;
    context.master_doc_source = 'args';
    return context;
  }
  
  // If user_id and site_id are provided, try to fetch the doc
  if (args && args.user_id && args.site_id) {
    logger.debug('Fetching master_doc from database', {
      userId: args.user_id,
      siteId: args.site_id
    });
    const designDocumentTool = require('../tools/design-document-tool');
    try {
      const docResponse = await designDocumentTool.getDesignDoc({
        user_id: args.user_id,
        site_id: args.site_id
      }, context || {});
      
      if (docResponse.success && docResponse.data) {
        if (!context) {
          context = {};
        }
        context.master_doc = docResponse.data;
        context.master_doc_source = 'database';
        logger.debug('Successfully fetched master_doc from database');
        return context;
      } else {
        logger.warn('Failed to fetch master_doc from database', {
          error: docResponse.error
        });
      }
    } catch (error) {
      logger.error('Error fetching master_doc', {
        error: error.message
      });
    }
  }
  
  // If we reach here, we couldn't get a valid master doc
  if (!context) {
    context = {};
  }
  logger.debug('No valid master_doc found in context or database');
  return context;
}

/**
 * Updates the master design doc in the context and persists changes to database
 * 
 * @param {Object} updatedDoc - The updated master design doc
 * @param {Object} args - Tool arguments
 * @param {Object} context - Request context
 * @returns {Promise<Object>} - Update result
 */
async function updateContext(updatedDoc, args, context) {
  if (!updatedDoc || !isValidDesignDoc(updatedDoc)) {
    return createErrorResponse('INVALID_CONTEXT', 'Invalid master doc provided for update');
  }
  
  if (!args.user_id || !args.site_id) {
    return createErrorResponse('MISSING_PARAMETERS', 'User ID and Site ID required for context update');
  }
  
  try {
    logger.debug('Updating master_doc in context and database', {
      userId: args.user_id,
      siteId: args.site_id
    });
    const designDocumentTool = require('../tools/design-document-tool');
    // Update context
    if (!context) {
      context = {};
    }
    context.master_doc = updatedDoc;
    context.master_doc_updated = true;
    
    // Persist to database
    const updateResult = await designDocumentTool.updateDesignDoc({
      user_id: args.user_id,
      site_id: args.site_id,
      doc_data: updatedDoc,
      create_version: args.create_version || false,
      version_label: args.version_label,
      version_notes: args.version_notes
    }, context);
    
    if (updateResult.success) {
      logger.debug('Successfully updated master_doc in database');
      
      // Update version info in context if provided in result
      if (updateResult.data && updateResult.data.version) {
        context.master_doc.version = updateResult.data.version;
      }
      
      return {
        success: true,
        context,
        message: 'Context updated successfully',
        details: updateResult.data
      };
    } else {
      logger.warn('Failed to update master_doc in database', {
        error: updateResult.error
      });
      
      return createErrorResponse('UPDATE_FAILED', updateResult.error || 'Failed to update master doc in database');
    }
  } catch (error) {
    logger.error('Error updating context', {
      error: error.message
    });
    
    return createErrorResponse('SYSTEM_ERROR', `System error: ${error.message}`);
  }
}

module.exports = {
  ensureContext,
  updateContext,
  isValidDesignDoc,
  extractDesignDocFromArgs
}; 