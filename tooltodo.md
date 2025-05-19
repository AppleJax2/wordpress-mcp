# TanukiMCP Server Tools Implementation Todo List (Production Quality)

## 1. New Tools Implementation

- [x] **Workflow Execution Tool (`workflow-execution-tool.js`)**
  - Implement a new tool that executes workflows defined in the WordPress plugin's `class-workflow.php`.
  - **Core Functionality:**
    - Parse workflow JSON with nodes and connections from `TanukiMCP_Workflow::handle_run_workflow_ajax`.
    - Execute each node in the proper sequence based on connection order.
    - Store and pass context between node executions.
    - Handle conditional branching based on node results.
  - **Integration Points:**
    - Must expose an API endpoint that matches `execute_workflow` referenced in `class-mcp-api.php`.
    - Should accept the workflow JSON format from `TanukiMCP_MCP_API::execute_workflow`.
    - Must validate all resources against those available in the master design doc.
  - **Error Handling:**
    - Implement step-by-step transaction-like execution with state checkpoints.
    - Return detailed error information for any failed node.
    - Provide suggestions for fixing workflow issues.
  - **Performance:**
    - Add caching for repeated node patterns.
    - Optimize execution path to minimize API calls to WordPress.
  - **Register in tools/index.js** and follow MCP protocol standards.

- [x] **Visual Preview & Diff Tool (`visual-preview-tool.js`)**
  - Create a tool for generating visual representations of WordPress sites and comparing changes.
  - **Core Functionality:**
    - Generate full-page screenshots at multiple viewport sizes.
    - Implement visual diff comparison between before/after states.
    - Create overlay visualizations for highlighting changes.
    - Support both CORS-enabled iframe previews and browser automation screenshots.
  - **Browser Automation:**
    - Use Puppeteer/Playwright for headless browser control.
    - Implement smart caching of screenshots with TTL.
    - Support viewport emulation for mobile/tablet/desktop.
  - **Diff Implementation:**
    - Pixel-by-pixel comparison with configurable tolerance.
    - Visual heat map for changes (color-coded by significance).
    - Generate JSON report of visual changes with coordinates.
  - **Integration Points:**
    - Interface with `site-info-tool.js` for site access.
    - Connect with `design-document-tool.js` to store screenshots in version history.
  - **Performance:**
    - Implement screenshot compression.
    - Use worker threads for parallel processing of large images.
  - **Register in tools/index.js** and follow MCP protocol standards.

- [x] **Context Manager Tool (`context-manager-tool.js`)**
  - Implement a centralized tool for maintaining context across MCP operations.
  - **Core Functionality:**
    - Track and store the current master design doc state.
    - Provide methods for passing context between tool calls.
    - Implement efficient change detection and merging.
    - Maintain versioned history of context changes.
  - **State Management:**
    - Implement optimistic updates with rollback capability.
    - Support partial context updates to minimize data transfer.
    - Add session-based context caching.
  - **Integration Points:**
    - Must interface with `design-document-tool.js` for document updates.
    - Should connect with all other tools to provide context.
    - Expose methods for tools to update specific context sections.
  - **Change Tracking:**
    - Log all context modifications with timestamps and sources.
    - Implement conflict detection for concurrent modifications.
    - Add "dirty" flags for unsaved context changes.
  - **Performance:**
    - Use JSON-diff for efficient change detection.
    - Implement partial context serialization for large documents.
  - **Register in tools/index.js** and follow MCP protocol standards.

