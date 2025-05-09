/**
 * Theme Customizer Tool
 * Customize WordPress themes, with special support for Divi
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class ThemeCustomizerTool extends BaseTool {
  constructor() {
    super('wordpress_theme_customizer', 'Customize WordPress themes, with special support for Divi');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the tool to interact with theme customization
   * @param {Object} params - Parameters for the theme customization
   * @param {string} params.action - The action to perform (getThemes, activateTheme, customizeDivi, customizeGeneral)
   * @param {Object} params.data - Additional data for the specific action
   */
  async execute(params) {
    try {
      const { action, data = {} } = params;
      
      if (!action) {
        throw new Error('Action is required');
      }
      
      switch (action) {
        case 'getThemes':
          return this.getThemes();
        case 'activateTheme':
          return this.activateTheme(data);
        case 'customizeDivi':
          return this.customizeDivi(data);
        case 'customizeGeneral':
          return this.customizeGeneral(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Get all available themes
   */
  async getThemes() {
    try {
      const themes = await this.api.getThemes();
      
      return {
        success: true,
        data: {
          themes,
          count: Object.keys(themes).length
        }
      };
    } catch (error) {
      return this.handleError(error, 'getThemes');
    }
  }
  
  /**
   * Activate a theme
   */
  async activateTheme(data) {
    try {
      const { themeSlug } = data;
      
      if (!themeSlug) {
        throw new Error('Theme slug is required');
      }
      
      // Theme activation often requires admin UI interaction
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to themes page
      await this.browser.navigateToAdminPage('/themes.php');
      
      // Find the theme and activate it if it's not already active
      const themeCard = await this.browser.page.$(`.theme[data-slug="${themeSlug}"]`);
      
      if (!themeCard) {
        throw new Error(`Theme "${themeSlug}" not found`);
      }
      
      // Check if theme is already active
      const isActive = await this.browser.page.evaluate(
        selector => document.querySelector(selector).classList.contains('active'),
        `.theme[data-slug="${themeSlug}"]`
      );
      
      if (isActive) {
        return {
          success: true,
          data: {
            message: `Theme "${themeSlug}" is already active`
          }
        };
      }
      
      // Click on the theme to open details
      await this.browser.page.click(`.theme[data-slug="${themeSlug}"]`);
      
      // Wait for the details overlay to appear
      await this.browser.page.waitForSelector('.theme-overlay .theme-actions .button-primary');
      
      // Click the Activate button
      await this.browser.page.click('.theme-overlay .theme-actions .button-primary');
      
      // Wait for activation to complete
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Take a screenshot of the activated theme
      const screenshotPath = `./theme-activation-${themeSlug}-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: `Theme "${themeSlug}" activated successfully`,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'activateTheme');
    } finally {
      // Always close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Customize Divi theme settings
   */
  async customizeDivi(data) {
    try {
      const { section, settings = {} } = data;
      
      if (!section) {
        throw new Error('Divi settings section is required');
      }
      
      if (Object.keys(settings).length === 0) {
        throw new Error('At least one setting is required');
      }
      
      // Launch browser and navigate to Divi theme options
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to Divi Theme Options
      await this.browser.navigateToAdminPage('/admin.php?page=et_divi_options');
      
      // Check if we're on the Divi theme options page
      const isDiviOptions = await this.browser.page.$('#epanel-content');
      
      if (!isDiviOptions) {
        throw new Error('Divi Theme Options not found. Is Divi theme activated?');
      }
      
      // Navigate to the specified section
      const sectionTabSelector = `.epanel-tab[data-tab="${section}"]`;
      const sectionTabExists = await this.browser.page.$(sectionTabSelector);
      
      if (!sectionTabExists) {
        throw new Error(`Divi settings section "${section}" not found`);
      }
      
      // Click on the section tab
      await this.browser.page.click(sectionTabSelector);
      
      // Apply each setting in the settings object
      const appliedSettings = [];
      
      for (const [settingKey, settingValue] of Object.entries(settings)) {
        const settingSelector = `#${settingKey}`;
        const settingExists = await this.browser.page.$(settingSelector);
        
        if (!settingExists) {
          this.logger.warn(`Setting "${settingKey}" not found, skipping`);
          continue;
        }
        
        // Get the setting input type
        const settingType = await this.browser.page.evaluate(selector => {
          const element = document.querySelector(selector);
          if (!element) return null;
          
          if (element.tagName === 'SELECT') return 'select';
          if (element.tagName === 'INPUT') {
            return element.type.toLowerCase();
          }
          return element.tagName.toLowerCase();
        }, settingSelector);
        
        // Apply setting based on its type
        switch (settingType) {
          case 'text':
          case 'number':
            // Clear and set the value
            await this.browser.page.evaluate(selector => {
              document.querySelector(selector).value = '';
            }, settingSelector);
            await this.browser.page.type(settingSelector, String(settingValue));
            break;
            
          case 'checkbox':
            // Check or uncheck based on boolean value
            const isChecked = await this.browser.page.evaluate(selector => {
              return document.querySelector(selector).checked;
            }, settingSelector);
            
            if ((settingValue && !isChecked) || (!settingValue && isChecked)) {
              await this.browser.page.click(settingSelector);
            }
            break;
            
          case 'select':
            // Select dropdown option
            await this.browser.page.select(settingSelector, String(settingValue));
            break;
            
          case 'color':
            // Handle color picker (may require custom handling depending on Divi implementation)
            // This is a simplified approach
            await this.browser.page.evaluate((selector, value) => {
              document.querySelector(selector).value = value;
              // Trigger change event to ensure color picker updates
              const event = new Event('change');
              document.querySelector(selector).dispatchEvent(event);
            }, settingSelector, String(settingValue));
            break;
            
          default:
            this.logger.warn(`Unsupported setting type "${settingType}" for "${settingKey}", skipping`);
            continue;
        }
        
        appliedSettings.push(settingKey);
      }
      
      // Save the changes
      await this.browser.page.click('.save-button');
      
      // Wait for save confirmation
      await this.browser.page.waitForSelector('.epanel-save-status.success-animation', { visible: true });
      
      // Take a screenshot
      const screenshotPath = `./divi-theme-customization-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: 'Divi theme settings updated successfully',
          section,
          appliedSettings,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'customizeDivi');
    } finally {
      // Always close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Use the WordPress Customizer
   */
  async customizeGeneral(data) {
    try {
      const { section, settings = {} } = data;
      
      if (!section) {
        throw new Error('Customizer section is required');
      }
      
      if (Object.keys(settings).length === 0) {
        throw new Error('At least one setting is required');
      }
      
      // Launch browser and navigate to the WordPress Customizer
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the Customizer
      await this.browser.navigateToAdminPage('/customize.php');
      
      // Wait for the customizer to load
      await this.browser.page.waitForSelector('#customize-controls', { visible: true });
      
      // Navigate to the specified section
      // First check if we need to expand a parent panel
      const panelSelector = `#accordion-panel-${section.split('__')[0]}`;
      const hasPanelParent = await this.browser.page.$(panelSelector);
      
      if (hasPanelParent) {
        // Expand the parent panel
        const isPanelExpanded = await this.browser.page.evaluate(selector => {
          return document.querySelector(selector).classList.contains('open');
        }, panelSelector);
        
        if (!isPanelExpanded) {
          await this.browser.page.click(panelSelector);
          // Wait for animation
          await this.browser.page.waitForTimeout(500);
        }
      }
      
      // Click on the section
      const sectionSelector = `#accordion-section-${section}`;
      const sectionExists = await this.browser.page.$(sectionSelector);
      
      if (!sectionExists) {
        throw new Error(`Customizer section "${section}" not found`);
      }
      
      await this.browser.page.click(sectionSelector);
      
      // Wait for section to expand
      await this.browser.page.waitForTimeout(500);
      
      // Apply each setting
      const appliedSettings = [];
      
      for (const [settingKey, settingValue] of Object.entries(settings)) {
        // Find the control for this setting
        const controlSelector = `#customize-control-${settingKey}`;
        const controlExists = await this.browser.page.$(controlSelector);
        
        if (!controlExists) {
          this.logger.warn(`Customizer control for "${settingKey}" not found, skipping`);
          continue;
        }
        
        // Determine the type of control
        const controlType = await this.browser.page.evaluate(selector => {
          const control = document.querySelector(selector);
          
          if (control.querySelector('select')) return 'select';
          if (control.querySelector('input[type="checkbox"]')) return 'checkbox';
          if (control.querySelector('input[type="radio"]')) return 'radio';
          if (control.querySelector('input[type="text"]')) return 'text';
          if (control.querySelector('input[type="number"]')) return 'number';
          if (control.querySelector('input[type="color"]')) return 'color';
          if (control.querySelector('textarea')) return 'textarea';
          
          return 'unknown';
        }, controlSelector);
        
        // Handle different control types
        switch (controlType) {
          case 'select':
            await this.browser.page.select(`${controlSelector} select`, String(settingValue));
            break;
            
          case 'checkbox':
            const isChecked = await this.browser.page.evaluate(selector => {
              return document.querySelector(`${selector} input[type="checkbox"]`).checked;
            }, controlSelector);
            
            if ((settingValue && !isChecked) || (!settingValue && isChecked)) {
              await this.browser.page.click(`${controlSelector} input[type="checkbox"]`);
            }
            break;
            
          case 'radio':
            await this.browser.page.click(`${controlSelector} input[value="${settingValue}"]`);
            break;
            
          case 'text':
          case 'number':
            await this.browser.page.evaluate(selector => {
              document.querySelector(`${selector} input`).value = '';
            }, controlSelector);
            await this.browser.page.type(`${controlSelector} input`, String(settingValue));
            break;
            
          case 'textarea':
            await this.browser.page.evaluate(selector => {
              document.querySelector(`${selector} textarea`).value = '';
            }, controlSelector);
            await this.browser.page.type(`${controlSelector} textarea`, String(settingValue));
            break;
            
          case 'color':
            await this.browser.page.evaluate((selector, value) => {
              const input = document.querySelector(`${selector} input[type="color"]`);
              input.value = value;
              const event = new Event('change');
              input.dispatchEvent(event);
            }, controlSelector, String(settingValue));
            break;
            
          default:
            this.logger.warn(`Unsupported control type "${controlType}" for "${settingKey}", skipping`);
            continue;
        }
        
        appliedSettings.push(settingKey);
        
        // Wait a bit for the preview to update
        await this.browser.page.waitForTimeout(500);
      }
      
      // Save the changes
      await this.browser.page.click('#save');
      
      // Wait for save confirmation
      await this.browser.page.waitForSelector('#customize-save-button-wrapper .saved', { visible: true });
      
      // Take a screenshot
      const screenshotPath = `./wordpress-customizer-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: 'WordPress Customizer settings updated successfully',
          section,
          appliedSettings,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'customizeGeneral');
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
            action: {
              type: "string",
              enum: ["getThemes", "activateTheme", "customizeDivi", "customizeGeneral"],
              description: "The theme customization action to perform"
            },
            data: {
              type: "object",
              description: "Data specific to the selected action",
              properties: {
                // For activateTheme
                themeSlug: { 
                  type: "string",
                  description: "The slug/name identifier of the theme to activate" 
                },
                
                // For customizeDivi and customizeGeneral
                section: { 
                  type: "string", 
                  description: "The settings section ID to customize (e.g., 'general', 'colors', 'header' for Divi; or 'title_tagline', 'colors', 'header_image' for WordPress customizer)" 
                },
                settings: { 
                  type: "object",
                  description: "Key-value pairs of setting names and their values. For Divi, these are Divi Theme Options settings. For WordPress customizer, these are theme mods.",
                  additionalProperties: {
                    oneOf: [
                      { type: "string" },
                      { type: "number" },
                      { type: "boolean" },
                      { type: "array" }
                    ]
                  },
                  example: {
                    "header_text_color": "#ffffff",
                    "show_site_title": true,
                    "header_height": 90
                  }
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

module.exports = ThemeCustomizerTool; 