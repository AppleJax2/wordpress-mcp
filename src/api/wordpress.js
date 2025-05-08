/**
 * WordPress API Client
 * Handles direct REST API interactions with WordPress
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../config');

class WordPressAPI {
  constructor(options = {}) {
    this.siteUrl = options.siteUrl || config.wordpress.siteUrl;
    this.username = options.username || config.wordpress.username;
    this.password = options.appPassword || config.wordpress.appPassword;
    
    // Create axios instance with authentication
    this.client = axios.create({
      baseURL: `${this.siteUrl}/wp-json`,
      auth: {
        username: this.username,
        password: this.password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        const errorMessage = error.response?.data?.message || error.message;
        logger.error(`WordPress API Error: ${errorMessage}`, {
          status: error.response?.status,
          url: error.config?.url,
          method: error.config?.method
        });
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Get WordPress site information
   */
  async getSiteInfo() {
    try {
      const response = await this.client.get('/');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch site info', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get current user information
   */
  async getCurrentUser() {
    try {
      const response = await this.client.get('/wp/v2/users/me');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch current user', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get posts with optional filters
   */
  async getPosts(params = {}) {
    try {
      const response = await this.client.get('/wp/v2/posts', { params });
      return response;
    } catch (error) {
      logger.error('Failed to fetch posts', { error: error.message, params });
      throw error;
    }
  }
  
  /**
   * Get a specific post by ID
   */
  async getPost(postId) {
    try {
      const response = await this.client.get(`/wp/v2/posts/${postId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch post', { error: error.message, postId });
      throw error;
    }
  }
  
  /**
   * Create a new post
   */
  async createPost(postData) {
    try {
      const response = await this.client.post('/wp/v2/posts', postData);
      return response.data;
    } catch (error) {
      logger.error('Failed to create post', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Update an existing post
   */
  async updatePost(postId, postData) {
    try {
      const response = await this.client.put(`/wp/v2/posts/${postId}`, postData);
      return response.data;
    } catch (error) {
      logger.error('Failed to update post', { error: error.message, postId });
      throw error;
    }
  }
  
  /**
   * Delete a post
   * @param {number} postId - Post ID
   * @param {boolean} force - Whether to bypass trash and force deletion
   */
  async deletePost(postId, force = false) {
    try {
      const response = await this.client.delete(`/wp/v2/posts/${postId}`, {
        params: { force }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to delete post', { error: error.message, postId });
      throw error;
    }
  }
  
  /**
   * Get all pages
   */
  async getPages(params = {}) {
    try {
      const response = await this.client.get('/wp/v2/pages', { params });
      return response;
    } catch (error) {
      logger.error('Failed to fetch pages', { error: error.message, params });
      throw error;
    }
  }
  
  /**
   * Get a specific page by ID
   */
  async getPage(pageId) {
    try {
      const response = await this.client.get(`/wp/v2/pages/${pageId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch page', { error: error.message, pageId });
      throw error;
    }
  }
  
  /**
   * Create a new page
   */
  async createPage(pageData) {
    try {
      const response = await this.client.post('/wp/v2/pages', pageData);
      return response.data;
    } catch (error) {
      logger.error('Failed to create page', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Update an existing page
   */
  async updatePage(pageId, pageData) {
    try {
      const response = await this.client.put(`/wp/v2/pages/${pageId}`, pageData);
      return response.data;
    } catch (error) {
      logger.error('Failed to update page', { error: error.message, pageId });
      throw error;
    }
  }
  
  /**
   * Delete a page
   * @param {number} pageId - Page ID
   * @param {boolean} force - Whether to bypass trash and force deletion
   */
  async deletePage(pageId, force = false) {
    try {
      const response = await this.client.delete(`/wp/v2/pages/${pageId}`, {
        params: { force }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to delete page', { error: error.message, pageId });
      throw error;
    }
  }
  
  /**
   * Get all installed plugins
   */
  async getPlugins() {
    try {
      // Note: Requires authentication with admin privileges
      const response = await this.client.get('/wp/v2/plugins');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch plugins', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get a specific plugin by slug
   */
  async getPlugin(pluginSlug) {
    try {
      const response = await this.client.get(`/wp/v2/plugins/${pluginSlug}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch plugin', { error: error.message, pluginSlug });
      throw error;
    }
  }
  
  /**
   * Install a plugin from the WordPress.org repository
   */
  async installPlugin(pluginSlug) {
    try {
      const response = await this.client.post(`/wp/v2/plugins`, {
        slug: pluginSlug,
        status: 'inactive'
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to install plugin', { error: error.message, pluginSlug });
      throw error;
    }
  }
  
  /**
   * Upload a plugin from a zip file
   * @param {string|Buffer} file - Path to zip file or file buffer
   */
  async uploadPlugin(file) {
    try {
      // Create form data
      const formData = new FormData();
      
      // Add file data
      if (typeof file === 'string') {
        // File is a path
        formData.append('file', fs.createReadStream(file));
      } else if (Buffer.isBuffer(file)) {
        // File is a buffer
        formData.append('file', file, {
          filename: 'plugin.zip',
          contentType: 'application/zip'
        });
      } else {
        throw new Error('File must be a path string or Buffer');
      }
      
      // Create a custom client for this request with different headers
      const uploadClient = axios.create({
        baseURL: this.client.defaults.baseURL,
        auth: this.client.defaults.auth
      });
      
      // Upload the plugin
      const response = await uploadClient.post('/wp/v2/plugins/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Disposition': 'form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to upload plugin', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Activate a plugin
   */
  async activatePlugin(pluginSlug) {
    try {
      const response = await this.client.put(`/wp/v2/plugins/${pluginSlug}`, {
        status: 'active'
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to activate plugin', { error: error.message, pluginSlug });
      throw error;
    }
  }
  
  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginSlug) {
    try {
      const response = await this.client.put(`/wp/v2/plugins/${pluginSlug}`, {
        status: 'inactive'
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to deactivate plugin', { error: error.message, pluginSlug });
      throw error;
    }
  }
  
  /**
   * Delete a plugin
   */
  async deletePlugin(pluginSlug) {
    try {
      const response = await this.client.delete(`/wp/v2/plugins/${pluginSlug}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to delete plugin', { error: error.message, pluginSlug });
      throw error;
    }
  }
  
  /**
   * Get available themes
   */
  async getThemes() {
    try {
      const response = await this.client.get('/wp/v2/themes');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch themes', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Custom method for GeoDirectory plugin (example)
   * Get GeoDirectory listings
   */
  async getGeoDirectoryListings(params = {}) {
    try {
      // Assuming GeoDirectory exposes REST API endpoints
      const response = await this.client.get('/geodirectory/v2/places', { params });
      return response;
    } catch (error) {
      logger.error('Failed to fetch GeoDirectory listings', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get WooCommerce products
   */
  async getWooCommerceProducts(params = {}) {
    try {
      const response = await this.client.get('/wc/v3/products', { params });
      return response;
    } catch (error) {
      logger.error('Failed to fetch WooCommerce products', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get media items
   */
  async getMedia(params = {}) {
    try {
      const response = await this.client.get('/wp/v2/media', { params });
      return response;
    } catch (error) {
      logger.error('Failed to fetch media items', { error: error.message, params });
      throw error;
    }
  }
  
  /**
   * Get a specific media item by ID
   */
  async getMediaById(mediaId) {
    try {
      const response = await this.client.get(`/wp/v2/media/${mediaId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch media item', { error: error.message, mediaId });
      throw error;
    }
  }
  
  /**
   * Upload a media file
   * @param {string|Buffer} file - Path to file or file buffer
   * @param {Object} metadata - Media metadata
   * @param {string} metadata.title - Media title
   * @param {string} metadata.alt - Alt text
   * @param {string} metadata.description - Media description
   * @param {string} metadata.caption - Media caption
   */
  async uploadMedia(file, metadata = {}) {
    try {
      // Create form data
      const formData = new FormData();
      
      // Add file data
      if (typeof file === 'string') {
        // File is a path
        formData.append('file', fs.createReadStream(file));
      } else if (Buffer.isBuffer(file)) {
        // File is a buffer
        formData.append('file', file, {
          filename: metadata.filename || 'file.jpg',
          contentType: metadata.contentType || 'image/jpeg'
        });
      } else {
        throw new Error('File must be a path string or Buffer');
      }
      
      // Add metadata
      if (metadata.title) formData.append('title', metadata.title);
      if (metadata.alt) formData.append('alt_text', metadata.alt);
      if (metadata.description) formData.append('description', metadata.description);
      if (metadata.caption) formData.append('caption', metadata.caption);
      
      // Create a custom client for this request with different headers
      const uploadClient = axios.create({
        baseURL: this.client.defaults.baseURL,
        auth: this.client.defaults.auth
      });
      
      // Upload the file
      const response = await uploadClient.post('/wp/v2/media', formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Disposition': 'form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to upload media', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Update media item metadata
   */
  async updateMedia(mediaId, metadata) {
    try {
      const response = await this.client.post(`/wp/v2/media/${mediaId}`, metadata);
      return response.data;
    } catch (error) {
      logger.error('Failed to update media item', { error: error.message, mediaId });
      throw error;
    }
  }
  
  /**
   * Delete a media item
   * @param {number} mediaId - Media item ID
   * @param {boolean} force - Whether to bypass trash and force deletion
   */
  async deleteMedia(mediaId, force = false) {
    try {
      const response = await this.client.delete(`/wp/v2/media/${mediaId}`, {
        params: { force }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to delete media item', { error: error.message, mediaId });
      throw error;
    }
  }
}

module.exports = WordPressAPI; 