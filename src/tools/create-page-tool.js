/**
 * Create Page Tool
 * Creates a new page in WordPress
 */
const { BaseTool } = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class CreatePageTool extends BaseTool {
  constructor() {
    super('wordpress_create_page', 'Create a new page in WordPress');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the tool to create a new page
   * @param {Object} params - Parameters for creating the page
   * @param {string} params.title - Title of the page
   * @param {string} params.content - Content of the page
   * @param {boolean} params.useBrowser - Whether to use browser automation (for visual builders)
   * @param {string} params.status - Status of the page (publish, draft, etc.)
   * @param {string} params.template - Page template to use
   * @param {boolean} params.useDivi - Whether to use Divi builder for the page
   * @param {Array} params.categories - Categories to assign to the page
   */
  async execute(params) {
    try {
      const { 
        title, 
        content, 
        useBrowser = false, 
        status = 'publish',
        template = '',
        useDivi = false,
        categories = []
      } = params;
      
      if (!title) {
        throw new Error('Page title is required');
      }
      
      if (!content && !useDivi) {
        throw new Error('Page content is required unless using Divi builder');
      }
      
      // Check if we should use browser automation (for visual editors)
      if (useBrowser) {
        return this.createPageWithBrowser(title, content, { useDivi, template });
      } else {
        return this.createPageWithAPI(title, content, { status, template, categories });
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Create a page using the WordPress REST API
   */
  async createPageWithAPI(title, content, options = {}) {
    try {
      const { status, template, categories } = options;
      
      const pageData = {
        title,
        content,
        status,
        template,
        categories
      };
      
      const newPage = await this.api.createPage(pageData);
      
      return {
        success: true,
        data: {
          id: newPage.id,
          title: newPage.title.rendered,
          status: newPage.status,
          link: newPage.link
        }
      };
    } catch (error) {
      return this.handleError(error, 'createPageWithAPI');
    }
  }
  
  /**
   * Create a page using browser automation
   * This is useful for visual builders like Divi
   */
  async createPageWithBrowser(title, content, options = {}) {
    let browser = null;
    
    try {
      const { useDivi, template } = options;
      
      // Launch browser and login
      await this.browser.launch();
      await this.browser.login();
      
      // Create the page using the browser
      const result = await this.browser.createPage(title, content, {
        useTextEditor: false
      });
      
      // If we want to use Divi builder, open it
      if (useDivi && result.pageId) {
        await this.browser.openDiviBuilder(result.pageId);
        
        // Take a screenshot of the Divi builder
        const screenshotPath = `./divi-builder-${result.pageId}.png`;
        await this.browser.takeScreenshot(screenshotPath);
        
        return {
          success: true,
          data: {
            id: result.pageId,
            title,
            message: 'Page created with Divi Builder opened',
            screenshotPath
          }
        };
      }
      
      return {
        success: true,
        data: {
          id: result.pageId,
          title,
          message: 'Page created successfully using browser automation'
        }
      };
    } catch (error) {
      return this.handleError(error, 'createPageWithBrowser');
    } finally {
      // Always close the browser when done
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
            title: {
              type: "string",
              description: "Title of the page (required)"
            },
            content: {
              type: "string",
              description: "HTML content of the page (required unless using Divi builder)"
            },
            useBrowser: {
              type: "boolean",
              description: "Whether to use browser automation for creation (required for visual builders like Divi)",
              default: false
            },
            status: {
              type: "string",
              enum: ["publish", "draft", "pending", "private"],
              description: "Publication status of the page",
              default: "publish"
            },
            template: {
              type: "string",
              description: "Page template to use (if supported by the theme)",
              default: ""
            },
            useDivi: {
              type: "boolean",
              description: "Whether to use the Divi builder for page creation",
              default: false
            },
            categories: {
              type: "array",
              items: {
                type: "integer"
              },
              description: "Array of category IDs to assign to the page",
              default: []
            }
          },
          required: ["title"]
        }
      }
    };
  }
}

module.exports = CreatePageTool; 