// Test script to verify that all files can be loaded without syntax errors

try {
  console.log('Testing inspiration-tool.js...');
  const InspirationTool = require('./src/tools/inspiration-tool');
  console.log('✓ Successfully loaded inspiration-tool.js');
  
  console.log('Testing business-plan-tool.js...');
  const BusinessPlanTool = require('./src/tools/business-plan-tool');
  console.log('✓ Successfully loaded business-plan-tool.js');
  
  // Test creating instances
  const inspirationTool = new InspirationTool();
  const businessPlanTool = new BusinessPlanTool();
  
  console.log('✓ Successfully created instances of both tools');
  
  console.log('All tests passed! No syntax errors were found.');
  process.exit(0);
} catch (error) {
  console.error('Error detected:');
  console.error(error);
  process.exit(1);
}