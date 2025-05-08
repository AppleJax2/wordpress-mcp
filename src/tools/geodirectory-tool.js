/**
 * GeoDirectory Tool
 * Interact with the GeoDirectory plugin for WordPress
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class GeoDirectoryTool extends BaseTool {
  constructor() {
    super('wordpress_geodirectory', 'Interact with the GeoDirectory plugin for WordPress');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the tool to interact with GeoDirectory
   * @param {Object} params - Parameters for the GeoDirectory operation
   * @param {string} params.action - The action to perform (getListings, configureSetting, addListing)
   * @param {Object} params.data - Additional data for the specific action
   */
  async execute(params) {
    try {
      const { action, data = {} } = params;
      
      if (!action) {
        throw new Error('Action is required');
      }
      
      switch (action) {
        case 'getListings':
          return this.getListings(data);
        case 'configureSetting':
          return this.configureSetting(data);
        case 'addListing':
          return this.addListing(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Get GeoDirectory listings
   */
  async getListings(params = {}) {
    try {
      const listings = await this.api.getGeoDirectoryListings(params);
      
      return {
        success: true,
        data: {
          listings,
          count: listings.length
        }
      };
    } catch (error) {
      return this.handleError(error, 'getListings');
    }
  }
  
  /**
   * Configure GeoDirectory settings
   * Uses browser automation since many settings are only available in the admin UI
   */
  async configureSetting(data) {
    try {
      const { settingSection, settingKey, settingValue } = data;
      
      if (!settingSection || !settingKey || settingValue === undefined) {
        throw new Error('Missing required settings data');
      }
      
      // Launch browser and navigate to GeoDirectory settings
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the GeoDirectory settings page
      await this.browser.navigateToAdminPage('/admin.php?page=geodirectory&tab=general_settings');
      
      // Find the settings section
      // This is a simplified example - actual implementation would need to be customized
      // based on the GeoDirectory UI structure
      const sectionSelector = `#${settingSection}_settings`;
      const sectionExists = await this.browser.page.$(sectionSelector);
      
      if (!sectionExists) {
        throw new Error(`Settings section "${settingSection}" not found`);
      }
      
      // Click on the section tab if it's not already active
      await this.browser.page.click(sectionSelector);
      
      // Find the setting field
      const fieldSelector = `#${settingKey}`;
      const fieldExists = await this.browser.page.$(fieldSelector);
      
      if (!fieldExists) {
        throw new Error(`Setting field "${settingKey}" not found`);
      }
      
      // Update the setting value
      // Different handling based on field type
      const fieldType = await this.browser.page.evaluate(selector => {
        const field = document.querySelector(selector);
        return field ? field.type || field.tagName.toLowerCase() : null;
      }, fieldSelector);
      
      switch (fieldType) {
        case 'text':
        case 'number':
        case 'email':
        case 'url':
          // Clear the field and enter new value
          await this.browser.page.evaluate(selector => {
            document.querySelector(selector).value = '';
          }, fieldSelector);
          await this.browser.page.type(fieldSelector, String(settingValue));
          break;
        
        case 'checkbox':
          // Check or uncheck based on boolean value
          const isChecked = await this.browser.page.evaluate(selector => {
            return document.querySelector(selector).checked;
          }, fieldSelector);
          
          if ((settingValue && !isChecked) || (!settingValue && isChecked)) {
            await this.browser.page.click(fieldSelector);
          }
          break;
        
        case 'select':
          // Select dropdown option
          await this.browser.page.select(fieldSelector, String(settingValue));
          break;
        
        default:
          throw new Error(`Unsupported field type: ${fieldType}`);
      }
      
      // Save the settings
      await this.browser.page.click('#geodir-save-options');
      
      // Wait for save confirmation
      await this.browser.page.waitForSelector('.updated.fade', { visible: true });
      
      // Take a screenshot of the result
      const screenshotPath = `./geodirectory-settings-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: `Setting "${settingKey}" updated successfully`,
          settingSection,
          settingKey,
          settingValue,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'configureSetting');
    } finally {
      // Always close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Add a new GeoDirectory listing
   */
  async addListing(data) {
    try {
      const { title, content, category, location, images = [], customFields = {} } = data;
      
      if (!title || !content || !category || !location) {
        throw new Error('Missing required listing data');
      }
      
      // Launch browser and navigate to add listing page
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the add listing page
      await this.browser.navigateToAdminPage('/post-new.php?post_type=gd_place');
      
      // Fill in the listing details
      // Title
      await this.browser.page.type('#title', title);
      
      // Content - may need to switch to the right editor mode
      const isBlockEditor = await this.browser.page.$('.block-editor');
      
      if (isBlockEditor) {
        // Gutenberg editor
        await this.browser.page.click('.block-editor-inserter__toggle');
        await this.browser.page.click('.editor-block-list-item-paragraph');
        await this.browser.page.type('.block-editor-rich-text__editable', content);
      } else {
        // Classic editor
        const frame = this.browser.page.frames().find(f => f.name() === 'content_ifr');
        await frame.type('body', content);
      }
      
      // Category selection - assuming it's a checkbox list
      const categorySelector = `input[name="tax_input[gd_placecategory][]"][value="${category}"]`;
      await this.browser.page.click(categorySelector);
      
      // Location fields
      await this.browser.page.type('#gd_street', location.street || '');
      await this.browser.page.type('#gd_city', location.city || '');
      await this.browser.page.type('#gd_region', location.region || '');
      await this.browser.page.type('#gd_country', location.country || '');
      await this.browser.page.type('#gd_postal_code', location.postalCode || '');
      
      if (location.latitude && location.longitude) {
        await this.browser.page.type('#gd_latitude', String(location.latitude));
        await this.browser.page.type('#gd_longitude', String(location.longitude));
      }
      
      // Handle custom fields
      for (const [fieldKey, fieldValue] of Object.entries(customFields)) {
        const fieldSelector = `#${fieldKey}`;
        const fieldExists = await this.browser.page.$(fieldSelector);
        
        if (fieldExists) {
          const fieldType = await this.browser.page.evaluate(selector => {
            const field = document.querySelector(selector);
            return field ? field.type || field.tagName.toLowerCase() : null;
          }, fieldSelector);
          
          // Handle different field types
          if (['text', 'number', 'email', 'url', 'tel'].includes(fieldType)) {
            await this.browser.page.type(fieldSelector, String(fieldValue));
          } else if (fieldType === 'select') {
            await this.browser.page.select(fieldSelector, String(fieldValue));
          } else if (fieldType === 'checkbox') {
            const isChecked = await this.browser.page.evaluate(selector => {
              return document.querySelector(selector).checked;
            }, fieldSelector);
            
            if ((fieldValue && !isChecked) || (!fieldValue && isChecked)) {
              await this.browser.page.click(fieldSelector);
            }
          }
        }
      }
      
      // Publish the listing
      await this.browser.page.click('#publish');
      
      // Wait for the page to reload and confirm publish
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Get the listing ID from the URL
      const pageUrl = this.browser.page.url();
      const match = pageUrl.match(/post=(\d+)/);
      const listingId = match ? match[1] : null;
      
      // Take a screenshot of the result
      const screenshotPath = `./geodirectory-listing-${listingId || Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: 'GeoDirectory listing added successfully',
          listingId,
          title,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'addListing');
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
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['getListings', 'configureSetting', 'addListing'],
          description: 'The GeoDirectory action to perform'
        },
        data: {
          type: 'object',
          description: 'Data specific to the action',
          properties: {
            // For getListings
            perPage: { type: 'integer' },
            page: { type: 'integer' },
            categories: { type: 'array', items: { type: 'string' } },
            
            // For configureSetting
            settingSection: { type: 'string' },
            settingKey: { type: 'string' },
            settingValue: { type: ['string', 'boolean', 'number'] },
            
            // For addListing
            title: { type: 'string' },
            content: { type: 'string' },
            category: { type: ['string', 'integer'] },
            location: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                region: { type: 'string' },
                country: { type: 'string' },
                postalCode: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' }
              }
            },
            images: { type: 'array', items: { type: 'string' } },
            customFields: { type: 'object' }
          }
        }
      },
      required: ['action']
    };
  }
}

module.exports = GeoDirectoryTool; 