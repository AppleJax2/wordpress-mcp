/**
 * Media Manager Tool
 * Comprehensive tool for managing WordPress media library
 */
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class MediaManagerTool extends BaseTool {
  constructor() {
    super('wordpress_media_manager', 'Comprehensive tool for managing WordPress media library');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the media manager tool
   * @param {Object} params - Parameters for the media operation
   * @param {string} params.action - Action to perform (list, upload, get, update, delete, organize, screenshot)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { action = 'list', data = {} } = params;
      
      switch (action) {
        case 'list':
          return await this.listMedia(data);
        case 'upload':
          return await this.uploadMedia(data);
        case 'get':
          return await this.getMediaDetails(data);
        case 'update':
          return await this.updateMedia(data);
        case 'delete':
          return await this.deleteMedia(data);
        case 'organize':
          return await this.organizeMedia(data);
        case 'screenshot':
          return await this.takeScreenshot(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * List media items with filtering
   */
  async listMedia(data) {
    try {
      const { 
        search = '',
        mediaType = '',
        author = '',
        parent = '',
        page = 1,
        perPage = 20,
        orderBy = 'date',
        order = 'desc'
      } = data;
      
      // Build query parameters
      const params = { 
        page,
        per_page: perPage,
        orderby: orderBy,
        order
      };
      
      // Add optional filters
      if (search) params.search = search;
      if (mediaType) params.media_type = mediaType;
      if (author) params.author = author;
      if (parent) params.parent = parent;
      
      // Get media items
      const response = await this.api.getMedia(params);
      
      // Extract pagination info from headers
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
      return this.handleError(error, 'listMedia');
    }
  }
  
  /**
   * Upload media to WordPress
   */
  async uploadMedia(data) {
    try {
      const { 
        fileUrl = '',
        filePath = '',
        fileBuffer = null,
        title = '',
        alt = '',
        caption = '',
        description = ''
      } = data;
      
      let file;
      let metadata = { title, alt, caption, description };
      
      // Determine file source and get the file
      if (fileUrl) {
        // Download file from URL
        this.logger.info(`Downloading file from URL: ${fileUrl}`);
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        file = buffer;
        
        // Get filename from URL for metadata
        const urlPath = new URL(fileUrl).pathname;
        const filename = path.basename(urlPath);
        metadata.filename = filename;
        
        // Determine content type
        metadata.contentType = response.headers.get('content-type') || 'application/octet-stream';
      } else if (filePath) {
        // Use local file path
        file = filePath;
        
        // Get file metadata
        const filename = path.basename(filePath);
        metadata.filename = filename;
        
        // Infer content type from file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
          '.mp4': 'video/mp4',
          '.mp3': 'audio/mpeg',
          '.zip': 'application/zip'
        };
        metadata.contentType = contentTypes[ext] || 'application/octet-stream';
      } else if (fileBuffer) {
        // Use provided buffer
        file = Buffer.from(fileBuffer, 'base64');
        
        // Use provided filename or default
        metadata.filename = metadata.filename || 'uploaded-file';
        
        // Use provided content type or default
        metadata.contentType = metadata.contentType || 'application/octet-stream';
      } else {
        throw new Error('No file provided. Provide fileUrl, filePath, or fileBuffer');
      }
      
      // Upload the file
      const uploadedMedia = await this.api.uploadMedia(file, metadata);
      
      return {
        success: true,
        data: {
          media: uploadedMedia
        }
      };
    } catch (error) {
      return this.handleError(error, 'uploadMedia');
    }
  }
  
  /**
   * Get detailed information about a media item
   */
  async getMediaDetails(data) {
    try {
      const { mediaId } = data;
      
      if (!mediaId) {
        throw new Error('Media ID is required');
      }
      
      const mediaItem = await this.api.getMediaById(mediaId);
      
      return {
        success: true,
        data: {
          media: mediaItem
        }
      };
    } catch (error) {
      return this.handleError(error, 'getMediaDetails');
    }
  }
  
  /**
   * Update media item metadata
   */
  async updateMedia(data) {
    try {
      const { 
        mediaId,
        title,
        alt,
        description,
        caption
      } = data;
      
      if (!mediaId) {
        throw new Error('Media ID is required');
      }
      
      // Build update data
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (alt !== undefined) updateData.alt_text = alt;
      if (description !== undefined) updateData.description = description;
      if (caption !== undefined) updateData.caption = caption;
      
      const updatedMedia = await this.api.updateMedia(mediaId, updateData);
      
      return {
        success: true,
        data: {
          media: updatedMedia
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateMedia');
    }
  }
  
  /**
   * Delete a media item
   */
  async deleteMedia(data) {
    try {
      const { mediaId, force = false } = data;
      
      if (!mediaId) {
        throw new Error('Media ID is required');
      }
      
      const deletedMedia = await this.api.deleteMedia(mediaId, force);
      
      return {
        success: true,
        data: {
          message: `Media item ${mediaId} deleted successfully`,
          media: deletedMedia
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteMedia');
    }
  }
  
  /**
   * Organize media using browser automation
   * This is for plugins like FileBird or Media Library Organizer
   */
  async organizeMedia(data) {
    try {
      const { mediaIds, folder, createFolder = false } = data;
      
      if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
        throw new Error('Media IDs array is required');
      }
      
      if (!folder) {
        throw new Error('Folder name is required');
      }
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to media library
      await this.browser.navigateToAdminPage('/upload.php');
      
      // Check for media organizer plugins
      const hasFileBird = await this.browser.page.evaluate(() => {
        return !!document.querySelector('.njt-filebird-folder, .filebird-sidebar');
      });
      
      const hasMediaLibraryOrganizer = await this.browser.page.evaluate(() => {
        return !!document.querySelector('.wpmediacategory-filter');
      });
      
      if (!hasFileBird && !hasMediaLibraryOrganizer) {
        throw new Error('No supported media organizer plugin found. Install FileBird or Media Library Organizer.');
      }
      
      // Organize with FileBird
      if (hasFileBird) {
        let folderId = null;
        
        // Check if folder exists
        const folderExists = await this.browser.page.evaluate((folderName) => {
          const folderElements = document.querySelectorAll('.njt-filebird-folder span, .filebird-sidebar span');
          for (const el of folderElements) {
            if (el.textContent.trim() === folderName) {
              return true;
            }
          }
          return false;
        }, folder);
        
        // Create folder if it doesn't exist
        if (!folderExists && createFolder) {
          this.logger.info(`Creating folder: ${folder}`);
          
          // Click new folder button
          await this.browser.page.click('.filebird-add-new-folder, .njt-filebird-add-new-folder');
          
          // Wait for input field
          await this.browser.page.waitForSelector('input.filebird-folder-name, input.njt-filebird-input');
          
          // Type folder name
          await this.browser.page.type('input.filebird-folder-name, input.njt-filebird-input', folder);
          
          // Press Enter
          await this.browser.page.keyboard.press('Enter');
          
          // Wait for folder creation
          await this.browser.page.waitForTimeout(1000);
        }
        
        // Get folder ID
        folderId = await this.browser.page.evaluate((folderName) => {
          const folderElements = document.querySelectorAll('.njt-filebird-folder, .filebird-sidebar-item');
          for (const el of folderElements) {
            const span = el.querySelector('span');
            if (span && span.textContent.trim() === folderName) {
              // Extract ID from element data attributes or classes
              const id = el.dataset.id || el.dataset.folder || null;
              if (id) return id;
              
              // Try to extract from class if data attribute not available
              const classMatch = [...el.classList].find(c => c.match(/folder-item-(\d+)/));
              if (classMatch) {
                return classMatch.replace('folder-item-', '');
              }
            }
          }
          return null;
        }, folder);
        
        if (!folderId) {
          throw new Error(`Could not find or create folder: ${folder}`);
        }
        
        // Select media items
        for (const mediaId of mediaIds) {
          await this.browser.page.click(`input[name="media[]"][value="${mediaId}"], .attachment[data-id="${mediaId}"] .check`);
        }
        
        // Move to folder
        // This varies by FileBird version, so we try multiple methods
        const moveSuccess = await this.browser.page.evaluate(async (folderId) => {
          // Try FileBird Pro version
          if (typeof window.njt_filebird_folder !== 'undefined') {
            try {
              window.njt_filebird_folder.moveFileToFolder(folderId);
              return true;
            } catch (e) {
              console.error('FileBird Pro move failed:', e);
            }
          }
          
          // Try FileBird standard version
          if (typeof window.fbv !== 'undefined' && window.fbv.moveSelectedAttachments) {
            try {
              window.fbv.moveSelectedAttachments(folderId);
              return true;
            } catch (e) {
              console.error('FileBird standard move failed:', e);
            }
          }
          
          // Try FileBird alternative method
          if (document.querySelector('.njt-filebird-dropdown, .filebird-dropdown')) {
            try {
              document.querySelector('.njt-filebird-dropdown, .filebird-dropdown').click();
              // Wait for dropdown menu
              await new Promise(resolve => setTimeout(resolve, 500));
              // Click move to folder
              const moveLinks = Array.from(document.querySelectorAll('.njt-filebird-dropdown a, .filebird-dropdown a'));
              const moveLink = moveLinks.find(a => a.textContent.includes('Move to'));
              if (moveLink) moveLink.click();
              // Wait for folder selection 
              await new Promise(resolve => setTimeout(resolve, 500));
              // Select target folder
              const folderLinks = Array.from(document.querySelectorAll('.media-frame a, .media-modal a'));
              const targetLink = folderLinks.find(a => a.dataset.id === folderId || a.dataset.folder === folderId);
              if (targetLink) {
                targetLink.click();
                return true;
              }
            } catch (e) {
              console.error('FileBird dropdown move failed:', e);
            }
          }
          
          return false;
        }, folderId);
        
        if (!moveSuccess) {
          throw new Error('Failed to move media items to folder. Incompatible FileBird version.');
        }
      }
      // Organize with Media Library Organizer
      else if (hasMediaLibraryOrganizer) {
        // To be implemented based on plugin structure
        throw new Error('Media Library Organizer support is not yet implemented');
      }
      
      // Take a screenshot of the result
      const screenshotPath = `./media-organization-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: `Media items moved to folder: ${folder}`,
          mediaIds,
          folder,
          screenshotPath
        }
      };
    } catch (error) {
      return this.handleError(error, 'organizeMedia');
    } finally {
      // Always close the browser
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Take a screenshot of the media library
   */
  async takeScreenshot(data) {
    try {
      const { 
        view = 'grid', // grid or list
        filter = ''  // all, images, audio, video, documents
      } = data;
      
      // Launch browser
      await this.browser.launch();
      await this.browser.login();
      
      // Navigate to media library
      let mediaUrl = '/upload.php';
      
      // Add filters if specified
      if (filter) {
        mediaUrl += `?filter=${filter}`;
      }
      
      await this.browser.navigateToAdminPage(mediaUrl);
      
      // Switch view if needed
      if (view === 'list') {
        await this.browser.page.click('.view-list');
      } else {
        await this.browser.page.click('.view-grid');
      }
      
      // Wait for view to load
      await this.browser.page.waitForTimeout(1000);
      
      // Take screenshot
      const screenshotPath = `./media-library-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshotPath);
      
      return {
        success: true,
        data: {
          message: 'Screenshot of media library taken',
          view,
          filter,
          screenshotPath
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
   * Get JSON schema for MCP
   */
  getSchema() {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'upload', 'get', 'update', 'delete', 'organize', 'screenshot'],
          description: 'Action to perform on media'
        },
        data: {
          type: 'object',
          description: 'Data specific to the action',
          properties: {
            // For list action
            search: { type: 'string' },
            mediaType: { type: 'string', enum: ['image', 'video', 'audio', 'application'] },
            page: { type: 'integer' },
            perPage: { type: 'integer' },
            orderBy: { type: 'string', enum: ['date', 'title', 'id'] },
            order: { type: 'string', enum: ['asc', 'desc'] },
            
            // For upload action
            fileUrl: { type: 'string' },
            filePath: { type: 'string' },
            fileBuffer: { type: 'string' }, // Base64 encoded
            filename: { type: 'string' },
            contentType: { type: 'string' },
            title: { type: 'string' },
            alt: { type: 'string' },
            caption: { type: 'string' },
            description: { type: 'string' },
            
            // For get, update, delete actions
            mediaId: { type: 'integer' },
            force: { type: 'boolean' },
            
            // For organize action
            mediaIds: { type: 'array', items: { type: 'integer' } },
            folder: { type: 'string' },
            createFolder: { type: 'boolean' },
            
            // For screenshot action
            view: { type: 'string', enum: ['grid', 'list'] },
            filter: { type: 'string', enum: ['', 'all', 'images', 'audio', 'video', 'documents'] }
          }
        }
      },
      required: ['action']
    };
  }
}

module.exports = MediaManagerTool; 