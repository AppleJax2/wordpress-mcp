/**
 * WordPress MCP Tools Registry - Focused on WordPress and Divi
 */
// Conceptual Tools
const SitemapTool = require('./sitemap-tool');
const WireframeTool = require('./wireframe-tool');
const DesignTokensTool = require('./design-tokens-tool');
const DesignDocumentTool = require('./design-document-tool');
const ModificationPlannerTool = require('./modification-planner-tool');
const FullHierarchyTool = require('./full-hierarchy-tool');
const ThemePickerTool = require('./theme-picker-tool'); 
const InspirationTool = require('./inspiration-tool');
const BusinessPlanTool = require('./business-plan-tool');

// Execution Tools
const ImplementModificationTool = require('./implement-modification-tool');
const ConfigurationTool = require('./configuration-tool');
const MediaManagerTool = require('./media-manager-tool');
const BuildSiteTool = require('./build-site-tool');

// Helper Tools
const SiteInfoTool = require('./site-info-tool');
const CreatePageTool = require('./create-page-tool');
const AuthManagerTool = require('./auth-manager-tool');
const ContentManagerTool = require('./content-manager-tool');
const MenuManagerTool = require('./menu-manager-tool');
const DiviBuilderTool = require('./divi-builder-tool');
const WidgetManagerTool = require('./widget-manager-tool');
const ThemeCustomizerTool = require('./theme-customizer-tool');

// Tool classes for lazy initialization
const ToolClasses = {
  // Conceptual Tools
  SitemapTool,
  WireframeTool,
  DesignTokensTool,
  DesignDocumentTool,
  ModificationPlannerTool,
  FullHierarchyTool,
  ThemePickerTool,
  InspirationTool,
  BusinessPlanTool,
  
  // Execution Tools
  ImplementModificationTool,
  ConfigurationTool,
  MediaManagerTool,
  BuildSiteTool,
  
  // Helper Tools
  SiteInfoTool,
  CreatePageTool,
  AuthManagerTool,
  ContentManagerTool, 
  MenuManagerTool,
  DiviBuilderTool,
  WidgetManagerTool,
  ThemeCustomizerTool
};

// Store tool instances
let toolInstances = {};

// Lazily get a tool instance
function getToolInstance(toolClassName) {
  if (!toolInstances[toolClassName]) {
    const ToolClass = ToolClasses[toolClassName];
    if (!ToolClass) {
      throw new Error(`Tool class not found: ${toolClassName}`);
    }
    toolInstances[toolClassName] = new ToolClass();
  }
  return toolInstances[toolClassName];
}

// Get a basic list of tool names and descriptions without full schema
function getBasicToolsMetadata() {
  return [
    {
      type: "function",
      function: {
        name: "wordpress_site_info",
        description: "Get comprehensive information about the WordPress site",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_create_page",
        description: "Create a new page in WordPress",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the new page"
            },
            content: {
              type: "string",
              description: "HTML content of the page"
            },
            status: {
              type: "string",
              description: "Status of the page (draft, publish, etc)"
            }
          },
          required: ["title"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_theme_manager",
        description: "For installing, activating, and managing WordPress themes",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (list, activate, install)"
            },
            theme: {
              type: "string",
              description: "Theme name or ID to act upon"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_auth_manager",
        description: "Manage WordPress authentication and credentials",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (check, login, logout)"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_media_manager",
        description: "Comprehensive tool for managing WordPress media library",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (list, upload, delete)"
            },
            url: {
              type: "string",
              description: "URL of the media to upload"
            },
            id: {
              type: "integer",
              description: "ID of the media item"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_content_manager",
        description: "Comprehensive tool for managing WordPress pages and posts",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (list, get, update, delete)"
            },
            id: {
              type: "integer",
              description: "ID of the content item"
            },
            type: {
              type: "string",
              description: "Type of content (post, page)"
            },
            content: {
              type: "object",
              description: "Content data for create/update operations"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_menu_manager",
        description: "Comprehensive tool for managing WordPress navigation menus",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (list, get, update, create, delete)"
            },
            menu_id: {
              type: "integer",
              description: "ID of the menu to operate on"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_divi_builder",
        description: "Advanced page building with the Divi framework",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform"
            },
            page_id: {
              type: "integer",
              description: "ID of the page to modify"
            },
            content: {
              type: "object",
              description: "Divi content structure to apply"
            }
          },
          required: ["action", "page_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_widget_manager",
        description: "Comprehensive tool for managing WordPress sidebar widgets and widget areas",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (list, get, update)"
            },
            sidebar_id: {
              type: "string",
              description: "ID of the sidebar"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_theme_customizer",
        description: "Customize WordPress themes, with special support for Divi",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform"
            },
            settings: {
              type: "object",
              description: "Customization settings to apply"
            }
          },
          required: ["action"]
        }
      }
    }
  ];
}

// Get full metadata for a specific tool
function getFullToolMetadata(toolName) {
  // Find the tool class that has the matching name
  for (const className of Object.keys(ToolClasses)) {
    const instance = getToolInstance(className);
    if (instance.name === toolName) {
      console.log(`Getting full schema for tool: ${toolName}`);
      
      if (typeof instance.getSchema !== 'function') {
        console.error(`ERROR: Tool '${toolName}' is missing the getSchema() method.`);
        return {
          type: "function",
          function: {
            name: instance.name,
            description: instance.description,
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        };
      }
      
      return instance.getSchema();
    }
  }
  
  console.error(`ERROR: Tool not found: ${toolName}`);
  return null;
}

// Get all tools metadata (used only when explicitly needed)
function getAllToolsMetadata() {
  return Object.keys(ToolClasses).map(className => {
    const instance = getToolInstance(className);
    
    if (typeof instance.getSchema !== 'function') {
      console.error(`ERROR: Tool '${instance.name}' is missing the getSchema() method.`);
      return {
        type: "function",
        function: {
          name: instance.name,
          description: instance.description,
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      };
    }
    
    return instance.getSchema();
  }).filter(Boolean);
}

// Get a tool instance by name
function getToolByName(toolName) {
  for (const className of Object.keys(ToolClasses)) {
    const instance = getToolInstance(className);
    if (instance.name === toolName) {
      return instance;
    }
  }
  return null;
}

// On-demand tool registry for MCP
const wordpressTools = new Proxy({}, {
  get: (target, prop) => {
    // Find and return the tool with matching name
    return getToolByName(prop);
  }
});

// Lazy-loaded tool metadata
const wordpressToolsMetadata = getBasicToolsMetadata();

module.exports = {
  wordpressTools,
  wordpressToolsMetadata,
  getBasicToolsMetadata,
  getFullToolMetadata,
  getAllToolsMetadata,
  getToolByName,
  
  // Individual tool class exports
  ...ToolClasses
}; 