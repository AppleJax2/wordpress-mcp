const fetch = require('node-fetch');

// Replace this with your actual Render URL
const renderUrl = 'https://wordpress-mcp.onrender.com';

async function testConnection() {
  try {
    console.log('Testing connection to WordPress MCP server on Render...');
    
    // Test basic server info endpoint
    const response = await fetch(`${renderUrl}/`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const serverInfo = await response.json();
    console.log('✅ Connection successful!');
    console.log('Server info:', JSON.stringify(serverInfo, null, 2));
    
    console.log('\nTo connect Cursor to this server:');
    console.log('1. Open Cursor settings (Preferences)');
    console.log('2. Navigate to "MCP Configuration"');
    console.log('3. Add or update the configuration with the content of cursor-mcp-config.json');
    console.log('4. Restart Cursor');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\nPossible issues:');
    console.log('- Check if your Render service is running');
    console.log('- Verify the URL in the script matches your Render deployment');
    console.log('- Ensure there are no network restrictions');
  }
}

testConnection(); 