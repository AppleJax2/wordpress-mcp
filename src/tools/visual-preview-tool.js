/**
 * Visual Preview & Diff Tool
 * Generates visual representations of WordPress sites and compares changes
 */
const BaseTool = require('./base-tool');
const { createSuccessResponse, createErrorResponse } = require('../utils/response-formatter');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const pixelmatch = require('pixelmatch');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');
const crypto = require('crypto');
const os = require('os');

class VisualPreviewTool extends BaseTool {
  constructor() {
    super('visual_preview_tool', 'Generates visual representations of WordPress sites and compares changes');

    // Create cache directory for screenshots
    this.cacheDir = path.join(os.tmpdir(), 'wordpress-mcp-screenshot-cache');
    this._ensureCacheDir();
    
    // Default TTL for cached screenshots (5 minutes)
    this.cacheTTL = process.env.API_KEY_CACHE_TTL ? parseInt(process.env.API_KEY_CACHE_TTL) : 300000;
    
    // Default viewports
    this.defaultViewports = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1366, height: 768 }
    };
  }

  /**
   * Ensure cache directory exists
   * @private
   */
  async _ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create cache directory: ${error.message}`);
    }
  }

  /**
   * Execute the tool
   * @param {Object} params - Tool parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Tool execution result
   */
  async _execute(params, context) {
    const { action = 'screenshot', ...data } = params;

    switch (action) {
      case 'screenshot':
        return await this.generateScreenshot(data, context);
      case 'compare':
        return await this.compareScreenshots(data, context);
      case 'diff':
        return await this.generateDiff(data, context);
      case 'preview':
        return await this.generatePreview(data, context);
      default:
        return createErrorResponse(
          'INVALID_PARAMETERS',
          `Unsupported action: ${action}`,
          { supportedActions: ['screenshot', 'compare', 'diff', 'preview'] }
        );
    }
  }

  /**
   * Generate a screenshot of a WordPress site
   * @param {Object} data - Screenshot parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Screenshot result
   */
  async generateScreenshot(data, context) {
    try {
      const {
        url,
        viewport = 'desktop',
        fullPage = true,
        selector = null,
        format = 'png',
        quality = 80,
        cacheKey = null,
        forceFresh = false
      } = data;

      if (!url) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'URL is required for screenshot generation',
          { missingParams: ['url'] }
        );
      }

      // Generate cache key based on parameters if not provided
      const effectiveCacheKey = cacheKey || this._generateCacheKey({
        url,
        viewport,
        fullPage,
        selector,
        format
      });

      // Check cache if not forcing fresh screenshot
      if (!forceFresh) {
        const cachedScreenshot = await this._getFromCache(effectiveCacheKey);
        if (cachedScreenshot) {
          return createSuccessResponse(
            {
              screenshot: cachedScreenshot.data,
              metadata: {
                url,
                viewport,
                format,
                dimensions: cachedScreenshot.metadata.dimensions,
                timestamp: cachedScreenshot.metadata.timestamp,
                fromCache: true
              }
            },
            'Screenshot retrieved from cache'
          );
        }
      }

      // Get browser client
      const browser = this.getBrowserClient();
      try {
        // Launch browser if not already launched
        if (!browser.browser) {
          await browser.launch();
        }

        // Set viewport
        const viewportDimensions = typeof viewport === 'string'
          ? this.defaultViewports[viewport] || this.defaultViewports.desktop
          : viewport;

        await browser.page.setViewport(viewportDimensions);

        // Navigate to URL
        await browser.page.goto(url, { waitUntil: 'networkidle2' });

        // Take screenshot
        let screenshot;
        if (selector) {
          // Get element and take screenshot of it
          const element = await browser.page.$(selector);
          if (!element) {
            throw new Error(`Element not found with selector: ${selector}`);
          }
          screenshot = await element.screenshot({ type: format, quality: format === 'jpeg' ? quality : undefined });
        } else {
          // Take full page or viewport screenshot
          screenshot = await browser.page.screenshot({
            fullPage,
            type: format,
            quality: format === 'jpeg' ? quality : undefined
          });
        }

        // Get dimensions
        const dimensions = await browser.page.evaluate(() => {
          return {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
          };
        });

        // Save to cache
        const screenshotData = screenshot.toString('base64');
        await this._saveToCache(effectiveCacheKey, {
          data: screenshotData,
          metadata: {
            url,
            viewport: viewportDimensions,
            dimensions,
            format,
            timestamp: new Date().toISOString()
          }
        });

        return createSuccessResponse(
          {
            screenshot: screenshotData,
            metadata: {
              url,
              viewport: viewportDimensions,
              format,
              dimensions,
              timestamp: new Date().toISOString(),
              fromCache: false
            }
          },
          'Screenshot generated successfully'
        );
      } finally {
        // Release browser client
        await this.releaseConnections();
      }
    } catch (error) {
      return createErrorResponse(
        'SCREENSHOT_ERROR',
        `Failed to generate screenshot: ${error.message}`,
        { error: error.stack },
        error
      );
    }
  }

  /**
   * Compare two screenshots or URLs
   * @param {Object} data - Comparison parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Comparison result
   */
  async compareScreenshots(data, context) {
    try {
      const {
        beforeUrl,
        afterUrl,
        beforeScreenshot,
        afterScreenshot,
        viewport = 'desktop',
        threshold = 0.1,
        ignoreRegions = [],
        fullPage = true
      } = data;

      // Validate parameters
      if ((!beforeUrl && !beforeScreenshot) || (!afterUrl && !afterScreenshot)) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'Either before/after URLs or screenshots must be provided',
          { missingParams: ['beforeUrl/beforeScreenshot', 'afterUrl/afterScreenshot'] }
        );
      }

      // Get "before" screenshot
      let beforeImage;
      if (beforeUrl) {
        const beforeResult = await this.generateScreenshot({
          url: beforeUrl,
          viewport,
          fullPage
        }, context);

        if (!beforeResult.success) {
          return createErrorResponse(
            'SCREENSHOT_ERROR',
            'Failed to generate "before" screenshot',
            { originalError: beforeResult.error }
          );
        }

        beforeImage = beforeResult.data.screenshot;
      } else {
        beforeImage = beforeScreenshot;
      }

      // Get "after" screenshot
      let afterImage;
      if (afterUrl) {
        const afterResult = await this.generateScreenshot({
          url: afterUrl,
          viewport,
          fullPage
        }, context);

        if (!afterResult.success) {
          return createErrorResponse(
            'SCREENSHOT_ERROR',
            'Failed to generate "after" screenshot',
            { originalError: afterResult.error }
          );
        }

        afterImage = afterResult.data.screenshot;
      } else {
        afterImage = afterScreenshot;
      }

      // Generate diff between the two screenshots
      const diffResult = await this._generateDiffImage(beforeImage, afterImage, {
        threshold,
        ignoreRegions
      });

      return createSuccessResponse(
        {
          diffResult,
          metadata: {
            beforeUrl: beforeUrl || 'Custom screenshot',
            afterUrl: afterUrl || 'Custom screenshot',
            viewport: typeof viewport === 'string' ? viewport : 'custom',
            threshold,
            ignoreRegions
          }
        },
        'Screenshot comparison completed'
      );
    } catch (error) {
      return createErrorResponse(
        'COMPARISON_ERROR',
        `Failed to compare screenshots: ${error.message}`,
        { error: error.stack },
        error
      );
    }
  }

  /**
   * Generate a visual diff between two images
   * @param {Object} data - Diff parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Diff result
   */
  async generateDiff(data, context) {
    try {
      const {
        beforeImage,
        afterImage,
        threshold = 0.1,
        highlightColor = '#FF0000',
        ignoreRegions = []
      } = data;

      // Validate parameters
      if (!beforeImage || !afterImage) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'Both before and after images are required',
          { missingParams: ['beforeImage', 'afterImage'] }
        );
      }

      // Generate diff between the two images
      const diffResult = await this._generateDiffImage(beforeImage, afterImage, {
        threshold,
        highlightColor,
        ignoreRegions
      });

      return createSuccessResponse(
        {
          diff: diffResult.diffImage,
          diffMap: diffResult.diffMap,
          metadata: {
            percentDifference: diffResult.percentDifference,
            numDiffPixels: diffResult.numDiffPixels,
            dimensions: diffResult.dimensions,
            threshold
          }
        },
        'Diff generated successfully'
      );
    } catch (error) {
      return createErrorResponse(
        'DIFF_ERROR',
        `Failed to generate diff: ${error.message}`,
        { error: error.stack },
        error
      );
    }
  }

  /**
   * Generate a preview of a WordPress site with multiple viewport sizes
   * @param {Object} data - Preview parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Preview result
   */
  async generatePreview(data, context) {
    try {
      const {
        url,
        viewports = ['mobile', 'tablet', 'desktop'],
        fullPage = true
      } = data;

      if (!url) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'URL is required for preview generation',
          { missingParams: ['url'] }
        );
      }

      const previews = {};

      // Generate screenshots for each viewport
      for (const viewport of viewports) {
        const result = await this.generateScreenshot({
          url,
          viewport,
          fullPage
        }, context);

        if (!result.success) {
          logger.error(`Failed to generate preview for viewport: ${viewport}`, {
            error: result.error
          });
          continue;
        }

        previews[viewport] = {
          screenshot: result.data.screenshot,
          metadata: result.data.metadata
        };
      }

      return createSuccessResponse(
        {
          url,
          previews,
          timestamp: new Date().toISOString()
        },
        'Site preview generated successfully'
      );
    } catch (error) {
      return createErrorResponse(
        'PREVIEW_ERROR',
        `Failed to generate preview: ${error.message}`,
        { error: error.stack },
        error
      );
    }
  }

  /**
   * Generate a diff image between two images
   * @param {string|Buffer} beforeImage - Before image (base64 or buffer)
   * @param {string|Buffer} afterImage - After image (base64 or buffer)
   * @param {Object} options - Diff options
   * @returns {Promise<Object>} - Diff result
   * @private
   */
  async _generateDiffImage(beforeImage, afterImage, options = {}) {
    const {
      threshold = 0.1,
      highlightColor = '#FF0000',
      ignoreRegions = []
    } = options;

    // Convert images to buffers if they're base64 strings
    const beforeBuffer = typeof beforeImage === 'string' 
      ? Buffer.from(beforeImage, 'base64') 
      : beforeImage;
    
    const afterBuffer = typeof afterImage === 'string' 
      ? Buffer.from(afterImage, 'base64') 
      : afterImage;

    // Load images
    const img1 = await loadImage(beforeBuffer);
    const img2 = await loadImage(afterBuffer);

    // Ensure images are the same size
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);

    // Create canvases for the images
    const canvas1 = createCanvas(width, height);
    const ctx1 = canvas1.getContext('2d');
    ctx1.drawImage(img1, 0, 0);

    const canvas2 = createCanvas(width, height);
    const ctx2 = canvas2.getContext('2d');
    ctx2.drawImage(img2, 0, 0);

    // Create canvas for the diff
    const diffCanvas = createCanvas(width, height);
    const diffCtx = diffCanvas.getContext('2d');

    // Get image data
    const img1Data = ctx1.getImageData(0, 0, width, height);
    const img2Data = ctx2.getImageData(0, 0, width, height);
    const diffData = diffCtx.createImageData(width, height);

    // Apply ignore regions if any
    if (ignoreRegions && ignoreRegions.length > 0) {
      for (const region of ignoreRegions) {
        const { x, y, width: w, height: h } = region;
        // Skip pixels in this region by making them identical in both images
        for (let iy = y; iy < y + h && iy < height; iy++) {
          for (let ix = x; ix < x + w && ix < width; ix++) {
            const idx = (iy * width + ix) * 4;
            img2Data.data[idx] = img1Data.data[idx];
            img2Data.data[idx + 1] = img1Data.data[idx + 1];
            img2Data.data[idx + 2] = img1Data.data[idx + 2];
            img2Data.data[idx + 3] = img1Data.data[idx + 3];
          }
        }
      }
    }

    // Perform the diff
    const numDiffPixels = pixelmatch(
      img1Data.data, 
      img2Data.data, 
      diffData.data, 
      width, 
      height, 
      { threshold, alpha: 0.3 }
    );

    // Calculate percentage difference
    const totalPixels = width * height;
    const percentDifference = (numDiffPixels / totalPixels) * 100;

    // Put the diff image data to the canvas
    diffCtx.putImageData(diffData, 0, 0);

    // Convert to PNG buffer
    const diffImage = diffCanvas.toBuffer('image/png');

    // Create a heatmap version
    const heatmapCanvas = createCanvas(width, height);
    const heatmapCtx = heatmapCanvas.getContext('2d');
    
    // Draw original "after" image as base
    heatmapCtx.drawImage(img2, 0, 0);
    
    // Draw differences as color overlay
    const heatmapData = heatmapCtx.getImageData(0, 0, width, height);
    const rgbHighlight = this._hexToRgb(highlightColor);
    
    for (let i = 0; i < diffData.data.length; i += 4) {
      // If this pixel is different (not black in diff), highlight it
      if (diffData.data[i] !== 0 || diffData.data[i + 1] !== 0 || diffData.data[i + 2] !== 0) {
        heatmapData.data[i] = rgbHighlight.r;
        heatmapData.data[i + 1] = rgbHighlight.g;
        heatmapData.data[i + 2] = rgbHighlight.b;
        heatmapData.data[i + 3] = 180; // Semi-transparent
      }
    }
    
    heatmapCtx.putImageData(heatmapData, 0, 0);
    const heatmapImage = heatmapCanvas.toBuffer('image/png');

    // Generate a JSON diff map with coordinates of changed areas
    const diffMap = this._generateDiffMap(diffData.data, width, height);

    return {
      diffImage: diffImage.toString('base64'),
      heatmapImage: heatmapImage.toString('base64'),
      diffMap,
      numDiffPixels,
      percentDifference,
      dimensions: { width, height }
    };
  }

  /**
   * Generate a diff map with coordinates of changed areas
   * @param {Uint8ClampedArray} diffData - Diff image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Array} - Array of changed regions
   * @private
   */
  _generateDiffMap(diffData, width, height) {
    // Use a simple algorithm to find rectangles of different regions
    // This is a simplified version that returns a list of different pixels
    const differentPixels = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // If this pixel is different (not black in diff)
        if (diffData[idx] !== 0 || diffData[idx + 1] !== 0 || diffData[idx + 2] !== 0) {
          differentPixels.push({ x, y });
        }
      }
    }
    
    // Group adjacent pixels into regions
    // This is a simplified approach; a more sophisticated clustering
    // algorithm would be used in a production system
    const regions = [];
    const visited = new Set();
    
    for (const pixel of differentPixels) {
      const key = `${pixel.x},${pixel.y}`;
      if (visited.has(key)) continue;
      
      // Start a new region
      const region = {
        x: pixel.x,
        y: pixel.y,
        width: 1,
        height: 1
      };
      
      // Simple expansion to find adjacent pixels
      let expanded = true;
      while (expanded) {
        expanded = false;
        
        // Try to expand right
        const rightEdge = region.x + region.width;
        if (rightEdge < width) {
          let canExpandRight = true;
          for (let y = region.y; y < region.y + region.height; y++) {
            const key = `${rightEdge},${y}`;
            if (!differentPixels.some(p => p.x === rightEdge && p.y === y)) {
              canExpandRight = false;
              break;
            }
          }
          
          if (canExpandRight) {
            region.width++;
            expanded = true;
            
            // Mark pixels as visited
            for (let y = region.y; y < region.y + region.height; y++) {
              visited.add(`${rightEdge},${y}`);
            }
          }
        }
        
        // Try to expand down
        const bottomEdge = region.y + region.height;
        if (bottomEdge < height) {
          let canExpandDown = true;
          for (let x = region.x; x < region.x + region.width; x++) {
            const key = `${x},${bottomEdge}`;
            if (!differentPixels.some(p => p.x === x && p.y === bottomEdge)) {
              canExpandDown = false;
              break;
            }
          }
          
          if (canExpandDown) {
            region.height++;
            expanded = true;
            
            // Mark pixels as visited
            for (let x = region.x; x < region.x + region.width; x++) {
              visited.add(`${x},${bottomEdge}`);
            }
          }
        }
      }
      
      // Add region to results if it's large enough (filter out noise)
      if (region.width > 1 || region.height > 1) {
        regions.push(region);
      }
    }
    
    return regions;
  }

  /**
   * Generate a cache key based on parameters
   * @param {Object} params - Parameters to hash
   * @returns {string} - Cache key
   * @private
   */
  _generateCacheKey(params) {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(params));
    return hash.digest('hex');
  }

  /**
   * Save data to cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @returns {Promise<void>}
   * @private
   */
  async _saveToCache(key, data) {
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(
        cacheFile,
        JSON.stringify({
          ...data,
          cachedAt: Date.now()
        })
      );
    } catch (error) {
      logger.error(`Failed to save to cache: ${error.message}`);
    }
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} - Cached data or null if not found/expired
   * @private
   */
  async _getFromCache(key) {
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      
      // Check if file exists
      try {
        await fs.access(cacheFile);
      } catch {
        return null;
      }
      
      // Read and parse cache file
      const cacheData = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
      
      // Check if cache is expired
      if (Date.now() - cacheData.cachedAt > this.cacheTTL) {
        // Delete expired cache
        await fs.unlink(cacheFile).catch(() => {});
        return null;
      }
      
      return cacheData;
    } catch (error) {
      logger.error(`Failed to get from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert hex color to RGB object
   * @param {string} hex - Hex color string
   * @returns {Object} - RGB object
   * @private
   */
  _hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse r, g, b values
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }

  /**
   * Get schema for MCP compatibility
   * @returns {Object} - Tool schema
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
              description: "Action to perform",
              enum: ["screenshot", "compare", "diff", "preview"]
            },
            url: {
              type: "string",
              description: "URL of the WordPress site to capture"
            },
            viewport: {
              type: "string",
              description: "Viewport to use (mobile, tablet, desktop) or custom dimensions",
              enum: ["mobile", "tablet", "desktop"]
            },
            fullPage: {
              type: "boolean",
              description: "Whether to capture the full page or just the viewport"
            },
            beforeUrl: {
              type: "string",
              description: "URL of the WordPress site to use as 'before' state for comparison"
            },
            afterUrl: {
              type: "string",
              description: "URL of the WordPress site to use as 'after' state for comparison"
            },
            threshold: {
              type: "number",
              description: "Threshold for pixel matching in diff comparison (0.0 to 1.0)"
            },
            selector: {
              type: "string",
              description: "CSS selector to capture specific element instead of full page"
            },
            forceFresh: {
              type: "boolean",
              description: "Force fresh screenshot instead of using cache"
            },
            ignoreRegions: {
              type: "array",
              description: "Regions to ignore during comparison",
              items: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" }
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

module.exports = VisualPreviewTool; 