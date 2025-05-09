# WordPress MCP Server - Cursor IDE Integration Guide

This guide explains how to integrate the WordPress MCP Server with Cursor IDE using Smithery.

## Installation Options

You have two options for integrating with Cursor IDE:

### Option 1: Using Smithery (Recommended)

1. **Install Smithery CLI** (if not already installed):
   ```bash
   npm install -g @smithery/cli
   ```

2. **Login to Smithery** (if not already logged in):
   ```bash
   npx @smithery/cli login
   ```

3. **Install the WordPress MCP Server**:
   ```bash
   npx @smithery/cli install wordpress-mcp-server
   ```

4. **Configure the WordPress MCP Server**:
   ```bash
   npx @smithery/cli config wordpress-mcp-server --set WP_SITE_URL=https://your-site.com --set WP_USERNAME=your_username --set WP_APP_PASSWORD=your_app_password
   ```

5. **Update your Cursor MCP configuration**:
   
   Create or update the file at: `%AppData%\Cursor\mcp.json` with the following content:
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

6. **Restart Cursor IDE** to load the new configuration.

### Option 2: Direct Integration (Manual)

1. **Update your Cursor MCP configuration**:
   
   Create or update the file at: `%AppData%\Cursor\mcp.json` with the following content:
   ```json
   {
     "mcpServers": {
       "wordpress-mcp": {
         "command": "node",
         "args": ["mcp-wrapper.js"],
         "cwd": "C:/path/to/wordpress-mcp-server",
         "environment": {
           "PORT": "3001"
         }
       }
     }
   }
   ```

   Replace `C:/path/to/wordpress-mcp-server` with the absolute path to your WordPress MCP Server installation.

2. **Create a `.env` file** in your WordPress MCP Server directory with your WordPress credentials:
   ```
   WP_SITE_URL=https://your-wordpress-site.com
   WP_USERNAME=your_username
   WP_APP_PASSWORD=your_app_password
   PORT=3001
   NODE_ENV=production
   HEADLESS=true
   SLOWMO=0
   ```

3. **Restart Cursor IDE** to load the new configuration.

## Testing the Integration

1. After restarting Cursor IDE, open the chat interface.
2. Look for the tool icon in the chat interface (hammer icon).
3. When you click on it, you should see WordPress tools listed.
4. Try a simple tool like "Get WordPress Site Info" to verify the connection is working.

## Troubleshooting

If you're having issues with the integration:

1. **Check the WordPress MCP Server is running**:
   - If using Smithery, it should start automatically.
   - If using direct integration, make sure the server is running on port 3001.

2. **Check Cursor logs**:
   - Look for any error messages in the Cursor log files.

3. **Check WordPress credentials**:
   - Verify your WordPress credentials are correct.
   - Make sure your WordPress site is accessible.

4. **Restart Cursor IDE**:
   - Sometimes a simple restart can resolve connection issues.

5. **Check firewall settings**:
   - Ensure your firewall isn't blocking the connection.

## Advanced: Customizing the WordPress MCP Server

If you need to customize the WordPress MCP Server:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wordpress-mcp-server.git
   cd wordpress-mcp-server
   ```

2. Make your changes.

3. Publish to Smithery:
   ```bash
   npm run publish:smithery
   ```

4. Install your customized version:
   ```bash
   npx @smithery/cli install wordpress-mcp-server
   ``` 