- [x] **Comprehensive Site Analyzer Tool (`site-analyzer-tool.js`)**
  - Create an orchestration tool that coordinates other analysis tools for comprehensive site evaluation.
  - **Core Functionality:**
    - Sequence calls to `sitemap-tool`, `wireframe-tool`, `design-tokens-tool`, `full-hierarchy-tool`, etc.
    - Collate results into a unified analysis document.
    - Generate comprehensive suggestions based on aggregated data.
    - Track analysis progress and support resumable operations.
  - **Orchestration Logic:**
    - Implement dependency graph for analysis operations.
    - Add parallel processing for independent analysis tasks.
    - Include circuit breaker pattern for failed analysis steps.
  - **Data Aggregation:**
    - Standardize data formats across analysis tools.
    - Implement smart deduplication for overlapping data.
    - Add metadata/confidence scores for each insight.
  - **Integration Points:**
    - Must connect with all analysis tools referenced in todolist.md.
    - Should interface with `design-document-tool.js` for storing results.
    - Must respect authentication context from calling plugin.
  - **Performance:**
    - Implement progressive analysis (most important results first).
    - Add caching based on site content hash.
    - Support batch operations to minimize API calls.
  - **Register in tools/index.js** and follow MCP protocol standards.

## 2. Tool Enhancements & Updates

- [x] **Design Document Tool Enhancements (`design-document-tool.js`)**
  - Improve the existing design document tool with advanced features for better integration.
  - **Version Visualization:**
    - Add methods to generate visual diffs between document versions.
    - Implement graphical version timeline representation.
    - Support branching and merging of document versions.
  - **Conflict Resolution:**
    - Enhance the `mergeDocuments` method with smarter 3-way merge.
    - Add interactive conflict resolution suggestions.
    - Implement section-specific merge strategies.
  - **Resource Validation:**
    - Add comprehensive validation against WordPress capabilities.
    - Implement "what-if" validation for proposed changes.
    - Add suggestions for alternative resources when requested ones aren't available.
  - **Integration Enhancements:**
    - Improve coordination with `context-manager-tool.js`.
    - Add hooks for other tools to register as document change listeners.
    - Implement WebSocket support for real-time document updates.
  - **Performance:**
    - Optimize document storage and retrieval with partial loading.
    - Add LRU caching for frequently accessed documents.
    - Implement document compression for large documents.

- [x] **Theme & Plugin Manager Tool Updates**
  - Enhance existing theme and plugin tools for better integration with master design doc.
  - **Theme Manager (`theme-manager-tool.js`):**
    - Add comprehensive theme capability detection.
    - Implement theme screenshot comparison and analysis.
    - Add methods to extract theme color schemes and typography.
    - Enhance theme installation with dependency resolution.
    - Add detailed compatibility scoring against site requirements.
  - **Plugin Manager (`plugin-manager-tool.js`):**
    - Add block detection for Gutenberg-enabled plugins.
    - Implement plugin capability fingerprinting.
    - Add methods to analyze plugin interactions and conflicts.
    - Enhance security scanning for plugin installations.
    - Add performance impact estimation for plugins.
  - **Integration Improvements:**
    - Add bi-directional sync with master design doc inventories.
    - Implement change detection to update design docs when themes/plugins change.
    - Add notification hooks for theme/plugin updates.
  - Theme capability detection, color/typography extraction, and design doc sync are now implemented in production quality in `theme-manager-tool.js` (see new 'analyze' action). (Plugin enhancements can be tackled next as a separate task.)

- [x] **Site Info & Content Audit Tool Enhancements**
  - Update existing tools for more comprehensive site information and content analysis.
  - **Site Info Tool (`site-info-tool.js`):**
    - [x] Add live preview URL generation with authentication handling. (Production-ready: secure, HMAC-signed, time-limited preview URL with context-aware authentication, fully integrated with MCP protocol)
    - Implement site health metrics collection.
    - Add performance benchmark methods.
    - Implement site change detection for incremental updates.
    - Add detailed hosting environment information collection.
  - **Content Audit Tool (`content-audit-tool.js`):**
    - Enhance content inventory with semantic analysis.
    - Add methods to detect content duplication and inconsistencies.
    - Implement image usage and optimization analysis.
    - Add SEO gap analysis functionality.
    - Implement content quality scoring.
  - **Integration Improvements:**
    - Connect with `visual-preview-tool.js` for visual content auditing.
    - Add hooks into `context-manager-tool.js` for site state tracking.
    - Implement efficient content diffing for change detection.

## 3. Integration & API Standardization

