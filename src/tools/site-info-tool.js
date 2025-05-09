/**
 * Enhanced Site Info Tool
 * Gets comprehensive information about the WordPress site
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class SiteInfoTool extends BaseTool {
  constructor() {
    super('wordpress_site_info', 'Get comprehensive information about the WordPress site');
  }
  
  /**
   * Execute the tool to get site information
   * @param {Object} params - Optional parameters
   * @param {boolean} params.includeThemes - Whether to include theme info
   * @param {boolean} params.includePlugins - Whether to include plugin info
   * @param {boolean} params.includeUsers - Whether to include user info (anonymized)
   * @param {boolean} params.includeStats - Whether to include content statistics
   * @param {boolean} params.includeSettings - Whether to include site settings
   */
  async execute(params = {}) {
    try {
      const {
        includeThemes = true,
        includePlugins = true,
        includeUsers = true,
        includeStats = true,
        includeSettings = true
      } = params;
      
      // Get API client from connection pool
      const api = this.getApiClient();
      
      // Get site information from WordPress API
      const siteInfo = await api.getSiteInfo();
      
      // Get current user information
      const currentUser = await api.getCurrentUser();
      
      // Create base response
      const result = {
        success: true,
        data: {
          name: siteInfo.name,
          description: siteInfo.description,
          url: siteInfo.url,
          home: siteInfo.home,
          currentUser: {
            id: currentUser.id,
            name: currentUser.name,
            roles: currentUser.roles
          },
          namespaces: siteInfo.namespaces,
          authentication: {
            application_passwords: siteInfo.authentication?.application_passwords
          },
          gmt_offset: siteInfo.gmt_offset,
          timezone_string: siteInfo.timezone_string
        }
      };
      
      // Add theme information if requested
      if (includeThemes) {
        try {
          const themes = await api.getThemes();
          result.data.themes = {
            active: Object.values(themes).find(theme => theme.active),
            installed: Object.keys(themes),
            count: Object.keys(themes).length
          };
        } catch (error) {
          this.logger.warn('Could not fetch theme information', { error: error.message });
          result.data.themes = { error: 'Could not fetch theme information' };
        }
      }
      
      // Add plugin information if requested
      if (includePlugins) {
        try {
          const plugins = await api.getPlugins();
          result.data.plugins = {
            active: plugins.filter(plugin => plugin.status === 'active').map(p => p.name),
            inactive: plugins.filter(plugin => plugin.status !== 'active').map(p => p.name),
            count: plugins.length
          };
        } catch (error) {
          this.logger.warn('Could not fetch plugin information', { error: error.message });
          result.data.plugins = { error: 'Could not fetch plugin information' };
        }
      }
      
      // Add user information if requested (anonymized)
      if (includeUsers) {
        try {
          // Get browser client from connection pool
          const browser = this.getBrowserClient();
          
          // We'll use browser automation for this as the REST API might not provide all roles
          await browser.launch();
          await browser.login();
          
          // Navigate to the users page and extract information
          await browser.navigateToAdminPage('/users.php');
          
          // Get user role counts using page evaluation
          const roleStats = await browser.page.evaluate(() => {
            const roleLinks = document.querySelectorAll('.subsubsub a');
            const stats = {};
            
            roleLinks.forEach(link => {
              const text = link.textContent;
              const match = text.match(/(\w+) \((\d+)\)/);
              if (match) {
                const role = match[1].toLowerCase();
                const count = parseInt(match[2], 10);
                if (role !== 'all') {
                  stats[role] = count;
                }
              }
            });
            
            return stats;
          });
          
          result.data.users = {
            roles: roleStats,
            totalCount: Object.values(roleStats).reduce((sum, count) => sum + count, 0)
          };
          
          // Browser will be released at the end of execution
        } catch (error) {
          this.logger.warn('Could not fetch user information', { error: error.message });
          result.data.users = { error: 'Could not fetch user information' };
        }
      }
      
      // Add content statistics if requested
      if (includeStats) {
        try {
          // Get posts count
          const posts = await api.getPosts({ per_page: 1 });
          const totalPosts = parseInt(posts.headers?.['x-wp-total'] || '0', 10);
          
          // Get pages count
          const pages = await api.getPages({ per_page: 1 });
          const totalPages = parseInt(pages.headers?.['x-wp-total'] || '0', 10);
          
          result.data.contentStats = {
            posts: totalPosts,
            pages: totalPages,
            lastUpdated: new Date().toISOString()
          };
          
          // Check if WooCommerce is active
          if (result.data.plugins?.active?.some(p => p.toLowerCase().includes('woocommerce'))) {
            try {
              const products = await api.getWooCommerceProducts({ per_page: 1 });
              const totalProducts = parseInt(products.headers?.['x-wp-total'] || '0', 10);
              result.data.contentStats.woocommerce = {
                products: totalProducts
              };
            } catch (error) {
              // WooCommerce might be installed but API not available
              result.data.contentStats.woocommerce = { error: 'Could not fetch WooCommerce stats' };
            }
          }
          
          // Check if GeoDirectory is active
          if (result.data.plugins?.active?.some(p => p.toLowerCase().includes('geodirectory'))) {
            try {
              const listings = await api.getGeoDirectoryListings({ per_page: 1 });
              const totalListings = parseInt(listings.headers?.['x-wp-total'] || '0', 10);
              result.data.contentStats.geodirectory = {
                listings: totalListings
              };
            } catch (error) {
              // GeoDirectory might be installed but API not available
              result.data.contentStats.geodirectory = { error: 'Could not fetch GeoDirectory stats' };
            }
          }
        } catch (error) {
          this.logger.warn('Could not fetch content statistics', { error: error.message });
          result.data.contentStats = { error: 'Could not fetch content statistics' };
        }
      }
      
      // Add site settings if requested
      if (includeSettings) {
        try {
          // Get browser client from connection pool (or reuse existing)
          const browser = this._browserClient || this.getBrowserClient();
          
          // We need to use browser automation for this
          if (!browser.isLoggedIn) {
            await browser.launch();
            await browser.login();
          }
          
          // Navigate to the general settings page
          await browser.navigateToAdminPage('/options-general.php');
          
          // Extract settings using page evaluation
          const generalSettings = await browser.page.evaluate(() => {
            const settings = {};
            const fields = ['blogname', 'blogdescription', 'admin_email', 'siteurl', 'home', 'users_can_register', 'default_role', 'WPLANG', 'timezone_string', 'date_format', 'time_format'];
            
            fields.forEach(field => {
              const element = document.getElementById(field);
              if (element) {
                if (element.type === 'checkbox') {
                  settings[field] = element.checked;
                } else if (element.tagName === 'SELECT') {
                  settings[field] = element.options[element.selectedIndex].value;
                } else {
                  settings[field] = element.value;
                }
              }
            });
            
            return settings;
          });
          
          result.data.settings = {
            general: generalSettings
          };
          
          // Browser will be released at the end of execution
        } catch (error) {
          this.logger.warn('Could not fetch site settings', { error: error.message });
          result.data.settings = { error: 'Could not fetch site settings' };
        }
      }
      
      return result;
    } catch (error) {
      return this.handleError(error);
    } finally {
      // Release connections back to the pool
      await this.releaseConnections();
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
            includeThemes: {
              type: "boolean",
              description: "Whether to include detailed theme information (active theme, installed themes, count)",
              default: true
            },
            includePlugins: {
              type: "boolean",
              description: "Whether to include detailed plugin information (active plugins, inactive plugins, count)",
              default: true
            },
            includeUsers: {
              type: "boolean",
              description: "Whether to include user role statistics (anonymized for privacy and security)",
              default: true
            },
            includeStats: {
              type: "boolean",
              description: "Whether to include content statistics (posts, pages, products if WooCommerce is active, listings if GeoDirectory is active)",
              default: true
            },
            includeSettings: {
              type: "boolean",
              description: "Whether to include WordPress site settings (general settings from the admin panel)",
              default: true
            }
          },
          required: []
        }
      }
    };
  }
}

module.exports = SiteInfoTool; 