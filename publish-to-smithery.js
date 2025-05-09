/**
 * Smithery Publishing Helper Script
 * 
 * This script automates the process of publishing the WordPress MCP Server to Smithery.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PACKAGE_NAME = 'ididi/wordpress-mcp';
const FILES_TO_INCLUDE = [
  'src/**/*',
  'mcp-wrapper.js',
  'package.json',
  'smithery.json',
  'smithery.yaml',
  'README.md',
  '.env.example',
  'Dockerfile'
];

// Use our already created .env.example file
if (!fs.existsSync(path.join(__dirname, '.env.example'))) {
  console.error('Error: .env.example file is missing. Publication may fail.');
} else {
  console.log('.env.example file exists, continuing...');
}

// Run the Smithery publish command
console.log(`Publishing ${PACKAGE_NAME} to Smithery...`);

// Create a basic command without complex options
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const smitheryArgs = [
  '@smithery/cli@latest', 
  'publish',
  '--client', 'cursor'
];

// Use API key
const apiKey = 'edb5b7f0-1d65-4121-895d-98c59cd7a0f8';
smitheryArgs.push('--key', apiKey);
console.log('Using API key from script');

// Simplified spawn call to avoid issues with Windows PowerShell
const publish = spawn(npxCommand, smitheryArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

publish.on('error', (error) => {
  console.error(`Failed to start subprocess: ${error.message}`);
});

publish.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ Successfully published ${PACKAGE_NAME} to Smithery!`);
    console.log('\nNext steps:');
    console.log(`1. Install globally: npx @smithery/cli@latest install ${PACKAGE_NAME} --client cursor`);
    console.log(`2. Configure: npx @smithery/cli@latest config ${PACKAGE_NAME} --set WP_SITE_URL=https://your-site.com`);
    console.log(`3. Run: npx @smithery/cli@latest run ${PACKAGE_NAME}`);
  } else {
    console.error(`\n❌ Failed to publish ${PACKAGE_NAME} to Smithery (exit code: ${code})`);
    console.log('\nTroubleshooting:');
    console.log('- Try publishing directly with: npx @smithery/cli@latest publish --client cursor --key YOUR_API_KEY');
    console.log('- Check that your smithery.json and smithery.yaml files are correctly configured');
    console.log('- Try running with --verbose flag for more detailed error messages');
  }
}); 