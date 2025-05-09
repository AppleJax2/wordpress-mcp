/**
 * Theme Manager Tool
 * For installing, activating, and managing WordPress themes
 */
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class ThemeManagerTool extends BaseTool {
  constructor() {
    super('wordpress_theme_manager', 'For installing, activating, and managing WordPress themes');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the theme manager tool
   * @param {Object} params - Parameters for the theme operation
   * @param {string} params.action - Action to perform (list, get, install, upload, activate, delete, update, search)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { action = 'list', data = {} } = params;
      
      switch (action) {
        case 'list':
          return await this.listThemes(data);
        case 'get':
          return await this.getThemeDetails(data);
        case 'install':
          return await this.installTheme(data);
        case 'upload':
          return await this.uploadTheme(data);
        case 'activate':
          return await this.activateTheme(data);
        case 'delete':
          return await this.deleteTheme(data);
        case 'update':
          return await this.updateTheme(data);
        case 'search':
          return await this.searchThemes(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * List installed themes with optional filtering
   */
  async listThemes(data) {
    try {
      const { status = '' } = data;
      
      // Fetch all themes
      const themes = await this.api.getThemes();
      
      // Apply filtering if needed
      let filteredThemes = themes;
      
      if (status) {
        filteredThemes = Object.fromEntries(
          Object.entries(themes).filter(([_, theme]) => {
            if (status === 'active' && theme.status === 'active') return true;
            if (status === 'inactive' && theme.status !== 'active') return true;
            return false;
          })
        );
      }
      
      return {
        success: true,
        data: {
          themes: filteredThemes,
          count: Object.keys(filteredThemes).length,
          activeTheme: Object.values(themes).find(theme => theme.status === 'active')
        }
      };
    } catch (error) {
      return this.handleError(error, 'listThemes');
    }
  }
  
  /**
   * Get detailed information about a specific theme
   */
  async getThemeDetails(data) {
    try {
      const { themeSlug } = data;
      
      if (!themeSlug) {
        throw new Error('Theme slug is required');
      }
      
      const themes = await this.api.getThemes();
      const theme = themes[themeSlug];
      
      if (!theme) {
        throw new Error(`Theme "${themeSlug}" not found`);
      }
      
      return {
        success: true,
        data: {
          theme
        }
      };
    } catch (error) {
      return this.handleError(error, 'getThemeDetails');
    }
  }
  
  /**
   * Install a theme from the WordPress.org repository
   * Uses browser automation since the REST API doesn't fully support theme installation
   */
  async installTheme(data) {
    try {
      const { 
        themeSlug,
        activate = false
      } = data;
      
      if (!themeSlug) {
        throw new Error('Theme slug is required');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the theme installation page
      await this.browser.navigateToAdminPage('/theme-install.php');
      
      // Search for the theme
      await this.browser.page.type('#wp-filter-search-input', themeSlug);
      await this.browser.page.keyboard.press('Enter');
      
      // Wait for search results
      await this.browser.page.waitForSelector('.theme-browser .theme, .notice-error, .no-themes', { timeout: 10000 });
      
      // Check if theme was found
      const themeFound = await this.browser.page.evaluate((slug) => {
        const errorNotice = document.querySelector('.notice-error');
        const noThemes = document.querySelector('.no-themes');
        
        if (errorNotice || noThemes) return false;
        
        // Look for the specific theme
        const themeElements = document.querySelectorAll('.theme-browser .theme');
        for (const theme of themeElements) {
          const themeNameEl = theme.querySelector('.theme-name');
          if (themeNameEl && themeNameEl.textContent.toLowerCase().includes(slug.toLowerCase())) {
            return true;
          }
        }
        
        return false;
      }, themeSlug);
      
      if (!themeFound) {
        throw new Error(`Theme "${themeSlug}" not found in WordPress.org repository`);
      }
      
      // Click on the theme card
      await this.browser.page.evaluate((slug) => {
        const themeElements = document.querySelectorAll('.theme-browser .theme');
        for (const theme of themeElements) {
          const themeNameEl = theme.querySelector('.theme-name');
          if (themeNameEl && themeNameEl.textContent.toLowerCase().includes(slug.toLowerCase())) {
            theme.querySelector('.theme-screenshot').click();
            return;
          }
        }
      }, themeSlug);
      
      // Wait for theme details modal
      await this.browser.page.waitForSelector('#theme-details .theme-install-overlay');
      
      // Click install button
      await this.browser.page.click('#theme-details .theme-install');
      
      // Wait for installation to complete
      await this.browser.page.waitForSelector('#theme-details .theme-install.disabled, #theme-details .theme-install-success', { timeout: 60000 });
      
      // Verify installation was successful
      const installSuccess = await this.browser.page.evaluate(() => {
        return document.querySelector('#theme-details .theme-install-success') !== null;
      });
      
      if (!installSuccess) {
        throw new Error(`Failed to install theme "${themeSlug}"`);
      }
      
      // Activate the theme if requested
      if (activate) {
        // Click activate button
        await this.browser.page.click('#theme-details .theme-install-actions .button-primary');
        
        // Wait for activation to complete
        await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Take a screenshot of the result
      const screenshotPath = `./theme-install-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: `Theme "${themeSlug}" installed successfully${activate ? ' and activated' : ''}`,
          activated: activate,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'installTheme');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Upload a custom theme from a zip file
   */
  async uploadTheme(data) {
    try {
      const { 
        fileUrl = '',
        filePath = '',
        fileBuffer = null,
        activate = false
      } = data;
      
      // Validate inputs - at least one file source must be provided
      if (!fileUrl && !filePath && !fileBuffer) {
        throw new Error('No file provided. Provide fileUrl, filePath, or fileBuffer');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to theme upload page
      await this.browser.navigateToAdminPage('/theme-install.php?upload');
      
      // Prepare the file for upload
      let file;
      let tempFilePath;
      
      if (fileUrl) {
        // Download from URL and save to temp file
        this.logger.info(`Downloading theme from URL: ${fileUrl}`);
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to download theme: ${response.statusText}`);
        }
        
        const fileData = await response.buffer();
        tempFilePath = path.join('.', `theme-upload-${Date.now()}.zip`);
        await fs.writeFile(tempFilePath, fileData);
        file = tempFilePath;
      } else if (filePath) {
        // Use provided file path
        file = filePath;
      } else if (fileBuffer) {
        // Convert buffer to temp file
        tempFilePath = path.join('.', `theme-upload-${Date.now()}.zip`);
        await fs.writeFile(tempFilePath, Buffer.from(fileBuffer, 'base64'));
        file = tempFilePath;
      }
      
      // Upload the file
      const fileInputSelector = '#themezip';
      const uploadButtonSelector = '#install-theme-submit';
      
      // Wait for the file input to be present
      await this.browser.page.waitForSelector(fileInputSelector);
      
      // Upload the file
      const fileInput = await this.browser.page.$(fileInputSelector);
      await fileInput.uploadFile(file);
      
      // Click upload button
      await this.browser.page.click(uploadButtonSelector);
      
      // Wait for upload to complete - either success or error
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check for error messages
      const hasError = await this.browser.page.evaluate(() => {
        return document.querySelector('.error-message, .notice-error') !== null;
      });
      
      if (hasError) {
        const errorMessage = await this.browser.page.evaluate(() => {
          const errorEl = document.querySelector('.error-message, .notice-error');
          return errorEl ? errorEl.textContent.trim() : 'Unknown error occurred during theme upload';
        });
        throw new Error(errorMessage);
      }
      
      // Theme was uploaded successfully
      // If activation was requested, look for the activate button
      if (activate) {
        const activateButtonSelector = '.theme-actions .button-primary';
        const activateButtonExists = await this.browser.page.$(activateButtonSelector);
        
        if (activateButtonExists) {
          await this.browser.page.click(activateButtonSelector);
          await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
        } else {
          this.logger.warn('Could not find activation button. Theme was uploaded but not activated.');
        }
      }
      
      // Take a screenshot of the result
      const screenshotPath = `./theme-upload-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      // Clean up temp file if created
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (e) {
          this.logger.warn(`Failed to delete temp file: ${e.message}`);
        }
      }
      
      return {
        success: true,
        data: {
          message: `Theme uploaded successfully${activate ? ' and activated' : ''}`,
          activated: activate,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'uploadTheme');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
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
      
      // Theme activation requires admin UI interaction
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
   * Delete a theme
   */
  async deleteTheme(data) {
    try {
      const { themeSlug } = data;
      
      if (!themeSlug) {
        throw new Error('Theme slug is required');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to themes page
      await this.browser.navigateToAdminPage('/themes.php');
      
      // Find the theme
      const themeExists = await this.browser.page.$(`.theme[data-slug="${themeSlug}"]`);
      
      if (!themeExists) {
        throw new Error(`Theme "${themeSlug}" not found`);
      }
      
      // Check if theme is currently active
      const isActive = await this.browser.page.evaluate(
        selector => document.querySelector(selector).classList.contains('active'),
        `.theme[data-slug="${themeSlug}"]`
      );
      
      if (isActive) {
        throw new Error(`Cannot delete theme "${themeSlug}" because it is currently active`);
      }
      
      // Click on the theme to open details
      await this.browser.page.click(`.theme[data-slug="${themeSlug}"]`);
      
      // Wait for theme details overlay
      await this.browser.page.waitForSelector('.theme-overlay');
      
      // Check if there's a delete button (not all themes can be deleted, e.g., default themes)
      const deleteButtonExists = await this.browser.page.$('.theme-overlay .delete-theme');
      
      if (!deleteButtonExists) {
        throw new Error(`Theme "${themeSlug}" cannot be deleted (might be a default theme)`);
      }
      
      // Click delete button
      await this.browser.page.click('.theme-overlay .delete-theme');
      
      // Wait for confirmation dialog
      await this.browser.page.waitForSelector('.theme-install-overlay .button-primary');
      
      // Click confirm button
      await this.browser.page.click('.theme-install-overlay .button-primary');
      
      // Wait for deletion to complete
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check for success message
      const deletionSuccess = await this.browser.page.evaluate(() => {
        const noticeEl = document.querySelector('.notice-success');
        return noticeEl !== null;
      });
      
      if (!deletionSuccess) {
        throw new Error(`Failed to delete theme "${themeSlug}"`);
      }
      
      // Take a screenshot of the result
      const screenshotPath = `./theme-deletion-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: `Theme "${themeSlug}" deleted successfully`,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteTheme');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Update a theme (if updates are available)
   */
  async updateTheme(data) {
    try {
      const { themeSlug } = data;
      
      if (!themeSlug) {
        throw new Error('Theme slug is required');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to themes page with updates view
      await this.browser.navigateToAdminPage('/themes.php?theme_status=update');
      
      // Check if there are any updates available
      const hasUpdates = await this.browser.page.$('.update-message');
      
      if (!hasUpdates) {
        return {
          success: true,
          data: {
            message: 'No theme updates available',
            updated: false
          }
        };
      }
      
      // Check if this specific theme has an update
      const themeHasUpdate = await this.browser.page.evaluate((slug) => {
        const themeRow = document.querySelector(`.theme[data-slug="${slug}"]`);
        if (!themeRow) return false;
        
        return themeRow.querySelector('.update-message') !== null;
      }, themeSlug);
      
      if (!themeHasUpdate) {
        return {
          success: true,
          data: {
            message: `Theme "${themeSlug}" is already up to date`,
            updated: false
          }
        };
      }
      
      // Click on the theme to open details
      await this.browser.page.click(`.theme[data-slug="${themeSlug}"]`);
      
      // Wait for theme details overlay
      await this.browser.page.waitForSelector('.theme-overlay');
      
      // Click on update button
      await this.browser.page.click('.theme-overlay .update-message .update-link');
      
      // Wait for update to complete
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check for success message
      const updateSuccess = await this.browser.page.evaluate(() => {
        const noticeEl = document.querySelector('.notice-success');
        return noticeEl !== null;
      });
      
      if (!updateSuccess) {
        throw new Error(`Failed to update theme "${themeSlug}"`);
      }
      
      // Take a screenshot of the result
      const screenshotPath = `./theme-update-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: `Theme "${themeSlug}" updated successfully`,
          updated: true,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateTheme');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Search for themes in the WordPress.org repository
   */
  async searchThemes(data) {
    try {
      const { 
        searchTerm, 
        subject = '',
        feature = '',
        page = 1 
      } = data;
      
      if (!searchTerm && !subject && !feature) {
        throw new Error('At least one search parameter is required: searchTerm, subject, or feature');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to theme installation page
      await this.browser.navigateToAdminPage('/theme-install.php');
      
      // Enter search term if provided
      if (searchTerm) {
        await this.browser.page.type('#wp-filter-search-input', searchTerm);
        await this.browser.page.keyboard.press('Enter');
      }
      
      // Apply filters if provided
      if (subject || feature) {
        // Click on Feature Filter button
        await this.browser.page.click('.drawer-toggle');
        
        // Wait for filter drawer to open
        await this.browser.page.waitForSelector('.filter-drawer.drawer-open');
        
        // Apply subject filter
        if (subject) {
          await this.browser.page.evaluate((subjectValue) => {
            const subjectCheckboxes = document.querySelectorAll('.filter-group:nth-child(1) input[type="checkbox"]');
            for (const checkbox of subjectCheckboxes) {
              if (checkbox.parentElement.textContent.trim().toLowerCase() === subjectValue.toLowerCase()) {
                checkbox.click();
                return true;
              }
            }
            return false;
          }, subject);
        }
        
        // Apply feature filter
        if (feature) {
          await this.browser.page.evaluate((featureValue) => {
            const featureCheckboxes = document.querySelectorAll('.filter-group:nth-child(2) input[type="checkbox"]');
            for (const checkbox of featureCheckboxes) {
              if (checkbox.parentElement.textContent.trim().toLowerCase() === featureValue.toLowerCase()) {
                checkbox.click();
                return true;
              }
            }
            return false;
          }, feature);
        }
        
        // Apply filters
        await this.browser.page.click('.apply-filters');
        
        // Wait for results to load
        await this.browser.page.waitForSelector('.theme-browser .theme, .notice-error, .no-themes', { timeout: 10000 });
      }
      
      // Navigate to specific page if needed
      if (page > 1) {
        const hasNextPage = await this.browser.page.evaluate((targetPage) => {
          const pageLinks = document.querySelectorAll('.theme-count + .pagination-links a');
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
        const themes = [];
        const cards = document.querySelectorAll('.theme-browser .theme:not(.add-new-theme)');
        
        cards.forEach(card => {
          // Skip the add new theme card
          if (card.classList.contains('add-new-theme')) return;
          
          const nameElement = card.querySelector('.theme-name');
          const authorElement = card.querySelector('.theme-author');
          const detailsLink = card.getAttribute('data-slug');
          
          themes.push({
            name: nameElement ? nameElement.textContent.trim() : 'Unknown Theme',
            author: authorElement ? authorElement.textContent.trim().replace('By ', '') : 'Unknown',
            slug: detailsLink || '',
            previewUrl: card.querySelector('.theme-screenshot')?.src || ''
          });
        });
        
        // Get pagination info
        const themeCount = document.querySelector('.theme-count');
        let totalThemes = 0;
        if (themeCount) {
          const countText = themeCount.textContent.trim();
          const match = countText.match(/\d+/);
          if (match) {
            totalThemes = parseInt(match[0], 10);
          }
        }
        
        const paginationElement = document.querySelector('.theme-count + .pagination-links');
        let currentPage = 1;
        let totalPages = 1;
        
        if (paginationElement) {
          const currentSpan = paginationElement.querySelector('.current');
          if (currentSpan) {
            currentPage = parseInt(currentSpan.textContent.trim(), 10) || 1;
          }
          
          const pageLinks = paginationElement.querySelectorAll('a, span.current');
          if (pageLinks.length > 0) {
            const lastPageLink = pageLinks[pageLinks.length - 1];
            totalPages = parseInt(lastPageLink.textContent.trim(), 10) || 1;
          }
        }
        
        return {
          themes,
          pagination: {
            currentPage,
            totalPages,
            totalThemes,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
          }
        };
      });
      
      // Take a screenshot of the search results
      const screenshotPath = `./theme-search-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          results: results.themes,
          pagination: results.pagination,
          searchTerm,
          subject,
          feature,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'searchThemes');
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
              enum: ["listThemes", "getThemeDetails", "installTheme", "uploadTheme", "activateTheme", "deleteTheme", "updateTheme", "searchThemes"],
              description: "The theme management action to perform",
              default: "listThemes"
            },
            data: {
              type: "object",
              description: "Data specific to the selected action",
              properties: {
                // Common properties
                themeSlug: { 
                  type: "string",
                  description: "The theme slug/name identifier (required for getThemeDetails, installTheme, activateTheme, deleteTheme, updateTheme)"
                },
                
                // For listThemes
                status: {
                  type: "string",
                  enum: ["", "active", "inactive"],
                  description: "Filter themes by status when listing",
                  default: ""
                },
                
                // For installTheme/uploadTheme
                activate: {
                  type: "boolean",
                  description: "Whether to activate the theme after installation",
                  default: false
                },
                
                // For uploadTheme
                fileUrl: {
                  type: "string",
                  description: "URL to download a theme zip file"
                },
                filePath: {
                  type: "string",
                  description: "Local file path to a theme zip file"
                },
                fileBuffer: {
                  type: "string",
                  description: "Base64-encoded theme zip file content"
                },
                
                // For searchThemes
                searchTerm: {
                  type: "string",
                  description: "Search term for finding themes in the WordPress.org repository"
                },
                subject: {
                  type: "string",
                  description: "Theme subject filter (e.g., Blog, E-Commerce, Portfolio)"
                },
                feature: {
                  type: "string",
                  description: "Theme feature filter (e.g., Accessibility Ready, Custom Colors, Editor Style)"
                },
                page: {
                  type: "integer",
                  description: "Page number for search results pagination",
                  default: 1
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

module.exports = ThemeManagerTool; 