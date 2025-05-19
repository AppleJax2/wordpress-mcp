/**
 * User Journey Mapper Tool
 * Maps typical user paths through the site and identifies improvement opportunities
 */
const { BaseTool } = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');
const logger = require('../utils/logger');

class UserJourneyMapperTool extends BaseTool {
  constructor() {
    super('wordpress_user_journey_mapper', 'Maps typical user paths through the site and identifies improvement opportunities');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the tool to map user journeys and identify improvement opportunities
   * @param {Object} params - Parameters for the journey mapping
   * @param {string} params.userType - Type of user to analyze (e.g., 'anonymous', 'customer', 'administrator')
   * @param {string} params.scenario - Specific scenario to map (e.g., 'product_purchase', 'content_discovery')
   * @param {number} params.sampleSize - Number of user sessions to analyze
   * @param {boolean} params.includeVisualData - Whether to include visual data in the analysis
   * @param {boolean} params.includeAnalyticsData - Whether to include analytics data
   */
  async execute(params = {}) {
    try {
      const {
        userType = 'anonymous',
        scenario = 'general_browsing',
        sampleSize = 100,
        includeVisualData = false,
        includeAnalyticsData = true
      } = params;
      
      // Validate parameters
      if (!['anonymous', 'customer', 'subscriber', 'administrator'].includes(userType)) {
        return {
          success: false,
          error: `Invalid userType: ${userType}. Must be one of: anonymous, customer, subscriber, administrator`
        };
      }
      
      // Base result structure
      const result = {
        success: true,
        data: {
          userType,
          scenario,
          sampleSize,
          journeyMap: {},
          opportunities: []
        }
      };
      
      // Get site structure
      const siteStructure = await this.getSiteStructure();
      result.data.siteStructure = siteStructure;
      
      // Define journey phases based on scenario and site structure
      const journeyPhases = await this.defineJourneyPhases(scenario, siteStructure);
      result.data.journeyMap.phases = journeyPhases;
      
      // Collect analytics data if available and requested
      if (includeAnalyticsData) {
        try {
          const analyticsData = await this.collectAnalyticsData(userType, scenario, sampleSize);
          result.data.journeyMap.analytics = analyticsData;
        } catch (error) {
          this.logger.warn('Could not collect analytics data', { error: error.message });
          result.data.journeyMap.analytics = { error: 'Could not collect analytics data' };
        }
      }
      
      // Map user actions to phases
      result.data.journeyMap.actions = await this.mapUserActions(journeyPhases, userType, scenario);
      
      // Identify potential emotions based on page characteristics and engagement metrics
      if (result.data.journeyMap.analytics && !result.data.journeyMap.analytics.error) {
        result.data.journeyMap.emotions = this.identifyEmotions(result.data.journeyMap.actions, result.data.journeyMap.analytics);
      }
      
      // Collect visual data using browser automation if requested
      if (includeVisualData) {
        try {
          const visualData = await this.collectVisualData(journeyPhases);
          result.data.journeyMap.visualData = visualData;
        } catch (error) {
          this.logger.warn('Could not collect visual data', { error: error.message });
          result.data.journeyMap.visualData = { error: 'Could not collect visual data' };
        }
      }
      
      // Identify improvement opportunities
      result.data.opportunities = this.identifyOpportunities(result.data.journeyMap);
      
      return result;
    } catch (error) {
      return this.handleError(error, 'execute');
    }
  }
  
  /**
   * Get site structure
   * @returns {Promise<Object>} Site structure data
   */
  async getSiteStructure() {
    try {
      // Get main pages and site hierarchy
      await this.browser.launch();
      await this.browser.navigateTo('/');
      
      // Extract main navigation structure
      const mainNav = await this.browser.page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('nav a, header a, #main-nav a, #primary-menu a, .main-navigation a'));
        return menuItems.map(item => ({
          text: item.textContent.trim(),
          url: item.href,
          // Simplify path for internal links
          path: item.href.replace(window.location.origin, ''),
          isExternal: !item.href.includes(window.location.hostname)
        }))
        .filter(item => item.text && !item.isExternal); // Only include non-empty internal links
      });
      
      // Get page templates and check for key functionality
      const pageTypes = {
        home: { path: '/', found: true },
        blog: { path: '/blog', found: false },
        shop: { path: '/shop', found: false }, 
        about: { path: '/about', found: false },
        contact: { path: '/contact', found: false }
      };
      
