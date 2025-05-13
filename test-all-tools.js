// Test script to verify that all tool files can be loaded without syntax errors

try {
  // Get list of all tool files
  const fs = require('fs');
  const path = require('path');
  
  const toolsDir = path.join(__dirname, 'src', 'tools');
  const toolFiles = fs.readdirSync(toolsDir).filter(file => file.endsWith('.js') && file !== 'index.js');
  
  console.log(`Found ${toolFiles.length} tool files to test...`);
  
  // Try to require each file
  for (const file of toolFiles) {
    const filePath = path.join('src', 'tools', file);
    console.log(`Testing ${file}...`);
    const ToolClass = require('./' + filePath);
    console.log(`✓ Successfully loaded ${file}`);
    
    // Try to create an instance if it's a class
    if (typeof ToolClass === 'function') {
      const instance = new ToolClass();
      console.log(`✓ Successfully created instance of ${file}`);
    }
  }
  
  console.log('All tests passed! No syntax errors were found in any tool files.');
  process.exit(0);
} catch (error) {
  console.error('Error detected:');
  console.error(error);
  process.exit(1);
}