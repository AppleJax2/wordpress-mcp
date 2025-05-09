/**
 * Plugin Manager Tool
 * Comprehensive tool for managing WordPress plugins
 */
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class PluginManagerTool extends BaseTool {
  constructor() {
    super('wordpress_plugin_manager', 'Comprehensive tool for managing WordPress plugins');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the plugin manager tool
   * @param {Object} params - Parameters for the plugin operation
   * @param {string} params.action - Action to perform (list, get, install, upload, activate, deactivate, delete, update, search)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { action = 'list', data = {} } = params;
      
      switch (action) {
        case 'list':
          return await this.listPlugins(data);
        case 'get':
          return await this.getPluginDetails(data);
        case 'install':
          return await this.installPlugin(data);
        case 'upload':
          return await this.uploadPlugin(data);
        case 'activate':
          return await this.activatePlugin(data);
        case 'deactivate':
          return await this.deactivatePlugin(data);
        case 'delete':
          return await this.deletePlugin(data);
        case 'update':
          return await this.updatePlugin(data);
        case 'search':
          return await this.searchPlugins(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * List plugins with optional filtering
   */
  async listPlugins(data) {
    try {
      const { 
        status = '',
        searchTerm = ''
      } = data;
      
      // Fetch all plugins
      const plugins = await this.api.getPlugins();
      
      // Apply filtering (API doesn't support filtering, so we do it here)
      let filteredPlugins = plugins;
      
      if (status) {
        filteredPlugins = filteredPlugins.filter(plugin => {
          if (status === 'active' && plugin.status === 'active') return true;
          if (status === 'inactive' && plugin.status === 'inactive') return true;
          return false;
        });
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredPlugins = filteredPlugins.filter(plugin => 
          plugin.name.toLowerCase().includes(term) || 
          plugin.description.toLowerCase().includes(term) ||
          plugin.plugin.toLowerCase().includes(term)
        );
      }
      
      return {
        success: true,
        data: {
          plugins: filteredPlugins,
          total: filteredPlugins.length,
          activeCount: filteredPlugins.filter(p => p.status === 'active').length,
          inactiveCount: filteredPlugins.filter(p => p.status === 'inactive').length
        }
      };
    } catch (error) {
      return this.handleError(error, 'listPlugins');
    }
  }
  
  /**
   * Get detailed information about a specific plugin
   */
  async getPluginDetails(data) {
    try {
      const { pluginSlug } = data;
      
      if (!pluginSlug) {
        throw new Error('Plugin slug is required');
      }
      
      const plugin = await this.api.getPlugin(pluginSlug);
      
      return {
        success: true,
        data: {
          plugin
        }
      };
    } catch (error) {
      return this.handleError(error, 'getPluginDetails');
    }
  }
  
  /**
   * Install a plugin from the WordPress.org repository
   */
  async installPlugin(data) {
    try {
      const { 
        pluginSlug,
        activate = false
      } = data;
      
      if (!pluginSlug) {
        throw new Error('Plugin slug is required');
      }
      
      // Install the plugin
      const plugin = await this.api.installPlugin(pluginSlug);
      
      // Activate if requested
      if (activate && plugin) {
        await this.api.activatePlugin(plugin.plugin);
      }
      
      return {
        success: true,
        data: {
          plugin,
          activated: activate
        }
      };
    } catch (error) {
      return this.handleError(error, 'installPlugin');
    }
  }
  
  /**
   * Upload a plugin from a zip file
   */
  async uploadPlugin(data) {
    try {
      const { 
        fileUrl = '',
        filePath = '',
        fileBuffer = null,
        activate = false
      } = data;
      
      let file;
      
      // Determine file source and get the file
      if (fileUrl) {
        // Download file from URL
        this.logger.info(`Downloading plugin from URL: ${fileUrl}`);
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download plugin: ${response.statusText}`);
        }
        
        file = await response.buffer();
      } else if (filePath) {
        // Use local file path
        file = filePath;
      } else if (fileBuffer) {
        // Use provided buffer
        file = Buffer.from(fileBuffer, 'base64');
      } else {
        throw new Error('No file provided. Provide fileUrl, filePath, or fileBuffer');
      }
      
      // Upload the plugin
      const plugin = await this.api.uploadPlugin(file);
      
      // Activate if requested
      if (activate && plugin) {
        await this.api.activatePlugin(plugin.plugin);
      }
      
      return {
        success: true,
        data: {
          plugin,
          activated: activate
        }
      };
    } catch (error) {
      return this.handleError(error, 'uploadPlugin');
    }
  }
  
  /**
   * Activate a plugin
   */
  async activatePlugin(data) {
    try {
      const { pluginSlug } = data;
      
      if (!pluginSlug) {
        throw new Error('Plugin slug is required');
      }
      
      const plugin = await this.api.activatePlugin(pluginSlug);
      
      return {
        success: true,
        data: {
          plugin,
          message: `Plugin ${pluginSlug} activated successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'activatePlugin');
    }
  }
  
  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(data) {
    try {
      const { pluginSlug } = data;
      
      if (!pluginSlug) {
        throw new Error('Plugin slug is required');
      }
      
      const plugin = await this.api.deactivatePlugin(pluginSlug);
      
      return {
        success: true,
        data: {
          plugin,
          message: `Plugin ${pluginSlug} deactivated successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'deactivatePlugin');
    }
  }
  
  /**
   * Delete a plugin
   */
  async deletePlugin(data) {
    try {
      const { pluginSlug } = data;
      
      if (!pluginSlug) {
        throw new Error('Plugin slug is required');
      }
      
      const result = await this.api.deletePlugin(pluginSlug);
      
      return {
        success: true,
        data: {
          result,
          message: `Plugin ${pluginSlug} deleted successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'deletePlugin');
    }
  }
  
  /**
   * Update a plugin
   * For this we need to use browser automation as the REST API doesn't support updating plugins
   */
  async updatePlugin(data) {
    try {
      const { pluginSlug } = data;
      
      if (!pluginSlug) {
        throw new Error('Plugin slug is required');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to plugins page
      await this.browser.navigateToAdminPage('/plugins.php');
      
      // Check if plugin has an update
      const hasUpdate = await this.browser.page.evaluate((slug) => {
        const pluginRow = document.querySelector(`tr[data-plugin="${slug}"]`);
        if (!pluginRow) return false;
        
        return !!pluginRow.querySelector('.update-message');
      }, pluginSlug);
      
      if (!hasUpdate) {
        return {
          success: true,
          data: {
            message: `Plugin ${pluginSlug} is already up to date`,
            updated: false
          }
        };
      }
      
      // Click the update link
      await this.browser.page.evaluate((slug) => {
        const updateLink = document.querySelector(`tr[data-plugin="${slug}"] .update-link`);
        if (updateLink) updateLink.click();
      }, pluginSlug);
      
      // Wait for update to complete
      await this.browser.page.waitForSelector('#wpbody-content .updated, #wpbody-content .error', { timeout: 30000 });
      
      // Check if update was successful
      const updateSuccess = await this.browser.page.evaluate(() => {
        const errorElement = document.querySelector('#wpbody-content .error');
        return !errorElement;
      });
      
      // Take a screenshot of the result
      const screenshotPath = `./plugin-update-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: updateSuccess 
            ? `Plugin ${pluginSlug} updated successfully` 
            : `Failed to update plugin ${pluginSlug}`,
          updated: updateSuccess,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'updatePlugin');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Search for plugins in the WordPress.org repository
   * Using browser automation since the REST API doesn't have a direct endpoint for this
   */
  async searchPlugins(data) {
    try {
      const { 
        searchTerm, 
        category = '',
        page = 1 
      } = data;
      
      if (!searchTerm) {
        throw new Error('Search term is required');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to plugin installation page
      await this.browser.navigateToAdminPage('/plugin-install.php');
      
      // Enter search term
      await this.browser.page.type('#search-plugins', searchTerm);
      
      // Apply category filter if provided
      if (category) {
        await this.browser.page.select('#typeselector', category);
      }
      
      // Click search button
      await this.browser.page.click('#search-submit');
      
      // Wait for results to load
      await this.browser.page.waitForSelector('.plugin-card, .no-plugin-results');
      
      // Navigate to specific page if needed
      if (page > 1) {
        const hasNextPage = await this.browser.page.evaluate((targetPage) => {
          const pageLinks = document.querySelectorAll('.pagination-links a');
          for (const link of pageLinks) {
            if (link.textContent.trim() === String(targetPage)) {
              link.click();
              return true;
            }
          }
          return false;
        }, page);
        
        if (hasNextPage) {
          // Wait for page to load
          await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
      }
      
      // Extract search results
      const results = await this.browser.page.evaluate(() => {
        const plugins = [];
        const cards = document.querySelectorAll('.plugin-card');
        
        cards.forEach(card => {
          const nameElement = card.querySelector('.plugin-card-top h3');
          const descriptionElement = card.querySelector('.plugin-card-top .column-description p');
          const authorElement = card.querySelector('.plugin-card-top .column-updated a');
          const ratingElement = card.querySelector('.plugin-card-top .column-rating .star-rating');
          const detailsLink = card.querySelector('.plugin-card-top h3 a');
          const downloadLink = card.querySelector('.plugin-action-buttons .install-now');
          
          // Extract slug from various possible sources
          let slug = '';
          if (downloadLink && downloadLink.getAttribute('data-slug')) {
            slug = downloadLink.getAttribute('data-slug');
          } else if (detailsLink && detailsLink.href) {
            const match = detailsLink.href.match(/plugin-install\.php\?tab=plugin-information&plugin=([^&]+)/);
            if (match && match[1]) {
              slug = match[1];
            }
          }
          
          plugins.push({
            name: nameElement ? nameElement.textContent.trim() : 'Unknown Plugin',
            description: descriptionElement ? descriptionElement.textContent.trim() : '',
            author: authorElement ? authorElement.textContent.trim() : 'Unknown',
            rating: ratingElement ? parseFloat(ratingElement.getAttribute('data-rating') || '0') : 0,
            slug: slug,
            detailsUrl: detailsLink ? detailsLink.href : ''
          });
        });
        
        // Get pagination info
        const paginationElement = document.querySelector('.pagination-links');
        let currentPage = 1;
        let totalPages = 1;
        
        if (paginationElement) {
          const currentSpan = paginationElement.querySelector('.current');
          if (currentSpan) {
            currentPage = parseInt(currentSpan.textContent.trim(), 10) || 1;
          }
          
          const totalSpan = paginationElement.querySelector('.total-pages');
          if (totalSpan) {
            totalPages = parseInt(totalSpan.textContent.trim(), 10) || 1;
          }
        }
        
        return {
          plugins,
          pagination: {
            currentPage,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
          }
        };
      });
      
      // Take a screenshot of the search results
      const screenshotPath = `./plugin-search-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          results: results.plugins,
          pagination: results.pagination,
          searchTerm,
          category,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'searchPlugins');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
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
              enum: ["list", "get", "install", "upload", "activate", "deactivate", "delete", "update", "search"],
              description: "Action to perform on WordPress plugins",
              default: "list"
            },
            data: {
              type: "object",
              description: "Data specific to the selected plugin action",
              properties: {
                // For list action
                status: { 
                  type: "string", 
                  enum: ["", "active", "inactive"],
                  description: "Filter plugins by activation status",
                  default: ""
                },
                searchTerm: { 
                  type: "string",
                  description: "Search term to filter plugins by name or description in the local plugin list"
                },
                
                // For get, activate, deactivate, delete, update actions
                pluginSlug: { 
                  type: "string",
                  description: "Plugin slug identifier (e.g., 'akismet', 'contact-form-7', 'woocommerce')"
                },
                
                // For install action
                activate: { 
                  type: "boolean",
                  description: "Whether to activate the plugin immediately after installation",
                  default: false
                },
                
                // For upload action
                fileUrl: { 
                  type: "string",
                  description: "URL to plugin zip file (e.g., 'https://downloads.wordpress.org/plugin/akismet.5.1.zip')"
                },
                filePath: { 
                  type: "string",
                  description: "Local path to plugin zip file on the server (e.g., '/path/to/plugin.zip')"
                },
                fileBuffer: { 
                  type: "string",
                  description: "Base64 encoded plugin zip file contents"
                },
                
                // For search action
                category: { 
                  type: "string",
                  enum: ["", "featured", "popular", "recommended", "favorites"],
                  description: "Plugin category filter for WordPress.org repository searches",
                  default: ""
                },
                page: { 
                  type: "integer",
                  description: "Results page number for paginated search results",
                  default: 1,
                  minimum: 1
                }
              }
            }
          },
          required: ["action"]
        }
      }
    };
  }
}

module.exports = PluginManagerTool; 