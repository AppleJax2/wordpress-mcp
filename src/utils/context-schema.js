/**
 * Context Schema and Validator
 *
 * Defines the standardized context schema for all MCP tools and provides
 * a validation utility to enforce context consistency and security.
 *
 * @module utils/context-schema
 */

const _ = require('lodash');

// Standardized context schema
const CONTEXT_SCHEMA = {
  type: 'object',
  properties: {
    site: {
      type: 'object',
      properties: {
        site_id: { type: 'string' },
        url: { type: 'string', format: 'uri' },
        capabilities: { type: 'object' },
        auth: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { type: 'string' },
            expires: { type: 'string', format: 'date-time' }
          },
          required: ['token', 'user']
        }
      },
      required: ['site_id', 'url']
    },
    user: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        preferences: { type: 'object' },
        identity_verified: { type: 'boolean' }
      },
      required: ['user_id']
    },
    master_doc: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        last_updated: { type: 'string', format: 'date-time' }
        // Additional master_doc fields are validated elsewhere
      },
      required: ['version', 'last_updated']
    },
    // Tool-specific context can be added as needed
  },
  required: ['site', 'user', 'master_doc']
};

/**
 * Validate and sanitize a context object against the schema
 * @param {Object} context - The context object to validate
 * @returns {Object} - { valid, missing, invalid, message, sanitized }
 */
function validateContextSchema(context) {
  const missing = [];
  const invalid = [];
  const sanitized = _.cloneDeep(context);

  // Check required top-level fields
  for (const key of CONTEXT_SCHEMA.required) {
    if (!context || typeof context !== 'object' || !context.hasOwnProperty(key)) {
      missing.push(key);
    }
  }

  // Validate each section
  for (const [section, sectionSchema] of Object.entries(CONTEXT_SCHEMA.properties)) {
    const value = context ? context[section] : undefined;
    if (value === undefined) continue;
    if (typeof value !== 'object') {
      invalid.push(section);
      continue;
    }
    // Check required fields in section
    if (sectionSchema.required) {
      for (const reqField of sectionSchema.required) {
        if (!value.hasOwnProperty(reqField)) {
          missing.push(`${section}.${reqField}`);
        }
      }
    }
    // Type checks for known fields
    for (const [field, fieldSchema] of Object.entries(sectionSchema.properties)) {
      if (value[field] !== undefined) {
        if (fieldSchema.type && typeof value[field] !== fieldSchema.type && !(fieldSchema.type === 'array' && Array.isArray(value[field]))) {
          invalid.push(`${section}.${field}`);
        }
      }
    }
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    message: missing.length > 0
      ? `Missing required context fields: ${missing.join(', ')}`
      : invalid.length > 0
        ? `Invalid context field types: ${invalid.join(', ')}`
        : '',
    sanitized
  };
}

module.exports = {
  CONTEXT_SCHEMA,
  validateContextSchema
}; 