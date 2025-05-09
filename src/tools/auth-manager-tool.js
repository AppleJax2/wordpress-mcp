/**
 * WordPress Auth Manager Tool
 * Manages WordPress authentication and credentials
 */
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');
const logger = require('../utils/logger');
const config = require('../config');

class AuthManagerTool extends BaseTool {
  constructor() {
    super('wordpress_auth_manager', 'Manage WordPress authentication and credentials');
    this.api = null;
    this.browser = null;
    this.credentialsPath = path.join(process.cwd(), '.wp-credentials');
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'wordpress-mcp-server';
  }
  
  /**
   * Execute the auth manager tool
   * @param {Object} params - Parameters for the auth operation
   * @param {string} params.action - Action to perform (verify, store, clear, test)
   * @param {Object} params.credentials - WordPress credentials (for store action)
   * @param {string} params.credentials.siteUrl - WordPress site URL
   * @param {string} params.credentials.username - WordPress username
   * @param {string} params.credentials.appPassword - WordPress application password
   */
  async execute(params = {}) {
    try {
      const { action = 'verify', credentials } = params;
      
      switch (action) {
        case 'verify':
          return await this.verifyCredentials();
        case 'store':
          return await this.storeCredentials(credentials);
        case 'clear':
          return await this.clearCredentials();
        case 'test':
          return await this.testConnection(credentials);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Verify if credentials are set and valid
   */
  async verifyCredentials() {
    try {
      // First check the environment variables
      const envCredentials = {
        siteUrl: process.env.WP_SITE_URL,
        username: process.env.WP_USERNAME,
        appPassword: process.env.WP_APP_PASSWORD
      };
      
      // Check if all environment variables are set
      const hasEnvCredentials = envCredentials.siteUrl && 
                              envCredentials.username && 
                              envCredentials.appPassword;
      
      // Then check for stored credentials
      let storedCredentials = null;
      let hasStoredCredentials = false;
      
      try {
        storedCredentials = await this.getStoredCredentials();
        hasStoredCredentials = !!storedCredentials;
      } catch (error) {
        hasStoredCredentials = false;
      }
      
      // If we have neither, return failure
      if (!hasEnvCredentials && !hasStoredCredentials) {
        return {
          success: false,
          data: {
            hasCredentials: false,
            message: 'No WordPress credentials found. Please set environment variables or store credentials.'
          }
        };
      }
      
      // Prioritize environment variables over stored credentials
      const credentials = hasEnvCredentials ? envCredentials : storedCredentials;
      
      // Test if the credentials work
      const testResult = await this.testConnection(credentials);
      
      return {
        success: testResult.success,
        data: {
          hasCredentials: true,
          source: hasEnvCredentials ? 'environment' : 'stored',
          siteUrl: credentials.siteUrl,
          username: credentials.username,
          isValid: testResult.success,
          message: testResult.data.message
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          hasCredentials: false,
          message: `Error verifying credentials: ${error.message}`
        }
      };
    }
  }
  
  /**
   * Store credentials securely
   */
  async storeCredentials(credentials) {
    try {
      if (!credentials || !credentials.siteUrl || !credentials.username || !credentials.appPassword) {
        throw new Error('Missing required credentials');
      }
      
      // Test the credentials before storing
      const testResult = await this.testConnection(credentials);
      
      if (!testResult.success) {
        return {
          success: false,
          data: {
            message: `Invalid credentials: ${testResult.data.message}`
          }
        };
      }
      
      // Encrypt and store the credentials
      const encrypted = this.encryptCredentials(credentials);
      await fs.writeFile(this.credentialsPath, encrypted, 'utf8');
      
      return {
        success: true,
        data: {
          message: 'WordPress credentials stored successfully',
          siteUrl: credentials.siteUrl,
          username: credentials.username
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          message: `Error storing credentials: ${error.message}`
        }
      };
    }
  }
  
  /**
   * Clear stored credentials
   */
  async clearCredentials() {
    try {
      try {
        await fs.access(this.credentialsPath);
        await fs.unlink(this.credentialsPath);
      } catch (error) {
        // File doesn't exist, which is fine
      }
      
      return {
        success: true,
        data: {
          message: 'WordPress credentials cleared'
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          message: `Error clearing credentials: ${error.message}`
        }
      };
    }
  }
  
  /**
   * Test connection to WordPress
   */
  async testConnection(credentials) {
    // Use provided credentials or get from environment/storage
    const creds = credentials || await this.getEffectiveCredentials();
    
    if (!creds) {
      return {
        success: false,
        data: {
          message: 'No WordPress credentials available'
        }
      };
    }
    
    // Create a temporary API client with these credentials
    const api = new WordPressAPI({
      siteUrl: creds.siteUrl,
      username: creds.username,
      appPassword: creds.appPassword
    });
    
    try {
      // Try to get site info as a basic connectivity test
      const siteInfo = await api.getSiteInfo();
      
      // Also try to get current user to verify authentication
      const currentUser = await api.getCurrentUser();
      
      return {
        success: true,
        data: {
          message: 'Successfully connected to WordPress',
          site: siteInfo.name,
          user: currentUser.name,
          roles: currentUser.roles
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          message: `Failed to connect to WordPress: ${error.message}`
        }
      };
    }
  }
  
  /**
   * Get stored credentials if available
   */
  async getStoredCredentials() {
    try {
      await fs.access(this.credentialsPath);
      const encrypted = await fs.readFile(this.credentialsPath, 'utf8');
      return this.decryptCredentials(encrypted);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Get effective credentials (from env or storage)
   */
  async getEffectiveCredentials() {
    // First check environment variables
    if (process.env.WP_SITE_URL && process.env.WP_USERNAME && process.env.WP_APP_PASSWORD) {
      return {
        siteUrl: process.env.WP_SITE_URL,
        username: process.env.WP_USERNAME,
        appPassword: process.env.WP_APP_PASSWORD
      };
    }
    
    // Fall back to stored credentials
    return await this.getStoredCredentials();
  }
  
  /**
   * Encrypt credentials for storage
   */
  encryptCredentials(credentials) {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return JSON.stringify({
        iv: iv.toString('hex'),
        data: encrypted
      });
    } catch (error) {
      logger.error('Error encrypting credentials', { error: error.message });
      throw new Error('Failed to encrypt credentials');
    }
  }
  
  /**
   * Decrypt stored credentials
   */
  decryptCredentials(encryptedStr) {
    try {
      const { iv, data } = JSON.parse(encryptedStr);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error decrypting credentials', { error: error.message });
      throw new Error('Failed to decrypt credentials');
    }
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
              enum: ["verify", "store", "clear", "test"],
              description: "Action to perform with WordPress credentials",
              default: "verify"
            },
            credentials: {
              type: "object",
              description: "WordPress credentials (required for 'store' and 'test' actions)",
              properties: {
                siteUrl: {
                  type: "string",
                  description: "WordPress site URL (e.g., https://example.com)"
                },
                username: {
                  type: "string",
                  description: "WordPress administrator username"
                },
                appPassword: {
                  type: "string",
                  description: "WordPress application password for API access (not the regular login password)"
                }
              },
              required: ["siteUrl", "username", "appPassword"]
            }
          },
          required: ["action"]
        }
      }
    };
  }
}

module.exports = AuthManagerTool; 