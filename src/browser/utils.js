/**
 * Browser utilities for WordPress automation
 */

/**
 * Fetch a page using browser automation
 * @param {Object} browser - The browser instance
 * @param {string} url - URL to fetch
 * @param {Object} options - Options for page navigation
 * @returns {Promise<Object>} - Page content and metadata
 */
const fetchPage = async (browser, url, options = {}) => {
  try {
    await browser.page.goto(url, { waitUntil: 'networkidle2', ...options });
    const content = await browser.page.content();
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Execute an action on the page
 * @param {Object} browser - The browser instance
 * @param {Function} actionFn - Function to execute on the page
 * @param {Object} options - Options for the action
 * @returns {Promise<Object>} - Action result
 */
const executeAction = async (browser, actionFn, options = {}) => {
  try {
    const result = await actionFn(browser.page, options);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Execute a REST API request through the browser
 * @param {Object} browser - The browser instance
 * @param {string} endpoint - REST API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request data
 * @returns {Promise<Object>} - Response
 */
const executeRestRequest = async (browser, endpoint, method = 'GET', data = null) => {
  try {
    const result = await browser.page.evaluate(
      async (endpoint, method, data) => {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.wpApiSettings?.nonce || ''
          }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(data);
        }
        
        const response = await fetch(endpoint, options);
        return await response.json();
      },
      endpoint,
      method,
      data
    );
    
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  fetchPage,
  executeAction,
  executeRestRequest
}; 