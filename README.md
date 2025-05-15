# TanukiMCP - WordPress Automation Platform

A comprehensive MCP server for WordPress automation. TanukiMCP provides powerful AI-driven tools for creating, managing, and customizing WordPress websites through the Model Context Protocol (MCP), compatible with Cursor, Claude, and other MCP-enabled AI tools.

## What is TanukiMCP?

TanukiMCP is a cloud-based automation platform that enables users to perform complex WordPress tasks through a dedicated web application. It leverages the Model Context Protocol (MCP) and integrates directly with the WordPress REST API to provide a seamless automation experience.

Key benefits:
- No coding knowledge required
- Secure connection to your WordPress sites
- Powerful automation workflows
- Real-time preview of changes
- Multi-site management
- Intuitive visual interface

## TanukiMCP Dashboard Plugin Integration

The TanukiMCP Dashboard Plugin provides a seamless way to integrate TanukiMCP capabilities directly within your WordPress admin dashboard. Here's how to set it up:

### Configuration

1. Install and activate the TanukiMCP Dashboard Plugin in your WordPress site
2. Navigate to the TanukiMCP settings page in your WordPress admin
3. Configure the following settings:
   - **API Endpoint**: Set to `https://wordpress-mcp.onrender.com/api/v1/`
   - **API Key**: Enter the master key `3c9a406341969edf38b3d6d0c8f7685c`

### Available Endpoints

The TanukiMCP server exposes these REST endpoints for the dashboard plugin:

- `POST /api/v1/edit-site` - For sending site editor messages
- `POST /api/v1/execute-workflow` - For executing workflows

### Authentication

All requests from the dashboard plugin must include:
- `Authorization: Bearer 3c9a406341969edf38b3d6d0c8f7685c` header
- `Content-Type: application/json` header

### Response Format

All endpoints return responses in this JSON format:
- Success: `{ "success": true, "data": {...} }`
- Error: `{ "success": false, "message": "Error message" }`

## Features

- WordPress site management tools
- Strategic planning and design tools
- Wireframing and design document creation
- Site architecture planning and visualization
- Page creation and content management
- Theme customization and management
- Media management
- Menu and widget configuration
- User management
- WooCommerce e-commerce support
- SEO optimization tools
- Visual design analysis
- User journey mapping and navigation optimization
- Form creation and analysis
- Content auditing and site polishing

## Getting Started

### Using with Cursor IDE

To connect TanukiMCP to Cursor IDE:

