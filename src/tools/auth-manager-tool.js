/**
 * WordPress Auth Manager Tool
 * Manages WordPress authentication and credentials
 */
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { BaseTool } = require('./base-tool');
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