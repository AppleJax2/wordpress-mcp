# WordPress MCP Server

A specialized Model Context Protocol (MCP) server for WordPress browser automation. This project provides tools for AI agents to create, manage, and customize WordPress websites with a focus on the Divi theme builder.

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

## Getting Started

### Prerequisites

- Node.js (v18+)
- A WordPress site with admin credentials
- Application Password generated in WordPress

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wordpress-mcp-server.git
   cd wordpress-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the following variables:
   ```
   WP_SITE_URL=https://your-wordpress-site.com
   WP_USERNAME=your-admin-username
   WP_APP_PASSWORD=your-application-password
   PORT=10000
   LOG_LEVEL=info
   HEADLESS=true
   REQUIRE_API_KEY=false
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Generating a WordPress Application Password

To create an application password for your WordPress site:
1. Log in to your WordPress admin
2. Go to Users → Profile
3. Scroll to "Application Passwords"
4. Enter a name for the application
5. Click "Add New Application Password"
6. Copy the generated password

## API Authentication

By default, the server can run without API authentication during development by setting `REQUIRE_API_KEY=false`. For production deployments, it's recommended to enable API key authentication:

1. Set `REQUIRE_API_KEY=true` in your environment variables
2. Implement a key generation and validation system (see API-AUTHENTICATION.md for details)

## Connecting to Claude Desktop or Cursor IDE

### Claude Desktop

1. Open Claude Desktop application
2. Go to Settings > Extensions
3. Click "Add Model Context Protocol Server"
4. Enter the following details:
   - Name: WordPress MCP
   - URL: `http://localhost:10000/sse-cursor` (or your deployment URL)
   - API Key: Your API key (if enabled)
5. Click "Save"

### Cursor IDE

1. Open Cursor IDE
2. Go to Settings > MCP Configuration
3. Add the following to your MCP configuration:

```json
{
  "mcpServers": {
    "wordpress-mcp": {
      "url": "http://localhost:10000/sse-cursor",
      "apiKey": "YOUR_API_KEY"
    }
  }
}
```

4. Replace `YOUR_API_KEY` with your API key (if enabled)
5. Restart Cursor

## MCP Protocol Testing

For developers who want to test the MCP protocol implementation directly:

1. Connect to the SSE endpoint: `curl -N http://localhost:10000/sse-cursor`
2. The server will respond with an event containing the message endpoint
3. Send a JSON-RPC request to the message endpoint:

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_API_KEY" -d '{"jsonrpc":"2.0","id":"1","method":"initialize"}' http://localhost:10000/message?sessionId=YOUR_SESSION_ID
```

4. You should receive a minimal HTTP acknowledgment and see the actual response in the SSE stream

## Deployment

You can deploy this server using Docker:

```bash
docker build -t wordpress-mcp-server .
docker run -p 10000:10000 --env-file .env wordpress-mcp-server
```

A sample render.yaml file is provided for deployment on Render.com.

## License

MIT License 