1. Make sure you have Cursor installed (download from [cursor.sh](https://cursor.sh))
2. Create or edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-specific) with:

```json
{
  "mcpServers": {
    "tanuki-wordpress": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@smithery/cli@latest",
        "run",
        "remote",
        "--url",
        "https://wordpress-mcp.onrender.com/sse-cursor",
        "--key",
        "YOUR_API_KEY_HERE"
      ]
    }
  }
}
```

3. Restart Cursor
4. Open Cursor chat and ask it to use the WordPress tools

### Using with Smithery

TanukiMCP is available on Smithery! You can use it directly with:

```
npx @smithery/cli run @tanuki/wordpress-mcp
```

### Self-hosting

You can deploy this MCP server to your own infrastructure:

1. Clone this repository
2. Run `npm install`
3. Set the required environment variables (see below)
4. Run `npm start`

### 1. Prepare Your WordPress Site

Before connecting to WordPress:

### 2. Prepare Your WordPress Site

Before connecting your WordPress site to TanukiMCP:

1. Have an active WordPress site with admin access
2. Generate an Application Password:
   - Log in to your WordPress admin
   - Go to Users → Profile
   - Scroll to "Application Passwords"
   - Enter a name for the application (e.g., "TanukiMCP")
   - Click "Add New Application Password"
   - Copy the generated password for later use

### 3. Connect Your WordPress Site

To connect your WordPress site to TanukiMCP:

1. Log in to your TanukiMCP dashboard
2. Click "Connect WordPress Site"
3. Enter your WordPress site URL
4. Enter your WordPress username and the application password you generated
5. Click "Connect Site"

Once connected, your WordPress site will appear in your dashboard, and you can start creating workflows and using tools.

## Tools Available

### Planning & Strategy
- **Business Plan Tool**: Create business plans and strategies for WordPress sites
- **Wireframe Tool**: Design wireframes for WordPress site layouts
- **Inspiration Tool**: Generate creative ideas and examples for WordPress sites
- **Design Document Tool**: Create comprehensive design documentation for WordPress projects
- **Design Tokens Tool**: Define and manage design tokens for consistent visual styling
- **Full Hierarchy Tool**: Generate and visualize complete site hierarchies and structures
- **Theme Picker Tool**: Compare and select WordPress themes based on requirements
- **Modification Planner**: Plan site changes with thorough before/after documentation
- **Sitemap Tool**: Generate and configure site sitemaps

### Execution Tools
- **Site Info Tool**: Get information about the WordPress site
- **Content Manager**: Manage WordPress content (pages, posts, custom post types)
- **User Manager**: Manage WordPress users and roles
- **Plugin Manager**: Install, activate, and configure plugins
- **Settings Manager**: Configure WordPress site settings
- **Build Site Tool**: Comprehensive tool for building complete WordPress sites
- **Configuration Tool**: Configure WordPress general settings and options
- **Implement Modification Tool**: Apply planned modifications to WordPress sites
- **Theme Customizer**: Customize WordPress themes
- **Theme Manager**: Manage WordPress themes
- **Menu Manager**: Manage WordPress menus
- **Widget Manager**: Manage WordPress widgets
- **Media Manager**: Manage WordPress media library
- **WooCommerce Manager**: Set up and manage WooCommerce stores

### Analysis & Optimization
- **Design Analyzer**: Analyze site design and suggest improvements
- **Content Audit Tool**: Audit site content for quality and consistency
- **Site Polisher**: Apply finishing touches and overall improvements
- **SEO Manager**: Optimize site for search engines
- **User Journey Mapper**: Map and optimize user flows through the site
- **Navigation Optimizer**: Analyze and optimize site navigation
- **Form Analysis Tool**: Create and optimize forms

## Using the Platform

The TanukiMCP platform provides three main ways to automate your WordPress site:

### 1. Ready-to-Use Workflows

Browse and use our pre-built workflows for common tasks:

- Homepage redesign
- E-commerce setup
- Content refresh
- SEO optimization
- Media library cleanup
- And many more

### 2. Custom Workflow Builder

Create your own custom workflows by combining tools in a sequential process:

1. Select your target WordPress site
2. Choose tools from our extensive collection
3. Configure each step with specific parameters
4. Save your workflow for future use
5. Run the workflow and monitor progress in real-time

### 3. Direct Tool Access

Use individual tools directly for specific tasks:

1. Select the tool you need
2. Configure the tool parameters
3. Run the tool and see the results immediately

## Live Preview Feature

Our unique Live Preview feature allows you to see changes as they happen:

- Watch the AI make changes to your site in real-time
- Approve, modify, or reject suggested changes
- Choose from different view modes (visual editor, code view, mobile view)
- Compare before/after states
- Ensure complete control over the automation process

## Troubleshooting

If you encounter issues with TanukiMCP:

1. **Connection Issues**: Verify your WordPress site is accessible and the application password is correct
2. **Workflow Errors**: Check the workflow logs for specific error messages
3. **Tool Compatibility**: Some tools may require specific WordPress plugins or configurations
4. **Browser Compatibility**: Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
5. **Clear Cache**: Try clearing your browser cache if the interface appears broken

## Environment Variables

The TanukiMCP server accepts the following environment variables:

```
# Required Configuration
TANUKIMCP_MASTER_KEY=your_master_api_key

# Optional Server Configuration
PORT=3001 (optional, defaults to 3001)
REQUIRE_API_KEY=true (recommended for production)
HEADLESS=true (optional, for browser automation)
CORS_ALLOW_ORIGIN=* (allows requests from any origin)
CORS_ALLOW_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_ALLOW_HEADERS=Content-Type,Authorization,Accept,Origin,X-Requested-With,X-Api-Key

# OpenAI API Configuration (Required for AI features)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1
OPENAI_ADVANCED_MODEL=gpt-4.1
OPENAI_BASIC_MODEL=gpt-4.1-mini
OPENAI_NANO_MODEL=gpt-4.1-nano
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_CONTEXT_TOKENS=128000

# Analytics Configuration
ANALYTICS_SAVE_INTERVAL_MS=300000
ANALYTICS_DETAILED_LOGGING=false
```

> **Important:** WordPress credentials (site URL, username, app password) are provided per-request by the TanukiMCP Dashboard plugin and should NOT be set as environment variables in production deployments. The server expects these credentials in the request body for each API call.

## Authentication

TanukiMCP uses a simplified authentication model:

1. **Master API Key**: All requests must include the master API key in the Authorization header:
   ```
   Authorization: Bearer 3c9a406341969edf38b3d6d0c8f7685c
   ```

2. **User Identification**: Each request should include the WordPress user ID in the request body:
   ```json
   {
     "user_id": 123,
     "message": "Your request message"
   }
   ```

This approach simplifies authentication while still allowing usage tracking per WordPress user.

## OpenAI API Integration

TanukiMCP integrates with OpenAI's GPT-4.1 models to provide AI-powered WordPress site management. The server supports multiple model tiers:

- **GPT-4.1** (Default): The most capable model for complex WordPress tasks and coding
- **GPT-4.1 Mini**: A faster, more cost-effective model for simpler tasks
- **GPT-4.1 Nano**: The fastest, most economical option for basic tasks

The API integration provides:

1. WordPress expertise with deep knowledge of themes, plugins, and core functionality
2. Automated site editing and content management
3. Workflow automation for common WordPress tasks
4. Token usage tracking and analytics

Users can specify model preferences in their requests with the `model_preference` parameter:
- `advanced`: Uses the GPT-4.1 model
- `basic`: Uses the GPT-4.1-mini model

## API Endpoints

### WordPress Dashboard Plugin Endpoints

- `POST /api/v1/edit-site` - For sending site editor messages
  ```json
  {
    "message": "User message content",
    "target_site_url": "https://example.com",
    "target_site_app_password": "xxxx xxxx xxxx xxxx",
    "user_id": 123,
    "model_preference": "advanced"
  }
  ```

- `POST /api/v1/execute-workflow` - For executing workflows
  ```json
  {
    "workflow": "optimize_images",
    "parameters": {
      "quality": 85,
      "resize": true
    },
    "user_id": 123
  }
  ```

### Analytics Endpoints

- `GET /api/v1/analytics/token-usage?user_id=123&detailed=true` - View token usage statistics
- `GET /api/v1/analytics/monthly-report?month=2023-01` - View monthly token usage report

## Support

For assistance with TanukiMCP:

- **GitHub Issues**: Open an issue on our GitHub repository
- **Email Support**: Contact support@tanukimcp.com

## Pricing

TanukiMCP offers flexible pricing plans to suit different needs. Visit [tanukimcp.com/pricing](https://tanukimcp.com/pricing) for current pricing information.

- **Starter**: For individuals with a single WordPress site
- **Business**: For agencies and businesses with multiple WordPress sites
- **Enterprise**: Custom solutions for large organizations

All plans include access to our core automation tools, with higher tiers offering more workflows, sites, and advanced features. 