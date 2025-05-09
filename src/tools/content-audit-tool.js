/**
 * Content Audit Tool
 * 
 * Analyzes content quality, readability, SEO, and engagement metrics
 */
const BaseTool = require('./base-tool');
const axios = require('axios');
const { JSDOM } = require('jsdom'); // This would need to be installed
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');

class ContentAuditTool extends BaseTool {
  constructor() {
    super(
      'wordpress_content_audit',
      'Analyzes content quality, readability, SEO, and engagement metrics'
    );
  }
  
  /**
   * Execute the content audit tool
   */
  async execute(params) {
    try {
      const { action, target, options = {} } = params;
      
      // Validate required parameters
      if (!action) {
        return this.handleError(new Error('Action is required'), 'execute');
      }
      
      if (!target || (!target.contentId && !target.contentUrl && !target.contentText)) {
        return this.handleError(new Error('Target content is required (contentId, contentUrl, or contentText)'), 'execute');
      }
      
      // Set default options if not provided
      const analysisOptions = {
        includeQuality: options.includeQuality !== false,
        includeReadability: options.includeReadability !== false,
        includeSEO: options.includeSEO !== false,
        includeEngagement: options.includeEngagement !== false,
        detailLevel: options.detailLevel || 'detailed'
      };
      
      // Fetch content based on provided target
      const content = await this.fetchContent(target);
      if (!content.success) {
        return content; // Return error from fetchContent
      }
      
      // Perform requested action
      switch (action) {
        case 'analyze':
          return this.performFullAnalysis(content.data, analysisOptions);
        case 'summary':
          return this.generateSummary(content.data, analysisOptions);
        case 'suggestions':
          return this.generateSuggestions(content.data, analysisOptions);
        default:
          return this.handleError(new Error(`Unknown action: ${action}`), 'execute');
      }
    } catch (error) {
      return this.handleError(error, 'execute');
    }
  }
  
