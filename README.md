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

The TanukiMCP server requires the following environment variables:

```
WP_SITE_URL=https://yourwordpresssite.com
WP_USERNAME=your_admin_username
WP_APP_PASSWORD=your_app_password
PORT=3001 (optional, defaults to 3001)
REQUIRE_API_KEY=false (optional, set to true in production)
HEADLESS=true (optional, for browser automation)
```

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