/**
 * SiteMapperTool
 * Creates a comprehensive map of a WordPress site including all pages, posts, media, and their relationships
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const { createGzip } = require('zlib');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

class SiteMapperTool extends BaseTool {
  constructor() {
    super('wordpress_sitemap', 'Creates a comprehensive map of a WordPress site including all pages, posts, media, and their relationships');
    this.api = new WordPressAPI();
    this.maxEntriesPerSitemap = 2000; // Default from WordPress
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
              enum: ["generate", "analyze", "verify", "view", "download"],
              description: "The sitemap operation to perform",
              default: "generate"
            },
            options: {
              type: "object",
              description: "Sitemap generation options",
              properties: {
                contentTypes: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["post", "page", "attachment", "product", "category", "tag", "custom", "all"]
                  },
                  description: "Content types to include in the sitemap",
                  default: ["post", "page"]
                },
                includeImages: {
                  type: "boolean",
                  description: "Whether to include image information in the sitemap",
                  default: true
                },
                includeLastmod: {
                  type: "boolean",
                  description: "Whether to include last modification dates",
                  default: true
                },
                excludeNoindex: {
                  type: "boolean",
                  description: "Whether to exclude content marked as noindex",
                  default: true
                },
                maxUrlsPerSitemap: {
                  type: "integer",
                  description: "Maximum number of URLs per sitemap file",
                  default: 2000,
                  minimum: 100,
                  maximum: 50000
                },
                priorityConfig: {
                  type: "object",
                  description: "Priority configuration for different content types",
                  properties: {
                    home: {
                      type: "number",
                      description: "Priority for the homepage (0.0-1.0)",
                      default: 1.0,
                      minimum: 0.0,
                      maximum: 1.0
                    },
                    posts: {
                      type: "number",
                      description: "Priority for blog posts (0.0-1.0)",
                      default: 0.7,
                      minimum: 0.0,
                      maximum: 1.0
                    },
                    pages: {
                      type: "number",
                      description: "Priority for static pages (0.0-1.0)",
                      default: 0.8,
                      minimum: 0.0,
                      maximum: 1.0
                    },
                    categories: {
                      type: "number",
                      description: "Priority for category archives (0.0-1.0)",
                      default: 0.6,
                      minimum: 0.0,
                      maximum: 1.0
                    },
                    tags: {
                      type: "number",
                      description: "Priority for tag archives (0.0-1.0)",
                      default: 0.4,
                      minimum: 0.0,
                      maximum: 1.0
                    }
                  }
                },
                changefreqConfig: {
                  type: "object",
                  description: "Change frequency configuration for different content types",
                  properties: {
                    home: {
                      type: "string",
                      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
                      description: "Change frequency for the homepage",
                      default: "daily"
                    },
                    posts: {
                      type: "string",
                      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
                      description: "Change frequency for blog posts",
                      default: "weekly"
                    },
                    pages: {
                      type: "string",
                      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
                      description: "Change frequency for static pages",
                      default: "monthly"
                    }
                  }
                },
                customUrls: {
                  type: "array",
                  description: "Additional custom URLs to include in the sitemap",
                  items: {
                    type: "object",
                    properties: {
                      loc: {
                        type: "string",
                        description: "URL location"
                      },
                      lastmod: {
                        type: "string",
                        description: "Last modification date (YYYY-MM-DD format)"
                      },
                      priority: {
                        type: "number",
                        description: "URL priority (0.0-1.0)",
                        minimum: 0.0,
                        maximum: 1.0
                      },
                      changefreq: {
                        type: "string",
                        enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
                        description: "Change frequency"
                      }
                    },
                    required: ["loc"]
                  }
                }
              }
            },
            outputFormat: {
              type: "string",
              enum: ["xml", "html", "json", "text"],
              description: "Format for the sitemap output",
              default: "xml"
            },
            compress: {
              type: "boolean",
              description: "Whether to compress the sitemap with gzip",
              default: false
            },
            notifySearchEngines: {
              type: "boolean",
              description: "Whether to ping search engines about the updated sitemap",
              default: true
            },
            sitemapUrl: {
              type: "string",
              description: "URL of existing sitemap to analyze or verify (for 'analyze' and 'verify' actions)"
            }
          },
          required: ["action"]
        }
      }
    };
  }
}

module.exports = SiteMapperTool;