# WordPress MCP Server

A specialized remotely hosted Model Context Protocol (MCP) server for WordPress browser automation. This service provides tools for AI agents to create, manage, and customize WordPress websites with a focus on the Divi theme builder.

## What is WordPress MCP Server?

WordPress MCP Server is a cloud-based service that enables AI assistants to perform WordPress tasks through browser automation. It implements the Model Context Protocol (MCP) to allow tools like Claude and Cursor to directly interact with WordPress sites on your behalf.

Key benefits:
- No installation or deployment required
- Secure connection to your WordPress site
- Powerful automation capabilities through AI agents
- Seamless integration with Claude Desktop and Cursor IDE

## Features

- WordPress site management tools
- Divi theme builder integration
- Page creation and content management
- Theme customization and management
- Media management
- Menu and widget configuration
- Authentication and user management
- WooCommerce e-commerce support
- GeoDirectory location-based directory integration
- SEO optimization tools
- Visual design analysis
- User journey mapping and navigation optimization
- Form creation and analysis
- Content auditing and site polishing

## Getting Started

### 1. Prepare Your WordPress Site

Before connecting to our service, you'll need to:

1. Have an active WordPress site with admin access
2. Generate an Application Password:
   - Log in to your WordPress admin
   - Go to Users → Profile
   - Scroll to "Application Passwords"
   - Enter a name for the application (e.g., "WordPress MCP")
   - Click "Add New Application Password"
   - Copy the generated password for later use

### 2. Obtain Access Credentials

Contact our team to receive your API key for accessing the service.

### 3. Connect to Claude Desktop

To use our WordPress automation tools in Claude Desktop:

1. Open Claude Desktop application
2. Go to Settings > Extensions
3. Click "Add Model Context Protocol Server"
4. Enter the following details:
   - Name: WordPress MCP
   - URL: `https://wordpress-mcp.onrender.com/sse-cursor`
   - API Key: Your provided API key
5. Click "Save"

Once configured, you can ask Claude to perform WordPress and Divi tasks.

### 4. Connect to Cursor IDE

To add our WordPress automation tools to Cursor:

1. Open Cursor IDE
2. Go to Settings > MCP Configuration
3. Add the following to your MCP configuration:

```json
{
  "mcpServers": {
    "wordpress-mcp": {
      "url": "https://wordpress-mcp.onrender.com/sse-cursor",
      "apiKey": "YOUR_API_KEY"
    }
  }
}
```

4. Replace `YOUR_API_KEY` with your provided API key
5. Restart Cursor

Now you can ask the Cursor AI assistant to perform WordPress and Divi automation tasks.

## MCP Protocol Implementation

This server implements the Model Context Protocol (MCP) with Server-Sent Events (SSE) for streaming responses, following the MCP protocol flow:

1. Client connects to `/sse-cursor` to establish an SSE connection
2. Server responds with an event containing the message endpoint: `/message?sessionId=<UUID>`
3. Client sends JSON-RPC requests to the message endpoint
4. Server responds with a minimal HTTP acknowledgment and sends the actual response via the SSE channel

Supported JSON-RPC methods:
- `initialize` - Initialize the MCP session
- `tools/list` - Get a list of available WordPress tools
- `tools/call` - Call a WordPress tool with parameters
- `notifications/initialized` - Acknowledge client ready state

This implementation is compatible with standard MCP protocol clients like Claude Desktop and Cursor IDE.

## Tools Available

### WordPress Core
- **wordpress_site_info**: Get information about the WordPress site
- **wordpress_auth_manager**: Handle WordPress authentication
- **wordpress_create_page**: Create pages in WordPress
- **wordpress_content_manager**: Manage WordPress content (pages, posts, custom post types)
- **wordpress_user_manager**: Manage WordPress users and roles
- **wordpress_plugin_manager**: Install, activate, and configure plugins
- **wordpress_settings_manager**: Configure WordPress site settings

### Divi Builder
- **wordpress_divi_builder**: Advanced page building with the Divi framework
- **wordpress_theme_customizer**: Customize WordPress themes
- **wordpress_theme_manager**: Manage WordPress themes

### Site Structure
- **wordpress_menu_manager**: Manage WordPress menus
- **wordpress_widget_manager**: Manage WordPress widgets
- **wordpress_media_manager**: Manage WordPress media library
- **wordpress_navigation_optimizer**: Analyze and optimize site navigation
- **wordpress_sitemap_tool**: Generate and configure site sitemaps

### E-commerce
- **wordpress_woocommerce_manager**: Set up and manage WooCommerce stores

### Location Directory
- **wordpress_geodirectory_tool**: Create and manage location-based directories

### Analysis & Optimization
- **wordpress_design_analyzer**: Analyze site design and suggest improvements
- **wordpress_content_audit**: Audit site content for quality and consistency
- **wordpress_site_polisher**: Apply finishing touches and overall improvements
- **wordpress_seo_manager**: Optimize site for search engines
- **wordpress_user_journey_mapper**: Map and optimize user flows through the site
- **wordpress_authenticated_user_analyzer**: Analyze user behavior patterns
- **wordpress_form_analysis**: Create and optimize forms

## Using the Service

After connecting Claude Desktop or Cursor to our server, you can instruct the AI to interact with your WordPress site using natural language. For example:

- "Create a new about page with three sections"
- "Set up a WooCommerce store with product categories for clothing"
- "Design a professional homepage using Divi with a hero section"
- "Audit my site content and suggest SEO improvements"

The AI will use our specialized WordPress tools to execute these tasks.

## Support

For assistance with the WordPress MCP Server, please contact our support team. 