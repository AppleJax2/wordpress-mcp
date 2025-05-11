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
- WooCommerce e-commerce support
- GeoDirectory location-based directory integration
- SEO optimization tools
- Visual design analysis
- User journey mapping and navigation optimization
- Form creation and analysis
- Content auditing and site polishing

## MCP Protocol Implementation

This server implements the Machine Conversation Protocol (MCP) with Server-Sent Events (SSE) for streaming responses, following the MCP protocol flow:

1. Client connects to `/sse-cursor` to establish an SSE connection
2. Server responds with an event containing the message endpoint: `/message?sessionId=<UUID>`
3. Client sends JSON-RPC requests to the message endpoint
4. Server responds with a minimal HTTP acknowledgment and sends the actual response via the SSE channel

Supported JSON-RPC methods:
- `initialize` - Initialize the MCP session
- `tools/list` - Get a list of available WordPress tools
- `tools/call` - Call a WordPress tool with parameters
- `notifications/initialized` - Acknowledge client ready state

This implementation is compatible with both the standard MCP protocol and Smithery's remote execution environments.

## Connecting to the Smithery-Hosted Server

This MCP server is hosted remotely at https://wordpress-mcp.onrender.com and available through Smithery.

### Connect via Smithery CLI

To connect to the hosted server using the Smithery CLI:

```bash
npx @smithery/cli connect http --url https://wordpress-mcp.onrender.com/mcp
```

### Connect from Claude Desktop

Add the following configuration to your Claude Desktop settings:

```json
{
  "mcpServers": {
    "wordpress-mcp": {
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

### Connect Using Native MCP Protocol

For clients supporting the native MCP protocol with SSE, use:

```json
{
  "mcpServers": {
    "wordpress-mcp-sse": {
      "command": "npx",
      "args": [
        "@smithery/cli@latest",
        "connect",
        "http",
        "--url",
        "https://wordpress-mcp.onrender.com/sse-cursor"
      ]
    }
  }
}
```

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

## Installation and Setup

### Installing in Claude Desktop

To use our WordPress MCP tools in Claude Desktop:

1. Open Claude Desktop application
2. Go to Settings > Extensions
3. Click "Add Model Context Protocol Server"
4. Enter the following details:
   - Name: WordPress MCP
   - URL: `https://wordpress-mcp.onrender.com/mcp`
5. Click "Save"

Once configured, you can access WordPress automation tools by asking Claude to perform WordPress and Divi tasks.

### Installing in Cursor IDE

To add our WordPress MCP tools to Cursor:

1. Open Cursor IDE
2. Go to Settings > MCP Configuration
3. Add the following to your MCP configuration:

```json
{
  "mcpServers": {
    "wordpress-mcp": {
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

4. Replace `YOUR_API_KEY` with the key provided to you
5. Restart Cursor

Now you can ask the Cursor AI assistant to perform WordPress and Divi automation tasks.

## Direct Connection to Render.com Deployment

If you've deployed this server to Render.com, you can connect directly to it using:

```json
{
  "mcpServers": {
    "wordpress-mcp-render": {
      "command": "npx",
      "args": [
        "@smithery/cli@latest",
        "connect",
        "http",
        "--url",
        "https://wordpress-mcp.onrender.com/sse-cursor"
      ]
    }
  }
}
```

This uses the native MCP protocol implementation with SSE for streaming responses.

## Usage Guide

Our WordPress MCP server provides powerful tools that can be utilized through AI agents in Claude Desktop or Cursor IDE. Simply describe what you want to accomplish with your WordPress site, and the AI will use our tools to perform these actions based on your natural language requests.

## Example User Journeys

Below are example user journeys demonstrating how our WordPress MCP server can automate website development through AI agent interactions.

### 1. Business Website Creation with Divi

**User Goal:** Create a professional business website for a law firm with multiple custom pages and consistent branding.

**Example Interaction:**

```
User: "I need to create a professional website for Johnson & Partners Law Firm. They need a homepage, about page, services page, attorneys page, and contact page. Use a clean, professional design with their brand colors of navy blue (#0A2463) and gold (#E6AF2E)."

