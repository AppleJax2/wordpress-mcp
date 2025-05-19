/**
 * Design Analyzer Tool
 * Analyzes site design, provides critique and improvement recommendations
 */
const { BaseTool } = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class DesignAnalyzerTool extends BaseTool {
  constructor() {
    super('design_analyzer', 'Analyzes site design, provides critique and improvement recommendations');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the tool
   * @param {Object} params - Parameters for the design analysis
   * @param {string} params.action - The action to perform (analyzeColors, analyzeTypography, analyzeLayout, analyzeAccessibility, analyzeOverall)
   * @param {Object} params.data - Additional data for specific analyses
   */
  async execute(params) {
    try {
      const { action, data = {} } = params;
      
      if (!action) {
        throw new Error('Action is required');
      }
      
      switch (action) {
        case 'analyzeColors':
          return this.analyzeColors(data);
        case 'analyzeTypography':
          return this.analyzeTypography(data);
        case 'analyzeLayout':
          return this.analyzeLayout(data);
        case 'analyzeAccessibility':
          return this.analyzeAccessibility(data);
        case 'analyzeOverall':
          return this.analyzeOverall(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Analyze website colors
   * @param {Object} data - Parameters for color analysis
   * @param {string} data.url - URL of the page to analyze
   * @param {boolean} data.checkContrast - Whether to check color contrast for accessibility
   * @param {boolean} data.identifyPalette - Whether to identify color palette
   */
  async analyzeColors(data) {
    try {
      const { url, checkContrast = true, identifyPalette = true } = data;
      
      if (!url) {
        throw new Error('URL is required for color analysis');
      }
      
      // Launch browser and navigate to the URL
      await this.browser.launch();
      await this.browser.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extract colors from the page
      const colorData = await this.browser.page.evaluate(() => {
        const colors = {
          backgroundColors: [],
          textColors: [],
          accentColors: [],
          buttonColors: []
        };
        
        // Extract background colors
        const elements = document.querySelectorAll('body, header, nav, main, section, footer, div, button');
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && !colors.backgroundColors.includes(bgColor)) {
            colors.backgroundColors.push(bgColor);
          }
        });
        
        // Extract text colors
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, li');
        textElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          if (color && !colors.textColors.includes(color)) {
            colors.textColors.push(color);
          }
        });
        
        // Extract accent colors
        const accentElements = document.querySelectorAll('a, button, .btn, [class*="accent"], [class*="highlight"]');
        accentElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bgColor = style.backgroundColor;
          
          if (color && color !== 'rgb(0, 0, 0)' && !colors.accentColors.includes(color)) {
            colors.accentColors.push(color);
          }
          
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && !colors.accentColors.includes(bgColor)) {
            colors.accentColors.push(bgColor);
          }
        });
        
        // Extract button colors
        const buttons = document.querySelectorAll('button, .button, [class*="btn"]');
        buttons.forEach(el => {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && !colors.buttonColors.includes(bgColor)) {
            colors.buttonColors.push(bgColor);
          }
        });
        
        return colors;
      });
      
      // Take a screenshot for reference
      const screenshot = `./color-analysis-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshot);
      
      // Generate recommendations
      const recommendations = [
        "Ensure color contrast meets WCAG 2.1 standards (4.5:1 for normal text, 3:1 for large text)",
        "Limit color palette to 3-5 main colors for consistency",
        "Use accent colors sparingly for important elements",
        "Consider color meaning and psychology for your brand",
        "Test color schemes for color blindness accessibility"
      ];
      
      return {
        success: true,
        data: {
          url,
          colors: colorData,
          recommendations,
          screenshot
        }
      };
    } catch (error) {
      return this.handleError(error, 'analyzeColors');
    } finally {
      // Always close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Analyze website typography
   * @param {Object} data - Parameters for typography analysis
   * @param {string} data.url - URL of the page to analyze
   * @param {boolean} data.checkHierarchy - Whether to check typography hierarchy
   * @param {boolean} data.checkReadability - Whether to check text readability
   */
  async analyzeTypography(data) {
    try {
      const { url, checkHierarchy = true, checkReadability = true } = data;
      
      if (!url) {
        throw new Error('URL is required for typography analysis');
      }
      
      // Launch browser and navigate to the URL
      await this.browser.launch();
      await this.browser.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extract typography information
      const typographyData = await this.browser.page.evaluate(() => {
        const typography = {
          fonts: [],
          headings: {
            h1: [],
            h2: [],
            h3: [],
            h4: [],
            h5: [],
            h6: []
          },
          bodyText: {
            fonts: [],
            sizes: [],
            lineHeights: []
          }
        };
        
        // Extract fonts used on the page
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const fontFamily = style.fontFamily;
          if (fontFamily && !typography.fonts.includes(fontFamily)) {
            typography.fonts.push(fontFamily);
          }
        });
        
        // Extract heading typography
        for (let i = 1; i <= 6; i++) {
          const headings = document.querySelectorAll(`h${i}`);
          headings.forEach(heading => {
            const style = window.getComputedStyle(heading);
            typography.headings[`h${i}`].push({
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              color: style.color
            });
          });
        }
        
        // Extract body text typography
        const bodyTextElements = document.querySelectorAll('p, li, span, div');
        bodyTextElements.forEach(el => {
          const style = window.getComputedStyle(el);
          
          if (!typography.bodyText.fonts.includes(style.fontFamily)) {
            typography.bodyText.fonts.push(style.fontFamily);
          }
          
          if (!typography.bodyText.sizes.includes(style.fontSize)) {
            typography.bodyText.sizes.push(style.fontSize);
          }
          
          if (!typography.bodyText.lineHeights.includes(style.lineHeight)) {
            typography.bodyText.lineHeights.push(style.lineHeight);
          }
        });
        
        return typography;
      });
      
      // Take a screenshot for reference
      const screenshot = `./typography-analysis-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshot);
      
      // Generate recommendations
      const recommendations = [
        "Limit font families to 2-3 for consistency",
        "Ensure body text is at least 16px for readability",
        "Maintain proper hierarchy with heading sizes",
        "Use line height of 1.5-1.6 for body text for readability",
        "Ensure sufficient contrast between text and background",
        "Avoid all-caps text for large content blocks"
      ];
      
      return {
        success: true,
        data: {
          url,
          typography: typographyData,
          recommendations,
          screenshot
        }
      };
    } catch (error) {
      return this.handleError(error, 'analyzeTypography');
    } finally {
      // Always close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Analyze website layout
   * @param {Object} data - Parameters for layout analysis
   * @param {string} data.url - URL of the page to analyze
   * @param {boolean} data.checkResponsiveness - Whether to check responsive layout
   * @param {boolean} data.checkAlignment - Whether to check element alignment
   */
  async analyzeLayout(data) {
    try {
      const { url, checkResponsiveness = true, checkAlignment = true } = data;
      
      if (!url) {
        throw new Error('URL is required for layout analysis');
      }
      
      // Launch browser and navigate to the URL
      await this.browser.launch();
      await this.browser.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extract layout information
      const layoutData = await this.browser.page.evaluate(() => {
        const layout = {
          pageWidth: document.documentElement.clientWidth,
          pageHeight: document.documentElement.clientHeight,
          containers: [],
          grid: {
            detected: false,
            type: null
          },
          whitespace: {
            margins: [],
            paddings: []
          }
        };
        
        // Detect main containers
        const containers = document.querySelectorAll('header, nav, main, section, aside, footer, .container, [class*="container"]');
        containers.forEach(container => {
          const rect = container.getBoundingClientRect();
          const style = window.getComputedStyle(container);
          
          layout.containers.push({
            tagName: container.tagName,
            className: container.className,
            width: rect.width,
            height: rect.height,
            position: {
              top: rect.top,
              left: rect.left
            },
            margin: style.margin,
            padding: style.padding
          });
          
          // Store margin and padding values for whitespace analysis
          layout.whitespace.margins.push(style.margin);
          layout.whitespace.paddings.push(style.padding);
        });
        
        // Attempt to detect grid system
        const gridElements = document.querySelectorAll('[class*="col-"], [class*="grid-"], [class*="row"]');
        if (gridElements.length > 0) {
          layout.grid.detected = true;
          
          // Try to determine grid type (e.g., 12-column, CSS Grid, Flexbox)
          const hasFlexbox = Array.from(gridElements).some(el => {
            const style = window.getComputedStyle(el);
            return style.display === 'flex' || style.display === 'inline-flex';
          });
          
          const hasCSSGrid = Array.from(gridElements).some(el => {
            const style = window.getComputedStyle(el);
            return style.display === 'grid' || style.display === 'inline-grid';
          });
          
          if (hasFlexbox) {
            layout.grid.type = 'Flexbox';
          } else if (hasCSSGrid) {
            layout.grid.type = 'CSS Grid';
          } else {
            layout.grid.type = 'Traditional (likely 12-column)';
          }
        }
        
        return layout;
      });
      
      // Take screenshots at different viewport sizes if checking responsiveness
      const screenshots = {};
      
      if (checkResponsiveness) {
        // Desktop screenshot
        screenshots.desktop = `./layout-desktop-${Date.now()}.png`;
        await this.browser.takeScreenshot(screenshots.desktop);
        
        // Tablet screenshot
        await this.browser.page.setViewport({ width: 768, height: 1024 });
        screenshots.tablet = `./layout-tablet-${Date.now()}.png`;
        await this.browser.takeScreenshot(screenshots.tablet);
        
        // Mobile screenshot
        await this.browser.page.setViewport({ width: 375, height: 667 });
        screenshots.mobile = `./layout-mobile-${Date.now()}.png`;
        await this.browser.takeScreenshot(screenshots.mobile);
      } else {
        // Just take a single screenshot
        screenshots.default = `./layout-analysis-${Date.now()}.png`;
        await this.browser.takeScreenshot(screenshots.default);
      }
      
      // Generate recommendations
      const recommendations = [
        "Use consistent margins and padding for visual rhythm",
        "Ensure the layout is responsive across all device sizes",
        "Implement proper visual hierarchy for content importance",
        "Use whitespace effectively to improve content readability",
        "Ensure important elements are above the fold",
        "Align elements to a grid for visual consistency"
      ];
      
      return {
        success: true,
        data: {
          url,
          layout: layoutData,
          recommendations,
          screenshots
        }
      };
    } catch (error) {
      return this.handleError(error, 'analyzeLayout');
    } finally {
      // Always close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Analyze website accessibility related to design
   * @param {Object} data - Parameters for accessibility analysis
   * @param {string} data.url - URL of the page to analyze
   * @param {boolean} data.checkContrast - Whether to check color contrast
   * @param {boolean} data.checkKeyboardNav - Whether to check keyboard navigation
   */
  async analyzeAccessibility(data) {
    try {
      const { url, checkContrast = true, checkKeyboardNav = true } = data;
      
      if (!url) {
        throw new Error('URL is required for accessibility analysis');
      }
      
      // Launch browser and navigate to the URL
      await this.browser.launch();
      await this.browser.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extract accessibility information
      const accessibilityData = await this.browser.page.evaluate(() => {
        const a11y = {
          images: {
            totalImages: 0,
            missingAlt: 0,
            emptyAlt: 0
          },
          headings: {
            hasH1: false,
            structure: [],
            emptyHeadings: 0
          },
          links: {
            totalLinks: 0,
            emptyLinks: 0,
            genericText: 0
          },
          forms: {
            totalFields: 0,
            missingLabels: 0
          },
          aria: {
            landmarks: [],
            customRoles: []
          }
        };
        
        // Check images
        const images = document.querySelectorAll('img');
        a11y.images.totalImages = images.length;
        
        images.forEach(img => {
          if (!img.hasAttribute('alt')) {
            a11y.images.missingAlt++;
          } else if (img.alt === '') {
            a11y.images.emptyAlt++;
          }
        });
        
        // Check headings
        const h1s = document.querySelectorAll('h1');
        a11y.headings.hasH1 = h1s.length > 0;
        
        for (let i = 1; i <= 6; i++) {
          const headings = document.querySelectorAll(`h${i}`);
          a11y.headings.structure.push({
            level: i,
            count: headings.length,
            empty: Array.from(headings).filter(h => h.textContent.trim() === '').length
          });
          
          a11y.headings.emptyHeadings += Array.from(headings).filter(h => h.textContent.trim() === '').length;
        }
        
        // Check links
        const links = document.querySelectorAll('a');
        a11y.links.totalLinks = links.length;
        
        links.forEach(link => {
          if (!link.textContent.trim() && !link.querySelector('img[alt]')) {
            a11y.links.emptyLinks++;
          }
          
          const text = link.textContent.trim().toLowerCase();
          if (['click here', 'read more', 'learn more', 'more', 'link'].includes(text)) {
            a11y.links.genericText++;
          }
        });
        
        // Check forms
        const formFields = document.querySelectorAll('input, select, textarea');
        a11y.forms.totalFields = formFields.length;
        
        formFields.forEach(field => {
          const id = field.getAttribute('id');
          if (id) {
            const hasLabel = document.querySelector(`label[for="${id}"]`) !== null;
            if (!hasLabel && !field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
              a11y.forms.missingLabels++;
            }
          } else if (!field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
            a11y.forms.missingLabels++;
          }
        });
        
        // Check ARIA landmarks
        const landmarks = [
          { role: 'banner', element: 'header[role="banner"]' },
          { role: 'navigation', element: 'nav, [role="navigation"]' },
          { role: 'main', element: 'main, [role="main"]' },
          { role: 'complementary', element: 'aside, [role="complementary"]' },
          { role: 'contentinfo', element: 'footer[role="contentinfo"]' },
          { role: 'search', element: '[role="search"]' }
        ];
        
        landmarks.forEach(landmark => {
          const elements = document.querySelectorAll(landmark.element);
          a11y.aria.landmarks.push({
            role: landmark.role,
            count: elements.length
          });
        });
        
        return a11y;
      });
      
      // Take a screenshot for reference
      const screenshot = `./accessibility-analysis-${Date.now()}.png`;
      await this.browser.takeScreenshot(screenshot);
      
      // Generate recommendations
      const recommendations = [
        "Ensure all images have appropriate alt text",
        "Maintain proper heading hierarchy (h1 to h6)",
        "Provide descriptive link text instead of generic phrases",
        "Ensure sufficient color contrast for text readability",
        "Make sure all form elements have labels",
        "Use ARIA landmarks to define page regions",
        "Test keyboard navigation for all interactive elements"
      ];
      
      return {
        success: true,
        data: {
          url,
          accessibility: accessibilityData,
          recommendations,
          screenshot
        }
      };
    } catch (error) {
      return this.handleError(error, 'analyzeAccessibility');
    } finally {
      // Always close the browser when done
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Perform comprehensive design analysis
   * @param {Object} data - Parameters for overall design analysis
   * @param {string} data.url - URL of the page to analyze
   */
  async analyzeOverall(data) {
    try {
      const { url } = data;
      
      if (!url) {
        throw new Error('URL is required for overall design analysis');
      }
      
      // Perform all individual analyses
      const colorResults = await this.analyzeColors({ url });
      const typographyResults = await this.analyzeTypography({ url });
      const layoutResults = await this.analyzeLayout({ url });
      const accessibilityResults = await this.analyzeAccessibility({ url });
      
      // Combine recommendations from all analyses
      const allRecommendations = {
        colors: colorResults.data.recommendations,
        typography: typographyResults.data.recommendations,
        layout: layoutResults.data.recommendations,
        accessibility: accessibilityResults.data.recommendations
      };
      
      // Generate prioritized recommendations
      const prioritizedRecommendations = [
        "Ensure sufficient color contrast for accessibility",
        "Maintain proper heading hierarchy for content structure",
        "Ensure all images have appropriate alt text",
        "Make the design responsive across all device sizes",
        "Use consistent typography for better readability",
        "Implement clear visual hierarchy for content importance",
        "Use whitespace effectively to improve readability",
        "Ensure the design is navigable with keyboard only"
      ];
      
      return {
        success: true,
        data: {
          url,
          analyses: {
            colors: colorResults.data,
            typography: typographyResults.data,
            layout: layoutResults.data,
            accessibility: accessibilityResults.data
          },
          recommendations: prioritizedRecommendations
        }
      };
    } catch (error) {
      return this.handleError(error, 'analyzeOverall');
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
              enum: ["analyzeColors", "analyzeTypography", "analyzeLayout", "analyzeAccessibility", "analyzeOverall"],
              description: "The type of design analysis to perform",
              default: "analyzeOverall"
            },
            data: {
              type: "object",
              description: "Parameters specific to the selected analysis type",
              properties: {
                url: {
                  type: "string",
                  description: "URL of the WordPress website or page to analyze (required for all actions)"
                },
                // Color analysis options
                checkContrast: {
                  type: "boolean",
                  description: "Whether to check color contrast for WCAG accessibility compliance",
                  default: true
                },
                identifyPalette: {
                  type: "boolean",
                  description: "Whether to identify and analyze the color palette used on the site",
                  default: true
                },
                // Typography analysis options
                checkHierarchy: {
                  type: "boolean",
                  description: "Whether to check typography hierarchy (headings, body text, etc.)",
                  default: true
                },
                checkReadability: {
                  type: "boolean",
                  description: "Whether to check text readability (font sizes, line height, etc.)",
                  default: true
                },
                // Layout analysis options
                checkResponsiveness: {
                  type: "boolean",
                  description: "Whether to check responsive layout across desktop, tablet, and mobile viewports",
                  default: true
                },
                checkAlignment: {
                  type: "boolean",
                  description: "Whether to check element alignment and spacing consistency",
                  default: true
                },
                // Accessibility analysis options
                checkKeyboardNav: {
                  type: "boolean",
                  description: "Whether to check keyboard navigation accessibility",
                  default: true
                }
              },
              required: ["url"]
            }
          },
          required: ["action", "data"]
        }
      }
    };
  }
}

module.exports = DesignAnalyzerTool; 