/**
 * Site Polisher Tool
 * Analyzes AI-generated content and makes enhancement/polishing improvements
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');
const logger = require('../utils/logger');

class SitePolisherTool extends BaseTool {
  constructor() {
    super('wordpress_site_polisher', 'Analyzes AI-generated content and makes enhancement/polishing improvements');
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
              enum: ["analyze", "enhance", "polish", "fix", "rewrite", "scan"],
              description: "The content enhancement action to perform",
              default: "analyze"
            },
            target: {
              type: "object",
              description: "Target content for polishing/enhancement",
              properties: {
                postId: {
                  type: "integer",
                  description: "ID of WordPress post/page to enhance"
                },
                url: {
                  type: "string",
                  description: "URL of the page to enhance"
                },
                contentText: {
                  type: "string",
                  description: "Direct input text content to enhance (if not using postId or URL)"
                },
                contentType: {
                  type: "string",
                  enum: ["post", "page", "product", "custom"],
                  description: "Type of WordPress content being enhanced",
                  default: "post"
                }
              }
            },
            enhancementOptions: {
              type: "object",
              description: "Options for content enhancement",
              properties: {
                improveTone: {
                  type: "boolean",
                  description: "Whether to improve the tone of the content",
                  default: true
                },
                fixGrammar: {
                  type: "boolean",
                  description: "Whether to fix grammar and spelling errors",
                  default: true
                },
                improveReadability: {
                  type: "boolean",
                  description: "Whether to improve content readability",
                  default: true
                },
                enhanceStructure: {
                  type: "boolean",
                  description: "Whether to improve content structure (headings, paragraphs, etc.)",
                  default: true
                },
                addSubheadings: {
                  type: "boolean",
                  description: "Whether to add or improve subheadings",
                  default: true
                },
                improveWordChoice: {
                  type: "boolean",
                  description: "Whether to improve word choice and vocabulary",
                  default: true
                },
                removeFiller: {
                  type: "boolean",
                  description: "Whether to remove filler words and phrases",
                  default: true
                },
                fixAIPatterns: {
                  type: "boolean",
                  description: "Whether to fix common AI writing patterns and biases",
                  default: true
                },
                targetWordCount: {
                  type: "integer",
                  description: "Target word count for the enhanced content (0 = maintain original length)",
                  default: 0,
                  minimum: 0
                },
                toneStyle: {
                  type: "string",
                  enum: ["casual", "conversational", "professional", "academic", "friendly", "authoritative", "original"],
                  description: "Target tone/style for the content",
                  default: "original"
                },
                contentPurpose: {
                  type: "string",
                  enum: ["informative", "persuasive", "educational", "entertaining", "technical", "promotional", "original"],
                  description: "Purpose of the content to guide enhancement",
                  default: "original"
                },
                addImages: {
                  type: "boolean",
                  description: "Whether to suggest image placements",
                  default: false
                },
                seoOptimize: {
                  type: "boolean",
                  description: "Whether to optimize content for SEO",
                  default: false
                },
                keywords: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "Keywords to emphasize in the enhanced content"
                },
                targetAudience: {
                  type: "string",
                  description: "Target audience description to tailor content style"
                }
              }
            },
            outputFormat: {
              type: "string",
              enum: ["html", "markdown", "text", "original"],
              description: "Format for the enhanced content output",
              default: "original"
            },
            autoApply: {
              type: "boolean",
              description: "Whether to automatically apply changes to WordPress content",
              default: false
            },
            saveAsDraft: {
              type: "boolean",
              description: "Whether to save enhanced content as a draft (when autoApply is true)",
              default: true
            },
            generateReport: {
              type: "boolean", 
              description: "Whether to generate a detailed report of changes",
              default: true
            }
          },
          required: ["action", "target"]
        }
      }
    };
  }
}

module.exports = SitePolisherTool;