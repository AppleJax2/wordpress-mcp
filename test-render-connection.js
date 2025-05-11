const fetch = require('node-fetch');

// Replace this with your actual Render URL
const renderUrl = 'https://wordpress-mcp.onrender.com';
// Add your API key here to test authentication
const apiKey = process.env.API_KEY || 'test-api-key';

async function testConnection() {
  try {
    console.log('Testing connection to WordPress MCP server on Render...');
    
    // Test basic server info endpoint
    const response = await fetch(`${renderUrl}/`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const serverInfo = await response.json();
    console.log('✅ Basic connection successful!');
    console.log('Server info:', JSON.stringify(serverInfo, null, 2));
    
    // Test SSE connection with API key
    console.log('\nTesting SSE connection with API key...');
    try {
      const sseResponse = await fetch(`${renderUrl}/sse-cursor`, {
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!sseResponse.ok) {
        throw new Error(`HTTP error ${sseResponse.status}: ${sseResponse.statusText}`);
      }
      
      console.log('✅ SSE connection successful!');
      console.log('The server accepted your API key and established an SSE connection.');
      // We don't need to read the stream here, just checking if connection succeeds
      
      // Close the connection
      sseResponse.body.cancel();
    } catch (sseError) {
      console.error('❌ SSE connection failed:', sseError.message);
      console.log('- Check if your API key is valid');
      console.log('- Verify the server supports SSE connections');
    }
    
    console.log('\nTo connect Cursor to this server:');
    console.log('1. Open Cursor settings (Preferences)');
    console.log('2. Navigate to "MCP Configuration"');
    console.log('3. Add or update the configuration with the content of cursor-mcp-config.json');
    console.log('4. Make sure to replace YOUR_API_KEY with a valid API key');
    console.log('5. Restart Cursor');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\nPossible issues:');
    console.log('- Check if your Render service is running');
    console.log('- Verify the URL in the script matches your Render deployment');
    console.log('- Ensure there are no network restrictions');
  }
}

testConnection(); 