AI Agent: "I'll create a complete law firm website for you with those pages. Let me get started by setting up the core structure."

[Agent uses wordpress_site_info to check site status]
[Agent uses wordpress_auth_manager to authenticate]
[Agent uses wordpress_theme_manager to verify Divi is active]
[Agent uses wordpress_content_manager to create initial pages]

AI Agent: "I've created the basic pages. Now I'll build out the homepage with a professional Divi layout."

[Agent uses wordpress_divi_builder to create a homepage layout with:
- Hero section with law firm name and tagline
- Services overview section with icons
- Testimonials slider
- Attorney profiles preview
- Call to action]

AI Agent: "The homepage is complete. Next, I'll design the about page to tell the firm's story."

[Process continues with agent building out each page using Divi layouts]
[Agent uses wordpress_menu_manager to create main navigation menu]
[Agent uses wordpress_theme_customizer to apply brand colors]

AI Agent: "Your law firm website is complete! I've created all five pages with professional Divi layouts, consistent branding using your navy and gold colors, and set up the navigation menu. Here's a screenshot of the homepage."
```

**Value Delivered:** A complete, professional business website built in minutes instead of days, with consistent branding and user experience across all pages.

### 2. E-commerce Store Setup with WooCommerce

**User Goal:** Create an online store selling handmade jewelry with product categories, payment processing, and shipping options.

**Example Interaction:**

```
User: "I need to set up an e-commerce store for my handmade jewelry business. I need to have categories for necklaces, bracelets, earrings, and rings. I want to accept credit cards and PayPal, and offer both standard and express shipping."

AI Agent: "I'll help you set up a complete e-commerce store for your jewelry business. First, I'll make sure WooCommerce is installed and configured."

[Agent uses wordpress_plugin_manager to check for and install WooCommerce]
[Agent uses wordpress_woocommerce_manager to set up basic store settings]

AI Agent: "WooCommerce is now installed and configured. I'll set up your product categories and create a sample product in each category."

[Agent uses wordpress_woocommerce_manager to create product categories]
[Agent uses wordpress_media_manager to upload sample product images]
[Agent uses wordpress_woocommerce_manager to create sample products]

AI Agent: "Your product categories and sample products are set up. Now I'll configure payment methods to accept credit cards and PayPal."

[Agent uses wordpress_woocommerce_manager to configure payment gateways]
[Agent uses wordpress_woocommerce_manager to set up shipping zones and methods]
[Agent uses wordpress_theme_customizer to style the store to match the brand]

AI Agent: "Your e-commerce store is ready! I've set up WooCommerce with your product categories, sample products, payment methods (credit card and PayPal), and shipping options (standard and express). The store is styled to match your brand and is ready for you to add more products."
```

**Value Delivered:** A fully functional e-commerce store with proper category structure, payment processing, and shipping options, ready to start selling products immediately.

### 3. Location-based Business Directory

**User Goal:** Create a city guide website with a directory of local businesses, searchable by category and location.

**Example Interaction:**

```
User: "I want to build a city guide for Portland with a directory of local businesses. Users should be able to search for businesses by category like restaurants, shops, and services, and filter by neighborhood."

AI Agent: "I'll create a Portland city guide with a searchable business directory. Let me first check if GeoDirectory plugin is installed and set it up."

[Agent uses wordpress_plugin_manager to install GeoDirectory]
[Agent uses wordpress_geodirectory_tool to configure initial settings]

AI Agent: "GeoDirectory is now set up. I'll create the main business categories and configure the search functionality."

[Agent uses wordpress_geodirectory_tool to create business categories]
[Agent uses wordpress_geodirectory_tool to set up location search by neighborhood]
[Agent uses wordpress_create_page to create main pages: Home, Directory, Add Listing, etc.]

AI Agent: "The directory structure is in place. Now I'll create a few sample business listings to demonstrate how it works."

