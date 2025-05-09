/**
 * Connection Optimizer Utility
 * 
 * Analyzes and optimizes connections for Smithery compatibility.
 * Run with: node src/utils/connection-optimizer.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Load environment variables
require('dotenv').config();

// Default values
const DEFAULT_MAX_API_CONNECTIONS = 3;
const DEFAULT_MAX_BROWSER_CONNECTIONS = 1;
const DEFAULT_CONNECTION_TIMEOUT = 10000;
const DEFAULT_CLEANUP_INTERVAL = 120000;

console.log('WordPress MCP Server Connection Optimizer');
console.log('========================================');

// Calculate optimal settings based on system resources
const systemMemory = Math.floor(os.totalmem() / (1024 * 1024 * 1024)); // Memory in GB
const cpuCount = os.cpus().length;

console.log(`\nSystem Resources:`);
console.log(`- Memory: ${systemMemory}GB`);
console.log(`- CPU cores: ${cpuCount}`);

// Calculate optimal API connections
const optimalApiConnections = Math.min(3, Math.max(1, Math.floor(systemMemory / 2)));
// Calculate optimal browser connections
const optimalBrowserConnections = Math.min(1, Math.max(1, Math.floor(systemMemory / 4)));

console.log(`\nRecommended Settings for Smithery:`);
console.log(`- MAX_API_CONNECTIONS: ${optimalApiConnections} (current: ${process.env.MAX_API_CONNECTIONS || DEFAULT_MAX_API_CONNECTIONS})`);
console.log(`- MAX_BROWSER_CONNECTIONS: ${optimalBrowserConnections} (current: ${process.env.MAX_BROWSER_CONNECTIONS || DEFAULT_MAX_BROWSER_CONNECTIONS})`);
console.log(`- CONNECTION_TIMEOUT: ${DEFAULT_CONNECTION_TIMEOUT} (current: ${process.env.CONNECTION_TIMEOUT || DEFAULT_CONNECTION_TIMEOUT})`);
console.log(`- CLEANUP_INTERVAL_MS: ${DEFAULT_CLEANUP_INTERVAL} (current: ${process.env.CLEANUP_INTERVAL_MS || DEFAULT_CLEANUP_INTERVAL})`);

// Check for existing .env file
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('\nFound existing .env file. Use these settings to update it if needed.');
} else {
  console.log('\nNo .env file found. Creating one with optimal settings...');
  
  try {
    // Create or read .env.example
    const envExamplePath = path.join(__dirname, '..', '..', '.env.example');
    let envContent = '';
    
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
    } else {
      envContent = `WP_SITE_URL=https://your-wordpress-site.com
WP_USERNAME=your_username
WP_APP_PASSWORD=your_app_password
PORT=3001
NODE_ENV=production
HEADLESS=true
SLOWMO=0`;
    }
    
    // Add or update connection settings
    if (!envContent.includes('MAX_API_CONNECTIONS')) {
      envContent += `\nMAX_API_CONNECTIONS=${optimalApiConnections}`;
    }
    if (!envContent.includes('MAX_BROWSER_CONNECTIONS')) {
      envContent += `\nMAX_BROWSER_CONNECTIONS=${optimalBrowserConnections}`;
    }
    if (!envContent.includes('CONNECTION_TIMEOUT')) {
      envContent += `\nCONNECTION_TIMEOUT=${DEFAULT_CONNECTION_TIMEOUT}`;
    }
    if (!envContent.includes('CLEANUP_INTERVAL_MS')) {
      envContent += `\nCLEANUP_INTERVAL_MS=${DEFAULT_CLEANUP_INTERVAL}`;
    }
    
    // Write to .env.example
    fs.writeFileSync(envExamplePath, envContent);
    console.log('.env.example updated with optimal connection settings');
  } catch (error) {
    console.error('Error updating .env.example:', error.message);
  }
}

console.log('\nTo publish to Smithery successfully, run:');
console.log('1. npm run login:smithery');
console.log('2. npm run publish:smithery');