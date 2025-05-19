/**
 * Enhanced Site Info Tool
 * Gets comprehensive information about the WordPress site
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');
const crypto = require('crypto');
const config = require('../config');

class SiteInfoTool extends BaseTool {
  constructor() {
    super('wordpress_site_info', 'Get comprehensive information about the WordPress site');
    this.registerMethod('generatePreviewUrl', this.generatePreviewUrl.bind(this));
    this.registerMethod('getSiteHealthMetrics', this.getSiteHealthMetrics.bind(this));
    this.registerMethod('getPerformanceBenchmarks', this.getPerformanceBenchmarks.bind(this));
    this.registerMethod('detectSiteChanges', this.detectSiteChanges.bind(this));
    this.registerMethod('getHostingEnvironmentInfo', this.getHostingEnvironmentInfo.bind(this));
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
   * Generate a secure, time-limited live preview URL for the WordPress site
   * @param {Object} params - Parameters for preview URL generation
   * @param {string} [params.siteUrl] - WordPress site URL (defaults to detected site)
   * @param {string} [params.userId] - User ID for whom the preview is generated
   * @param {number} [params.ttl] - Time to live in seconds (default: 300)
   * @param {Object} context - Execution context (must include user and site)
   * @returns {Object} - { success, previewUrl, expiresAt }
   */
  async generatePreviewUrl(params = {}, context = {}) {
    try {
      // Validate context
      if (!context || !context.site || !context.user) {
        return this.createErrorResponse('INVALID_CONTEXT', 'Context with site and user is required');
      }
      const siteUrl = params.siteUrl || context.site.url;
      const userId = params.userId || context.user.user_id;
      const ttl = Number(params.ttl) > 0 ? Number(params.ttl) : 300; // default 5 min
      const now = Math.floor(Date.now() / 1000);
      const expires = now + ttl;
      // Token payload
      const payload = {
        site: siteUrl,
        user: userId,
        exp: expires
      };
      const payloadStr = JSON.stringify(payload);
      // HMAC-SHA256 signature
      const secret = process.env.TANUKIMCP_MASTER_KEY || config.wordpress.mainPassword || 'changeme';
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
      // Encode payload as base64url
      const payloadB64 = Buffer.from(payloadStr).toString('base64url');
      // Compose token
      const token = `${payloadB64}.${signature}`;
      // Compose preview URL (assume /preview endpoint on the server)
      const previewUrl = `${siteUrl.replace(/\/$/, '')}/?tanukimcp_preview_token=${encodeURIComponent(token)}`;
      return this.createSuccessResponse({
        previewUrl,
        expiresAt: new Date(expires * 1000).toISOString(),
        token
      }, 'Preview URL generated successfully');
    } catch (error) {
      return this.handleError(error, 'generatePreviewUrl');
    }
  }
  
  /**
   * Collect comprehensive site health metrics (production quality)
   * @returns {Promise<Object>} Site health metrics and status
   */
  async getSiteHealthMetrics(params = {}, context = {}) {
    try {
      const api = this.getApiClient();
      const browser = this.getBrowserClient();
      let healthData = {};
      // 1. WordPress core version and update status
      const siteInfo = await api.getSiteInfo();
      healthData.wordpress = {
        version: siteInfo.version,
        updateAvailable: !!siteInfo.core_update,
        coreUpdate: siteInfo.core_update || null
      };
      // 2. Plugin/theme update status
      try {
        const plugins = await api.getPlugins();
        healthData.plugins = {
          total: plugins.length,
          updates: plugins.filter(p => p.update_available).map(p => ({ name: p.name, version: p.version, newVersion: p.new_version })),
          upToDate: plugins.every(p => !p.update_available)
        };
      } catch (e) {
        healthData.plugins = { error: 'Could not fetch plugin update status' };
      }
      try {
        const themes = await api.getThemes();
        healthData.themes = {
          total: Object.keys(themes).length,
          updates: Object.values(themes).filter(t => t.update_available).map(t => ({ name: t.name, version: t.version, newVersion: t.new_version })),
          upToDate: Object.values(themes).every(t => !t.update_available)
        };
      } catch (e) {
        healthData.themes = { error: 'Could not fetch theme update status' };
      }
      // 3. PHP/MySQL version, server info
      try {
        // Use browser automation to get environment info from /wp-admin/site-health.php
        await browser.launch();
        await browser.login();
        await browser.navigateToAdminPage('/site-health.php');
        const envInfo = await browser.page.evaluate(() => {
          const info = {};
          // PHP Version
          const phpRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('PHP Version'));
          if (phpRow) info.phpVersion = phpRow.querySelector('td').textContent.trim();
          // MySQL Version
          const mysqlRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('MySQL Version'));
          if (mysqlRow) info.mysqlVersion = mysqlRow.querySelector('td').textContent.trim();
          // Server
          const serverRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Server Info'));
          if (serverRow) info.server = serverRow.querySelector('td').textContent.trim();
          // SSL
          const sslRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('SSL'));
          if (sslRow) info.ssl = sslRow.querySelector('td').textContent.trim();
          return info;
        });
        healthData.environment = envInfo;
      } catch (e) {
        healthData.environment = { error: 'Could not fetch environment info' };
      }
      // 4. REST API status
      try {
        const restStatus = await api.client.get('/wp/v2');
        healthData.restApi = { available: true, namespaces: Object.keys(restStatus.data) };
      } catch (e) {
        healthData.restApi = { available: false, error: e.message };
      }
      // 5. WP-Cron status (check if scheduled events are running)
      try {
        await browser.navigateToAdminPage('/tools.php?page=site-health');
        const cronStatus = await browser.page.evaluate(() => {
          const cronRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('WP-Cron'));
          if (cronRow) return cronRow.querySelector('td').textContent.trim();
          return 'Unknown';
        });
        healthData.wpCron = { status: cronStatus };
      } catch (e) {
        healthData.wpCron = { error: 'Could not determine WP-Cron status' };
      }
      // 6. Site Health critical issues (from Site Health screen)
      try {
        await browser.navigateToAdminPage('/site-health.php');
        const issues = await browser.page.evaluate(() => {
          const critical = [];
          document.querySelectorAll('.site-health-issue-critical').forEach(el => {
            critical.push(el.textContent.trim());
          });
          return critical;
        });
        healthData.criticalIssues = issues;
      } catch (e) {
        healthData.criticalIssues = { error: 'Could not fetch critical issues' };
      }
      // 7. Sanitize and return
      return this.createSuccessResponse(healthData, 'Site health metrics collected successfully');
    } catch (error) {
      return this.handleError(error, 'getSiteHealthMetrics');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Collect site performance benchmarks (production quality)
   * @returns {Promise<Object>} Site performance metrics
   */
  async getPerformanceBenchmarks(params = {}, context = {}) {
    try {
      const api = this.getApiClient();
      const browser = this.getBrowserClient();
      const siteInfo = await api.getSiteInfo();
      const url = siteInfo.url;
      let benchmarks = {};
      // 1. Page load time (frontend)
      try {
        await browser.launch();
        const start = Date.now();
        await browser.page.goto(url, { waitUntil: 'networkidle2' });
        const loadTime = Date.now() - start;
        benchmarks.pageLoad = { ms: loadTime };
      } catch (e) {
        benchmarks.pageLoad = { error: 'Could not measure page load time' };
      }
      // 2. REST API response time
      try {
        const apiStart = Date.now();
        await api.getSiteInfo();
        const apiTime = Date.now() - apiStart;
        benchmarks.apiResponse = { ms: apiTime };
      } catch (e) {
        benchmarks.apiResponse = { error: 'Could not measure API response time' };
      }
      // 3. DB query time (from Site Health screen)
      try {
        await browser.navigateToAdminPage('/site-health.php');
        const dbTime = await browser.page.evaluate(() => {
          const dbRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Database Query Time'));
          if (dbRow) return dbRow.querySelector('td').textContent.trim();
          return null;
        });
        benchmarks.dbQuery = { value: dbTime };
      } catch (e) {
        benchmarks.dbQuery = { error: 'Could not measure DB query time' };
      }
      // 4. Sanitize and return
      return this.createSuccessResponse(benchmarks, 'Performance benchmarks collected successfully');
    } catch (error) {
      return this.handleError(error, 'getPerformanceBenchmarks');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Detect incremental site changes (production quality)
   * @param {Object} params - { previousContext, currentContext, section (optional) }
   * @returns {Promise<Object>} Site change diff
   */
  async detectSiteChanges(params = {}, context = {}) {
    try {
      const { previousContext, currentContext, section = null } = params;
      // Validate input
      if (!previousContext || !currentContext) {
        return this.createErrorResponse('INVALID_PARAMETERS', 'Both previousContext and currentContext are required');
      }
      // Use context-manager-tool.js for diffing
      const ContextManagerTool = require('./context-manager-tool');
      const contextManager = new ContextManagerTool();
      const diffParams = {
        action: 'diffContexts',
        left: section ? previousContext[section] : previousContext,
        right: section ? currentContext[section] : currentContext
      };
      const diffResult = await contextManager.execute(diffParams, context);
      if (!diffResult.success) {
        return this.createErrorResponse('DIFF_ERROR', diffResult.error || 'Failed to compute diff');
      }
      return this.createSuccessResponse(diffResult.data, 'Site changes detected successfully');
    } catch (error) {
      return this.handleError(error, 'detectSiteChanges');
    }
  }
  
  /**
   * Collect detailed hosting environment information (production quality)
   * @returns {Promise<Object>} Hosting environment details
   */
  async getHostingEnvironmentInfo(params = {}, context = {}) {
    try {
      const api = this.getApiClient();
      const browser = this.getBrowserClient();
      let envInfo = {};
      try {
        await browser.launch();
        await browser.login();
        await browser.navigateToAdminPage('/site-health.php');
        envInfo = await browser.page.evaluate(() => {
          const info = {};
          // Server
          const serverRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Server Info'));
          if (serverRow) info.server = serverRow.querySelector('td').textContent.trim();
          // PHP Version
          const phpRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('PHP Version'));
          if (phpRow) info.phpVersion = phpRow.querySelector('td').textContent.trim();
          // PHP Extensions
          const extRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('PHP Extensions'));
          if (extRow) info.phpExtensions = extRow.querySelector('td').textContent.trim().split(',').map(e => e.trim());
          // Memory Limit
          const memRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Memory Limit'));
          if (memRow) info.memoryLimit = memRow.querySelector('td').textContent.trim();
          // Max Execution Time
          const execRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Max Execution Time'));
          if (execRow) info.maxExecutionTime = execRow.querySelector('td').textContent.trim();
          // Upload Max Filesize
          const uploadRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Upload Max Filesize'));
          if (uploadRow) info.uploadMaxFilesize = uploadRow.querySelector('td').textContent.trim();
          // Post Max Size
          const postRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Post Max Size'));
          if (postRow) info.postMaxSize = postRow.querySelector('td').textContent.trim();
          // Database
          const dbRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Database Name'));
          if (dbRow) info.database = dbRow.querySelector('td').textContent.trim();
          // Disk Space
          const diskRow = Array.from(document.querySelectorAll('tr')).find(row => row.textContent.includes('Disk Space'));
          if (diskRow) info.diskSpace = diskRow.querySelector('td').textContent.trim();
          return info;
        });
      } catch (e) {
        envInfo = { error: 'Could not fetch hosting environment info' };
      }
      return this.createSuccessResponse(envInfo, 'Hosting environment info collected successfully');
    } catch (error) {
      return this.handleError(error, 'getHostingEnvironmentInfo');
    } finally {
      await this.releaseConnections();
    }
  }
  
  /**
   * Get JSON schema for MCP
   */
  getSchema() {
    const baseSchema = {
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
    // Add schema for generatePreviewUrl
    baseSchema.function.parameters.generatePreviewUrl = {
      type: "object",
      description: "Generate a secure, time-limited live preview URL for the WordPress site.",
      properties: {
        siteUrl: { type: "string", description: "WordPress site URL (optional, defaults to context.site.url)" },
        userId: { type: "string", description: "User ID for whom the preview is generated (optional, defaults to context.user.user_id)" },
        ttl: { type: "number", description: "Time to live in seconds (default: 300)" }
      },
      required: []
    };
    return baseSchema;
  }
}

module.exports = SiteInfoTool; 