- [x] **MCP Tool API Standardization**
  - Ensure all MCP tools follow consistent patterns and standards.
  - **Method Naming Conventions:**
    - Standardize on `camelCase` for all method names.
    - Implement consistent prefix patterns (`get*`, `update*`, `create*`, etc.).
    - Ensure all tools expose the same core methods where applicable.
  - **Parameter Handling:**
    - Implement consistent parameter validation across all tools.
    - Standardize error responses for missing/invalid parameters.
    - Add parameter type coercion where sensible.
  - **Response Formatting:**
    - Ensure all tools use the `createSuccessResponse` and `createErrorResponse` utilities.
    - Standardize success/error payloads across all tools.
    - Implement consistent HTTP status code usage.
  - **Documentation:**
    - Update JSDoc for all tool methods with consistent formatting.
    - Add usage examples for all major tool functions.
    - Implement schema generation for API documentation.

- [x] **Cross-Tool Context Handling**
  - All tools now require and validate a standardized `context` parameter, enforced by a shared schema (site, user, master_doc, etc.).
  - Context validation and sanitization are performed in BaseTool and ContextManagerTool.
  - Context inheritance, debugging, and logging are integrated across the codebase.
  - All context operations are schema-compliant and interoperable between tools.

## 4. Performance & Security Optimization

- [x] **MCP Tool Performance Optimization**
  - Optimize all MCP tools for performance and resource efficiency.
  - **Caching Strategy:**
    - Implement a standardized caching system across all tools. (UnifiedCache utility in src/utils/cache.js)
    - Add TTL configuration based on data volatility.
    - Implement cache invalidation hooks for data changes.
  - **Resource Management:**
    - Add connection pooling for WordPress API calls.
    - Implement request batching for related operations. (Batching/concurrency in connection-manager.js)
    - Add concurrency limits to prevent overloading.
  - **Memory Optimization:**
    - Implement streaming for large data sets. (Helper utilities added)
    - Add pagination for all list operations.
    - Optimize object creation patterns.
  - **Monitoring:**
    - Add performance metrics collection.
    - Implement slow operation logging.
    - [x] Add resource usage tracking.

## 3. Data Model & State Management

- [x] **Master Design Doc Schema**
  - Define a schema that includes: sitemap, wireframe, design tokens, theme/plugins/blocks inventory, page structure, and user/AI notes.
  - Store as a single JSON document per site/user.
  - Always update via MCP tools, never by direct manipulation.

- [x] **Context Passing & Update Logic**
  - Every builder action must pass the current master doc as context to the MCP server.
  - After each change, fetch the updated doc and update local state/UI.
  - **Style:** All context passing and update UIs must use the TanukiMCP palette and notification styles.
  - **Animation:** Use fade/slide-in for context update feedback.

## 5. Stepwise Execution Pattern & Dashboard UX

- [x] **Reusable Stepwise Execution Pattern**
  - Implemented a StepwiseExecutionMixin in `base-tool.js` for tools that perform multi-step tasks.
  - Refactored `build-site-tool.js` to use the mixin for stepwise execution, progress tracking, and context updates.
  - Pattern available for future refactors of other complex tools (e.g., site-analyzer-tool.js).
  - Stepwise tools now emit progress events for integration with the dashboard.

- [x] **Dashboard UX Improvements (for tanukimcp-dashboard)**
  - Tools with stepwise execution now expose step progress and context updates via API/events.
  - Dashboard should visualize step progress (progress bar, current step, errors, etc.).
  - Use fade/slide-in animation for context update feedback, following TanukiMCP palette and notification styles.

---

## Completed Items (for reference)

- [x] **Design Document Tool (`design-document-tool.js`)**
  - Basic implementation for master design document storage and retrieval.
  - Version handling and conflict resolution.
  - WordPress integration via REST endpoints.

---

**Note:**
- All tools must extend the `BaseTool` class defined in `base-tool.js`.
- All tools must be registered in `tools/index.js` following the established pattern.
- Tools must be compatible with the MCP protocol and WordPress API.
- All tools must implement comprehensive error handling and logging.
- Performance and security considerations must be addressed for all implementations.
- Follow existing code style and architecture patterns. 