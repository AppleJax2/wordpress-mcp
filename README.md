# KumoCart - WordPress Browser Automation

A specialized Model Context Protocol (MCP) server for WordPress browser automation. KumoCart provides tools for AI agents to create, manage, and customize WordPress websites with a focus on the Divi theme builder.

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

KumoCart implements the Model Context Protocol (MCP) with Server-Sent Events (SSE) for streaming responses, following the MCP protocol flow:

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

### 1. Create a KumoCart Account

To use our WordPress automation tools, first create an account:

1. Visit [KumoCart.com](https://kumocart.com) and sign up
2. Choose a subscription plan that fits your needs
3. Complete the registration process

### 2. Configure Your WordPress Site

After creating your account, you'll need to connect your WordPress site:

1. In your KumoCart dashboard, navigate to **WordPress Sites**
2. Click **Add New Site**
3. Enter your WordPress site information:
   - Site Name (for your reference)
   - WordPress Site URL
   - Admin Username
   - Application Password (created in your WordPress admin)

> **Creating a WordPress Application Password:**
> 1. Log in to your WordPress admin
> 2. Go to Users → Profile
> 3. Scroll to "Application Passwords"
> 4. Enter "KumoCart" as the name
> 5. Click "Add New Application Password"
> 6. Copy the generated password

Your credentials are securely stored and encrypted. Our service uses these credentials when executing WordPress operations on your behalf.

### 3. Generate an API Key

Once your WordPress site is configured:

1. In your KumoCart dashboard, go to **API Keys**
2. Click **Generate New Key**
3. Name your key (e.g., "Claude Desktop" or "Cursor IDE")
4. Copy your new API key for use in the next steps

### 4. Connect to Claude Desktop

To use our WordPress automation tools in Claude Desktop:

1. Open Claude Desktop application
2. Go to Settings > Extensions
3. Click "Add Model Context Protocol Server"
4. Enter the following details:
   - Name: KumoCart WordPress MCP
   - URL: `https://wordpress-mcp.onrender.com/sse-cursor`
   - API Key: Your KumoCart API key
5. Click "Save"

Once configured, you can access WordPress automation tools by asking Claude to perform WordPress and Divi tasks.

### 5. Connect to Cursor IDE

To add our WordPress automation tools to Cursor:

1. Open Cursor IDE
2. Go to Settings > MCP Configuration
3. Add the following to your MCP configuration:

```json
{
  "mcpServers": {
    "kumocart-wordpress": {
      "url": "https://wordpress-mcp.onrender.com/sse-cursor",
      "apiKey": "YOUR_API_KEY"
    }
  }
}
```

4. Replace `YOUR_API_KEY` with your KumoCart API key
5. Restart Cursor

Now you can ask the Cursor AI assistant to perform WordPress and Divi automation tasks.

## Managing Multiple WordPress Sites

With KumoCart, you can manage multiple WordPress sites from a single account:

1. Add each site in your KumoCart dashboard
2. When executing tasks, specify which site to use with the `siteId` parameter
3. If not specified, your default site will be used

## API Key Management

Your KumoCart dashboard provides several API key management features:

- **Multiple Keys**: Create separate keys for different tools or team members
- **Usage Tracking**: Monitor operations performed with each key
- **Revocation**: Instantly revoke any key if needed
- **Permissions**: Set site-specific permissions for each key

## Usage Guide

Our WordPress automation services provide powerful tools that can be utilized through AI agents in Claude Desktop or Cursor IDE. Simply describe what you want to accomplish with your WordPress site, and the AI will use our tools to perform these actions based on your natural language requests.

## Example User Journeys

Below are example user journeys demonstrating how KumoCart can automate website development through AI agent interactions.

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

## Getting Support

If you encounter any issues or have questions about our services:

1. Visit the Help Center in your KumoCart dashboard
2. Email our support team at support@kumocart.com
3. Use the live chat support available on our website

## License

Proprietary - KumoCart © 2025

## MCP Protocol Testing

For developers who want to test the MCP protocol implementation directly:

1. Connect to the SSE endpoint: `curl -N https://wordpress-mcp.onrender.com/sse-cursor`
2. The server will respond with an event containing the message endpoint
3. Send a JSON-RPC request to the message endpoint:

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer kc_live_YOUR_API_KEY" -d '{"jsonrpc":"2.0","id":"1","method":"initialize"}' https://wordpress-mcp.onrender.com/message?sessionId=YOUR_SESSION_ID
```

4. You should receive a minimal HTTP acknowledgment and see the actual response in the SSE stream 