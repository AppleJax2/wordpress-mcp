# WordPress MCP Server

An MCP (Multi-agent Conversation Protocol) server for WordPress automation and management. This server provides a suite of tools for interacting with WordPress programmatically, including browser automation for visual builders like Divi.

## Features

- **WordPress API Integration**: Connect to WordPress REST API for direct site interaction
- **Browser Automation**: Control WordPress admin UI with Puppeteer for visual builders
- **Theme Customization**: Modify theme settings, including Divi theme
- **GeoDirectory Plugin Support**: Dedicated tools for the GeoDirectory plugin
- **MCP Integration**: Provides JSON Schema metadata for ChatGPT integration
- **Smithery Compatible**: Can be published and installed via Smithery CLI

## Tools

The server provides the following tools:

1. **Site Info Tool**: Get basic information about the WordPress site
2. **Create Page Tool**: Create new pages with support for Divi visual builder
3. **GeoDirectory Tool**: Interact with the GeoDirectory plugin
4. **Theme Customizer Tool**: Customize themes, with special support for Divi

## Requirements

- Node.js 16+
- A WordPress site with admin credentials
- Application Password generated for your WordPress user

## Installation

### Standard Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/wordpress-mcp-server.git
   cd wordpress-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your WordPress credentials:
   ```
   WP_SITE_URL=https://your-wordpress-site.com
   WP_USERNAME=your_username
   WP_APP_PASSWORD=your_app_password
   PORT=3000
   NODE_ENV=development
   HEADLESS=false
   ```

### Installing via Smithery

For a streamlined installation process using Smithery:

1. Install the server globally via Smithery:
   ```bash
   npx @smithery/cli@latest install wordpress-mcp-server
   ```

2. Set up your WordPress credentials:
   ```bash
   npx @smithery/cli@latest config wordpress-mcp-server --set WP_SITE_URL=https://your-wordpress-site.com --set WP_USERNAME=your_username --set WP_APP_PASSWORD=your_app_password
   ```

3. Run the server:
   ```bash
   npx @smithery/cli@latest run wordpress-mcp-server
   ```

## Usage

### Starting the Server

#### Standard Method
```bash
npm start
```

#### Via Smithery
```bash
npx @smithery/cli@latest run wordpress-mcp-server
```

The server will be available at http://localhost:3001 by default.

### Using with Cursor IDE

To use the WordPress MCP Server with Cursor IDE:

1. Create or update your `mcp.json` file in Cursor's config directory:
   ```json
   {
     "mcpServers": {
       "wordpress-mcp": {
         "command": "cmd",
         "args": [
           "/c",
           "npx",
           "-y",
           "@smithery/cli@latest",
           "run",
           "wordpress-mcp-server"
         ]
       }
     }
   }
   ```

2. Restart Cursor IDE to load the new configuration.
3. You should now see WordPress tools available in the Cursor chat interface.

### Using the Tools

You can use the server as an MCP server with systems that support the MCP protocol, or you can directly call the API endpoints:

#### Get Available Tools

```
GET /tools
```

#### Execute a Tool

```
POST /tools/:toolName
```

With a JSON body containing the tool parameters.

### Example API Calls

#### Get Site Info

```bash
curl -X POST http://localhost:3000/tools/wordpress_site_info -H "Content-Type: application/json" -d '{}'
```

#### Create a Page

```bash
curl -X POST http://localhost:3000/tools/wordpress_create_page -H "Content-Type: application/json" -d '{
  "title": "New Page",
  "content": "<h1>Hello World</h1><p>This is a new page created via the WordPress MCP Server.</p>",
  "status": "publish"
}'
```

#### Create a Page with Divi Builder

```bash
curl -X POST http://localhost:3000/tools/wordpress_create_page -H "Content-Type: application/json" -d '{
  "title": "Divi Page",
  "content": "Initial content",
  "useBrowser": true,
  "useDivi": true
}'
```

#### Customize Divi Theme

```bash
curl -X POST http://localhost:3000/tools/wordpress_theme_customizer -H "Content-Type: application/json" -d '{
  "action": "customizeDivi",
  "data": {
    "section": "general",
    "settings": {
      "divi_logo": "https://example.com/logo.png",
      "divi_primary_color": "#FF0000"
    }
  }
}'
```

#### Work with GeoDirectory Plugin

```bash
curl -X POST http://localhost:3000/tools/wordpress_geodirectory -H "Content-Type: application/json" -d '{
  "action": "getListings",
  "data": {
    "perPage": 10,
    "page": 1
  }
}'
```

## Publishing to Smithery

If you've made improvements to this server and want to publish it to Smithery:

1. Update version in `package.json` and `smithery.json`
2. Run the publishing command:
   ```bash
   npm run publish:smithery
   ```

## MCP Integration

To use this server with MCP systems like ChatGPT, you'll need to register the tools using the metadata provided by the `/tools` endpoint.

## License

MIT 