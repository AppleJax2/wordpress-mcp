/**
 * WordPress MCP Tools Registry
 */
const SiteInfoTool = require('./site-info-tool');
const CreatePageTool = require('./create-page-tool');
const GeoDirectoryTool = require('./geodirectory-tool');
const ThemeCustomizerTool = require('./theme-customizer-tool');
const AuthManagerTool = require('./auth-manager-tool');
const MediaManagerTool = require('./media-manager-tool');
const ContentManagerTool = require('./content-manager-tool');
const PluginManagerTool = require('./plugin-manager-tool');
const MenuManagerTool = require('./menu-manager-tool');

// Initialize all tools
const siteInfoTool = new SiteInfoTool();
const createPageTool = new CreatePageTool();
const geoDirectoryTool = new GeoDirectoryTool();
const themeCustomizerTool = new ThemeCustomizerTool();
const authManagerTool = new AuthManagerTool();
const mediaManagerTool = new MediaManagerTool();
const contentManagerTool = new ContentManagerTool();
const pluginManagerTool = new PluginManagerTool();
const menuManagerTool = new MenuManagerTool();

// Export tools registry
const wordpressTools = {
  [siteInfoTool.name]: siteInfoTool,
  [createPageTool.name]: createPageTool,
  [geoDirectoryTool.name]: geoDirectoryTool,
  [themeCustomizerTool.name]: themeCustomizerTool,
  [authManagerTool.name]: authManagerTool,
  [mediaManagerTool.name]: mediaManagerTool,
  [contentManagerTool.name]: contentManagerTool,
  [pluginManagerTool.name]: pluginManagerTool,
  [menuManagerTool.name]: menuManagerTool
};

// Export tools metadata for MCP integration
const wordpressToolsMetadata = Object.values(wordpressTools).map(tool => ({
  name: tool.name,
  description: tool.description,
  schema: tool.getSchema()
}));

module.exports = {
  wordpressTools,
  wordpressToolsMetadata,
  
  // Individual tool exports
  SiteInfoTool,
  CreatePageTool,
  GeoDirectoryTool,
  ThemeCustomizerTool,
  AuthManagerTool,
  MediaManagerTool,
  ContentManagerTool,
  PluginManagerTool,
  MenuManagerTool
}; 