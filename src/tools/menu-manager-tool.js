/**
 * Menu Manager Tool
 * Comprehensive tool for managing WordPress navigation menus
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class MenuManagerTool extends BaseTool {
  constructor() {
    super('wordpress_menu_manager', 'Comprehensive tool for managing WordPress navigation menus');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the menu manager tool
   * @param {Object} params - Parameters for the menu operation
   * @param {string} params.action - Action to perform (list, get, create, update, delete, addItem, removeItem, reorder)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { action = 'list', data = {} } = params;
      
      switch (action) {
        case 'list':
          return await this.listMenus(data);
        case 'get':
          return await this.getMenuDetails(data);
        case 'create':
          return await this.createMenu(data);
        case 'update':
          return await this.updateMenu(data);
        case 'delete':
          return await this.deleteMenu(data);
        case 'addItem':
          return await this.addMenuItem(data);
        case 'removeItem':
          return await this.removeMenuItem(data);
        case 'reorder':
          return await this.reorderMenuItems(data);
        case 'screenshot':
          return await this.takeMenuScreenshot(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * List all navigation menus
   */
  async listMenus(data) {
    try {
      // Using browser automation since WP REST API doesn't have built-in endpoints for menus
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to menus page
      await this.browser.navigateToAdminPage('/nav-menus.php');
      
      // Extract menu data
      const menus = await this.browser.page.evaluate(() => {
        const menusList = [];
        
        // Check if we're in the menu list view
        const menusSelect = document.getElementById('select-menu-to-edit');
        if (menusSelect) {
          const options = menusSelect.querySelectorAll('option');
          options.forEach(option => {
            // Skip the first "Select a menu to edit" option
            if (option.value !== '0' && option.value !== '') {
              menusList.push({
                id: parseInt(option.value, 10),
                name: option.textContent.trim()
              });
            }
          });
        }
        
        // Check if there's a currently active menu
        const currentMenuName = document.querySelector('#menu-name-title');
        const currentMenuId = document.querySelector('#menu');
        
        let activeMenu = null;
        if (currentMenuName && currentMenuId && currentMenuId.value) {
          activeMenu = {
            id: parseInt(currentMenuId.value, 10),
            name: currentMenuName.textContent.trim()
          };
        }
        
        // Get menu locations
        const locations = {};
        const locationCheckboxes = document.querySelectorAll('.menu-settings-group input[name^="menu-locations"]');
        locationCheckboxes.forEach(checkbox => {
          const locationName = checkbox.name.replace('menu-locations[', '').replace(']', '');
          locations[locationName] = {
            name: checkbox.parentNode.textContent.trim(),
            assigned: checkbox.checked
          };
        });
        
        return {
          menus: menusList,
          activeMenu,
          locations
        };
      });
      
      return {
        success: true,
        data: menus
      };
    } catch (error) {
      return this.handleError(error, 'listMenus');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Get detailed information about a specific menu
   */
  async getMenuDetails(data) {
    try {
      const { menuId } = data;
      
      if (!menuId) {
        throw new Error('Menu ID is required');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the specific menu
      await this.browser.navigateToAdminPage(`/nav-menus.php?action=edit&menu=${menuId}`);
      
      // Wait for the menu to load
      await this.browser.page.waitForSelector('#menu-to-edit, .manage-menus', { timeout: 10000 });
      
      // Check if the menu exists
      const menuExists = await this.browser.page.evaluate(() => {
        return !document.querySelector('.manage-menus') || 
               !document.querySelector('.manage-menus').textContent.includes('doesn\'t exist');
      });
      
      if (!menuExists) {
        throw new Error(`Menu with ID ${menuId} does not exist`);
      }
      
      // Extract menu data
      const menuData = await this.browser.page.evaluate(() => {
        // Get menu name
        const menuName = document.querySelector('#menu-name').value;
        
        // Get menu items
        const menuItems = [];
        const menuItemElements = document.querySelectorAll('#menu-to-edit li.menu-item');
        
        menuItemElements.forEach(item => {
          const id = parseInt(item.id.replace('menu-item-', ''), 10);
          const titleInput = item.querySelector('.edit-menu-item-title');
          const urlInput = item.querySelector('.edit-menu-item-url');
          const parentContainer = item.parentNode.parentNode;
          const isSubmenu = parentContainer.tagName.toLowerCase() === 'li';
          const parentId = isSubmenu ? parseInt(parentContainer.id.replace('menu-item-', ''), 10) : 0;
          
          menuItems.push({
            id,
            title: titleInput ? titleInput.value : 'Unknown',
            url: urlInput ? urlInput.value : '#',
            isSubmenu,
            parentId,
            itemType: item.className.includes('menu-item-custom') ? 'custom' : 
                      item.className.includes('menu-item-post_type') ? 'post' :
                      item.className.includes('menu-item-taxonomy') ? 'taxonomy' : 'unknown'
          });
        });
        
        // Get menu settings
        const locations = {};
        const locationCheckboxes = document.querySelectorAll('.menu-settings-group input[name^="menu-locations"]');
        locationCheckboxes.forEach(checkbox => {
          const locationName = checkbox.name.replace('menu-locations[', '').replace(']', '');
          locations[locationName] = {
            name: checkbox.parentNode.textContent.trim(),
            assigned: checkbox.checked
          };
        });
        
        // Get auto-add pages option
        const autoAddPages = document.querySelector('#auto-add-pages').checked;
        
        return {
          name: menuName,
          items: menuItems,
          locations,
          autoAddPages
        };
      });
      
      // Take a screenshot
      const screenshotPath = `./menu-details-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          menuId,
          ...menuData,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'getMenuDetails');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Create a new navigation menu
   */
  async createMenu(data) {
    try {
      const { 
        name,
        locations = [],
        autoAddPages = false
      } = data;
      
      if (!name) {
        throw new Error('Menu name is required');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to create menu page
      await this.browser.navigateToAdminPage('/nav-menus.php?action=edit&menu=0');
      
      // Fill in menu name
      await this.browser.page.type('#menu-name', name);
      
      // Click create menu button
      await this.browser.page.click('#save_menu_header');
      
      // Wait for page to reload
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Get the new menu ID
      const menuId = await this.browser.page.evaluate(() => {
        const menuIdInput = document.querySelector('#menu');
        return menuIdInput ? parseInt(menuIdInput.value, 10) : null;
      });
      
      if (!menuId) {
        throw new Error('Failed to create menu');
      }
      
      // Set menu locations if provided
      if (locations.length > 0) {
        for (const location of locations) {
          await this.browser.page.evaluate((loc) => {
            const checkbox = document.querySelector(`input[name="menu-locations[${loc}]"]`);
            if (checkbox) checkbox.checked = true;
          }, location);
        }
      }
      
      // Set auto-add pages option
      await this.browser.page.evaluate((autoAdd) => {
        const checkbox = document.querySelector('#auto-add-pages');
        if (checkbox) checkbox.checked = autoAdd;
      }, autoAddPages);
      
      // Save menu
      await this.browser.page.click('#save_menu_header');
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Take a screenshot
      const screenshotPath = `./menu-create-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          menuId,
          name,
          locations,
          autoAddPages,
          message: `Menu "${name}" created successfully`,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'createMenu');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Update an existing menu
   */
  async updateMenu(data) {
    try {
      const { 
        menuId,
        name,
        locations,
        autoAddPages
      } = data;
      
      if (!menuId) {
        throw new Error('Menu ID is required');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the specific menu
      await this.browser.navigateToAdminPage(`/nav-menus.php?action=edit&menu=${menuId}`);
      
      // Wait for the menu to load
      await this.browser.page.waitForSelector('#menu-to-edit, .manage-menus', { timeout: 10000 });
      
      // Check if the menu exists
      const menuExists = await this.browser.page.evaluate(() => {
        return !document.querySelector('.manage-menus') || 
               !document.querySelector('.manage-menus').textContent.includes('doesn\'t exist');
      });
      
      if (!menuExists) {
        throw new Error(`Menu with ID ${menuId} does not exist`);
      }
      
      // Update menu properties
      if (name) {
        await this.browser.page.evaluate((newName) => {
          const nameInput = document.querySelector('#menu-name');
          if (nameInput) nameInput.value = newName;
        }, name);
      }
      
      // Update locations if provided
      if (locations) {
        // First uncheck all locations
        await this.browser.page.evaluate(() => {
          const checkboxes = document.querySelectorAll('input[name^="menu-locations"]');
          checkboxes.forEach(checkbox => {
            checkbox.checked = false;
          });
        });
        
        // Then check the ones specified
        for (const location of locations) {
          await this.browser.page.evaluate((loc) => {
            const checkbox = document.querySelector(`input[name="menu-locations[${loc}]"]`);
            if (checkbox) checkbox.checked = true;
          }, location);
        }
      }
      
      // Update auto-add pages option if provided
      if (autoAddPages !== undefined) {
        await this.browser.page.evaluate((autoAdd) => {
          const checkbox = document.querySelector('#auto-add-pages');
          if (checkbox) checkbox.checked = autoAdd;
        }, autoAddPages);
      }
      
      // Save the menu
      await this.browser.page.click('#save_menu_header');
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Take a screenshot
      const screenshotPath = `./menu-update-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          menuId,
          name,
          locations,
          autoAddPages,
          message: `Menu updated successfully`,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateMenu');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Delete a menu
   */
  async deleteMenu(data) {
    try {
      const { menuId } = data;
      
      if (!menuId) {
        throw new Error('Menu ID is required');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the specific menu
      await this.browser.navigateToAdminPage(`/nav-menus.php?action=edit&menu=${menuId}`);
      
      // Wait for the menu to load
      await this.browser.page.waitForSelector('#menu-to-edit, .manage-menus', { timeout: 10000 });
      
      // Check if the menu exists
      const menuExists = await this.browser.page.evaluate(() => {
        return !document.querySelector('.manage-menus') || 
               !document.querySelector('.manage-menus').textContent.includes('doesn\'t exist');
      });
      
      if (!menuExists) {
        throw new Error(`Menu with ID ${menuId} does not exist`);
      }
      
      // Click the delete link
      const deleteSuccess = await this.browser.page.evaluate(() => {
        const deleteLink = document.querySelector('.submitdelete');
        if (deleteLink) {
          deleteLink.click();
          return true;
        }
        return false;
      });
      
      if (!deleteSuccess) {
        throw new Error('Delete link not found');
      }
      
      // Wait for confirmation dialog
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      return {
        success: true,
        data: {
          menuId,
          message: `Menu deleted successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteMenu');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Add an item to a menu
   */
  async addMenuItem(data) {
    try {
      const { 
        menuId,
        type = 'custom', // custom, page, post, category, tag
        title,
        url = '',
        objectId = null, // ID of the object (post, page, etc.) if not custom
        parentId = 0,
        position = -1 // -1 means add to end
      } = data;
      
      if (!menuId) {
        throw new Error('Menu ID is required');
      }
      
      if (!title && type === 'custom') {
        throw new Error('Item title is required for custom links');
      }
      
      if (type === 'custom' && !url) {
        throw new Error('URL is required for custom links');
      }
      
      if (type !== 'custom' && !objectId) {
        throw new Error('Object ID is required for non-custom menu items');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the specific menu
      await this.browser.navigateToAdminPage(`/nav-menus.php?action=edit&menu=${menuId}`);
      
      // Wait for the menu to load
      await this.browser.page.waitForSelector('#menu-to-edit, .manage-menus', { timeout: 10000 });
      
      // Check if the menu exists
      const menuExists = await this.browser.page.evaluate(() => {
        return !document.querySelector('.manage-menus') || 
               !document.querySelector('.manage-menus').textContent.includes('doesn\'t exist');
      });
      
      if (!menuExists) {
        throw new Error(`Menu with ID ${menuId} does not exist`);
      }
      
      // Add menu item based on type
      let itemAdded = false;
      
      if (type === 'custom') {
        // Open custom links section if not open
        await this.browser.page.evaluate(() => {
          const customLinksTab = document.querySelector('#add-custom-links-tab');
          if (customLinksTab && !customLinksTab.parentNode.classList.contains('tabs-panel-active')) {
            customLinksTab.click();
          }
        });
        
        // Fill custom link form
        await this.browser.page.type('#custom-menu-item-url', url);
        await this.browser.page.type('#custom-menu-item-name', title);
        
        // Click add to menu button
        await this.browser.page.click('#submit-customlinkdiv');
        
        // Wait for new item to appear
        await this.browser.page.waitForSelector('.pending', { timeout: 5000 });
        itemAdded = true;
      } else {
        // Handle other content types (posts, pages, categories, etc.)
        const tabMap = {
          'page': 'add-page-tab',
          'post': 'add-post-tab',
          'category': 'add-category-tab',
          'tag': 'add-post_tag-tab'
        };
        
        const tabId = tabMap[type];
        if (!tabId) {
          throw new Error(`Unsupported menu item type: ${type}`);
        }
        
        // Open the tab if not open
        await this.browser.page.evaluate((id) => {
          const tab = document.querySelector(`#${id}`);
          if (tab && !tab.parentNode.classList.contains('tabs-panel-active')) {
            tab.click();
          }
        }, tabId);
        
        // Select the item
        await this.browser.page.evaluate((objId) => {
          const checkbox = document.querySelector(`#in-${objId}`);
          if (checkbox) {
            checkbox.checked = true;
            return true;
          }
          return false;
        }, objectId);
        
        // Click add to menu button for that section
        const submitButtonId = tabId.replace('tab', 'submit');
        await this.browser.page.click(`#${submitButtonId}`);
        
        // Wait for new item to appear
        await this.browser.page.waitForSelector('.pending', { timeout: 5000 });
        itemAdded = true;
      }
      
      if (!itemAdded) {
        throw new Error('Failed to add menu item');
      }
      
      // Set parent item if needed
      if (parentId > 0) {
        // Find the new item
        const newItemId = await this.browser.page.evaluate(() => {
          const pendingItem = document.querySelector('.pending');
          if (pendingItem) {
            return pendingItem.id.replace('menu-item-', '');
          }
          return null;
        });
        
        if (newItemId) {
          await this.browser.page.evaluate((itemId, parent) => {
            const itemDepthInput = document.querySelector(`#menu-item-${itemId} input.menu-item-data-parent-id`);
            if (itemDepthInput) {
              itemDepthInput.value = parent;
            }
          }, newItemId, parentId);
        }
      }
      
      // Save menu
      await this.browser.page.click('#save_menu_header');
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Take a screenshot
      const screenshotPath = `./menu-add-item-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          menuId,
          type,
          title,
          url,
          objectId,
          parentId,
          message: 'Menu item added successfully',
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'addMenuItem');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Remove an item from a menu
   */
  async removeMenuItem(data) {
    try {
      const { menuId, itemId } = data;
      
      if (!menuId) {
        throw new Error('Menu ID is required');
      }
      
      if (!itemId) {
        throw new Error('Menu item ID is required');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the specific menu
      await this.browser.navigateToAdminPage(`/nav-menus.php?action=edit&menu=${menuId}`);
      
      // Wait for the menu to load
      await this.browser.page.waitForSelector('#menu-to-edit, .manage-menus', { timeout: 10000 });
      
      // Check if the menu exists
      const menuExists = await this.browser.page.evaluate(() => {
        return !document.querySelector('.manage-menus') || 
               !document.querySelector('.manage-menus').textContent.includes('doesn\'t exist');
      });
      
      if (!menuExists) {
        throw new Error(`Menu with ID ${menuId} does not exist`);
      }
      
      // Expand the menu item if needed
      await this.browser.page.evaluate((id) => {
        const item = document.querySelector(`#menu-item-${id}`);
        if (item && !item.classList.contains('menu-item-edit-active')) {
          const titleArea = item.querySelector('.menu-item-title, .item-title');
          if (titleArea) titleArea.click();
        }
      }, itemId);
      
      // Click the remove link
      const removeSuccess = await this.browser.page.evaluate((id) => {
        const removeLink = document.querySelector(`#menu-item-${id} .item-delete, #menu-item-${id} .submitdelete`);
        if (removeLink) {
          removeLink.click();
          return true;
        }
        return false;
      }, itemId);
      
      if (!removeSuccess) {
        throw new Error(`Menu item ${itemId} not found or could not be removed`);
      }
      
      // Save menu
      await this.browser.page.click('#save_menu_header');
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Take a screenshot
      const screenshotPath = `./menu-remove-item-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          menuId,
          itemId,
          message: 'Menu item removed successfully',
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'removeMenuItem');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Reorder menu items
   */
  async reorderMenuItems(data) {
    try {
      const { menuId, items } = data;
      
      if (!menuId) {
        throw new Error('Menu ID is required');
      }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Items array is required with at least one item');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the specific menu
      await this.browser.navigateToAdminPage(`/nav-menus.php?action=edit&menu=${menuId}`);
      
      // Wait for the menu to load
      await this.browser.page.waitForSelector('#menu-to-edit, .manage-menus', { timeout: 10000 });
      
      // Check if the menu exists
      const menuExists = await this.browser.page.evaluate(() => {
        return !document.querySelector('.manage-menus') || 
               !document.querySelector('.manage-menus').textContent.includes('doesn\'t exist');
      });
      
      if (!menuExists) {
        throw new Error(`Menu with ID ${menuId} does not exist`);
      }
      
      // Update menu item positions
      for (const item of items) {
        const { id, parentId = 0, position = 0 } = item;
        
        if (!id) {
          continue; // Skip items without ID
        }
        
        await this.browser.page.evaluate((itemId, parent, pos) => {
          const menuItem = document.querySelector(`#menu-item-${itemId}`);
          if (!menuItem) return false;
          
          // Set parent ID
          const parentInput = menuItem.querySelector('input.menu-item-data-parent-id');
          if (parentInput) parentInput.value = parent;
          
          // Set menu order
          const menuOrderInput = menuItem.querySelector('input.menu-item-data-db-id');
          if (menuOrderInput) menuOrderInput.value = pos;
          
          return true;
        }, id, parentId, position);
      }
      
      // Save menu
      await this.browser.page.click('#save_menu_header');
      await this.browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Take a screenshot
      const screenshotPath = `./menu-reorder-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          menuId,
          items,
          message: 'Menu items reordered successfully',
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'reorderMenuItems');
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Take a screenshot of the menu structure and editor
   */
  async takeMenuScreenshot(data) {
    try {
      const { menuId } = data;
      
      if (!menuId) {
        throw new Error('Menu ID is required');
      }
      
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to the specific menu
      await this.browser.navigateToAdminPage(`/nav-menus.php?action=edit&menu=${menuId}`);
      
      // Wait for the menu to load
      await this.browser.page.waitForSelector('#menu-to-edit, .manage-menus', { timeout: 10000 });
      
      // Check if the menu exists
      const menuExists = await this.browser.page.evaluate(() => {
        return !document.querySelector('.manage-menus') || 
               !document.querySelector('.manage-menus').textContent.includes('doesn\'t exist');
      });
      
      if (!menuExists) {
        throw new Error(`Menu with ID ${menuId} does not exist`);
      }
      
      // Take a screenshot
      const screenshotPath = `./menu-screenshot-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      // Get menu name
      const menuName = await this.browser.page.evaluate(() => {
        const nameInput = document.querySelector('#menu-name');
        return nameInput ? nameInput.value : 'Unknown';
      });
      
      return {
        success: true,
        data: {
          menuId,
          menuName,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'takeMenuScreenshot');
    } finally {
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
          enum: ['list', 'get', 'create', 'update', 'delete', 'addItem', 'removeItem', 'reorder', 'screenshot'],
          description: 'Action to perform on menus'
        },
        data: {
          type: 'object',
          description: 'Data specific to the action',
          properties: {
            // Common properties
            menuId: { 
              type: 'integer',
              description: 'Menu ID' 
            },
            
            // For create/update actions
            name: { 
              type: 'string',
              description: 'Menu name' 
            },
            locations: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Menu locations (theme locations where this menu should appear)' 
            },
            autoAddPages: { 
              type: 'boolean',
              description: 'Whether to automatically add new top-level pages to this menu' 
            },
            
            // For addItem action
            type: { 
              type: 'string',
              enum: ['custom', 'page', 'post', 'category', 'tag'],
              description: 'Type of menu item to add' 
            },
            title: { 
              type: 'string',
              description: 'Menu item title' 
            },
            url: { 
              type: 'string',
              description: 'URL for custom links' 
            },
            objectId: { 
              type: 'integer',
              description: 'ID of the object (post, page, etc.) for non-custom links' 
            },
            parentId: { 
              type: 'integer',
              description: 'Parent menu item ID (0 for top-level)' 
            },
            position: { 
              type: 'integer',
              description: 'Position in the menu (-1 for end)' 
            },
            
            // For removeItem action
            itemId: { 
              type: 'integer',
              description: 'Menu item ID to remove' 
            },
            
            // For reorder action
            items: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  parentId: { type: 'integer' },
                  position: { type: 'integer' }
                },
                required: ['id']
              },
              description: 'Array of items with new ordering information' 
            }
          }
        }
      },
      required: ['action']
    };
  }
}

module.exports = MenuManagerTool; 