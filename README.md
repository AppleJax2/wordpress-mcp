# WordPress and Divi Theme Builder MCP Server

A specialized Model Context Protocol (MCP) server for WordPress and Divi theme builder automation. This server provides tools for AI agents to create, manage, and customize WordPress websites with a focus on the Divi theme builder.

## Features

- WordPress site management tools
- Divi theme builder integration
- Page creation and content management
- Theme customization and management
- Media management
- Menu and widget configuration
- Authentication and user management

## Tools Available

### WordPress Core
- **wordpress_site_info**: Get information about the WordPress site
- **wordpress_create_page**: Create pages in WordPress
- **wordpress_auth_manager**: Handle WordPress authentication
- **wordpress_content_manager**: Manage WordPress content

### Divi Builder
- **wordpress_divi_builder**: Advanced page building with the Divi framework
- **wordpress_theme_customizer**: Customize WordPress themes
- **wordpress_theme_manager**: Manage WordPress themes

### Site Structure
- **wordpress_menu_manager**: Manage WordPress menus
- **wordpress_widget_manager**: Manage WordPress widgets
- **wordpress_media_manager**: Manage WordPress media library

## Setup

### Prerequisites
- Node.js 18 or higher
- Access to a WordPress site with the Divi theme installed
- WordPress application password for authentication

### Configuration
Set the following environment variables:

```
WP_SITE_URL=https://your-wordpress-site.com
WP_USERNAME=your-admin-username
WP_APP_PASSWORD=your-app-password
```

### Installation

```bash
# Clone this repository
git clone https://github.com/yourusername/wordpress-mcp.git

# Install dependencies
cd wordpress-mcp
npm install

# Start the server
npm start
```

## Smithery Deployment

This MCP server is designed to be deployed to Smithery.ai. To deploy to Smithery:

1. Fork this repository
2. Connect your repository to Smithery
3. Configure the required WordPress credentials
4. Deploy

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Test
npm test
```

## License

MIT 

## Deployment on Render.com

This server can be deployed on Render.com using the provided `render.yaml` configuration:

1. Fork this repository
2. Sign up for a Render account
3. Connect your GitHub account
4. Create a new Web Service from your forked repository
5. Add the following environment secrets:
   - `WP_SITE_URL` - Your WordPress site URL
   - `WP_USERNAME` - Your WordPress admin username
   - `WP_APP_PASSWORD` - Your WordPress application password

Once deployed, your server will be available at `https://wordpress-mcp.onrender.com` or a similar URL provided by Render.

## Connect Cursor to Remote Server

To connect Cursor to your remote Render-hosted MCP server, update your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "wordpress-mcp-remote": {
      "command": "npx",
      "args": [
        "@smithery/cli@latest",
        "connect",
        "http",
        "--url",
        "https://wordpress-mcp.onrender.com/mcp"
      ]
    }
  }
}
```

Replace `https://wordpress-mcp.onrender.com` with your actual Render.com URL. 