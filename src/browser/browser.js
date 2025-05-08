/**
 * Browser Automation Module
 * Handles browser-based interactions with WordPress using Puppeteer
 */
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const config = require('../config');

class WordPressBrowser {
  constructor(options = {}) {
    this.siteUrl = options.siteUrl || config.wordpress.siteUrl;
    this.username = options.username || config.wordpress.username;
    this.password = options.appPassword || config.wordpress.appPassword;
    this.adminPath = options.adminPath || config.wordpress.adminPath;
    this.headless = typeof options.headless !== 'undefined' ? options.headless : config.browser.headless;
    this.slowMo = options.slowMo || config.browser.slowMo;
    this.defaultViewport = options.defaultViewport || config.browser.defaultViewport;
    
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }
  
  /**
   * Launch the browser
   */
  async launch() {
    try {
      logger.info('Launching browser');
      this.browser = await puppeteer.launch({
        headless: this.headless,
        slowMo: this.slowMo,
        defaultViewport: this.defaultViewport,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      this.page = await this.browser.newPage();
      
      // Set up event listeners for console logging
      this.page.on('console', message => {
        if (message.type() === 'error') {
          logger.error(`Browser console error: ${message.text()}`);
        } else {
          logger.debug(`Browser console: ${message.text()}`);
        }
      });
      
      return this.browser;
    } catch (error) {
      logger.error('Failed to launch browser', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      logger.info('Closing browser');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
    }
  }
  
  /**
   * Log in to WordPress admin
   */
  async login() {
    if (!this.browser) {
      await this.launch();
    }
    
    if (this.isLoggedIn) {
      logger.info('Already logged in');
      return true;
    }
    
    try {
      logger.info('Logging in to WordPress admin');
      
      // Navigate to the login page
      await this.page.goto(`${this.siteUrl}${this.adminPath}/`, {
        waitUntil: 'networkidle2'
      });
      
      // Check if already logged in
      const currentUrl = this.page.url();
      if (!currentUrl.includes('wp-login.php')) {
        logger.info('Already logged in to WordPress admin');
        this.isLoggedIn = true;
        return true;
      }
      
      // Fill in the login form
      await this.page.type('#user_login', this.username);
      await this.page.type('#user_pass', this.password);
      await this.page.click('#wp-submit');
      
      // Wait for navigation to complete
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check if login was successful
      const isLoginPage = this.page.url().includes('wp-login.php');
      if (isLoginPage) {
        const errorElement = await this.page.$('.login-error');
        if (errorElement) {
          const errorText = await this.page.evaluate(el => el.textContent, errorElement);
          throw new Error(`Login failed: ${errorText}`);
        }
        throw new Error('Login failed for unknown reason');
      }
      
      logger.info('Successfully logged in to WordPress admin');
      this.isLoggedIn = true;
      return true;
    } catch (error) {
      logger.error('Failed to log in to WordPress admin', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Navigate to a specific admin page
   */
  async navigateToAdminPage(path) {
    if (!this.isLoggedIn) {
      await this.login();
    }
    
    try {
      const fullPath = path.startsWith('/') ? path : `/${path}`;
      logger.info(`Navigating to admin page: ${fullPath}`);
      
      await this.page.goto(`${this.siteUrl}${this.adminPath}${fullPath}`, {
        waitUntil: 'networkidle2'
      });
      
      return this.page;
    } catch (error) {
      logger.error(`Failed to navigate to admin page: ${path}`, { error: error.message });
      throw error;
    }
  }
  
  /**
   * Create a new page in WordPress
   */
  async createPage(title, content, options = {}) {
    try {
      // Navigate to Add New Page screen
      await this.navigateToAdminPage('/post-new.php?post_type=page');
      
      // Check if we're using classic editor or block editor (Gutenberg)
      const isGutenberg = await this.page.$('.block-editor');
      
      if (isGutenberg) {
        // Gutenberg Editor
        // Wait for editor to load completely
        await this.page.waitForSelector('.editor-post-title__input');
        
        // Enter title
        await this.page.type('.editor-post-title__input', title);
        
        // Enter content - this is more complex in Gutenberg
        // We'll click the add block button and add a paragraph
        await this.page.click('.block-editor-inserter__toggle');
        await this.page.click('.editor-block-list-item-paragraph');
        await this.page.type('.block-editor-rich-text__editable', content);
        
        // Publish the page
        await this.page.click('.editor-post-publish-panel__toggle');
        await this.page.waitForSelector('.editor-post-publish-button');
        await this.page.click('.editor-post-publish-button');
        
        // Wait for publish confirmation
        await this.page.waitForSelector('.components-snackbar');
      } else {
        // Classic Editor
        await this.page.type('#title', title);
        
        // Check if we need to switch to Text tab for content
        if (options.useTextEditor) {
          await this.page.click('#content-html');
        }
        
        // Enter content
        if (options.useTextEditor) {
          await this.page.type('#content', content);
        } else {
          // If using visual editor, we need to switch to the iframe
          const frame = this.page.frames().find(f => f.name() === 'content_ifr');
          await frame.type('body', content);
        }
        
        // Publish the page
        await this.page.click('#publish');
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      logger.info('Created new page successfully', { title });
      
      // Get the page ID from the URL
      const pageUrl = this.page.url();
      const match = pageUrl.match(/post=(\d+)/);
      const pageId = match ? match[1] : null;
      
      return { success: true, pageId };
    } catch (error) {
      logger.error('Failed to create page', { error: error.message, title });
      throw error;
    }
  }
  
  /**
   * Work with Divi Theme Builder
   */
  async openDiviBuilder(pageId) {
    try {
      // Navigate to the edit page
      await this.navigateToAdminPage(`/post.php?post=${pageId}&action=edit`);
      
      // Check if Divi builder is available
      const hasDiviButton = await this.page.$('#et_pb_use_builder');
      
      if (!hasDiviButton) {
        throw new Error('Divi Builder not found on this page');
      }
      
      // Click on "Use Divi Builder" button if not already active
      const isBuilderActive = await this.page.$('#et_pb_toggle_builder.et_pb_builder_is_used');
      
      if (!isBuilderActive) {
        await this.page.click('#et_pb_use_builder');
        // Wait for Divi to initialize
        await this.page.waitForSelector('.et-pb-option-container', { visible: true });
      }
      
      // Click on "Visual Builder" button
      await this.page.click('.et_pb_visual_builder_button');
      
      // Wait for visual builder to load
      await this.page.waitForSelector('.et-fb-button', { visible: true });
      
      logger.info('Opened Divi Visual Builder', { pageId });
      return true;
    } catch (error) {
      logger.error('Failed to open Divi Builder', { error: error.message, pageId });
      throw error;
    }
  }
  
  /**
   * Work with GeoDirectory Plugin
   */
  async configureGeoDirectory() {
    try {
      // Navigate to GeoDirectory settings
      await this.navigateToAdminPage('/admin.php?page=geodirectory');
      
      // Check if GeoDirectory settings are available
      const hasGeoSettings = await this.page.$('.geodir-settings-wrap');
      
      if (!hasGeoSettings) {
        throw new Error('GeoDirectory settings not found');
      }
      
      logger.info('Accessed GeoDirectory settings');
      
      // Return the current settings (you can expand this to configure specific settings)
      return {
        success: true,
        message: 'Accessed GeoDirectory settings'
      };
    } catch (error) {
      logger.error('Failed to configure GeoDirectory', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Take a screenshot
   */
  async takeScreenshot(path) {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    
    try {
      await this.page.screenshot({ path, fullPage: true });
      logger.info(`Screenshot saved to ${path}`);
      return { success: true, path };
    } catch (error) {
      logger.error('Failed to take screenshot', { error: error.message });
      throw error;
    }
  }
}

module.exports = WordPressBrowser; 