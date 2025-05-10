/**
 * WordPress MCP Tools Registry
 */
const SiteInfoTool = require('./site-info-tool');
const CreatePageTool = require('./create-page-tool');
const GeoDirectoryTool = require('./geodirectory-tool');
const ThemeCustomizerTool = require('./theme-customizer-tool');
const ThemeManagerTool = require('./theme-manager-tool');
const AuthManagerTool = require('./auth-manager-tool');
const MediaManagerTool = require('./media-manager-tool');
const ContentManagerTool = require('./content-manager-tool');
const PluginManagerTool = require('./plugin-manager-tool');
const MenuManagerTool = require('./menu-manager-tool');
const WooCommerceManagerTool = require('./woocommerce-manager-tool');
const DiviBuilderTool = require('./divi-builder-tool');
const WidgetManagerTool = require('./widget-manager-tool');
const UserManagerTool = require('./user-manager-tool');
const SEOManagerTool = require('./seo-manager-tool');
const SettingsManagerTool = require('./settings-manager-tool');
const SiteMapperTool = require('./sitemap-tool');
const DesignAnalyzerTool = require('./design-analyzer-tool');
const SitePolisherTool = require('./site-polisher-tool');
const ContentAuditTool = require('./content-audit-tool');
const AuthenticatedUserAnalyzerTool = require('./authenticated-user-analyzer-tool');
const UserJourneyMapperTool = require('./user-journey-mapper-tool');
const FormAnalysisTool = require('./form-analysis-tool');
const NavigationOptimizerTool = require('./navigation-optimizer-tool');

// Tool classes for lazy initialization
const ToolClasses = {
  SiteInfoTool,
  CreatePageTool,
  GeoDirectoryTool,
  ThemeCustomizerTool,
  ThemeManagerTool,
  AuthManagerTool,
  MediaManagerTool,
  ContentManagerTool,
  PluginManagerTool, 
  MenuManagerTool,
  WooCommerceManagerTool,
  DiviBuilderTool,
  WidgetManagerTool,
  UserManagerTool,
  SEOManagerTool,
  SettingsManagerTool,
  SiteMapperTool,
  DesignAnalyzerTool,
  SitePolisherTool,
  ContentAuditTool,
  AuthenticatedUserAnalyzerTool,
  UserJourneyMapperTool,
  FormAnalysisTool,
  NavigationOptimizerTool
};

// Store tool instances
let toolInstances = {};

// Pre-computed minimal tool metadata for ultra-fast Smithery scanning
// This avoids any initialization cost and is extremely lightweight
const smitheryToolsMetadata = Object.keys(ToolClasses).map(className => {
  const instance = new ToolClasses[className]();
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
});

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
  // For Smithery deployment, use the pre-computed list to avoid timeouts
  if (process.env.SMITHERY === 'true') {
    return smitheryToolsMetadata;
  }
  
  return Object.keys(ToolClasses).map(className => {
    const instance = getToolInstance(className);
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
  });
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
  // For Smithery deployment, use the pre-computed list to avoid timeouts
  if (process.env.SMITHERY === 'true') {
    return smitheryToolsMetadata;
  }
  
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
  smitheryToolsMetadata,
  
  // Individual tool class exports
  ...ToolClasses
}; 