[Agent uses wordpress_media_manager to upload sample business images]
[Agent uses wordpress_geodirectory_tool to create sample business listings]
[Agent uses wordpress_divi_builder to design the homepage with directory search]
[Agent uses wordpress_menu_manager to create navigation]

AI Agent: "Your Portland city guide is ready! The site has a homepage with featured businesses, a searchable directory organized by business category, neighborhood filters, and sample listings. Users can submit their own listings, and you can moderate submissions through the admin dashboard."
```

**Value Delivered:** A complete city guide with powerful location-based search and directory functionality, ready for businesses to submit listings or for manual population.

### 4. Content Audit and SEO Optimization

**User Goal:** Analyze an existing WordPress site for content quality issues and optimize it for search engines.

**Example Interaction:**

```
User: "My website's SEO is performing poorly. Can you audit my content and help optimize it for search engines?"

AI Agent: "I'll perform a comprehensive content audit and SEO optimization for your site. First, let me analyze the current content and SEO status."

[Agent uses wordpress_site_info to gather basic site information]
[Agent uses wordpress_content_audit to analyze existing content]
[Agent uses wordpress_seo_manager to check current SEO configuration]

AI Agent: "I've completed the initial analysis. I found several issues: missing meta descriptions on 15 pages, 8 pages with duplicate content, 12 images missing alt tags, and slow loading on the blog archive page. I'll start making improvements."

[Agent uses wordpress_seo_manager to add missing meta descriptions]
[Agent uses wordpress_content_manager to edit pages with duplicate content]
[Agent uses wordpress_media_manager to add alt tags to images]
[Agent uses wordpress_site_polisher to optimize the blog archive page]

AI Agent: "Now I'll analyze your most important keywords and optimize your content around them."

[Agent uses wordpress_seo_manager to perform keyword analysis]
[Agent uses wordpress_content_manager to update content with improved keyword usage]
[Agent uses wordpress_sitemap_tool to create and submit an XML sitemap]

AI Agent: "Your site has been fully optimized for SEO. I've fixed all meta descriptions, resolved duplicate content issues, added alt tags to images, improved page loading speed, optimized your content for target keywords, and submitted your sitemap to search engines. You should see improved search rankings in the coming weeks."
```

**Value Delivered:** A thorough SEO audit and optimization that would typically require an SEO specialist, improving search engine visibility and addressing critical content issues.

### 5. User Journey Mapping and Navigation Optimization

**User Goal:** Improve website conversion rates by optimizing user flow and navigation for a specific conversion goal.

**Example Interaction:**

```
User: "Users aren't making it to my consultation booking page. Can you analyze the user journey and fix the navigation to improve conversion rates?"

AI Agent: "I'll analyze your user journey and optimize the navigation to improve conversions to your consultation booking page. Let me first map the current user journeys."

[Agent uses wordpress_user_journey_mapper to analyze current user flows]
[Agent uses wordpress_authenticated_user_analyzer to check logged-in user behavior]
[Agent uses wordpress_navigation_optimizer to identify navigation bottlenecks]

AI Agent: "I've analyzed the user journeys and found several issues: Users are getting stuck on the services page, the consultation CTA isn't prominent enough, mobile navigation is confusing, and there are too many steps to reach the booking page. I'll implement fixes for these issues."

[Agent uses wordpress_menu_manager to streamline navigation structure]
[Agent uses wordpress_content_manager to add direct CTAs to the services page]
[Agent uses wordpress_theme_customizer to improve mobile navigation]
[Agent uses wordpress_divi_builder to create a more prominent booking button]

AI Agent: "I've optimized your user journey. The main changes include: streamlined navigation with fewer dropdown levels, added direct consultation CTAs on every service description, improved mobile navigation with a sticky booking button, and reduced the steps to booking from 4 to 2. These changes should significantly improve your conversion rate."
```

**Value Delivered:** Professional-level user experience optimization that identifies and removes conversion blockers, potentially increasing business leads and revenue.

### 6. Visual Design Analysis and Enhancement

**User Goal:** Improve the visual consistency and professionalism of an existing website.

**Example Interaction:**

```
User: "My website looks inconsistent and unprofessional. Can you analyze the design and improve it?"

