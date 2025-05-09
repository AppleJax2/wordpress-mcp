/**
 * Content Manager Tool
 * Comprehensive tool for managing WordPress pages and posts
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class ContentManagerTool extends BaseTool {
  constructor() {
    super('wordpress_content_manager', 'Comprehensive tool for managing WordPress pages and posts');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the content manager tool
   * @param {Object} params - Parameters for the content operation
   * @param {string} params.action - Action to perform (list, create, get, update, delete, screenshot, buildWithDivi)
   * @param {string} params.contentType - Type of content (page, post, custom)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { 
        action = 'list', 
        contentType = 'page',
        data = {} 
      } = params;
      
      switch (action) {
        case 'list':
          return await this.listContent(contentType, data);
        case 'create':
          return await this.createContent(contentType, data);
        case 'get':
          return await this.getContent(contentType, data);
        case 'update':
          return await this.updateContent(contentType, data);
        case 'delete':
          return await this.deleteContent(contentType, data);
        case 'screenshot':
          return await this.takeScreenshot(contentType, data);
        case 'buildWithDivi':
          return await this.buildWithDivi(contentType, data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * List content with optional filtering
   */
  async listContent(contentType, data) {
    try {
      const { 
        search = '',
        status = '',
        author = '',
        parent = null,
        order = 'desc',
        orderBy = 'date',
        page = 1,
        perPage = 20
      } = data;
      
      // Build parameters
      const params = {
        search,
        status,
        page,
        per_page: perPage,
        order,
        orderby: orderBy
      };
      
      if (author) params.author = author;
      if (parent !== null) params.parent = parent;
      
      // Get content
      let response;
      if (contentType === 'page') {
        response = await this.api.getPages(params);
      } else if (contentType === 'post') {
        response = await this.api.getPosts(params);
      } else {
        // Handle custom post types if they're supported by REST API
        throw new Error(`Custom post type "${contentType}" not yet supported`);
      }
      
      // Extract pagination info
      const totalItems = parseInt(response.headers?.['x-wp-total'] || '0', 10);
      const totalPages = parseInt(response.headers?.['x-wp-totalpages'] || '0', 10);
      
      return {
        success: true,
        data: {
          items: response.data,
          totalItems,
          totalPages,
          currentPage: page
        }
      };
    } catch (error) {
      return this.handleError(error, 'listContent');
    }
  }
  
  /**
   * Create new content (page or post)
   */
  async createContent(contentType, data) {
    try {
      const { 
        title, 
        content,
        status = 'draft',
        excerpt = '',
        featuredMedia = null,
        template = '',
        parent = 0,
        order = 0,
        categories = [],
        tags = [],
        meta = {},
        useBrowser = false,
        useDivi = false
      } = data;
      
      // Required fields
      if (!title) {
        throw new Error('Title is required');
      }
      
      // If using browser or Divi, use the browser workflow
      if (useBrowser || useDivi) {
        return await this.createContentWithBrowser(contentType, data);
      }
      
      // Create the content object
      const contentData = {
        title,
        content: content || '',
        status,
        parent,
        menu_order: order
      };
      
      // Add optional fields
      if (excerpt) contentData.excerpt = excerpt;
      if (featuredMedia) contentData.featured_media = featuredMedia;
      if (template) contentData.template = template;
      
      // Add taxonomy terms
      if (contentType === 'post') {
        if (categories && categories.length > 0) contentData.categories = categories;
        if (tags && tags.length > 0) contentData.tags = tags;
      }
      
      // Add metadata if provided
      if (meta && Object.keys(meta).length > 0) {
        contentData.meta = meta;
      }
      
      // Create the content
      let result;
      if (contentType === 'page') {
        result = await this.api.createPage(contentData);
      } else if (contentType === 'post') {
        result = await this.api.createPost(contentData);
      } else {
        throw new Error(`Custom post type "${contentType}" not yet supported`);
      }
      
      return {
        success: true,
        data: {
          id: result.id,
          title: result.title.rendered,
          status: result.status,
          link: result.link,
          contentType
        }
      };
    } catch (error) {
      return this.handleError(error, 'createContent');
    }
  }
  
  /**
   * Create content using browser automation
   */
  async createContentWithBrowser(contentType, data) {
    try {
      const { 
        title, 
        content = '',
        useDivi = false,
        template = '',
        status = 'draft'
      } = data;
      
      // Required fields
      if (!title) {
        throw new Error('Title is required');
      }
      
      // Launch browser and login
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the appropriate new content screen
      let newContentUrl = '';
      if (contentType === 'page') {
        newContentUrl = '/post-new.php?post_type=page';
      } else if (contentType === 'post') {
        newContentUrl = '/post-new.php';
      } else {
        newContentUrl = `/post-new.php?post_type=${contentType}`;
      }
      
      await this.browser.navigateToAdminPage(newContentUrl);
      
      // Check if we're using block editor (Gutenberg) or classic editor
      const isGutenberg = await this.browser.page.evaluate(() => {
        return !!document.querySelector('.block-editor');
      });
      
      // Fill in title
      if (isGutenberg) {
        await this.browser.page.waitForSelector('.editor-post-title__input');
        await this.browser.page.type('.editor-post-title__input', title);
      } else {
        await this.browser.page.waitForSelector('#title');
        await this.browser.page.type('#title', title);
      }
      
      // Fill in content (if provided and not using Divi)
      if (content && !useDivi) {
        if (isGutenberg) {
          // For Gutenberg, wait for the block editor to be ready
          await this.browser.page.waitForSelector('.block-editor-block-list__layout');
          
          // Click to add a block
          await this.browser.page.click('.block-editor-inserter__toggle');
          await this.browser.page.waitForSelector('.block-editor-inserter__quick-inserter .block-editor-block-types-list__item');
          
          // Add a paragraph block
          const paragraphBlockSelector = '.block-editor-inserter__quick-inserter .block-editor-block-types-list__item:first-child';
          await this.browser.page.click(paragraphBlockSelector);
          
          // Type the content
          await this.browser.page.keyboard.type(content);
        } else {
          // For classic editor, check if Visual or Text tab is active
          const isTextTab = await this.browser.page.evaluate(() => {
            return document.querySelector('#content-html.active') !== null;
          });
          
          if (isTextTab) {
            // Text tab active, type directly
            await this.browser.page.waitForSelector('#content');
            await this.browser.page.type('#content', content);
          } else {
            // Visual tab active, we need to use the TinyMCE iframe
            const frame = this.browser.page.frames().find(f => f.name() === 'content_ifr');
            if (frame) {
              await frame.waitForSelector('body');
              await frame.type('body', content);
            } else {
              this.logger.warn('TinyMCE iframe not found, falling back to text editor');
              await this.browser.page.click('#content-html');
              await this.browser.page.waitForSelector('#content');
              await this.browser.page.type('#content', content);
            }
          }
        }
      }
      
      // Set template if provided (pages only)
      if (template && contentType === 'page') {
        try {
          // Template select is in the Page Attributes metabox
          // First make sure the metabox is visible
          const isPageAttributesVisible = await this.browser.page.evaluate(() => {
            const metabox = document.querySelector('#pageparentdiv, .components-panel__body:has(h2:contains("Page Attributes"))');
            return metabox && window.getComputedStyle(metabox).display !== 'none';
          });
          
          if (!isPageAttributesVisible) {
            if (isGutenberg) {
              // Open the Page Attributes panel in Gutenberg
              await this.browser.page.evaluate(() => {
                const panels = Array.from(document.querySelectorAll('.components-panel__body'));
                const pageAttributesPanel = panels.find(panel => 
                  panel.querySelector('h2')?.textContent.includes('Page Attributes')
                );
                if (pageAttributesPanel && !pageAttributesPanel.classList.contains('is-opened')) {
                  pageAttributesPanel.querySelector('button').click();
                }
              });
            } else {
              // Open the Page Attributes metabox in classic editor
              await this.browser.page.evaluate(() => {
                const metabox = document.querySelector('#pageparentdiv');
                if (metabox && metabox.classList.contains('closed')) {
                  metabox.querySelector('h2, button.components-panel__body-toggle').click();
                }
              });
            }
          }
          
          // Now select the template
          if (isGutenberg) {
            await this.browser.page.waitForSelector('select.editor-page-attributes__template');
            await this.browser.page.select('select.editor-page-attributes__template', template);
          } else {
            await this.browser.page.waitForSelector('#page_template');
            await this.browser.page.select('#page_template', template);
          }
        } catch (error) {
          this.logger.warn(`Failed to set template: ${error.message}`);
        }
      }
      
      // Set status
      if (status !== 'draft') {
        try {
          if (isGutenberg) {
            // Open publish panel
            await this.browser.page.click('.editor-post-publish-panel__toggle');
            await this.browser.page.waitForSelector('.editor-post-publish-panel');
            
            if (status === 'publish') {
              // Publish immediately
              await this.browser.page.click('.editor-post-publish-button');
            } else {
              // For other statuses (private, pending, etc.)
              await this.browser.page.click('.edit-post-post-visibility__toggle');
              await this.browser.page.waitForSelector('.edit-post-post-visibility__dialog');
              
              if (status === 'private') {
                await this.browser.page.click('input[value="private"]');
              } else if (status === 'pending') {
                await this.browser.page.click('input[value="pending"]');
              }
              
              // Save the changes
              await this.browser.page.click('.editor-post-publish-button');
            }
          } else {
            // Classic editor
            if (status === 'publish') {
              await this.browser.page.click('#publish');
            } else if (status === 'pending') {
              await this.browser.page.select('#post_status', 'pending');
              await this.browser.page.click('#save-post');
            } else if (status === 'private') {
              await this.browser.page.select('#visibility', 'private');
              await this.browser.page.click('#publish');
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to set status: ${error.message}`);
        }
      } else {
        // Just save as draft
        if (isGutenberg) {
          await this.browser.page.click('.editor-post-save-draft');
        } else {
          await this.browser.page.click('#save-post');
        }
      }
      
      // Wait for save to complete
      await this.browser.page.waitForTimeout(2000);
      
      // Get the content ID from the URL
      const url = this.browser.page.url();
      const match = url.match(/post=(\d+)/);
      const contentId = match ? match[1] : null;
      
      if (!contentId) {
        throw new Error('Failed to get content ID after creation');
      }
      
      // If Divi builder is requested, open it
      if (useDivi && contentId) {
        try {
          await this.browser.openDiviBuilder(contentId);
          
          // Take a screenshot of Divi builder
          const screenshotPath = `./divi-builder-${contentId}.png`;
          await this.browser.takeScreenshot(screenshotPath);
          
          return {
            success: true,
            data: {
              id: contentId,
              title,
              status,
              contentType,
              diviBuilder: true,
              message: 'Content created with Divi builder opened',
              screenshotPath
            }
          };
        } catch (error) {
          this.logger.warn(`Failed to open Divi builder: ${error.message}`);
          // Continue with normal response even if Divi fails
        }
      }
      
      // Take screenshot for confirmation
      const screenshotPath = `./content-created-${contentId}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          id: contentId,
          title,
          status,
          contentType,
          message: `${contentType} created successfully with browser`,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'createContentWithBrowser');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Get details of an existing content item
   */
  async getContent(contentType, data) {
    try {
      const { id } = data;
      
      if (!id) {
        throw new Error('Content ID is required');
      }
      
      let content;
      if (contentType === 'page') {
        content = await this.api.getPage(id);
      } else if (contentType === 'post') {
        content = await this.api.getPost(id);
      } else {
        throw new Error(`Custom post type "${contentType}" not yet supported`);
      }
      
      return {
        success: true,
        data: {
          content,
          contentType
        }
      };
    } catch (error) {
      return this.handleError(error, 'getContent');
    }
  }
  
  /**
   * Update existing content
   */
  async updateContent(contentType, data) {
    try {
      const { 
        id,
        title,
        content,
        status,
        excerpt,
        featuredMedia,
        template,
        parent,
        order,
        categories,
        tags,
        meta,
        useBrowser = false,
        useDivi = false
      } = data;
      
      if (!id) {
        throw new Error('Content ID is required');
      }
      
      // If using browser or Divi, use the browser workflow
      if (useBrowser || useDivi) {
        return await this.updateContentWithBrowser(contentType, data);
      }
      
      // Create update object with only provided fields
      const contentData = {};
      if (title !== undefined) contentData.title = title;
      if (content !== undefined) contentData.content = content;
      if (status !== undefined) contentData.status = status;
      if (excerpt !== undefined) contentData.excerpt = excerpt;
      if (featuredMedia !== undefined) contentData.featured_media = featuredMedia;
      if (template !== undefined) contentData.template = template;
      if (parent !== undefined) contentData.parent = parent;
      if (order !== undefined) contentData.menu_order = order;
      
      // Add taxonomy terms for posts
      if (contentType === 'post') {
        if (categories !== undefined) contentData.categories = categories;
        if (tags !== undefined) contentData.tags = tags;
      }
      
      // Add meta fields if provided
      if (meta !== undefined) contentData.meta = meta;
      
      // Update the content
      let result;
      if (contentType === 'page') {
        result = await this.api.updatePage(id, contentData);
      } else if (contentType === 'post') {
        result = await this.api.updatePost(id, contentData);
      } else {
        throw new Error(`Custom post type "${contentType}" not yet supported`);
      }
      
      return {
        success: true,
        data: {
          id: result.id,
          title: result.title.rendered,
          status: result.status,
          link: result.link,
          contentType
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateContent');
    }
  }
  
  /**
   * Update content using browser automation
   */
  async updateContentWithBrowser(contentType, data) {
    try {
      const { 
        id,
        title,
        content,
        useDivi = false
      } = data;
      
      if (!id) {
        throw new Error('Content ID is required');
      }
      
      // Launch browser and login
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the edit page
      await this.browser.navigateToAdminPage(`/post.php?post=${id}&action=edit`);
      
      // Check if we're using block editor (Gutenberg) or classic editor
      const isGutenberg = await this.browser.page.evaluate(() => {
        return !!document.querySelector('.block-editor');
      });
      
      // Update title if provided
      if (title !== undefined) {
        if (isGutenberg) {
          await this.browser.page.waitForSelector('.editor-post-title__input');
          await this.browser.page.evaluate((value) => {
            document.querySelector('.editor-post-title__input').value = '';
          }, '');
          await this.browser.page.type('.editor-post-title__input', title);
        } else {
          await this.browser.page.waitForSelector('#title');
          await this.browser.page.evaluate(() => {
            document.querySelector('#title').value = '';
          });
          await this.browser.page.type('#title', title);
        }
      }
      
      // Update content if provided and not using Divi
      if (content !== undefined && !useDivi) {
        if (isGutenberg) {
          // We need to clear existing content and add new content
          // This is complex in Gutenberg, so we use a simplified approach
          
          // Select all blocks
          await this.browser.page.keyboard.down('Control');
          await this.browser.page.keyboard.press('a');
          await this.browser.page.keyboard.up('Control');
          
          // Delete selected blocks
          await this.browser.page.keyboard.press('Delete');
          
          // Add a new paragraph block
          await this.browser.page.click('.block-editor-inserter__toggle');
          await this.browser.page.waitForSelector('.block-editor-inserter__quick-inserter .block-editor-block-types-list__item');
          await this.browser.page.click('.block-editor-inserter__quick-inserter .block-editor-block-types-list__item:first-child');
          
          // Type the new content
          await this.browser.page.keyboard.type(content);
        } else {
          // For classic editor
          const isTextTab = await this.browser.page.evaluate(() => {
            return document.querySelector('#content-html.active') !== null;
          });
          
          if (isTextTab) {
            // Text tab active
            await this.browser.page.waitForSelector('#content');
            await this.browser.page.evaluate(() => {
              document.querySelector('#content').value = '';
            });
            await this.browser.page.type('#content', content);
          } else {
            // Visual tab active, switch to text for simplicity
            await this.browser.page.click('#content-html');
            await this.browser.page.waitForSelector('#content');
            await this.browser.page.evaluate(() => {
              document.querySelector('#content').value = '';
            });
            await this.browser.page.type('#content', content);
            // Switch back to visual
            await this.browser.page.click('#content-tmce');
          }
        }
      }
      
      // Save the changes
      if (isGutenberg) {
        await this.browser.page.click('.editor-post-save-draft, .editor-post-publish-panel__toggle');
        
        // Check if it opened the publish panel
        const hasPublishPanel = await this.browser.page.evaluate(() => {
          return !!document.querySelector('.editor-post-publish-panel');
        });
        
        if (hasPublishPanel) {
          await this.browser.page.click('.editor-post-publish-button');
        }
      } else {
        await this.browser.page.click('#save-post, #publish');
      }
      
      // Wait for save to complete
      await this.browser.page.waitForTimeout(2000);
      
      // If Divi builder is requested, open it
      if (useDivi) {
        try {
          await this.browser.openDiviBuilder(id);
          
          // Take a screenshot of Divi builder
          const screenshotPath = `./divi-builder-${id}.png`;
          await this.browser.takeScreenshot(screenshotPath);
          
          return {
            success: true,
            data: {
              id,
              title,
              contentType,
              diviBuilder: true,
              message: 'Content updated and Divi builder opened',
              screenshotPath
            }
          };
        } catch (error) {
          this.logger.warn(`Failed to open Divi builder: ${error.message}`);
          // Continue with normal response even if Divi fails
        }
      }
      
      // Take screenshot for confirmation
      const screenshotPath = `./content-updated-${id}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          id,
          contentType,
          message: `${contentType} updated successfully`,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateContentWithBrowser');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Delete content
   */
  async deleteContent(contentType, data) {
    try {
      const { id, force = false } = data;
      
      if (!id) {
        throw new Error('Content ID is required');
      }
      
      // Delete the content
      let result;
      if (contentType === 'page') {
        result = await this.api.deletePage(id, force);
      } else if (contentType === 'post') {
        result = await this.api.deletePost(id, force);
      } else {
        throw new Error(`Custom post type "${contentType}" not yet supported`);
      }
      
      return {
        success: true,
        data: {
          id,
          contentType,
          message: `${contentType} deleted successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteContent');
    }
  }
  
  /**
   * Take screenshot of content
   */
  async takeScreenshot(contentType, data) {
    try {
      const { id, type = 'admin' } = data;
      
      if (!id) {
        throw new Error('Content ID is required');
      }
      
      // Launch browser and login
      await this.browser.launch();
      await this.browser.login();
      
      let url;
      if (type === 'admin') {
        // Screenshot the admin edit page
        url = `/post.php?post=${id}&action=edit`;
      } else if (type === 'frontend') {
        // First get the public URL
        let content;
        if (contentType === 'page') {
          content = await this.api.getPage(id);
        } else if (contentType === 'post') {
          content = await this.api.getPost(id);
        } else {
          throw new Error(`Custom post type "${contentType}" not yet supported`);
        }
        
        url = content.link;
        
        // Strip the domain part to get a relative URL
        const siteUrl = this.api.siteUrl;
        url = url.replace(siteUrl, '');
      } else {
        throw new Error(`Invalid screenshot type: ${type}`);
      }
      
      // Navigate to the URL
      if (type === 'admin') {
        await this.browser.navigateToAdminPage(url);
      } else {
        await this.browser.page.goto(`${this.api.siteUrl}${url}`, {
          waitUntil: 'networkidle2'
        });
      }
      
      // Take the screenshot
      const screenshotPath = `./${contentType}-${id}-${type}-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          id,
          contentType,
          screenshotType: type,
          screenshotPath,
          message: `Screenshot taken of ${contentType} ${id}`
        }
      };
    } catch (error) {
      return this.handleError(error, 'takeScreenshot');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Build content with Divi
   */
  async buildWithDivi(contentType, data) {
    try {
      const { id } = data;
      
      if (!id) {
        throw new Error('Content ID is required');
      }
      
      // Launch browser and login
      await this.browser.launch();
      await this.browser.login();
      
      // Open the Divi builder
      await this.browser.openDiviBuilder(id);
      
      // Take screenshot of Divi builder
      const screenshotPath = `./divi-builder-${id}-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          id,
          contentType,
          message: `Divi builder opened for ${contentType} ${id}`,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'buildWithDivi');
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
              enum: ["list", "create", "get", "update", "delete", "screenshot", "buildWithDivi"],
              description: "Action to perform on WordPress content",
              default: "list"
            },
            contentType: {
              type: "string",
              enum: ["page", "post", "custom"],
              description: "Type of WordPress content to manage",
              default: "page"
            },
            data: {
              type: "object",
              description: "Data specific to the selected action",
              properties: {
                // Common properties
                id: { 
                  type: "integer", 
                  description: "Content ID (required for get, update, delete, screenshot, buildWithDivi actions)" 
                },
                
                // List properties
                search: { 
                  type: "string", 
                  description: "Search term to filter results" 
                },
                status: { 
                  type: "string", 
                  enum: ["publish", "draft", "pending", "private", "future", "trash", "any"],
                  description: "Content status filter" 
                },
                page: { 
                  type: "integer", 
                  description: "Page number for pagination",
                  default: 1 
                },
                perPage: { 
                  type: "integer", 
                  description: "Number of items per page",
                  default: 20 
                },
                
                // Create/update properties
                title: { 
                  type: "string", 
                  description: "Content title (required for create action)" 
                },
                content: { 
                  type: "string", 
                  description: "Content body in HTML format" 
                },
                excerpt: { 
                  type: "string", 
                  description: "Short excerpt/summary of the content" 
                },
                featuredMedia: { 
                  type: "integer", 
                  description: "Featured image/media ID" 
                },
                template: { 
                  type: "string", 
                  description: "Page template filename (e.g., 'template-full-width.php')" 
                },
                parent: { 
                  type: "integer", 
                  description: "Parent page/post ID (for hierarchical content)",
                  default: 0 
                },
                order: { 
                  type: "integer", 
                  description: "Menu order (for controlling display order)",
                  default: 0 
                },
                categories: { 
                  type: "array", 
                  items: { type: "integer" }, 
                  description: "Category IDs (for posts only)" 
                },
                tags: { 
                  type: "array", 
                  items: { type: "integer" }, 
                  description: "Tag IDs (for posts only)" 
                },
                meta: { 
                  type: "object", 
                  description: "Custom meta fields as key-value pairs" 
                },
                
                // Browser-specific options
                useBrowser: { 
                  type: "boolean", 
                  description: "Whether to use browser automation instead of API",
                  default: false 
                },
                useDivi: { 
                  type: "boolean", 
                  description: "Whether to use Divi builder for content creation/editing",
                  default: false 
                },
                
                // Delete options
                force: { 
                  type: "boolean", 
                  description: "Whether to force delete (bypass trash)",
                  default: false 
                },
                
                // Screenshot options
                type: { 
                  type: "string", 
                  enum: ["admin", "frontend"], 
                  description: "Type of screenshot to take (admin=editor view, frontend=public view)",
                  default: "admin" 
                }
              }
            }
          },
          required: ["action", "contentType"]
        }
      }
    };
  }
}

module.exports = ContentManagerTool; 