      // Check existence of key pages
      for (const [type, data] of Object.entries(pageTypes)) {
        if (type === 'home') continue; // Home is already set to found:true
        
        // Check if page exists in navigation or try direct access
        const navItem = mainNav.find(item => 
          item.path === data.path || 
          item.path.includes(`/${type}`) || 
          item.text.toLowerCase().includes(type)
        );
        
        if (navItem) {
          pageTypes[type].path = navItem.path;
          pageTypes[type].found = true;
        } else {
          // Try direct access
          try {
            await this.browser.navigateTo(data.path);
            const status = await this.browser.page.evaluate(() => 
              document.title.toLowerCase().includes('not found') || 
              document.body.textContent.includes('404') ? 'not found' : 'found'
            );
            pageTypes[type].found = status === 'found';
          } catch (error) {
            // Page navigation failed
            pageTypes[type].found = false;
          }
        }
      }
      
      // Check for WooCommerce
      const hasWooCommerce = mainNav.some(item => 
        item.path.includes('/shop') || 
        item.path.includes('/product') || 
        item.text.toLowerCase().includes('shop') ||
        item.text.toLowerCase().includes('cart')
      );
      
      // Get site name and tagline
      await this.browser.navigateTo('/');
      const siteInfo = await this.browser.page.evaluate(() => {
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || ''
        };
      });
      
      await this.browser.close();
      
      return {
        navigation: mainNav,
        pageTypes,
        hasWooCommerce,
        siteInfo
      };
    } catch (error) {
      this.logger.error('Error getting site structure', { error: error.message });
      await this.browser.close();
      return { error: 'Could not get site structure' };
    }
  }
  
  /**
   * Define journey phases based on scenario and site structure
   * @param {string} scenario - The user journey scenario
   * @param {Object} siteStructure - Site structure data
   * @returns {Promise<Array>} Journey phases
   */
  async defineJourneyPhases(scenario, siteStructure) {
    // Define default phases based on scenario
    const scenarioPhases = {
      'general_browsing': [
        { id: 'discover', name: 'Discovery', description: 'User discovers the site' },
        { id: 'explore', name: 'Exploration', description: 'User explores content' },
        { id: 'engage', name: 'Engagement', description: 'User engages with content' },
        { id: 'return', name: 'Return', description: 'User returns for more content' }
      ],
      'product_purchase': [
        { id: 'discover', name: 'Discovery', description: 'User discovers products' },
        { id: 'browse', name: 'Browsing', description: 'User browses product catalog' },
        { id: 'select', name: 'Selection', description: 'User selects products' },
        { id: 'checkout', name: 'Checkout', description: 'User completes purchase' },
        { id: 'post_purchase', name: 'Post-Purchase', description: 'User experience after purchase' }
      ],
      'content_discovery': [
        { id: 'arrive', name: 'Arrival', description: 'User arrives at site' },
        { id: 'search', name: 'Search', description: 'User searches for content' },
        { id: 'consume', name: 'Consumption', description: 'User consumes content' },
        { id: 'share', name: 'Sharing', description: 'User shares or bookmarks content' }
      ]
    };
    
    // Get default phases or general browsing phases as fallback
    const phases = scenarioPhases[scenario] || scenarioPhases['general_browsing'];
    
    // Customize phases based on site structure
    // For example, if site has WooCommerce, ensure purchase phases are included
    if (siteStructure.hasWooCommerce && scenario === 'general_browsing') {
      // Add shop phase if not already included
      if (!phases.some(phase => phase.id === 'shop')) {
        phases.splice(2, 0, { 
          id: 'shop', 
          name: 'Shopping', 
          description: 'User shops for products' 
        });
      }
    }
    
    return phases;
  }
  
  /**
   * Collect analytics data for user journeys
   * @param {string} userType - Type of user to analyze
   * @param {string} scenario - Specific scenario to map
   * @param {number} sampleSize - Number of user sessions to analyze
   * @returns {Promise<Object>} Analytics data
   */
  async collectAnalyticsData(userType, scenario, sampleSize) {
    // In a real implementation, this would integrate with Google Analytics, 
    // Matomo, or other analytics platforms
    // For now, we'll return simulated data
    
    return {
      topEntryPages: [
        { url: '/', percentage: 65 },
        { url: '/blog', percentage: 20 },
        { url: '/shop', percentage: 15 }
      ],
      topExitPages: [
        { url: '/contact', percentage: 30 },
        { url: '/checkout', percentage: 25 },
        { url: '/blog', percentage: 15 }
      ],
      averageSessionDuration: 320, // in seconds
      averagePageViews: 4.5,
      bounceRate: 35, // percentage
      conversionRate: 2.8, // percentage
      commonPaths: [
        { path: ['/', '/shop', '/product', '/cart', '/checkout'], frequency: 45 },
        { path: ['/', '/blog', '/post-1'], frequency: 30 },
        { path: ['/shop', '/product', '/cart'], frequency: 25 }
      ],
      deviceBreakdown: {
        desktop: 65,
        mobile: 30,
        tablet: 5
      },
      note: 'Simulated data - integrate with real analytics in production'
    };
  }
  
  /**
   * Map user actions to journey phases
   * @param {Array} phases - Journey phases
   * @param {string} userType - Type of user
   * @param {string} scenario - Journey scenario
   * @returns {Promise<Object>} Mapped user actions
   */
  async mapUserActions(phases, userType, scenario) {
    // Create an actions map for each phase
    const actionsMap = {};
    
    // Define actions based on phase, user type and scenario
    for (const phase of phases) {
      switch (phase.id) {
        case 'discover':
          actionsMap[phase.id] = {
            actions: [
              'User arrives from search engine',
              'User clicks on advertisement',
              'User follows link from social media',
              'User types URL directly'
            ],
            touchpoints: ['Search engine results', 'Social media', 'Advertisements', 'Browser'],
            metrics: {
              avgTimeSpent: '15 seconds',
              dropOffRate: '40%'
            }
          };
          break;
          
        case 'explore':
        case 'browse':
          actionsMap[phase.id] = {
            actions: [
              'User navigates through main menu',
              'User scrolls through content',
              'User uses search functionality',
              'User filters content'
            ],
            touchpoints: ['Navigation menu', 'Search bar', 'Content filters', 'Featured content'],
            metrics: {
              avgTimeSpent: '2 minutes',
              dropOffRate: '25%'
            }
          };
          break;
          
        case 'engage':
        case 'select':
        case 'consume':
          actionsMap[phase.id] = {
            actions: [
              'User reads article/product details',
              'User views images/videos',
              'User reads reviews/comments',
              'User adds items to cart/wishlist'
            ],
            touchpoints: ['Content pages', 'Product pages', 'Media galleries', 'Add to cart button'],
            metrics: {
              avgTimeSpent: '3.5 minutes',
              dropOffRate: '15%'
            }
          };
          break;
          
        case 'checkout':
          actionsMap[phase.id] = {
            actions: [
              'User reviews cart',
              'User enters shipping information',
              'User selects payment method',
              'User completes order'
            ],
            touchpoints: ['Cart page', 'Checkout form', 'Payment gateway', 'Order confirmation'],
            metrics: {
              avgTimeSpent: '4 minutes',
              dropOffRate: '30%'
            }
          };
          break;
          
        case 'return':
        case 'post_purchase':
        case 'share':
          actionsMap[phase.id] = {
            actions: [
              'User bookmarks site',
              'User subscribes to newsletter',
              'User shares content',
              'User leaves review/comment'
            ],
            touchpoints: ['Social sharing buttons', 'Review forms', 'Newsletter signup', 'Account creation'],
            metrics: {
              avgTimeSpent: '1.5 minutes',
              dropOffRate: '10%'
            }
          };
          break;
          
        default:
          actionsMap[phase.id] = {
            actions: ['User interacts with site content'],
            touchpoints: ['Various site elements'],
            metrics: {
              avgTimeSpent: '2 minutes',
              dropOffRate: '20%'
            }
          };
      }
    }
    
    return actionsMap;
  }
  
  /**
   * Identify potential user emotions based on page characteristics and engagement metrics
   * @param {Object} actions - Mapped user actions
   * @param {Object} analytics - Analytics data
   * @returns {Object} Emotion mapping
   */
  identifyEmotions(actions, analytics) {
    const emotions = {};
    
    // Map emotions to each phase based on metrics
    for (const [phaseId, phaseActions] of Object.entries(actions)) {
      // Default neutral emotion
      let emotion = 'neutral';
      let intensity = 3; // 1-5 scale
      
      // Infer emotion based on metrics
      const dropOffRate = parseInt(phaseActions.metrics.dropOffRate, 10);
      
      if (dropOffRate > 30) {
        // High drop-off suggests frustration or confusion
        emotion = 'frustrated';
        intensity = 4;
      } else if (dropOffRate < 15) {
        // Low drop-off suggests satisfaction
        emotion = 'satisfied';
        intensity = 4;
      }
      
      // Checkout has specific emotional patterns
      if (phaseId === 'checkout') {
        emotion = 'anxious'; // People are often anxious during checkout
        intensity = 4;
      }
      
      // Post-purchase/return typically has satisfied users
      if (phaseId === 'post_purchase' || phaseId === 'return') {
        emotion = 'satisfied';
        intensity = 5;
      }
      
      emotions[phaseId] = {
        primaryEmotion: emotion,
        intensity: intensity,
        notes: `Inferred from ${dropOffRate}% drop-off rate and typical behavior in this phase`
      };
    }
    
    return emotions;
  }
  
  /**
   * Collect visual data using browser automation
   * @param {Array} phases - Journey phases
   * @returns {Promise<Object>} Visual data
   */
  async collectVisualData(phases) {
    // In a production implementation, this would take screenshots
    // of key pages and analyze visual elements
    return {
      note: 'Visual data collection would require implementation specific to site structure'
    };
  }
  
  /**
   * Identify improvement opportunities
   * @param {Object} journeyMap - Journey mapping data
   * @returns {Array} Improvement opportunities
   */
  identifyOpportunities(journeyMap) {
    const opportunities = [];
    
    // Look for high drop-off rates
    for (const [phaseId, actions] of Object.entries(journeyMap.actions)) {
      const dropOffRate = parseInt(actions.metrics.dropOffRate, 10);
      
      if (dropOffRate > 25) {
        opportunities.push({
          phaseId,
          issue: 'High drop-off rate',
          description: `${dropOffRate}% of users leave during the ${phaseId} phase`,
          recommendation: `Review the ${phaseId} experience to identify and remove friction points`,
          priority: dropOffRate > 35 ? 'high' : 'medium'
        });
      }
    }
    
    // Look for negative emotions
    if (journeyMap.emotions) {
      for (const [phaseId, emotion] of Object.entries(journeyMap.emotions)) {
        if (emotion.primaryEmotion === 'frustrated' || emotion.primaryEmotion === 'confused') {
          opportunities.push({
            phaseId,
            issue: 'Negative user emotion',
            description: `Users appear to be ${emotion.primaryEmotion} during the ${phaseId} phase`,
            recommendation: `Simplify the interface and improve clarity in the ${phaseId} phase`,
            priority: emotion.intensity > 3 ? 'high' : 'medium'
          });
        }
      }
    }
    
    // Look for common paths that don't lead to conversion
    if (journeyMap.analytics && journeyMap.analytics.commonPaths) {
      const nonConvertingPaths = journeyMap.analytics.commonPaths.filter(
        path => !path.path.includes('/checkout') && !path.path.includes('/thank-you')
      );
      
      if (nonConvertingPaths.length > 0) {
        opportunities.push({
          issue: 'Non-converting user paths',
          description: 'Common user paths that don\'t lead to conversions',
          recommendation: 'Add relevant calls-to-action along these common paths',
          priority: 'medium'
        });
      }
    }
    
    // Add generic improvement opportunities
    opportunities.push({
      issue: 'Generic improvement',
      description: 'User journey mapping should be combined with user testing for deeper insights',
      recommendation: 'Conduct user testing sessions to validate journey map findings',
      priority: 'medium'
    });
    
    return opportunities;
  }
  
  /**
   * Get schema for MCP integration
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
            userType: {
              type: "string",
              enum: ["anonymous", "customer", "subscriber", "administrator"],
              default: "anonymous",
              description: "Type of WordPress user to analyze for journey mapping"
            },
            scenario: {
              type: "string",
              enum: ["general_browsing", "product_purchase", "content_discovery"],
              default: "general_browsing",
              description: "Specific user journey scenario to map and analyze"
            },
            sampleSize: {
              type: "integer",
              default: 100,
              minimum: 10,
              maximum: 1000,
              description: "Number of user sessions to analyze for journey mapping (higher values provide more accurate results)"
            },
            includeVisualData: {
              type: "boolean",
              default: false,
              description: "Whether to capture screenshots and visual elements during journey mapping (requires browser automation)"
            },
            includeAnalyticsData: {
              type: "boolean",
              default: true,
              description: "Whether to include analytics data in the journey analysis (pageviews, bounce rates, etc.)"
            },
            generateVisualMap: {
              type: "boolean",
              default: false,
              description: "Whether to generate a visual representation of the user journey map"
            },
            focusArea: {
              type: "string",
              enum: ["conversion", "engagement", "retention", "onboarding", "all"],
              default: "all",
              description: "Specific aspect of the journey to focus analysis on"
            },
            outputFormat: {
              type: "string",
              enum: ["detailed", "summary", "recommendations"],
              default: "detailed",
              description: "Level of detail to include in the journey mapping output"
            }
          },
          required: []
        }
      }
    };
  }
}

module.exports = UserJourneyMapperTool; 