AI Agent: "I'll analyze your website design and make improvements for visual consistency and professionalism. Let me first run a design analysis."

[Agent uses wordpress_design_analyzer to evaluate current design]
[Agent uses wordpress_theme_customizer to check current theme settings]

AI Agent: "I've analyzed your site design and found several issues: inconsistent color usage across pages, too many font styles (5 different fonts), inconsistent button styles, poor spacing on mobile devices, and low-quality images on some pages. I'll systematically address these issues."

[Agent uses wordpress_theme_customizer to create a consistent color palette]
[Agent uses wordpress_theme_customizer to standardize typography to 2 fonts]
[Agent uses wordpress_theme_customizer to create consistent button styles]
[Agent uses wordpress_divi_builder to fix spacing issues across devices]
[Agent uses wordpress_media_manager to replace low-quality images]

AI Agent: "I've completed the design improvements. Your site now has: a consistent color palette applied across all pages, standardized typography with just 2 complementary fonts, uniform button styles throughout the site, proper spacing on all device sizes, and high-quality images. The overall appearance is much more professional and cohesive."
```

**Value Delivered:** Professional design optimization that creates a more credible, trustworthy brand impression for visitors without requiring a full redesign.

### 7. Automated Form Creation and Analysis

**User Goal:** Create effective lead generation forms and optimize their conversion rates.

**Example Interaction:**

```
User: "I need to create lead generation forms for my business services and make sure they convert well."

AI Agent: "I'll help you create high-converting lead generation forms for your business services. First, let me check what form solutions you have available."

[Agent uses wordpress_plugin_manager to check for or install a forms plugin]
[Agent uses wordpress_form_analysis to study best practices for your industry]

AI Agent: "I'll create three optimized forms: a short contact form, a detailed consultation request form, and a newsletter signup form."

[Agent uses wordpress_form_analysis to create the three form types]
[Agent uses wordpress_divi_builder to place forms strategically across the site]
[Agent uses wordpress_content_manager to create dedicated landing pages for each form]

AI Agent: "Now I'll set up tracking to monitor form performance and make improvements."

[Agent uses wordpress_form_analysis to configure conversion tracking]
[Agent uses wordpress_form_analysis to set up A/B testing between two form variants]

AI Agent: "Your lead generation forms are complete and optimized. I've created three different forms, each designed for different stages of the customer journey. The forms are placed strategically across your site, including dedicated landing pages. I've also set up conversion tracking and A/B testing so you can see which form performs better. After a week of data collection, we can further optimize the forms based on the results."
```

**Value Delivered:** Professional lead generation system with strategic form placement, conversion tracking, and continuous improvement through A/B testing, driving more business opportunities.

## Getting Access

To get access to our WordPress MCP tools, visit [github.com/AppleJax2/wordpress-mcp](https://github.com/AppleJax2/wordpress-mcp) or contact us at github@applejax2.dev.

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

## Publishing to Smithery

To publish your WordPress MCP server to Smithery:

1. Install the Smithery CLI: `npm install -g @smithery/cli`
2. Login to Smithery: `npm run login:smithery`
3. Update your server details in `smithery.json` or `smithery.yaml`
4. Publish to Smithery: `npm run publish:smithery`

Your server will be available at `https://wordpress-mcp.smithery.ai/YOUR_USERNAME/wordpress-mcp`

## MCP Protocol Testing

To test the MCP protocol implementation:

1. Start the server: `npm run start`
2. Connect to the SSE endpoint: `curl -N http://localhost:3001/sse-cursor`
3. The server will respond with an event containing the message endpoint
4. Send a JSON-RPC request to the message endpoint:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":"1","method":"initialize"}' http://localhost:3001/message?sessionId=YOUR_SESSION_ID
```

5. You should receive a minimal HTTP acknowledgment and see the actual response in the SSE stream

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