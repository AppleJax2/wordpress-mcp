# WordPress MCP Server

MCP server for WordPress automation and management. This server provides a standardized interface for AI assistants to manage WordPress sites through a collection of specialized tools.

## Features

- Standardized interface following the MCP protocol
- WordPress site integration
- Headless browser automation
- Connection pooling to prevent resource exhaustion
- Docker ready for production deployment

## Updates

### Latest Updates

- **Enhanced Smithery compatibility mode**: Implemented ultra-fast tool scanning to prevent timeouts during Smithery deployment. The server now provides immediate responses in Smithery mode to avoid the scanning timeout issue.
- **Lazy loading of tool configurations**: Implemented lazy loading of tool metadata to prevent timeouts during initialization. This makes the server more compatible with Smithery and other deployment platforms.

## Setup

### Environment Variables

Copy `.env.example` to `.env` and update with your WordPress site details:

```
WP_SITE_URL=https://example.com
WP_USERNAME=admin
WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### Running Locally

```bash
npm install
npm start
```

### Docker Deployment

```bash
docker build -t wordpress-mcp-server .
docker run -p 3001:3001 --env-file .env wordpress-mcp-server
```

## Smithery Deployment

This project is designed for compatibility with Smithery deployment. The server implements:

1. **Ultra-fast scanning mode**: When deployed via Smithery, the server provides an immediate minimal set of tools to prevent scan timeouts.
2. **Lazy loading**: Full tool schemas are only loaded when needed, reducing initialization time.
3. **Resource conservation**: Connection pools and browser instances are optimized for Smithery's containerized environment.

To enable Smithery compatibility mode manually, set the environment variable:
```
SMITHERY=true
```

## Connection Management

The server implements connection pooling for both API and browser connections. This helps prevent resource exhaustion and "max client connections" errors.

In Smithery mode, connection limits are automatically reduced to ensure compatibility with the platform's resource constraints.

## Tool Development

To add a new tool, create a new file in the `src/tools` directory following the existing patterns. The tool will be automatically registered.

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