/**
 * Analytics Module for TanukiMCP
 * Provides persistent token usage tracking and analytics
 */
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const config = require('../config');

class Analytics {
  constructor() {
    this.usageData = new Map(); // userId -> usage stats
    this.dataFile = path.join(__dirname, '..', '..', 'data', 'token-usage.json');
    this.initialized = false;
    this.saveInterval = null;
    
    // Read settings from config
    this.trackTokenUsage = config.analytics?.trackTokenUsage !== false;
    this.saveIntervalMs = config.analytics?.saveIntervalMs || 300000; // 5 minutes default
    this.detailedLogging = config.analytics?.detailedLogging || false;
    
    // Initialize analytics
    this.init();
  }
  
  /**
   * Initialize analytics module
   */
  async init() {
    try {
      // Skip if token usage tracking is disabled
      if (!this.trackTokenUsage) {
        logger.info('Token usage tracking is disabled in configuration');
        return;
      }
      
      // Create data directory if it doesn't exist
      const dataDir = path.join(__dirname, '..', '..', 'data');
      try {
        await fs.mkdir(dataDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
      
      // Load existing data
      try {
        const data = await fs.readFile(this.dataFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Convert object to Map
        Object.keys(parsed).forEach(userId => {
          this.usageData.set(userId, parsed[userId]);
        });
        
        logger.info(`Loaded token usage data for ${this.usageData.size} users`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.error('Error loading token usage data', err);
        } else {
          logger.info('No existing token usage data found, starting fresh');
        }
      }
      
      // Set up periodic saving (using configured interval)
      this.saveInterval = setInterval(() => this.saveData(), this.saveIntervalMs);
      
      this.initialized = true;
      logger.info('Analytics module initialized successfully', {
        trackTokenUsage: this.trackTokenUsage,
        saveIntervalMs: this.saveIntervalMs,
        detailedLogging: this.detailedLogging
      });
    } catch (error) {
      logger.error('Failed to initialize analytics module', error);
    }
  }
  
  /**
   * Track token usage
   * @param {string} userId - WordPress user ID
   * @param {Object} usage - OpenAI API usage data
   * @param {string} model - Model used for the request
   */
  trackTokenUsage(userId, usage, model) {
    if (!userId || !usage) return;
    
    const { prompt_tokens, completion_tokens, total_tokens } = usage;
    const timestamp = new Date().toISOString();
    
    // Ensure we're initialized
    if (!this.initialized) {
      logger.warn('Analytics module not initialized, token usage will not be tracked');
      return;
    }
    
    // Get or create user record
    if (!this.usageData.has(userId)) {
      this.usageData.set(userId, {
        userId,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        requests: 0,
        firstRequest: timestamp,
        lastRequest: timestamp,
        costEstimate: 0,
        byModel: {},
        history: []
      });
    }
    
    const userData = this.usageData.get(userId);
    
    // Update totals
    userData.totalTokens += total_tokens || 0;
    userData.promptTokens += prompt_tokens || 0;
    userData.completionTokens += completion_tokens || 0;
    userData.requests += 1;
    userData.lastRequest = timestamp;
    
    // Update model-specific stats
    if (!userData.byModel[model]) {
      userData.byModel[model] = {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        requests: 0
      };
    }
    
    userData.byModel[model].totalTokens += total_tokens || 0;
    userData.byModel[model].promptTokens += prompt_tokens || 0;
    userData.byModel[model].completionTokens += completion_tokens || 0;
    userData.byModel[model].requests += 1;
    
    // Calculate approximate cost (very rough estimate)
    const cost = this.estimateCost(model, prompt_tokens, completion_tokens);
    userData.costEstimate += cost;
    
    // Add to history (keep last 100 entries max)
    userData.history.push({
      timestamp,
      model,
      promptTokens: prompt_tokens,
      completionTokens: completion_tokens,
      totalTokens: total_tokens,
      estimatedCost: cost
    });
    
    // Trim history if needed
    if (userData.history.length > 100) {
      userData.history = userData.history.slice(-100);
    }
    
    // Log for monitoring
    logger.info(`Token usage tracked for user ${userId}`, {
      userId,
      requestTokens: total_tokens,
      model,
      totalUserTokens: userData.totalTokens
    });
    
    // Save immediately if this is a high-usage request
    if (total_tokens > 1000) {
      this.saveData();
    }
  }
  
  /**
   * Estimate cost for token usage (very rough estimate)
   * @private
   */
  estimateCost(model, promptTokens, completionTokens) {
    // These rates are approximate and will need to be updated as pricing changes
    const rates = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-4-1106-preview': { prompt: 0.01, completion: 0.03 },
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 }
    };
    
    // Default to gpt-4-turbo rates if model not found
    const rate = rates[model] || rates['gpt-4-turbo'];
    
    // Calculate cost per thousand tokens
    const promptCost = (promptTokens / 1000) * rate.prompt;
    const completionCost = (completionTokens / 1000) * rate.completion;
    
    return promptCost + completionCost;
  }
  
  /**
   * Save usage data to file
   */
  async saveData() {
    if (!this.initialized) return;
    
    try {
      // Convert Map to Object
      const data = {};
      for (const [userId, stats] of this.usageData.entries()) {
        data[userId] = stats;
      }
      
      // Write to file
      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2), 'utf8');
      logger.info(`Saved token usage data for ${this.usageData.size} users`);
    } catch (error) {
      logger.error('Failed to save token usage data', error);
    }
  }
  
  /**
   * Get usage statistics for a specific user or all users
   * @param {string} userId - Optional user ID to filter stats
   * @param {boolean} detailed - Whether to include detailed history
   * @returns {Object} Usage statistics
   */
  getUsageStats(userId = null, detailed = false) {
    if (!this.initialized) {
      return { error: 'Analytics module not initialized' };
    }
    
    if (userId) {
      // Get stats for a specific user
      const userData = this.usageData.get(userId);
      if (!userData) {
        return { message: 'No usage data for this user' };
      }
      
      // Clone data to avoid exposing the reference
      const stats = { ...userData };
      
      // Remove history if not detailed
      if (!detailed) {
        delete stats.history;
      }
      
      return stats;
    } else {
      // Get aggregated stats for all users
      const summary = {
        totalUsers: this.usageData.size,
        totalTokens: 0,
        totalRequests: 0,
        totalCost: 0,
        byModel: {},
        topUsers: []
      };
      
      // User-specific stats (for top users)
      const userStats = [];
      
      for (const [userId, stats] of this.usageData.entries()) {
        // Update totals
        summary.totalTokens += stats.totalTokens;
        summary.totalRequests += stats.requests;
        summary.totalCost += stats.costEstimate;
        
        // Update model-specific stats
        for (const [model, modelStats] of Object.entries(stats.byModel)) {
          if (!summary.byModel[model]) {
            summary.byModel[model] = {
              totalTokens: 0,
              requests: 0
            };
          }
          
          summary.byModel[model].totalTokens += modelStats.totalTokens;
          summary.byModel[model].requests += modelStats.requests;
        }
        
        // Add to user stats for top users calculation
        userStats.push({
          userId,
          totalTokens: stats.totalTokens,
          requests: stats.requests,
          costEstimate: stats.costEstimate
        });
      }
      
      // Get top 10 users by token usage
      summary.topUsers = userStats
        .sort((a, b) => b.totalTokens - a.totalTokens)
        .slice(0, 10);
      
      return summary;
    }
  }
  
  /**
   * Get monthly usage report
   * @param {string} month - Month in YYYY-MM format
   * @returns {Object} Monthly usage report
   */
  getMonthlyReport(month = null) {
    if (!this.initialized) {
      return { error: 'Analytics module not initialized' };
    }
    
    // Default to current month
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    const report = {
      month,
      totalTokens: 0,
      totalRequests: 0,
      totalCost: 0,
      byModel: {},
      byUser: {}
    };
    
    // Process all user data
    for (const [userId, userData] of this.usageData.entries()) {
      let userMonthlyTokens = 0;
      let userMonthlyRequests = 0;
      let userMonthlyCost = 0;
      
      // Process history entries for the specified month
      if (userData.history) {
        for (const entry of userData.history) {
          // Check if entry is from the specified month
          if (entry.timestamp.startsWith(month)) {
            userMonthlyTokens += entry.totalTokens;
            userMonthlyRequests += 1;
            userMonthlyCost += entry.estimatedCost;
            
            // Update model-specific stats
            if (!report.byModel[entry.model]) {
              report.byModel[entry.model] = {
                totalTokens: 0,
                requests: 0,
                cost: 0
              };
            }
            
            report.byModel[entry.model].totalTokens += entry.totalTokens;
            report.byModel[entry.model].requests += 1;
            report.byModel[entry.model].cost += entry.estimatedCost;
          }
        }
      }
      
      // Only add user to report if they had activity in the specified month
      if (userMonthlyRequests > 0) {
        report.byUser[userId] = {
          totalTokens: userMonthlyTokens,
          requests: userMonthlyRequests,
          cost: userMonthlyCost
        };
        
        // Update totals
        report.totalTokens += userMonthlyTokens;
        report.totalRequests += userMonthlyRequests;
        report.totalCost += userMonthlyCost;
      }
    }
    
    return report;
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // Save data one last time
    this.saveData();
  }
}

// Create and export singleton instance
const analytics = new Analytics();

// Handle process exit
process.on('exit', () => {
  analytics.cleanup();
});

module.exports = analytics; 