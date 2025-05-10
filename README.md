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

This project is compatible with Smithery deployment. The server implements lazy loading of tool metadata to prevent timeout issues during scanning.

## Connection Management

The server implements connection pooling for both API and browser connections. This helps prevent resource exhaustion and "max client connections" errors.

## Tool Development

To add a new tool, create a new file in the `src/tools` directory following the existing patterns. The tool will be automatically registered.

## License

MIT 