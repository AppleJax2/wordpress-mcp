# API Key Authentication for WordPress MCP Server

This document outlines how API key authentication will work in our SaaS model for WordPress MCP Server.

## Overview

The WordPress MCP Server uses API keys to authenticate requests from clients, such as Claude Desktop or Cursor IDE. Each API key is associated with a specific user account and subscription plan.

## API Key Format

API keys follow this format:
- Prefix: `wpk_` (WordPress Key)
- 32 character random string
- Example: `wpk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## Implementation Details

### 1. User Registration and API Key Generation

When a user signs up for the KumoCart SaaS service:
1. User creates an account with email and password
2. User selects a subscription plan
3. User is assigned to that plan in the database
4. User can generate API keys from their dashboard

### 2. API Key Storage

- API keys are never stored in plain text
- Only hashed versions of the keys are stored in the database
- The key hash, creation timestamp, and last used timestamp are tracked

### 3. Middleware for API Key Validation

The server includes middleware to validate API keys on protected endpoints:

```javascript
// Example middleware for API key validation
const validateApiKey = async (req, res, next) => {
  // 1. Extract API key from Authorization header
  const apiKey = req.headers.authorization?.split('Bearer ')[1];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Missing API key. Please provide a valid API key in the Authorization header.' 
    });
  }
  
  try {
    // 2. Look up the API key in the database
    const keyData = await lookupApiKey(apiKey);
    
    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key.' });
    }
    
    // 3. Check if user account is active
    if (!keyData.user.isActive) {
      return res.status(403).json({ error: 'User account is inactive.' });
    }
    
    // 4. Check if subscription is valid
    if (!keyData.user.hasValidSubscription) {
      return res.status(403).json({ error: 'Subscription inactive or expired.' });
    }
    
    // 5. Check rate limits
    if (isRateLimited(keyData)) {
      return res.status(429).json({ error: 'Rate limit exceeded.' });
    }
    
    // 6. Attach user and plan info to request
    req.user = keyData.user;
    req.subscriptionPlan = keyData.user.subscriptionPlan;
    
    // 7. Track API usage for billing
    trackApiUsage(keyData.user.id, req.path);
    
    // 8. Update last used timestamp
    updateKeyLastUsed(apiKey);
    
    // Continue to the route handler
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

### 4. API Usage Tracking

Each API call is tracked to:
- Enforce operation limits based on subscription plan
- Provide usage analytics to users
- Enable accurate billing

### 5. Rate Limiting

Rate limiting is applied based on:
- User's subscription plan
- Number of operations within a time window
- Types of operations performed

## Environment Configuration

The server uses these environment variables for API key authentication:

```
# API Authentication
REQUIRE_API_KEY=true                 # Set to false during development
API_KEY_CACHE_TTL=300000             # Cache valid keys for 5 minutes (in ms)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000           # Window for rate limiting (1 minute)
RATE_LIMIT_MAX_REQUESTS=60           # Default max requests per window
```

## Connecting to the Server

### Claude Desktop

```
Name: WordPress MCP
URL: https://wordpress-mcp.onrender.com/sse-cursor
API Key: wpk_your_api_key
```

### Cursor IDE

```json
{
  "mcpServers": {
    "wordpress-mcp": {
      "url": "https://wordpress-mcp.onrender.com/sse-cursor",
      "apiKey": "wpk_your_api_key"
    }
  }
}
```

## Testing API Keys

You can test your API key using the `test-render-connection.js` script:

```
API_KEY=wpk_your_api_key node test-render-connection.js
```

## Integration with KumoCart Website

The API key system is designed to integrate with our KumoCart website, where users can:
1. Sign up and manage their account
2. Choose/update subscription plans 
3. Generate and revoke API keys
4. View usage statistics and billing information
5. Access documentation and support

## Development Mode

During development or for self-hosted instances, API key validation can be disabled by setting `REQUIRE_API_KEY=false` in the environment variables. 