/**
 * WordPress User Manager Tool
 * Comprehensive user management for WordPress sites
 */
const { BaseTool } = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const logger = require('../utils/logger');

class UserManagerTool extends BaseTool {
  constructor() {
    super('wordpress_user_manager', 'Comprehensive WordPress user management');
    this.api = null;
  }

  /**
   * Get JSON schema for MCP
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
              enum: [
                "list", 
                "get", 
                "create", 
                "update", 
                "delete", 
                "roles", 
                "search", 
                "permissions",
                "reset_password"
              ],
              description: "The user management action to perform",
              default: "list"
            },
            userId: {
              type: "integer",
              description: "WordPress user ID for get, update, delete and permission operations"
            },
            username: {
              type: "string",
              description: "Username for get, create operations (unique WordPress login name)"
            },
            email: {
              type: "string",
              description: "Email address for user operations (must be unique in WordPress)"
            },
            password: {
              type: "string",
              description: "Password for create/update operations (min 8 characters recommended)"
            },
            firstName: {
              type: "string",
              description: "User's first name"
            },
            lastName: {
              type: "string",
              description: "User's last name"
            },
            nickname: {
              type: "string",
              description: "User's nickname (defaults to username if not provided)"
            },
            displayName: {
              type: "string",
              description: "How the user's name appears on the site"
            },
            role: {
              type: "string",
              enum: [
                "administrator", 
                "editor", 
                "author", 
                "contributor", 
                "subscriber", 
                "customer",
                "shop_manager"
              ],
              description: "WordPress user role (WooCommerce roles included if applicable)",
              default: "subscriber"
            },
            meta: {
              type: "object",
              description: "Custom user meta data as key-value pairs",
              additionalProperties: {
                type: "string"
              }
            },
            sendUserNotification: {
              type: "boolean",
              description: "Whether to send a notification email to the user when creating or updating",
              default: true
            },
            forceDelete: {
              type: "boolean",
              description: "Whether to completely delete the user instead of reassigning content (delete action)",
              default: false
            },
            reassignTo: {
              type: "integer",
              description: "User ID to reassign content to when deleting a user"
            },
            page: {
              type: "integer",
              description: "Page number for paginated results (list and search actions)",
              default: 1,
              minimum: 1
            },
            perPage: {
              type: "integer",
              description: "Number of users per page (list and search actions)",
              default: 10,
              minimum: 1,
              maximum: 100
            },
            orderBy: {
              type: "string",
              enum: ["id", "email", "name", "registered_date", "display_name"],
              description: "Field to order results by (list and search actions)",
              default: "id"
            },
            order: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order (ascending or descending)",
              default: "asc"
            },
            search: {
              type: "string",
              description: "Search term to filter users by (search action)"
            },
            roles: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Filter users by one or more roles (list and search actions)"
            },
            capabilities: {
              type: "array",
              items: {
                type: "string"
              },
              description: "WordPress capabilities to add or remove (permissions action)"
            },
            grantCapabilities: {
              type: "boolean",
              description: "Whether to grant (true) or revoke (false) the specified capabilities",
              default: true
            }
          },
          required: ["action"]
        }
      }
    };
  }
}

module.exports = UserManagerTool;