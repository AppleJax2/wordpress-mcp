/**
 * Divi Builder Tool
 * Advanced page building with the Divi framework
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class DiviBuilderTool extends BaseTool {
  constructor() {
    super('wordpress_divi_builder', 'Advanced page building with the Divi framework');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the tool based on the operation requested
   */
  async execute(params) {
    try {
      const { operation, pageId } = params;
      
      if (!operation) {
        throw new Error('Operation is required');
      }
      
      if (!pageId && operation !== 'createLayout') {
        throw new Error('Page ID is required for this operation');
      }
      
      // Launch browser for all operations
      await this.browser.launch();
      await this.browser.login();
      
      // Execute the requested operation
      switch (operation) {
        case 'createLayout':
          return this.createLayout(params);
        case 'editLayout':
          return this.editLayout(params);
        case 'addModule':
          return this.addModule(params);
        case 'addSection':
          return this.addSection(params);
        case 'addRow':
          return this.addRow(params);
        case 'saveTemplate':
          return this.saveTemplate(params);
        case 'loadTemplate':
          return this.loadTemplate(params);
        case 'styleElement':
          return this.styleElement(params);
        case 'duplicateElement':
          return this.duplicateElement(params);
        case 'deleteElement':
          return this.deleteElement(params);
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return this.handleError(error);
    } finally {
      // Close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Create a new layout with Divi
   */
  async createLayout(params) {
    const { title, content, layoutStructure, template } = params;
    
    try {
      // Create a new page first
      const pageResult = await this.browser.createPage(title, content || '', {
        useTextEditor: true
      });
      
      if (!pageResult.success) {
        throw new Error('Failed to create page');
      }
      
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageResult.pageId);
      
      // If a template is specified, load it
      if (template) {
        await this.loadDiviTemplate(template);
      }
      
      // If a layout structure is provided, build it
      if (layoutStructure) {
        await this.buildLayoutFromStructure(layoutStructure);
      }
      
      // Take a screenshot of the built page
      const screenshotPath = `./divi-layout-${pageResult.pageId}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          pageId: pageResult.pageId,
          title,
          message: 'Divi layout created successfully',
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'createLayout');
    }
  }
  
  /**
   * Edit an existing Divi layout
   */
  async editLayout(params) {
    const { pageId, layoutStructure } = params;
    
    try {
      // Open Divi Builder for the existing page
      await this.browser.openDiviBuilder(pageId);
      
      // Apply the layout structure updates
      if (layoutStructure) {
        await this.buildLayoutFromStructure(layoutStructure);
      }
      
      // Take a screenshot of the updated page
      const screenshotPath = `./divi-layout-${pageId}-updated.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          pageId,
          message: 'Divi layout updated successfully',
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'editLayout');
    }
  }
  
  /**
   * Add a module to a Divi layout
   */
  async addModule(params) {
    const { pageId, moduleType, moduleSettings, parentRowId } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Navigate to the parent row where the module should be added
      if (parentRowId) {
        await this.navigateToElement(parentRowId);
      }
      
      // Add the module
      await this.addDiviModule(moduleType, moduleSettings);
      
      return {
        success: true,
        data: {
          pageId,
          moduleType,
          message: `${moduleType} module added successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'addModule');
    }
  }
  
  /**
   * Add a section to a Divi layout
   */
  async addSection(params) {
    const { pageId, sectionSettings, position } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Add the section
      await this.addDiviSection(sectionSettings, position);
      
      return {
        success: true,
        data: {
          pageId,
          message: 'Section added successfully'
        }
      };
    } catch (error) {
      return this.handleError(error, 'addSection');
    }
  }
  
  /**
   * Add a row to a Divi section
   */
  async addRow(params) {
    const { pageId, parentSectionId, rowSettings, columnLayout } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Navigate to the parent section
      if (parentSectionId) {
        await this.navigateToElement(parentSectionId);
      }
      
      // Add the row with specified column layout
      await this.addDiviRow(rowSettings, columnLayout);
      
      return {
        success: true,
        data: {
          pageId,
          message: 'Row added successfully'
        }
      };
    } catch (error) {
      return this.handleError(error, 'addRow');
    }
  }
  
  /**
   * Save a Divi layout as a template
   */
  async saveTemplate(params) {
    const { pageId, templateName, global } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Save the template
      await this.saveDiviTemplate(templateName, global);
      
      return {
        success: true,
        data: {
          pageId,
          templateName,
          message: `Template "${templateName}" saved successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'saveTemplate');
    }
  }
  
  /**
   * Load a Divi template into a page
   */
  async loadTemplate(params) {
    const { pageId, templateName } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Load the template
      await this.loadDiviTemplate(templateName);
      
      return {
        success: true,
        data: {
          pageId,
          templateName,
          message: `Template "${templateName}" loaded successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'loadTemplate');
    }
  }
  
  /**
   * Apply styling to a Divi element
   */
  async styleElement(params) {
    const { pageId, elementId, styleSettings } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Navigate to the element
      await this.navigateToElement(elementId);
      
      // Apply styling settings
      await this.applyDiviStyles(styleSettings);
      
      return {
        success: true,
        data: {
          pageId,
          elementId,
          message: 'Styling applied successfully'
        }
      };
    } catch (error) {
      return this.handleError(error, 'styleElement');
    }
  }
  
  /**
   * Duplicate a Divi element (section, row, or module)
   */
  async duplicateElement(params) {
    const { pageId, elementId } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Navigate to the element
      await this.navigateToElement(elementId);
      
      // Duplicate the element
      await this.duplicateDiviElement();
      
      return {
        success: true,
        data: {
          pageId,
          elementId,
          message: 'Element duplicated successfully'
        }
      };
    } catch (error) {
      return this.handleError(error, 'duplicateElement');
    }
  }
  
  /**
   * Delete a Divi element (section, row, or module)
   */
  async deleteElement(params) {
    const { pageId, elementId } = params;
    
    try {
      // Open Divi Builder
      await this.browser.openDiviBuilder(pageId);
      
      // Navigate to the element
      await this.navigateToElement(elementId);
      
      // Delete the element
      await this.deleteDiviElement();
      
      return {
        success: true,
        data: {
          pageId,
          elementId,
          message: 'Element deleted successfully'
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteElement');
    }
  }
  
  // Helper Methods for Divi Builder Interactions
  
  /**
   * Build a layout from a JSON structure
   */
  async buildLayoutFromStructure(structure) {
    try {
      for (const section of structure.sections) {
        // Add a section
        await this.addDiviSection(section.settings);
        
        // Add rows to the section
        for (const row of section.rows) {
          await this.addDiviRow(row.settings, row.columnLayout);
          
          // Add modules to each row
          for (const module of row.modules) {
            await this.addDiviModule(module.type, module.settings);
          }
        }
      }
      
      // Save changes
      await this.saveDiviChanges();
      
      return true;
    } catch (error) {
      this.logger.error('Failed to build layout from structure', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Add a Divi section
   */
  async addDiviSection(settings = {}, position = 'bottom') {
    try {
      // Click the "+" button to add a section
      await this.browser.page.click('.et-fb-button--add-section');
      
      // Select the section type
      if (settings.type === 'regular') {
        await this.browser.page.click('.et-fb-section-add-block__regular');
      } else if (settings.type === 'specialty') {
        await this.browser.page.click('.et-fb-section-add-block__specialty');
      } else if (settings.type === 'fullwidth') {
        await this.browser.page.click('.et-fb-section-add-block__fullwidth');
      } else {
        // Default to regular
        await this.browser.page.click('.et-fb-section-add-block__regular');
      }
      
      // Apply section settings if any
      if (Object.keys(settings).length > 0) {
        await this.configureElementSettings(settings);
      }
      
      return true;
    } catch (error) {
      this.logger.error('Failed to add Divi section', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Add a Divi row with specified column layout
   */
  async addDiviRow(settings = {}, columnLayout = '1_1') {
    try {
      // Click the "+" button to add a row
      await this.browser.page.click('.et-fb-button--add-row');
      
      // Select the column layout
      await this.browser.page.click(`.et-fb-row-add-block__column-type--${columnLayout}`);
      
      // Apply row settings if any
      if (Object.keys(settings).length > 0) {
        await this.configureElementSettings(settings);
      }
      
      return true;
    } catch (error) {
      this.logger.error('Failed to add Divi row', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Add a Divi module of specific type
   */
  async addDiviModule(moduleType, settings = {}) {
    try {
      // Click the "+" button to add a module
      await this.browser.page.click('.et-fb-button--add-module');
      
      // Search for the module
      await this.browser.page.type('.et-fb-modules-list__search', moduleType);
      
      // Wait for search results
      await this.browser.page.waitForSelector('.et-fb-modules-list__item');
      
      // Click on the module
      await this.browser.page.click(`.et-fb-modules-list__item[data-module-type="${moduleType}"]`);
      
      // Apply module settings if any
      if (Object.keys(settings).length > 0) {
        await this.configureElementSettings(settings);
      }
      
      return true;
    } catch (error) {
      this.logger.error('Failed to add Divi module', { error: error.message, moduleType });
      throw error;
    }
  }
  
  /**
   * Navigate to a specific element by ID
   */
  async navigateToElement(elementId) {
    try {
      // Click on the element to select it
      await this.browser.page.click(`[data-id="${elementId}"]`);
      return true;
    } catch (error) {
      this.logger.error('Failed to navigate to element', { error: error.message, elementId });
      throw error;
    }
  }
  
  /**
   * Save template in Divi Library
   */
  async saveDiviTemplate(templateName, isGlobal = false) {
    try {
      // Click the save button
      await this.browser.page.click('.et-fb-button--save');
      
      // Click "Save to Library"
      await this.browser.page.click('.et-fb-save-library');
      
      // Enter template name
      await this.browser.page.type('.et-fb-save-library-item-name', templateName);
      
      // If global, check the global option
      if (isGlobal) {
        await this.browser.page.click('.et-fb-settings-option-input--global input');
      }
      
      // Click save
      await this.browser.page.click('.et-fb-save-library__button');
      
      // Wait for confirmation
      await this.browser.page.waitForSelector('.et-fb-notification--success');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to save Divi template', { error: error.message, templateName });
      throw error;
    }
  }
  
  /**
   * Load template from Divi Library
   */
  async loadDiviTemplate(templateName) {
    try {
      // Click the load button
      await this.browser.page.click('.et-fb-button--load');
      
      // Search for the template
      await this.browser.page.type('.et-fb-library-search', templateName);
      
      // Wait for search results
      await this.browser.page.waitForSelector('.et-fb-library-item');
      
      // Click on the template
      await this.browser.page.click('.et-fb-library-item');
      
      // Click "Use Template" button
      await this.browser.page.click('.et-fb-library__use-template');
      
      // Wait for confirmation
      await this.browser.page.waitForSelector('.et-fb-notification--success');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to load Divi template', { error: error.message, templateName });
      throw error;
    }
  }
  
  /**
   * Configure element settings
   */
  async configureElementSettings(settings) {
    try {
      // Wait for settings modal to appear
      await this.browser.page.waitForSelector('.et-fb-settings-modal');
      
      // Loop through settings and apply them
      for (const [key, value] of Object.entries(settings)) {
        // Find the setting input
        const inputSelector = `.et-fb-settings-option[data-setting="${key}"] input, 
                             .et-fb-settings-option[data-setting="${key}"] textarea, 
                             .et-fb-settings-option[data-setting="${key}"] select`;
        
        const hasInput = await this.browser.page.$(inputSelector);
        
        if (hasInput) {
          // Determine input type
          const inputType = await this.browser.page.evaluate(selector => {
            const element = document.querySelector(selector);
            return element ? element.tagName.toLowerCase() : null;
          }, inputSelector);
          
          switch (inputType) {
            case 'input':
              // Check if it's a checkbox
              const isCheckbox = await this.browser.page.evaluate(selector => {
                const element = document.querySelector(selector);
                return element ? element.type === 'checkbox' : false;
              }, inputSelector);
              
              if (isCheckbox) {
                // For checkboxes, we need to check or uncheck based on value
                if (value) {
                  await this.browser.page.evaluate(selector => {
                    const checkbox = document.querySelector(selector);
                    if (!checkbox.checked) checkbox.click();
                  }, inputSelector);
                } else {
                  await this.browser.page.evaluate(selector => {
                    const checkbox = document.querySelector(selector);
                    if (checkbox.checked) checkbox.click();
                  }, inputSelector);
                }
              } else {
                // For text inputs, clear and type
                await this.browser.page.click(inputSelector, { clickCount: 3 });
                await this.browser.page.type(inputSelector, String(value));
              }
              break;
              
            case 'textarea':
              // For textareas, clear and type
              await this.browser.page.click(inputSelector, { clickCount: 3 });
              await this.browser.page.type(inputSelector, String(value));
              break;
              
            case 'select':
              // For select elements, select by value
              await this.browser.page.select(inputSelector, String(value));
              break;
          }
        } else {
          this.logger.warn(`Setting "${key}" not found in Divi options`);
        }
      }
      
      // Click save settings
      await this.browser.page.click('.et-fb-modal__bottom button.et-fb-button--save');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to configure element settings', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Apply styling to a Divi element
   */
  async applyDiviStyles(styleSettings) {
    try {
      // Navigate to style tab
      await this.browser.page.click('.et-fb-tabs__item--design');
      
      // Apply styling settings
      await this.configureElementSettings(styleSettings);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to apply Divi styles', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Duplicate a Divi element
   */
  async duplicateDiviElement() {
    try {
      // Click on element options
      await this.browser.page.click('.et-fb-settings-button--duplicate');
      
      // Wait for duplication to complete
      await this.browser.page.waitForTimeout(500);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to duplicate Divi element', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Delete a Divi element
   */
  async deleteDiviElement() {
    try {
      // Click on element options
      await this.browser.page.click('.et-fb-settings-button--delete');
      
      // Confirm deletion
      await this.browser.page.waitForSelector('.et-fb-modal__confirm');
      await this.browser.page.click('.et-fb-modal__confirm');
      
      // Wait for deletion to complete
      await this.browser.page.waitForTimeout(500);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to delete Divi element', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Save changes in Divi Builder
   */
  async saveDiviChanges() {
    try {
      // Click the save button
      await this.browser.page.click('.et-fb-button--publish');
      
      // Wait for save to complete
      await this.browser.page.waitForSelector('.et-fb-notification--success');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to save Divi changes', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get JSON schema for MCP
   */
  getSchema() {
    return {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'createLayout',
            'editLayout',
            'addModule',
            'addSection',
            'addRow',
            'saveTemplate',
            'loadTemplate',
            'styleElement',
            'duplicateElement',
            'deleteElement'
          ],
          description: 'The operation to perform with the Divi Builder'
        },
        pageId: {
          type: 'string',
          description: 'The ID of the page to edit (required for all operations except createLayout)'
        },
        title: {
          type: 'string',
          description: 'Title of the page (for createLayout operation)'
        },
        content: {
          type: 'string',
          description: 'Initial content of the page (for createLayout operation)'
        },
        layoutStructure: {
          type: 'object',
          description: 'JSON structure defining the layout to build'
        },
        moduleType: {
          type: 'string',
          description: 'Type of Divi module to add (e.g., Text, Image, Slider)'
        },
        moduleSettings: {
          type: 'object',
          description: 'Settings to apply to the module'
        },
        sectionSettings: {
          type: 'object',
          description: 'Settings to apply to the section'
        },
        rowSettings: {
          type: 'object',
          description: 'Settings to apply to the row'
        },
        columnLayout: {
          type: 'string',
          description: 'Column layout for a row (e.g., 1_1, 1_2_1_2, 1_3_1_3_1_3)'
        },
        templateName: {
          type: 'string',
          description: 'Name of the template to save or load'
        },
        global: {
          type: 'boolean',
          description: 'Whether to save the template as global'
        },
        elementId: {
          type: 'string',
          description: 'ID of the element to manipulate'
        },
        styleSettings: {
          type: 'object',
          description: 'Styling settings to apply to an element'
        },
        parentSectionId: {
          type: 'string',
          description: 'ID of the parent section to add a row to'
        },
        parentRowId: {
          type: 'string',
          description: 'ID of the parent row to add a module to'
        },
        position: {
          type: 'string',
          enum: ['top', 'bottom'],
          description: 'Position to add a new section (top or bottom)'
        }
      },
      required: ['operation']
    };
  }
}

module.exports = DiviBuilderTool; 