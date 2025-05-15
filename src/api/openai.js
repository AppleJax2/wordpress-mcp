/**
 * OpenAI API Client
 * Handles interactions with OpenAI API for WordPress related tasks
 */
const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const analytics = require('../utils/analytics');

class OpenAIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      logger.warn('OPENAI_API_KEY environment variable is not set. OpenAI functionality will not work.');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey,
    });
    
    // Default configuration
    this.model = process.env.OPENAI_MODEL || 'gpt-4.1';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10);
  }
  
  /**
   * Process a WordPress site editing request
   * @param {Object} options - Request options
   * @param {string} options.message - User message
   * @param {string} options.userId - WordPress user ID for tracking
   * @param {string} options.targetSiteUrl - WordPress site URL
   * @param {string} options.targetSiteAppPassword - WordPress app password
   * @param {string} options.modelPreference - Model preference (basic/advanced)
   * @returns {Promise<Object>} - OpenAI API response
   */
  async processSiteEditRequest(options) {
    try {
      const { message, userId, targetSiteUrl, targetSiteAppPassword, modelPreference } = options;
      
      // Determine which model to use based on preference
      const modelToUse = modelPreference === 'advanced' ? 
                         (process.env.OPENAI_ADVANCED_MODEL || 'gpt-4.1') : 
                         (modelPreference === 'basic' ? 'gpt-4.1-mini' : this.model);
      
      // Create system message with WordPress expertise
      const systemMessage = this.getWordPressExpertSystemPrompt();
      
      // Create complete prompt with user's request
      const response = await this.client.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: this.maxTokens,
        user: `wp_user_${userId}` // For OpenAI's tracking
      });
      
      // Track token usage in analytics
      analytics.trackTokenUsage(userId, response.usage, modelToUse);
      
      return {
        success: true,
        data: {
          content: response.choices[0].message.content,
          usage: response.usage,
          model: modelToUse
        }
      };
    } catch (error) {
      logger.error('Error calling OpenAI API', {
        error: error.message,
        userId: options.userId,
        stack: error.stack
      });
      
      return {
        success: false,
        error: this.formatOpenAIError(error)
      };
    }
  }
  
  /**
   * Process a workflow execution request
   * @param {Object} options - Request options
   * @param {string} options.workflow - Workflow name or details
   * @param {Object} options.parameters - Workflow parameters
   * @param {string} options.userId - WordPress user ID for tracking
   * @returns {Promise<Object>} - OpenAI API response
   */
  async processWorkflowRequest(options) {
    try {
      const { workflow, parameters, userId } = options;
      
      // Create system message with WordPress expertise and workflow context
      const systemMessage = `${this.getWordPressExpertSystemPrompt()}\n\nYou are executing the "${workflow}" workflow with the following parameters: ${JSON.stringify(parameters)}`;
      
      // Create complete prompt with workflow instructions
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `Execute the ${workflow} workflow with the provided parameters.` }
        ],
        temperature: 0.5,
        max_tokens: this.maxTokens,
        user: `wp_user_${userId}` // For OpenAI's tracking
      });
      
      // Track token usage in analytics
      analytics.trackTokenUsage(userId, response.usage, this.model);
      
      return {
        success: true,
        data: {
          result: response.choices[0].message.content,
          usage: response.usage,
          model: this.model
        }
      };
    } catch (error) {
      logger.error('Error executing workflow via OpenAI API', {
        error: error.message,
        userId: options.userId,
        workflow: options.workflow,
        stack: error.stack
      });
      
      return {
        success: false,
        error: this.formatOpenAIError(error)
      };
    }
  }
  
  /**
   * Format OpenAI error for client response
   * @private
   */
  formatOpenAIError(error) {
    // Check for rate limiting errors
    if (error.status === 429) {
      return {
        message: 'Rate limit exceeded. Please try again later.',
        type: 'rate_limit',
        retryAfter: error.headers?.['retry-after'] || 60
      };
    }
    
    // Check for token quota errors
    if (error.message && error.message.includes('quota')) {
      return {
        message: 'API quota exceeded. Please check your subscription.',
        type: 'quota_exceeded'
      };
    }
    
    // Check for model-specific errors
    if (error.message && error.message.includes('model')) {
      return {
        message: 'Model error: ' + error.message,
        type: 'model_error',
        code: error.status || 400
      };
    }
    
    // Default error format
    return {
      message: error.message || 'Unknown error occurred',
      type: error.type || 'api_error',
      code: error.status || 500
    };
  }
  
  /**
   * Get the system prompt for WordPress expert
   * @private
   */
  getWordPressExpertSystemPrompt() {
    return `You are the Comprehensive WordPress Expert - a specialized AI assistant with deep expertise in WordPress development, design, and administration.

### Core Identity and Expertise
- Primary Role: Expert WordPress developer, designer, and administrator with full-stack capabilities
- Technical Foundation: Deep understanding of WordPress core (6.0+), PHP (7.4+), MySQL, JavaScript, CSS, and REST API architecture

Your expertise includes:
- WordPress file structure, directory organization, and core files
- WordPress database schema
- Theme architecture (theme.json, template hierarchy)
- Plugin architecture (hooks, filters, activation hooks)
- Block editor (Gutenberg) architecture
- WordPress transients, object caching, and optimization techniques
- WordPress Multisite configuration

You excel at:
- Theme development (classic vs. block themes)
- Plugin development (actions, filters, shortcodes)
- E-commerce expertise (WooCommerce)
- Performance optimization
- Security best practices

When solving problems:
1. Systematically diagnose starting with WordPress fundamentals
2. Consider theme/plugin conflicts
3. Analyze server environment factors
4. Consider browser compatibility
5. Evaluate mobile/responsive implications

Use clear, concise technical explanations and provide step-by-step task breakdowns for complex changes.`;
  }
  
  /**
   * Get token usage statistics
   * @param {string} userId - Optional user ID to filter stats
   * @param {boolean} detailed - Whether to include detailed history
   * @returns {Object} - Token usage statistics
   */
  getTokenUsageStats(userId = null, detailed = false) {
    return analytics.getUsageStats(userId, detailed);
  }
  
  /**
   * Get monthly usage report
   * @param {string} month - Month in YYYY-MM format
   * @returns {Object} - Monthly usage report
   */
  getMonthlyReport(month = null) {
    return analytics.getMonthlyReport(month);
  }
}

module.exports = new OpenAIService(); 