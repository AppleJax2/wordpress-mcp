/**
 * Context Handler
 * 
 * Utility for handling context updates and notifications for clients.
 * This module ensures that context changes are properly communicated to clients
 * through Server-Sent Events (SSE) with appropriate styling and animations.
 * 
 * @module utils/context-handler
 */

const logger = require('./logger');

/**
 * Send a context update notification to the client via SSE
 * 
 * @param {Object} sseResponse - The SSE response object
 * @param {Object} context - The updated context
 * @param {string} toolName - The name of the tool that updated the context
 * @param {string} updateType - Type of update (e.g., 'minor', 'major')
 * @returns {boolean} - Success status
 */
function sendContextUpdate(sseResponse, context, toolName, updateType = 'minor') {
  if (!sseResponse || !sseResponse.write) {
    logger.warn('Cannot send context update: Invalid SSE response object');
    return false;
  }
  
  if (!context || !context.master_doc) {
    logger.warn('Cannot send context update: Invalid context or missing master_doc');
    return false;
  }
  
  try {
    logger.debug('Sending context update to client', {
      toolName,
      updateType,
      contextVersion: context.master_doc.version
    });
    
    // Create context update event
    const updateEvent = {
      type: 'context_update',
      data: {
        master_doc: {
          // Only send essential metadata to keep payload small
          version: context.master_doc.version,
          last_updated: context.master_doc.last_updated,
          update_type: updateType,
          updated_by: toolName
        },
        // Include styling and animation preferences for the UI
        ui: {
          style: 'tanukimcp', // Use TanukiMCP style
          animation: updateType === 'minor' ? 'fade' : 'slide-in', // Animation type
          notification: true, // Show notification
          notification_type: updateType === 'major' ? 'toast' : 'indicator', // Notification style
          notification_duration: updateType === 'major' ? 5000 : 3000 // Duration in ms
        }
      }
    };
    
    // Send as SSE event
    sseResponse.write(`event: context_update\n`);
    sseResponse.write(`data: ${JSON.stringify(updateEvent)}\n\n`);
    
    return true;
  } catch (error) {
    logger.error('Error sending context update', {
      error: error.message,
      stack: error.stack
    });
    
    return false;
  }
}

/**
 * Send a complete context refresh to the client
 * This is used when major changes occur that require a full refresh
 * 
 * @param {Object} sseResponse - The SSE response object
 * @param {Object} context - The complete context
 * @param {Object} options - Additional options
 * @returns {boolean} - Success status
 */
function sendContextRefresh(sseResponse, context, options = {}) {
  if (!sseResponse || !sseResponse.write) {
    logger.warn('Cannot send context refresh: Invalid SSE response object');
    return false;
  }
  
  if (!context || !context.master_doc) {
    logger.warn('Cannot send context refresh: Invalid context or missing master_doc');
    return false;
  }
  
  try {
    logger.debug('Sending full context refresh to client', {
      contextVersion: context.master_doc.version,
      options
    });
    
    // Send the complete master doc
    const refreshEvent = {
      type: 'context_refresh',
      data: {
        master_doc: context.master_doc,
        // Include styling and animation preferences for the UI
        ui: {
          style: 'tanukimcp', // Use TanukiMCP style
          animation: 'slide-in', // Animation type
          notification: true, // Show notification
          notification_type: 'toast', // Notification style
          notification_duration: 5000, // Duration in ms
          notification_message: options.message || 'Master document updated. Refreshing context.'
        }
      }
    };
    
    // Send as SSE event
    sseResponse.write(`event: context_refresh\n`);
    sseResponse.write(`data: ${JSON.stringify(refreshEvent)}\n\n`);
    
    return true;
  } catch (error) {
    logger.error('Error sending context refresh', {
      error: error.message,
      stack: error.stack
    });
    
    return false;
  }
}

/**
 * Send a context sync conflict notification to the client
 * Used when a sync conflict is detected that requires user intervention
 * 
 * @param {Object} sseResponse - The SSE response object
 * @param {Array} conflicts - List of conflict details
 * @param {Object} serverDoc - The server's version of the document
 * @param {Object} clientDoc - The client's version of the document
 * @returns {boolean} - Success status
 */
function sendContextConflict(sseResponse, conflicts, serverDoc, clientDoc) {
  if (!sseResponse || !sseResponse.write) {
    logger.warn('Cannot send context conflict: Invalid SSE response object');
    return false;
  }
  
  if (!conflicts || !Array.isArray(conflicts)) {
    logger.warn('Cannot send context conflict: Invalid conflicts array');
    return false;
  }
  
  try {
    logger.debug('Sending context conflict notification to client', {
      conflictCount: conflicts.length
    });
    
    // Send conflict details
    const conflictEvent = {
      type: 'context_conflict',
      data: {
        conflicts,
        server_version: serverDoc?.version,
        client_version: clientDoc?.version,
        // Include styling and animation preferences for the UI
        ui: {
          style: 'tanukimcp', // Use TanukiMCP style
          animation: 'slide-in', // Animation type
          notification: true, // Show notification
          notification_type: 'modal', // Notification style (use modal for conflicts)
          notification_message: 'Context conflict detected. Please review and resolve.'
        }
      }
    };
    
    // Send as SSE event
    sseResponse.write(`event: context_conflict\n`);
    sseResponse.write(`data: ${JSON.stringify(conflictEvent)}\n\n`);
    
    return true;
  } catch (error) {
    logger.error('Error sending context conflict', {
      error: error.message,
      stack: error.stack
    });
    
    return false;
  }
}

module.exports = {
  sendContextUpdate,
  sendContextRefresh,
  sendContextConflict
}; 