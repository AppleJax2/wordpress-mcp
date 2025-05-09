/**
 * SEO Manager Tool
 * Manages SEO settings, sitemaps, and metadata for WordPress
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class SEOManagerTool extends BaseTool {
  constructor() {
    super('wordpress_seo_manager', 'Manage SEO settings, sitemaps, and metadata for WordPress');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
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
              enum: [
                "analyze", 
                "updateMetaTags", 
                "optimizeTitles", 
                "generateDescription",
                "checkSitemap",
                "inspectSchema",
                "auditContent",
                "analyzeSocial",
                "checkMobileOptimization",
                "scanForIssues",
                "suggestImprovements"
              ],
              description: "The SEO operation to perform",
              default: "analyze"
            },
            target: {
              type: "object",
              description: "Target content for the SEO operation",
              properties: {
                url: {
                  type: "string",
                  description: "URL of the page to analyze or modify (e.g., 'https://example.com/page')"
                },
                postId: {
                  type: "integer",
                  description: "WordPress post/page ID to analyze or modify"
                },
                sitewide: {
                  type: "boolean",
                  description: "Whether to perform the operation site-wide rather than on a specific page",
                  default: false
                }
              }
            },
            data: {
              type: "object",
              description: "Data specific to the selected SEO action",
              properties: {
                // For updateMetaTags
                metaTags: {
                  type: "object",
                  description: "Meta tag values to update",
                  properties: {
                    title: {
                      type: "string", 
                      description: "Page meta title (typically 50-60 characters)"
                    },
                    description: {
                      type: "string",
                      description: "Page meta description (typically 150-160 characters)"
                    },
                    keywords: {
                      type: "string",
                      description: "Comma-separated meta keywords (if supported by SEO plugin)"
                    },
                    canonical: {
                      type: "string",
                      description: "Canonical URL for the page"
                    },
                    robots: {
                      type: "string",
                      description: "Robots meta tag value (e.g., 'index,follow', 'noindex,nofollow')"
                    }
                  }
                },
                // For optimizeTitles and generateDescription
                keywords: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "Target keywords to optimize for"
                },
                focusKeyword: {
                  type: "string",
                  description: "Primary focus keyword for the content"
                },
                // For checkSitemap
                sitemapUrl: {
                  type: "string",
                  description: "URL of the sitemap to check (defaults to /sitemap.xml or plugin-specific location)"
                },
                // For scanForIssues
                issueTypes: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "brokenLinks",
                      "missingAltText",
                      "mixedContent",
                      "missingTitles",
                      "duplicateContent",
                      "poorPerformance",
                      "noSsl",
                      "mobileIssues",
                      "all"
                    ]
                  },
                  description: "Types of SEO issues to scan for",
                  default: ["all"]
                },
                // For social analysis
                platforms: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["facebook", "twitter", "linkedin", "pinterest", "all"]
                  },
                  description: "Social media platforms to analyze/optimize for",
                  default: ["all"]
                },
                // Common parameters
                detailedReport: {
                  type: "boolean",
                  description: "Whether to generate a detailed report of findings",
                  default: true
                },
                maxResults: {
                  type: "integer",
                  description: "Maximum number of results/suggestions to return",
                  default: 10,
                  minimum: 1,
                  maximum: 100
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

module.exports = SEOManagerTool;