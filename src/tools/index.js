/**
 * WordPress MCP Tools Registry - Focused on WordPress and Divi
 */
const SiteInfoTool = require('./site-info-tool');
const CreatePageTool = require('./create-page-tool');
const ThemeManagerTool = require('./theme-manager-tool');
const AuthManagerTool = require('./auth-manager-tool');
const MediaManagerTool = require('./media-manager-tool');
const ContentManagerTool = require('./content-manager-tool');
const MenuManagerTool = require('./menu-manager-tool');
const DiviBuilderTool = require('./divi-builder-tool');
const WidgetManagerTool = require('./widget-manager-tool');
const ThemeCustomizerTool = require('./theme-customizer-tool');

// Tool classes for lazy initialization
const ToolClasses = {
  SiteInfoTool,
  CreatePageTool,
  ThemeManagerTool,
  AuthManagerTool,
  MediaManagerTool,
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