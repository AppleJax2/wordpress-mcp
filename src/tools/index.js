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

// Initialize all tools
const siteInfoTool = new SiteInfoTool();
const createPageTool = new CreatePageTool();
const geoDirectoryTool = new GeoDirectoryTool();
const themeCustomizerTool = new ThemeCustomizerTool();
const themeManagerTool = new ThemeManagerTool();
const authManagerTool = new AuthManagerTool();
const mediaManagerTool = new MediaManagerTool();
const contentManagerTool = new ContentManagerTool();
const pluginManagerTool = new PluginManagerTool();
const menuManagerTool = new MenuManagerTool();
const wooCommerceManagerTool = new WooCommerceManagerTool();
const diviBuilderTool = new DiviBuilderTool();
const widgetManagerTool = new WidgetManagerTool();
const userManagerTool = new UserManagerTool();
const seoManagerTool = new SEOManagerTool();
const settingsManagerTool = new SettingsManagerTool();
const siteMapperTool = new SiteMapperTool();
const designAnalyzerTool = new DesignAnalyzerTool();
const sitePolisherTool = new SitePolisherTool();
const contentAuditTool = new ContentAuditTool();
const authenticatedUserAnalyzerTool = new AuthenticatedUserAnalyzerTool();
const userJourneyMapperTool = new UserJourneyMapperTool();
const formAnalysisTool = new FormAnalysisTool();
const navigationOptimizerTool = new NavigationOptimizerTool();

// Export tools registry
const wordpressTools = {
  [siteInfoTool.name]: siteInfoTool,
  [createPageTool.name]: createPageTool,
  [geoDirectoryTool.name]: geoDirectoryTool,
  [themeCustomizerTool.name]: themeCustomizerTool,
  [themeManagerTool.name]: themeManagerTool,
  [authManagerTool.name]: authManagerTool,
  [mediaManagerTool.name]: mediaManagerTool,
  [contentManagerTool.name]: contentManagerTool,
  [pluginManagerTool.name]: pluginManagerTool,
  [menuManagerTool.name]: menuManagerTool,
  [wooCommerceManagerTool.name]: wooCommerceManagerTool,
  [diviBuilderTool.name]: diviBuilderTool,
  [widgetManagerTool.name]: widgetManagerTool,
  [userManagerTool.name]: userManagerTool,
  [seoManagerTool.name]: seoManagerTool,
  [settingsManagerTool.name]: settingsManagerTool,
  [siteMapperTool.name]: siteMapperTool,
  [designAnalyzerTool.name]: designAnalyzerTool,
  [sitePolisherTool.name]: sitePolisherTool,
  [contentAuditTool.name]: contentAuditTool,
  [authenticatedUserAnalyzerTool.name]: authenticatedUserAnalyzerTool,
  [userJourneyMapperTool.name]: userJourneyMapperTool,
  [formAnalysisTool.name]: formAnalysisTool,
  [navigationOptimizerTool.name]: navigationOptimizerTool
};

// Export tools metadata for MCP integration
const wordpressToolsMetadata = Object.values(wordpressTools).map(tool => {
  console.log(`Processing tool: ${tool.name}`);
  if (typeof tool.getSchema !== 'function') {
    console.error(`ERROR: Tool '${tool.name}' is missing the getSchema() method.`);
    return null;
  }
  
  // Get the schema from the tool
  const schema = tool.getSchema();
  
  // Ensure the schema is in the correct format
  if (!schema.type || !schema.function) {
    console.error(`ERROR: Tool '${tool.name}' schema is not in the correct format.`);
  return {
      type: "function",
      function: {
    name: tool.name,
    description: tool.description,
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    };
  }
  
  return schema;
}).filter(Boolean); // Remove any null entries

module.exports = {
  wordpressTools,
  wordpressToolsMetadata,
  
  // Individual tool exports
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