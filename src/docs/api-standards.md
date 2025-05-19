# MCP Tool API Standards

This document outlines the standardized patterns and conventions that all MCP tools must follow. Consistent API design ensures better maintainability, interoperability, and developer experience.

## Method Naming Conventions

All method names must use camelCase and follow these standard prefixes:

| Prefix      | Purpose                                  | Example            |
|-------------|------------------------------------------|-------------------|
| `get`       | Retrieve a single resource               | `getUser`         |
| `list`      | Retrieve multiple resources              | `listPages`       |
| `create`    | Create a new resource                    | `createPost`      |
| `update`    | Modify an existing resource              | `updateTheme`     |
| `delete`    | Remove a resource                        | `deleteMedia`     |
| `validate`  | Validate input without making changes    | `validateContent` |
| `analyze`   | Perform analysis on resources            | `analyzeLayout`   |
| `execute`   | Perform an operation                     | `executeWorkflow` |
| `generate`  | Create derived resources                 | `generateImage`   |
| `convert`   | Transform resources                      | `convertFormat`   |

## Parameter Handling

All tools must validate parameters according to the following guidelines:

1. Required parameters must be checked before any operation is performed
2. Parameter types must be validated
3. Enum values must be checked against allowed values
4. Complex parameters must be deep-validated

Example:

```js
const validation = this.validateParams(params);
if (!validation.valid) {
  return createErrorResponse('INVALID_PARAMETERS', validation.message, {
    missing: validation.missing,
    invalid: validation.invalid
  });
}
```

## Response Formatting

All tool responses must use the standardized response format:

### Success Response

```js
{
  success: true,
  data: <result data>,
  message: <success message>,
  timestamp: <ISO timestamp>
}
```

### Error Response

```js
{
  success: false,
  error: {
    code: <error code>,
    message: <error message>,
    details: <additional details>
  },
  timestamp: <ISO timestamp>
}
```

Tools must use the `createSuccessResponse` and `createErrorResponse` utilities from `response-formatter.js`.

## Context Handling

All tools must accept and handle a `context` parameter consistently:

1. Always use `useContext` to ensure the master design doc is available
2. Use `updateContext` to persist changes to the master design doc
3. Pass the context to dependent tool calls
4. Respect the context's authentication and site information

Example:

```js
async _execute(params, context) {
  // Enhance context
  const enhancedContext = await this.useContext(params, context);
  
  // Perform operations
  const result = doSomething();
  
  // Update context if needed
  if (modifiedDoc) {
    await this.updateContext(modifiedDoc, params, enhancedContext);
  }
  
  return this.createSuccessResponse(result);
}
```

## Error Handling

All tools must implement comprehensive error handling:

1. Use try/catch blocks around all asynchronous operations
2. Use the standard error codes from `ERROR_CODES`
3. Include appropriate details in error responses
4. Log errors with stack traces
5. Use the `withErrorHandling` wrapper for method registration

Example:

```js
try {
  // Perform operation
} catch (error) {
  return this.handleError(error, 'methodName');
}
```

## Documentation Standards

All methods must include proper JSDoc documentation:

1. Description of what the method does
2. `@param` for each parameter with types and descriptions
3. `@returns` with return type and description
4. `@throws` if applicable
5. Examples for complex methods

Example:

```js
/**
 * Updates a WordPress page
 * 
 * @param {Object} params - Parameters
 * @param {number} params.id - Page ID
 * @param {string} params.title - New page title
 * @param {string} params.content - New page content
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} - Update result with updated page data
 * @throws {Error} - If page update fails
 */
```

## Tool Implementation Template

All tools should follow this implementation pattern:

```js
const BaseTool = require('./base-tool');

class MyNewTool extends BaseTool {
  constructor() {
    super('my_new_tool', 'Description of what this tool does');
    
    // Register additional methods
    this.registerMethod('customMethod', this.customMethod.bind(this));
  }
  
  async _execute(params, context) {
    // Implement main tool functionality
    return this.createSuccessResponse(result);
  }
  
  async customMethod(params, context) {
    // Implement custom method
    return this.createSuccessResponse(result);
  }
  
  getSchema() {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties: {
            // Define parameters
          },
          required: []
        }
      }
    };
  }
}

module.exports = MyNewTool;
```

## Migration Guide

To update existing tools to follow these standards:

1. Update import statements to include the response formatter utilities
2. Replace direct response objects with `createSuccessResponse` and `createErrorResponse`
3. Rename `execute` method to `_execute` and update signature to include context
4. Add parameter validation using `validateParams`
5. Update error handling with standardized codes
6. Register all methods with `registerMethod`
7. Add JSDoc comments for all methods

## Tool Registration

All tools must be registered in `tools/index.js` following the established pattern:

```js
const MyNewTool = require('./my-new-tool');

// ... other requires ...

const ToolClasses = {
  // ... existing tools ...
  MyNewTool
};
```

---

These standards ensure that all MCP tools work together consistently and provide a predictable API for both developers and the WordPress plugin. Following these patterns will make the codebase more maintainable and easier to extend. 