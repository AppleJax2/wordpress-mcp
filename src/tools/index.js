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
const UserJourneyMapperTool = require('./user-journey-mapper-tool');
const DesignAnalyzerTool = require('./design-analyzer-tool');
const FormAnalysisTool = require('./form-analysis-tool');
const NavigationOptimizerTool = require('./navigation-optimizer-tool');

// Execution Tools
const ImplementModificationTool = require('./implement-modification-tool');
const ConfigurationTool = require('./configuration-tool');
const MediaManagerTool = require('./media-manager-tool');
const BuildSiteTool = require('./build-site-tool');
const ThemeManagerTool = require('./theme-manager-tool');
const PluginManagerTool = require('./plugin-manager-tool');
const ContentAuditTool = require('./content-audit-tool');
const SitePolisherTool = require('./site-polisher-tool');
const AuthenticatedUserAnalyzerTool = require('./authenticated-user-analyzer-tool');
const WooCommerceManagerTool = require('./woocommerce-manager-tool');
const GeodirectoryTool = require('./geodirectory-tool');
const ContextManagerTool = require('./context-manager-tool');
const VisualPreviewTool = require('./visual-preview-tool');
const SiteAnalyzerTool = require('./site-analyzer-tool');

// Helper Tools
const SiteInfoTool = require('./site-info-tool');
const CreatePageTool = require('./create-page-tool');
const AuthManagerTool = require('./auth-manager-tool');
const ContentManagerTool = require('./content-manager-tool');
const MenuManagerTool = require('./menu-manager-tool');
const DiviBuilderTool = require('./divi-builder-tool');
const WidgetManagerTool = require('./widget-manager-tool');
const ThemeCustomizerTool = require('./theme-customizer-tool');
const UserManagerTool = require('./user-manager-tool');
const SettingsManagerTool = require('./settings-manager-tool');
const SeoManagerTool = require('./seo-manager-tool');

// New Workflow Execution Tool
const WorkflowExecutionTool = require('./workflow-execution-tool');

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
  UserJourneyMapperTool,
  DesignAnalyzerTool,
  FormAnalysisTool,
  NavigationOptimizerTool,
  
  // Execution Tools
  ImplementModificationTool,
  ConfigurationTool,
  MediaManagerTool,
  BuildSiteTool,
  ThemeManagerTool,
  PluginManagerTool,
  ContentAuditTool,
  SitePolisherTool,
  AuthenticatedUserAnalyzerTool,
  WooCommerceManagerTool,
  GeodirectoryTool,
  ContextManagerTool,
  VisualPreviewTool,
  SiteAnalyzerTool,
  
  // Helper Tools
  SiteInfoTool,
  CreatePageTool,
  AuthManagerTool,
  ContentManagerTool, 
  MenuManagerTool,
  DiviBuilderTool,
  WidgetManagerTool,
  ThemeCustomizerTool,
  UserManagerTool,
  SettingsManagerTool,
  SeoManagerTool,
  
  // New Workflow Execution Tool
  WorkflowExecutionTool
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
    },
    {
      type: "function",
      function: {
        name: "wordpress_context_manager",
        description: "Centralized tool for maintaining context across MCP operations",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (getContext, updateContext, mergeContexts, trackChange, createContextCheckpoint, rollbackToCheckpoint, diffContexts, validateContext, clearContextCache)",
              enum: ["getContext", "updateContext", "mergeContexts", "trackChange", "createContextCheckpoint", "rollbackToCheckpoint", "diffContexts", "validateContext", "clearContextCache"]
            },
            section: {
              type: "string",
              description: "Specific context section to act on"
            },
            session_id: {
              type: "string",
              description: "Session ID for context caching"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wordpress_visual_preview",
        description: "Generate visual representations of WordPress sites and compare changes",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action to perform (screenshot, compare, diff, preview)",
              enum: ["screenshot", "compare", "diff", "preview"]
            },
            url: {
              type: "string",
              description: "URL of the WordPress site to capture"
            },
            viewport: {
              type: "string",
              description: "Viewport to use (mobile, tablet, desktop)",
              enum: ["mobile", "tablet", "desktop"]
            },
            fullPage: {
              type: "boolean",
              description: "Whether to capture the full page or just the viewport"
            },
            beforeUrl: {
              type: "string",
              description: "URL of the WordPress site to use as 'before' state for comparison"
            },
            afterUrl: {
              type: "string", 
              description: "URL of the WordPress site to use as 'after' state for comparison"
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
  ...ToolClasses,
  WorkflowExecutionTool
}; 