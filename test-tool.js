const fetch = require('node-fetch');

async function testTool() {
  try {
    console.log('Testing wordpress_site_info tool on Tanuki MCP server...');
    
    // Step 1: Establish SSE connection
    const sseResponse = await fetch('https://wordpress-mcp.onrender.com/sse-cursor', {
      headers: {
        'Accept': 'text/event-stream'
      }
    });
    
    if (!sseResponse.ok) {
      throw new Error(`HTTP error ${sseResponse.status}: ${sseResponse.statusText}`);
    }
    
    console.log('SSE connection established');
    
    // Create a promise that will be resolved when we get the sessionId
    const sessionIdPromise = new Promise((resolve) => {
      const reader = sseResponse.body;
      reader.on('data', chunk => {
        const text = chunk.toString();
        console.log('SSE Event:', text);
        
        // Parse the endpoint event to get sessionId
        if (text.includes('event: endpoint')) {
          const match = text.match(/data: \/message\?sessionId=([^\n]+)/);
          if (match && match[1]) {
            const sessionId = match[1].trim();
            console.log('Received sessionId:', sessionId);
            resolve(sessionId);
          }
        }
      });
    });
    
    // Wait for the sessionId
    const sessionId = await sessionIdPromise;
    
    // Step 2: Call initialize method
    const initResponse = await fetch(`https://wordpress-mcp.onrender.com/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'initialize',
        params: {
          capabilities: {
            tools: true
          }
        }
      })
    });
    
    const initResult = await initResponse.json();
    console.log('Initialize response:', JSON.stringify(initResult, null, 2));
    
    // Step 3: Call tools/list
    const toolsResponse = await fetch(`https://wordpress-mcp.onrender.com/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '2',
        method: 'tools/list'
      })
    });
    
    const toolsResult = await toolsResponse.json();
    console.log('Tools list response:', JSON.stringify(toolsResult, null, 2));
    
    // Step 4: Call wordpress_site_info tool
    const toolCallResponse = await fetch(`https://wordpress-mcp.onrender.com/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '3',
        method: 'tools/call',
        params: {
          name: 'wordpress_site_info',
          arguments: {}
        }
      })
    });
    
    const toolCallResult = await toolCallResponse.json();
    console.log('Tool call response:', JSON.stringify(toolCallResult, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testTool(); 