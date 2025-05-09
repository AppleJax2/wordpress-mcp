/**
 * WordPress Settings Manager Tool
 * For managing core WordPress settings via REST API and browser automation
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class SettingsManagerTool extends BaseTool {
  constructor() {
    super('wordpress_settings_manager', 'For managing core WordPress settings');
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
              enum: ["get", "update", "list", "reset"],
              description: "The WordPress settings operation to perform",
              default: "list"
            },
            settingType: {
              type: "string",
              enum: [
                "general", 
                "writing", 
                "reading", 
                "discussion", 
                "media", 
                "permalinks", 
                "privacy",
                "all"
              ],
              description: "Type of WordPress settings to access",
              default: "general"
            },
            settings: {
              type: "object",
              description: "Settings to update (when action is 'update')",
              properties: {
                // General settings
                blogname: {
                  type: "string",
                  description: "Site title"
                },
                blogdescription: {
                  type: "string",
                  description: "Site tagline/description"
                },
                siteurl: {
                  type: "string",
                  description: "WordPress address (URL)"
                },
                home: {
                  type: "string",
                  description: "Site address (URL)"
                },
                admin_email: {
                  type: "string",
                  description: "Administration email address"
                },
                users_can_register: {
                  type: "boolean",
                  description: "Whether anyone can register for the site"
                },
                default_role: {
                  type: "string",
                  enum: ["subscriber", "contributor", "author", "editor", "administrator"],
                  description: "Default user role for new registrations"
                },
                timezone_string: {
                  type: "string",
                  description: "Timezone (e.g., 'America/New_York', 'Europe/London')"
                },
                date_format: {
                  type: "string",
                  description: "Date format (e.g., 'F j, Y', 'Y-m-d')"
                },
                time_format: {
                  type: "string", 
                  description: "Time format (e.g., 'g:i a', 'H:i')"
                },
                
                // Reading settings
                posts_per_page: {
                  type: "integer",
                  description: "Number of posts to display on blog pages",
                  minimum: 1
                },
                page_for_posts: {
                  type: "integer",
                  description: "Page ID to use as blog posts page"
                },
                page_on_front: {
                  type: "integer",
                  description: "Page ID to use as site front page"
                },
                show_on_front: {
                  type: "string",
                  enum: ["posts", "page"],
                  description: "What to show on the front page (latest posts or static page)"
                },
                blog_public: {
                  type: "boolean",
                  description: "Whether to discourage search engines from indexing the site"
                },
                
                // Discussion settings
                default_comment_status: {
                  type: "string",
                  enum: ["open", "closed"],
                  description: "Default comment status for new posts"
                },
                default_ping_status: {
                  type: "string",
                  enum: ["open", "closed"],
                  description: "Default pingback/trackback status for new posts"
                },
                comment_moderation: {
                  type: "boolean",
                  description: "Whether comments must be manually approved"
                },
                
                // Permalinks settings
                permalink_structure: {
                  type: "string",
                  description: "Permalink structure (e.g., '/%year%/%monthnum%/%postname%/')"
                },
                
                // Media settings
                thumbnail_size_w: {
                  type: "integer",
                  description: "Thumbnail image width in pixels"
                },
                thumbnail_size_h: {
                  type: "integer",
                  description: "Thumbnail image height in pixels"
                },
                medium_size_w: {
                  type: "integer",
                  description: "Medium image width in pixels"
                },
                medium_size_h: {
                  type: "integer",
                  description: "Medium image height in pixels"
                },
                large_size_w: {
                  type: "integer",
                  description: "Large image width in pixels"
                },
                large_size_h: {
                  type: "integer",
                  description: "Large image height in pixels"
                },
                uploads_use_yearmonth_folders: {
                  type: "boolean",
                  description: "Whether to organize uploads into year/month-based folders"
                }
              }
            },
            force: {
              type: "boolean",
              description: "Whether to force update settings that might have validation rules",
              default: false
            }
          },
          required: ["action"]
        }
      }
    };
  }
}

module.exports = SettingsManagerTool;