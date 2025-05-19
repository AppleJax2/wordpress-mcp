const { BaseTool } = require('./base-tool');
const WordPressBrowser = require('../browser/browser');

class NavigationOptimizerTool extends BaseTool {
  constructor() {
    super('navigation_optimizer', 'Analyzes and enhances site navigation structure');
    this.browser = new WordPressBrowser();
    this.defaultOptions = {
      maxDepth: 2,
      keyPages: ['home', 'about', 'blog', 'contact']
    };
  }

  /**
   * Fetch current navigation items for a given menu ID
   * @param {Object} data - { menuId: number }
   * @returns {Promise<Array>} Array of navigation items
   */
  async fetchCurrentNavigation({ menuId }) {
    if (!menuId) {
      throw new Error('menuId is required');
    }
    try {
      await this.browser.launch();
      await this.browser.login();
      await this.browser.navigateToAdminPage(`/nav-menus.php?menu=${menuId}`);
      const structure = await this.browser.page.evaluate(() => {
        const items = [];
        const elements = Array.from(document.querySelectorAll('#menu-to-edit li.menu-item'));
        elements.forEach(el => {
          const id = parseInt(el.id.replace('menu-item-', ''), 10);
          const titleEl = el.querySelector('.menu-item-title .item-title');
          const urlEl = el.querySelector('.menu-item-settings input.menu-item-url');
          const depthClass = Array.from(el.classList).find(c => c.startsWith('menu-item-depth-'));
          const depth = depthClass ? parseInt(depthClass.replace('menu-item-depth-', ''), 10) : 0;
          items.push({ id, title: titleEl ? titleEl.textContent.trim() : '', url: urlEl ? urlEl.value : '', depth });
        });
        return items;
      });
      return structure;
    } catch (error) {
      this.logger.error('Failed to fetch navigation', { error: error.message, menuId });
      throw error;
    }
  }

  /**
   * Analyze a navigation structure against optimization rules
   * @param {Object} data - { structure: Array, options?: Object }
   * @returns {Promise<Object>} Analysis report
   */
  async analyzeNavigation({ structure, options = {} }) {
    if (!Array.isArray(structure)) {
      throw new Error('structure must be an array of navigation items');
    }
    try {
      const opts = { ...this.defaultOptions, ...options };
      const report = { issues: [], stats: {} };
      // Depth issues
      structure.forEach(item => {
        if (item.depth > opts.maxDepth) {
          report.issues.push({ type: 'depth_exceeded', item });
        }
      });
      // Duplicates
      const seen = {};
      structure.forEach(item => {
        const key = `${item.title}|${item.url}`;
        seen[key] = (seen[key] || 0) + 1;
      });
      Object.entries(seen).forEach(([key, count]) => {
        if (count > 1) {
          report.issues.push({ type: 'duplicate_item', key, count });
        }
      });
      // Missing key pages
      opts.keyPages.forEach(page => {
        const found = structure.some(item => item.title.toLowerCase().includes(page) || item.url.includes(`/${page}`));
        if (!found) {
          report.issues.push({ type: 'missing_key_page', page });
        }
      });
      report.stats.totalItems = structure.length;
      return report;
    } catch (error) {
      this.logger.error('Failed to analyze navigation', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize navigation by applying heuristics and returning a recommended structure
   * @param {Object} data - { menuId: number, options?: Object }
   * @returns {Promise<Object>} Recommended structure
   */
  async optimizeNavigation({ menuId, options = {} }) {
    if (!menuId) {
      throw new Error('menuId is required');
    }
    try {
      const structure = await this.fetchCurrentNavigation({ menuId });
      const opts = { ...this.defaultOptions, ...options };
      const recommended = [];
      const lower = str => String(str).toLowerCase();
      // Identify key items
      const home = structure.find(i => lower(i.title) === 'home') || null;
      const contact = structure.find(i => lower(i.title) === 'contact') || null;
      const others = structure.filter(i => i !== home && i !== contact);
      // Sort others alphabetically
      const sortedOthers = others.sort((a, b) => a.title.localeCompare(b.title));
      if (home) recommended.push({ ...home, depth: 0 });
      sortedOthers.forEach(item => {
        recommended.push({ ...item, depth: Math.min(item.depth, opts.maxDepth) });
      });
      if (contact) recommended.push({ ...contact, depth: 0 });
      return { recommendedStructure: recommended };
    } catch (error) {
      this.logger.error('Failed to optimize navigation', { error: error.message, menuId });
      throw error;
    }
  }

  /**
   * Dispatches actions: fetch, analyze, optimize
   */
  async run(data) {
    const { action } = data;
    switch (action) {
      case 'fetch':
        return this.fetchCurrentNavigation(data);
      case 'analyze':
        return this.analyzeNavigation(data);
      case 'optimize':
        return this.optimizeNavigation(data);
      default:
        throw new Error(`Unknown action: ${action}`);
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
              enum: ["fetch", "analyze", "optimize"],
              description: "The navigation optimization action to perform",
              default: "optimize"
            },
            menuId: {
              type: "integer",
              description: "WordPress menu ID to analyze or optimize (required for 'fetch' and 'optimize' actions)"
            },
            structure: {
              type: "array",
              description: "Navigation structure to analyze (required for 'analyze' action)",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "integer",
                    description: "Menu item ID"
                  },
                  title: {
                    type: "string",
                    description: "Display title of the menu item"
                  },
                  url: {
                    type: "string",
                    description: "URL of the menu item"
                  },
                  depth: {
                    type: "integer",
                    description: "Nesting depth of the menu item (0 = top level)",
                    minimum: 0
                  }
                },
                required: ["title", "url", "depth"]
              }
            },
            options: {
              type: "object",
              description: "Configuration options for navigation analysis and optimization",
              properties: {
                maxDepth: {
                  type: "integer",
                  description: "Maximum recommended nesting depth for navigation items",
                  default: 2,
                  minimum: 1,
                  maximum: 5
                },
                keyPages: {
                  type: "array",
                  description: "Important pages that should be present in the navigation",
                  items: {
                    type: "string"
                  },
                  default: ["home", "about", "blog", "contact"]
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

module.exports = NavigationOptimizerTool; 