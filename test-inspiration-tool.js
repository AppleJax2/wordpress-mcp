// Test script to verify the inspiration-tool.js file can be imported without syntax errors

try {
  console.log('Attempting to require the inspiration-tool.js file...');
  const InspirationTool = require('./src/tools/inspiration-tool');
  console.log('Successfully loaded inspiration-tool.js without errors!');
  
  // Create an instance to further verify it works
  const tool = new InspirationTool();
  console.log('Successfully created an instance of InspirationTool!');
  
  // Test that the schema can be accessed
  const schema = tool.getSchema();
  console.log('Successfully retrieved the schema!');
  
  console.log('All tests passed!');
} catch (error) {
  console.error('Error loading or using inspiration-tool.js:');
  console.error(error);
  process.exit(1);
} 