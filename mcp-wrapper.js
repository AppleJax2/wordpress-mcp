/**
 * KumoCart MCP Wrapper
 * 
 * This script provides a simple interface for using KumoCart tools
 * directly from the command line or Node.js scripts.
 * 
 * Usage:
 * - Passing tools directly: node mcp-wrapper.js wordpress_site_info '{"param": "value"}'
 * - Interactive mode: node mcp-wrapper.js
 */

const path = require('path');
const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

// Import tools from the main package
const { wordpressTools, wordpressToolsMetadata } = require(path.join(__dirname, 'src', 'tools', 'index.js'));

// Print header
console.log("\n\x1b[1;36m=== KumoCart CLI Wrapper ===\x1b[0m");
console.log("\x1b[36mExecute WordPress browser automation tools directly\x1b[0m\n");

// If tool name is provided, execute directly and exit
if (process.argv.length >= 3) {
  const toolName = process.argv[2];
  const args = process.argv.length >= 4 ? JSON.parse(process.argv[3]) : {};
  
  console.log(`Executing tool: \x1b[36m${toolName}\x1b[0m with arguments:`, args);
  
  if (!wordpressTools[toolName]) {
    console.error(`\x1b[31mError: Tool '${toolName}' not found\x1b[0m`);
    console.log("Available tools:");
    wordpressToolsMetadata.forEach(tool => {
      console.log(`- \x1b[36m${tool.function.name}\x1b[0m: ${tool.function.description}`);
    });
    process.exit(1);
  }
  
  // Execute the tool
  wordpressTools[toolName].execute(args)
    .then(result => {
      console.log("\x1b[32mResult:\x1b[0m", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      process.exit(1);
    });
} else {
  // Interactive mode
  
  // Get available tools
  console.log("Available tools:", wordpressToolsMetadata.length);
  
  // Display tools as a menu
  wordpressToolsMetadata.forEach((tool, index) => {
    console.log(`${index + 1}. \x1b[36m${tool.function.name}\x1b[0m: ${tool.function.description}`);
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Prompt for tool selection
  rl.question('\nEnter tool number to execute (or q to quit): ', (answer) => {
    if (answer.toLowerCase() === 'q') {
      rl.close();
      return;
    }
    
    const toolIndex = parseInt(answer) - 1;
    
    if (isNaN(toolIndex) || toolIndex < 0 || toolIndex >= wordpressToolsMetadata.length) {
      console.error('\x1b[31mInvalid selection\x1b[0m');
      rl.close();
      return;
    }
    
    const selectedTool = wordpressToolsMetadata[toolIndex].function.name;
    console.log(`\nYou selected: \x1b[36m${selectedTool}\x1b[0m`);
    
    // Prompt for arguments
    rl.question('Enter arguments as JSON (or press enter for empty): ', (argsInput) => {
      let args = {};
      
      if (argsInput.trim()) {
        try {
          args = JSON.parse(argsInput);
        } catch (error) {
          console.error('\x1b[31mError parsing JSON arguments\x1b[0m');
          rl.close();
          return;
        }
      }
      
      console.log(`\nExecuting tool with arguments:`, args);
      
      // Execute the tool
      wordpressTools[selectedTool].execute(args)
        .then(result => {
          console.log("\n\x1b[32mResult:\x1b[0m", JSON.stringify(result, null, 2));
          
          // Ask if user wants to execute another tool
          rl.question('\nDo you want to execute another tool? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              // Restart the process
              rl.close();
              execSync(`node ${__filename}`, { stdio: 'inherit' });
            } else {
              rl.close();
            }
          });
        })
        .catch(error => {
          console.error(`\n\x1b[31mError: ${error.message}\x1b[0m`);
          rl.close();
        });
    });
  });
  
  rl.on('close', () => {
    console.log('\nGoodbye!');
  });
}