  /**
   * Fetch content from WordPress or external URL
   */
  async fetchContent(target) {
    try {
      let content, title, url;
      
      // Fetch from WordPress by ID
      if (target.contentId) {
        this.logger.debug(`Fetching WordPress content with ID: ${target.contentId}`);
        
        // We would use the WordPress API client here
        // For now, simple implementation using fetch
        const wpApiUrl = `${process.env.WP_SITE_URL}/wp-json/wp/v2/`;
        const endpoint = 'posts'; // Could be 'pages' or other post types
        
        const response = await fetch(`${wpApiUrl}${endpoint}/${target.contentId}`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch WordPress content: ${response.statusText}`);
        }
        
        const post = await response.json();
        content = post.content.rendered;
        title = post.title.rendered;
        url = post.link;
      }
      // Fetch from external URL
      else if (target.contentUrl) {
        this.logger.debug(`Fetching content from URL: ${target.contentUrl}`);
        
        // Fetch URL content with axios
        const response = await axios.get(target.contentUrl);
        content = response.data;
        url = target.contentUrl;
        
        // Extract title using simple regex
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1] : 'Unknown Title';
      }
      // Use directly provided content
      else if (target.contentText) {
        this.logger.debug('Using provided content text');
        content = target.contentText;
        title = 'Provided Content';
        url = null;
      }
      
      // Parse content if it's HTML
      let plainText = content;
      let wordCount = 0;
      let metadata = {};
      
      if (content.includes('<')) {
        // In a production implementation, we would use html-to-text or similar
        // For now, use simple DOM parsing
        
        // Create a JSDOM instance to parse the HTML
        const dom = new JSDOM(content);
        const document = dom.window.document;
        
        // Extract plain text
        plainText = document.body.textContent || '';
        
        // Extract metadata
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(meta => {
          const name = meta.getAttribute('name') || meta.getAttribute('property');
          const content = meta.getAttribute('content');
          if (name && content) {
            metadata[name] = content;
          }
        });
        
        // Count words
        wordCount = plainText.split(/\s+/).filter(Boolean).length;
      } else {
        // If it's plain text, count words directly
        wordCount = plainText.split(/\s+/).filter(Boolean).length;
      }
      
      return {
        success: true,
        data: {
          title,
          url,
          content: content,
          plainText,
          wordCount,
          metadata
        }
      };
    } catch (error) {
      return this.handleError(error, 'fetchContent');
    }
  }
  
  /**
   * Perform full content analysis
   */
  async performFullAnalysis(content, options) {
    try {
      const results = {
        success: true,
        title: content.title,
        url: content.url,
        wordCount: content.wordCount,
        analyses: {}
      };
      
      // Run each analysis based on options
      if (options.includeQuality) {
        results.analyses.quality = await this.analyzeQuality(content, options.detailLevel);
      }
      
      if (options.includeReadability) {
        results.analyses.readability = await this.analyzeReadability(content, options.detailLevel);
      }
      
      if (options.includeSEO) {
        results.analyses.seo = await this.analyzeSEO(content, options.detailLevel);
      }
      
      if (options.includeEngagement) {
        results.analyses.engagement = await this.analyzeEngagement(content, options.detailLevel);
      }
      
      // Generate overall score
      results.overallScore = this.calculateOverallScore(results.analyses);
      
      // Generate improvement suggestions
      results.suggestions = this.generateSuggestions(content, options, results.analyses);
      
      return results;
    } catch (error) {
      return this.handleError(error, 'performFullAnalysis');
    }
  }
  
  /**
   * Generate a summary of the content
   */
  async generateSummary(content, options) {
    try {
      // Perform a basic analysis first
      const basicOptions = { ...options, detailLevel: 'basic' };
      const analysis = await this.performFullAnalysis(content, basicOptions);
      
      // Extract summary information
      return {
        success: true,
        title: content.title,
        url: content.url,
        wordCount: content.wordCount,
        overallScore: analysis.overallScore,
        qualityScore: analysis.analyses.quality?.score || 'N/A',
        readabilityScore: analysis.analyses.readability?.score || 'N/A',
        seoScore: analysis.analyses.seo?.score || 'N/A',
        engagementScore: analysis.analyses.engagement?.score || 'N/A',
        topSuggestions: analysis.suggestions.slice(0, 3)
      };
    } catch (error) {
      return this.handleError(error, 'generateSummary');
    }
  }
  
  /**
   * Generate improvement suggestions based on analysis
   */
  generateSuggestions(content, options, analyses = null) {
    try {
      // If analyses were not provided, perform them
      if (!analyses) {
        // This would be an async call, but to keep the method synchronous,
        // we'll do a very limited analysis here
        analyses = {
          quality: this.analyzeQualitySync(content, 'basic'),
          readability: this.analyzeReadabilitySync(content, 'basic'),
          seo: this.analyzeSEOSync(content, 'basic'),
          engagement: { issues: [] } // Skip engagement in sync mode
        };
      }
      
      // Collect all issues
      const allIssues = [
        ...(analyses.quality?.issues || []),
        ...(analyses.readability?.issues || []),
        ...(analyses.seo?.issues || []),
        ...(analyses.engagement?.issues || [])
      ];
      
      // Sort issues by severity
      const sortedIssues = allIssues.sort((a, b) => b.severity - a.severity);
      
      // Generate suggestions from issues
      const suggestions = sortedIssues.map(issue => ({
        category: issue.category,
        severity: issue.severity,
        issue: issue.message,
        suggestion: issue.suggestion
      }));
      
      return suggestions;
    } catch (error) {
      this.logger.error(`Error generating suggestions: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Calculate overall score based on individual analyses
   */
  calculateOverallScore(analyses) {
    const scores = [
      analyses.quality?.score,
      analyses.readability?.score,
      analyses.seo?.score,
      analyses.engagement?.score
    ].filter(score => typeof score === 'number');
    
    if (scores.length === 0) return 0;
    
    // Average all available scores
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }
  
  /**
   * Analyze content quality
   */
  async analyzeQuality(content, detailLevel) {
    try {
      // We'd use more sophisticated tools here in a production environment
      // For demonstration, we'll implement basic checks
      
      const text = content.plainText;
      const issues = [];
      let score = 100; // Start with perfect score and subtract for issues
      
      // Check for very short content
      const minWordsForGoodContent = 300;
      if (content.wordCount < minWordsForGoodContent) {
        issues.push({
          category: 'quality',
          severity: 4,
          message: `Content is too short (${content.wordCount} words)`,
          suggestion: `Aim for at least ${minWordsForGoodContent} words for comprehensive content`
        });
        score -= 20;
      }
      
      // Check for very long paragraphs
      const paragraphs = text.split(/\n\s*\n/);
      const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150);
      if (longParagraphs.length > 0) {
        issues.push({
          category: 'quality',
          severity: 3,
          message: `${longParagraphs.length} paragraphs are too long`,
          suggestion: 'Break long paragraphs into smaller, more digestible chunks'
        });
        score -= 10 * Math.min(5, longParagraphs.length);
      }
      
      // Check for repeated words
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const wordFrequency = {};
      words.forEach(word => {
        if (word.length > 3) { // Only check non-trivial words
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
      
      const repeatedWords = Object.entries(wordFrequency)
        .filter(([word, count]) => count > 5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      if (repeatedWords.length > 0) {
        issues.push({
          category: 'quality',
          severity: 2,
          message: `Overuse of words: ${repeatedWords.map(([word, count]) => `"${word}" (${count} times)`).join(', ')}`,
          suggestion: 'Use synonyms to avoid word repetition and improve diversity of language'
        });
        score -= 5 * Math.min(5, repeatedWords.length);
      }
      
      // Check for passive voice (simplified)
      const passiveVoicePatterns = [
        /\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi,
        /\b(has|have|had)\s+been\s+\w+ed\b/gi
      ];
      
      let passiveCount = 0;
      passiveVoicePatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        passiveCount += matches.length;
      });
      
      if (passiveCount > 5) {
        issues.push({
          category: 'quality',
          severity: 2,
          message: `High use of passive voice (${passiveCount} instances)`,
          suggestion: 'Use active voice to make your writing more direct and engaging'
        });
        score -= Math.min(15, passiveCount);
      }
      
      // Check grammar and spelling - in production would use external API
      // Here we just note that this would be done in a real implementation
      if (detailLevel !== 'basic') {
        issues.push({
          category: 'quality',
          severity: 1,
          message: 'Grammar and spelling analysis would be performed with specialized tools',
          suggestion: 'Consider installing additional packages for grammar and spell checking'
        });
      }
      
      // Ensure score stays in 0-100 range
      score = Math.max(0, Math.min(100, score));
      
      return {
        score,
        issues,
        grade: this.scoreToGrade(score)
      };
    } catch (error) {
      this.logger.error(`Error in quality analysis: ${error.message}`);
      return {
        score: 0,
        issues: [{
          category: 'quality',
          severity: 5,
          message: 'Failed to analyze content quality',
          suggestion: 'Please try again or contact support'
        }],
        grade: 'F'
      };
    }
  }
  
  /**
   * Simple synchronous version of quality analysis for suggestion generation
   */
  analyzeQualitySync(content, detailLevel) {
    // Simplified version of analyzeQuality that runs synchronously
    try {
      const issues = [];
      
      if (content.wordCount < 300) {
        issues.push({
          category: 'quality',
          severity: 4,
          message: 'Content is too short',
          suggestion: 'Add more comprehensive information'
        });
      }
      
      return { issues };
    } catch (error) {
      return { issues: [] };
    }
  }
  
  /**
   * Analyze content readability
   */
  async analyzeReadability(content, detailLevel) {
    try {
      const text = content.plainText;
      const issues = [];
      let score = 100; // Start with perfect score
      
      // In production, we would use readability formulas like:
      // - Flesch-Kincaid Reading Ease
      // - SMOG Index
      // - Coleman-Liau Index
      // - Automated Readability Index
      
      // For demonstration, we'll implement a simplified reading ease calculation
      const sentences = text.match(/[.!?]+["'\s)\]]*\s/g) || [];
      const words = text.match(/\b\w+\b/g) || [];
      const syllables = this.countSyllables(text);
      
      if (sentences.length === 0 || words.length === 0) {
        return {
          score: 0,
          issues: [{
            category: 'readability',
            severity: 5,
            message: 'Could not analyze text - not enough content',
            suggestion: 'Add more content to analyze'
          }],
          grade: 'F'
        };
      }
      
      // Calculate average sentence length
      const avgSentenceLength = words.length / sentences.length;
      if (avgSentenceLength > 25) {
        issues.push({
          category: 'readability',
          severity: 4,
          message: `Sentences are too long (average ${avgSentenceLength.toFixed(1)} words)`,
          suggestion: 'Break long sentences into shorter ones for better readability'
        });
        score -= Math.min(30, (avgSentenceLength - 25) * 2);
      }
      
      // Calculate average syllables per word
      const avgSyllablesPerWord = syllables / words.length;
      if (avgSyllablesPerWord > 1.8) {
        issues.push({
          category: 'readability',
          severity: 3,
          message: 'Text uses too many complex words',
          suggestion: 'Replace complex words with simpler alternatives'
        });
        score -= Math.min(20, (avgSyllablesPerWord - 1.8) * 20);
      }
      
      // Simple Flesch Reading Ease calculation (simplified)
      const readingEase = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
      let readingLevel;
      
      if (readingEase >= 90) readingLevel = 'Very Easy';
      else if (readingEase >= 80) readingLevel = 'Easy';
      else if (readingEase >= 70) readingLevel = 'Fairly Easy';
      else if (readingEase >= 60) readingLevel = 'Standard';
      else if (readingEase >= 50) readingLevel = 'Fairly Difficult';
      else if (readingEase >= 30) readingLevel = 'Difficult';
      else readingLevel = 'Very Difficult';
      
      if (readingEase < 60) {
        issues.push({
          category: 'readability',
          severity: 3,
          message: `Content is ${readingLevel.toLowerCase()} to read (score: ${readingEase.toFixed(1)})`,
          suggestion: 'Simplify your language to make content more accessible'
        });
        score -= Math.min(30, Math.max(0, (60 - readingEase) * 0.75));
      }
      
      // Check paragraph structure
      const paragraphs = text.split(/\n\s*\n/);
      if (paragraphs.length < 3 && content.wordCount > 300) {
        issues.push({
          category: 'readability',
          severity: 2,
          message: 'Content has too few paragraphs',
          suggestion: 'Break content into more paragraphs to improve readability'
        });
        score -= 10;
      }
      
      // Check heading structure
      if (detailLevel !== 'basic' && content.content.includes('<')) {
        const headingsCount = (content.content.match(/<h[1-6][^>]*>/g) || []).length;
        if (headingsCount === 0 && content.wordCount > 200) {
          issues.push({
            category: 'readability',
            severity: 3,
            message: 'Content does not use any headings',
            suggestion: 'Add headings to structure your content and improve navigation'
          });
          score -= 15;
        }
      }
      
      // Ensure score stays in 0-100 range
      score = Math.max(0, Math.min(100, score));
      
      return {
        score,
        issues,
        grade: this.scoreToGrade(score),
        metrics: {
          readingEase,
          readingLevel,
          avgSentenceLength,
          avgSyllablesPerWord,
          sentenceCount: sentences.length,
          wordCount: words.length,
          syllableCount: syllables
        }
      };
    } catch (error) {
      this.logger.error(`Error in readability analysis: ${error.message}`);
      return {
        score: 0,
        issues: [{
          category: 'readability',
          severity: 5,
          message: 'Failed to analyze readability',
          suggestion: 'Please try again or contact support'
        }],
        grade: 'F'
      };
    }
  }
  
  /**
   * Simple synchronous version of readability analysis for suggestion generation
   */
  analyzeReadabilitySync(content, detailLevel) {
    // Simplified version that runs synchronously
    try {
      const issues = [];
      const text = content.plainText;
      
      // Check if any long sentences exist
      const sentences = text.split(/[.!?]+\s/).filter(s => s.length > 0);
      const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);
      
      if (longSentences.length > 0) {
        issues.push({
          category: 'readability',
          severity: 3,
          message: 'Some sentences are too long',
          suggestion: 'Shorten sentences to improve readability'
        });
      }
      
      return { issues };
    } catch (error) {
      return { issues: [] };
    }
  }
  
  /**
   * Analyze SEO factors
   */
  async analyzeSEO(content, detailLevel) {
    try {
      const issues = [];
      let score = 100; // Start with perfect score
      
      // Title analysis
      if (!content.title || content.title === 'Unknown Title') {
        issues.push({
          category: 'seo',
          severity: 5,
          message: 'Missing page title',
          suggestion: 'Add a descriptive title with target keywords'
        });
        score -= 20;
      } else {
        const titleLength = content.title.length;
        if (titleLength < 30) {
          issues.push({
            category: 'seo',
            severity: 3,
            message: `Title is too short (${titleLength} characters)`,
            suggestion: 'Create a more descriptive title between 50-60 characters'
          });
          score -= 10;
        } else if (titleLength > 70) {
          issues.push({
            category: 'seo',
            severity: 2,
            message: `Title is too long (${titleLength} characters)`,
            suggestion: 'Shorten title to 50-60 characters to avoid truncation in search results'
          });
          score -= 5;
        }
      }
      
      // Meta description analysis
      const metaDescription = content.metadata && (content.metadata['description'] || content.metadata['og:description']);
      if (!metaDescription) {
        issues.push({
          category: 'seo',
          severity: 4,
          message: 'Missing meta description',
          suggestion: 'Add a meta description that summarizes the content with target keywords'
        });
        score -= 15;
      } else if (metaDescription.length < 100) {
        issues.push({
          category: 'seo',
          severity: 3,
          message: `Meta description is too short (${metaDescription.length} characters)`,
          suggestion: 'Expand meta description to 150-160 characters'
        });
        score -= 8;
      } else if (metaDescription.length > 160) {
        issues.push({
          category: 'seo',
          severity: 2,
          message: `Meta description is too long (${metaDescription.length} characters)`,
          suggestion: 'Shorten meta description to 150-160 characters to avoid truncation'
        });
        score -= 5;
      }
      
      // Content length analysis
      if (content.wordCount < 300) {
        issues.push({
          category: 'seo',
          severity: 4,
          message: `Content is too short for SEO (${content.wordCount} words)`,
          suggestion: 'Create longer content with at least 800 words for better SEO performance'
        });
        score -= Math.min(20, (300 - content.wordCount) / 10);
      }
      
      // Keyword analysis - in production would extract and analyze keywords
      // Here we'll just note it would be done
      if (detailLevel !== 'basic') {
        issues.push({
          category: 'seo',
          severity: 1,
          message: 'Keyword analysis would be performed with specialized tools',
          suggestion: 'Consider installing additional packages for keyword optimization'
        });
      }
      
      // Heading structure analysis
      if (content.content.includes('<')) {
        const h1Count = (content.content.match(/<h1[^>]*>/g) || []).length;
        if (h1Count === 0) {
          issues.push({
            category: 'seo',
            severity: 4,
            message: 'Missing H1 heading',
            suggestion: 'Add a single H1 heading that includes your target keyword'
          });
          score -= 15;
        } else if (h1Count > 1) {
          issues.push({
            category: 'seo',
            severity: 3,
            message: 'Multiple H1 headings detected',
            suggestion: 'Use only one H1 heading per page'
          });
          score -= 10;
        }
        
        // Check for h2-h6 headings
        const otherHeadings = (content.content.match(/<h[2-6][^>]*>/g) || []).length;
        if (otherHeadings === 0 && content.wordCount > 300) {
          issues.push({
            category: 'seo',
            severity: 3,
            message: 'No subheadings (H2-H6) found',
            suggestion: 'Add subheadings to structure your content and include relevant keywords'
          });
          score -= 10;
        }
      }
      
      // Image alt text analysis
      if (content.content.includes('<img')) {
        const imgTags = content.content.match(/<img[^>]+>/g) || [];
        const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt=') || img.includes('alt=""') || img.includes("alt=''"));
        
        if (imgsWithoutAlt.length > 0) {
          issues.push({
            category: 'seo',
            severity: 3,
            message: `${imgsWithoutAlt.length} images missing alt text`,
            suggestion: 'Add descriptive alt text to all images'
          });
          score -= Math.min(15, imgsWithoutAlt.length * 3);
        }
      }
      
      // Internal/external link analysis
      if (content.content.includes('<a')) {
        const linkTags = content.content.match(/<a[^>]+>/g) || [];
        if (linkTags.length === 0 && content.wordCount > 500) {
          issues.push({
            category: 'seo',
            severity: 2,
            message: 'No links found in content',
            suggestion: 'Add internal and external links to improve SEO'
          });
          score -= 8;
        }
      }
      
      // Ensure score stays in 0-100 range
      score = Math.max(0, Math.min(100, score));
      
      return {
        score,
        issues,
        grade: this.scoreToGrade(score)
      };
    } catch (error) {
      this.logger.error(`Error in SEO analysis: ${error.message}`);
      return {
        score: 0,
        issues: [{
          category: 'seo',
          severity: 5,
          message: 'Failed to analyze SEO factors',
          suggestion: 'Please try again or contact support'
        }],
        grade: 'F'
      };
    }
  }
  
  /**
   * Simple synchronous version of SEO analysis for suggestion generation
   */
  analyzeSEOSync(content, detailLevel) {
    // Simplified version that runs synchronously
    try {
      const issues = [];
      
      if (!content.title || content.title === 'Unknown Title') {
        issues.push({
          category: 'seo',
          severity: 5,
          message: 'Missing page title',
          suggestion: 'Add a descriptive title with target keywords'
        });
      }
      
      if (content.wordCount < 300) {
        issues.push({
          category: 'seo',
          severity: 4,
          message: 'Content is too short for SEO',
          suggestion: 'Add more content for better SEO performance'
        });
      }
      
      return { issues };
    } catch (error) {
      return { issues: [] };
    }
  }
  
  /**
   * Analyze engagement metrics
   * Note: This would typically require analytics data which we don't have in this example
   */
  async analyzeEngagement(content, detailLevel) {
    // In a real implementation, this would connect to Google Analytics or similar
    // Here we'll return a placeholder with notes
    
    return {
      score: null, // No score since we don't have real metrics
      issues: [{
        category: 'engagement',
        severity: 1,
        message: 'Engagement analysis requires integration with analytics services',
        suggestion: 'Connect to Google Analytics or other analytics services for engagement metrics'
      }],
      grade: 'N/A',
      note: 'To perform engagement analysis, you would need to integrate with analytics APIs'
    };
  }
  
  /**
   * Helper method to count syllables in text
   */
  countSyllables(text) {
    // This is a simplified syllable counter - not perfectly accurate
    // In production, would use a dedicated linguistics library
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let count = 0;
    
    words.forEach(word => {
      // Count vowel groups as syllables
      let syllables = word.match(/[aeiouy]{1,2}/g) || [];
      
      // Adjust for common patterns
      // Silent e at end of word
      if (word.match(/[aeiouy].*e$/)) {
        syllables = syllables.slice(0, -1);
      }
      
      // Count at least one syllable per word
      count += Math.max(1, syllables.length);
    });
    
    return count;
  }
  
  /**
   * Convert numeric score to letter grade
   */
  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
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
              enum: ["analyze", "summary", "suggestions"],
              description: "Type of content audit to perform (analyze=full analysis, summary=brief overview, suggestions=improvement recommendations)",
              default: "analyze"
            },
            target: {
              type: "object",
              description: "The content to analyze (must provide one of: contentId, contentUrl, or contentText)",
              properties: {
                contentId: { 
                  type: "integer", 
                  description: "ID of WordPress content to analyze" 
                },
                contentUrl: { 
                  type: "string", 
                  description: "URL of web content to analyze" 
                },
                contentText: { 
                  type: "string", 
                  description: "Direct text/HTML content to analyze" 
                }
              },
              oneOf: [
                { required: ["contentId"] },
                { required: ["contentUrl"] },
                { required: ["contentText"] }
              ]
            },
            options: {
              type: "object",
              description: "Analysis options and settings",
              properties: {
                includeQuality: { 
                  type: "boolean", 
                  default: true, 
                  description: "Include quality analysis (grammar, structure, content length, etc.)" 
                },
                includeReadability: { 
                  type: "boolean", 
                  default: true,
                  description: "Include readability analysis (reading level, sentence complexity, etc.)"
                },
                includeSEO: { 
                  type: "boolean", 
                  default: true,
                  description: "Include SEO analysis (meta tags, headings, keywords, etc.)"
                },
                includeEngagement: { 
                  type: "boolean", 
                  default: true,
                  description: "Include engagement metrics analysis (requires analytics integration)"
                },
                detailLevel: { 
                  type: "string", 
                  enum: ["basic", "detailed", "comprehensive"],
                  default: "detailed",
                  description: "Level of detail for the analysis (basic=quick overview, detailed=standard analysis, comprehensive=in-depth analysis)"
                }
              }
            }
          },
          required: ["action", "target"]
        }
      }
    };
  }
}

module.exports = ContentAuditTool; 