/**
 * Smithery Publishing Helper Script
 * 
 * This script automates the process of publishing the WordPress MCP Server to Smithery.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PACKAGE_NAME = 'wordpress-mcp-server';
const FILES_TO_INCLUDE = [
  'src/**/*',
  'mcp-wrapper.js',
  'package.json',
  'smithery.json',
  'README.md',
  '.env.example'
];

// Create a temporary .env.example if it doesn't exist
if (!fs.existsSync(path.join(__dirname, '.env.example'))) {
  console.log('Creating .env.example file...');
  const envExample = `WP_SITE_URL=https://your-wordpress-site.com
WP_USERNAME=your_username
WP_APP_PASSWORD=your_app_password
PORT=3001
NODE_ENV=production
HEADLESS=true
SLOWMO=0
`;
  fs.writeFileSync(path.join(__dirname, '.env.example'), envExample);
}

// Run the Smithery publish command
console.log(`Publishing ${PACKAGE_NAME} to Smithery...`);

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const includeArgs = FILES_TO_INCLUDE.flatMap(file => ['--include', file]);

// Adjusting the arguments for npx.cmd on Windows
const smitheryArgs = ['@smithery/cli@latest', 'publish', '--client', 'cursor', ...includeArgs];

const publish = spawn(npxCommand, smitheryArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32' // Using shell option for Windows might help
});

publish.on('error', (error) => {
  console.error(`Failed to start subprocess: ${error.message}`);
});

publish.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ Successfully published ${PACKAGE_NAME} to Smithery!`);
    console.log('\nNext steps:');
    console.log(`1. Install globally: npx @smithery/cli@latest install ${PACKAGE_NAME}`);
    console.log(`2. Configure: npx @smithery/cli@latest config ${PACKAGE_NAME} --set WP_SITE_URL=https://your-site.com`);
    console.log(`3. Run: npx @smithery/cli@latest run ${PACKAGE_NAME}`);
  } else {
    console.error(`\n❌ Failed to publish ${PACKAGE_NAME} to Smithery (exit code: ${code})`);
    console.log('\nTroubleshooting:');
    console.log('- Make sure you are logged in to Smithery (npx @smithery/cli@latest login)');
    console.log('- Check that your smithery.json file is correctly configured');
    console.log('- Verify that all required files are included in the FILES_TO_INCLUDE array');
  }
}); 