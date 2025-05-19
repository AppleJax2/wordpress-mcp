/**
 * Comprehensive Site Analyzer Tool
 * 
 * Orchestrates multiple analysis tools to provide a unified site analysis.
 * Coordinates calls to sitemap-tool, wireframe-tool, design-tokens-tool,
 * full-hierarchy-tool, etc., collates results, and generates suggestions.
 * 
 * @module tools/site-analyzer-tool
 */

const BaseTool = require('./base-tool');
const logger = require('../utils/logger');
const { createSuccessResponse, createErrorResponse } = require('../utils/response-formatter');
const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

// Import required tools
const SitemapTool = require('./sitemap-tool');
const WireframeTool = require('./wireframe-tool');
const DesignTokensTool = require('./design-tokens-tool');
const FullHierarchyTool = require('./full-hierarchy-tool');
const DesignAnalyzerTool = require('./design-analyzer-tool');
const DesignDocumentTool = require('./design-document-tool');
const ContentAuditTool = require('./content-audit-tool');
const NavigationOptimizerTool = require('./navigation-optimizer-tool');
const FormAnalysisTool = require('./form-analysis-tool');
const SiteInfoTool = require('./site-info-tool');

/**
 * Comprehensive Site Analyzer Tool
 * Orchestrates and coordinates analysis tools for comprehensive site evaluation
 */
class SiteAnalyzerTool extends BaseTool {
  constructor() {
    super(
      'site_analyzer_tool',
      'Orchestrates multiple analysis tools for comprehensive site evaluation'
    );
    
    // Initialize tool instances
    this.sitemapTool = new SitemapTool();
    this.wireframeTool = new WireframeTool();
    this.designTokensTool = new DesignTokensTool();
    this.fullHierarchyTool = new FullHierarchyTool();
    this.designAnalyzerTool = new DesignAnalyzerTool();
    this.contentAuditTool = new ContentAuditTool();
    this.navigationOptimizerTool = new NavigationOptimizerTool();
    this.formAnalysisTool = new FormAnalysisTool();
    this.siteInfoTool = new SiteInfoTool();
    
    // In-memory cache for analysis results
    this._analysisCache = new Map();
    
    // Cache TTL in milliseconds (5 minutes default)
    this._cacheTTL = process.env.ANALYSIS_CACHE_TTL || 5 * 60 * 1000;
    
    // Register API methods
    this.registerMethod('analyze', this.analyzeSite.bind(this));
    this.registerMethod('getAnalysisStatus', this.getAnalysisStatus.bind(this));
    this.registerMethod('getAnalysisResults', this.getAnalysisResults.bind(this));
    this.registerMethod('saveAnalysisToDesignDoc', this.saveAnalysisToDesignDoc.bind(this));
    this.registerMethod('generateSuggestions', this.generateSuggestions.bind(this));
    this.registerMethod('clearAnalysisCache', this.clearAnalysisCache.bind(this));
  }

  /**
   * Main execute method for the tool
   * Delegates to specific registered methods
   * 
   * @param {Object} params - Tool parameters
   * @param {string} params.action - Action to perform
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Method response
   */
  async _execute(params, context) {
    const { action } = params;
    
    if (!action) {
      return createErrorResponse(
        'INVALID_PARAMETERS',
        'Missing required parameter: action',
        { required: ['action'] }
      );
    }
    
    // Delegate to appropriate method
    switch (action) {
      case 'analyze':
        return this.analyzeSite(params, context);
      case 'getAnalysisStatus':
        return this.getAnalysisStatus(params, context);
      case 'getAnalysisResults':
        return this.getAnalysisResults(params, context);
      case 'saveAnalysisToDesignDoc':
        return this.saveAnalysisToDesignDoc(params, context);
      case 'generateSuggestions':
        return this.generateSuggestions(params, context);
      case 'clearAnalysisCache':
        return this.clearAnalysisCache(params, context);
      default:
        return createErrorResponse(
          'UNSUPPORTED_OPERATION',
          `Unsupported action: ${action}`,
          { supported: ['analyze', 'getAnalysisStatus', 'getAnalysisResults', 'saveAnalysisToDesignDoc', 'generateSuggestions', 'clearAnalysisCache'] }
        );
    }
  }

  /**
   * Start a comprehensive site analysis
   * Orchestrates calls to various analysis tools and aggregates results
   * 
   * @param {Object} params - Analysis parameters
   * @param {string} params.site_id - WordPress site identifier
   * @param {string} params.user_id - WordPress user identifier
   * @param {Array<string>} [params.analysis_tools] - Specific tools to run (defaults to all)
   * @param {boolean} [params.run_parallel=false] - Whether to run independent tools in parallel
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Analysis status and ID
   */
  async analyzeSite(params, context) {
    try {
      // Validate required parameters
      if (!params.site_id || !params.user_id) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'Missing required parameters: site_id and user_id are required',
          { required: ['site_id', 'user_id'] }
        );
      }
      
      // Create a unique analysis ID
      const analysisId = params.analysis_id || uuidv4();
      
      // Determine which tools to run
      const toolsToRun = this._determineToolsToRun(params.analysis_tools);
      
      // Build dependency graph for the selected tools
      const dependencyGraph = this._buildDependencyGraph(toolsToRun);
      
      // Create analysis session object
      const analysisSession = {
        id: analysisId,
        site_id: params.site_id,
        user_id: params.user_id,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'running',
        progress: {
          completed: 0,
          total: toolsToRun.length,
          current_tool: null
        },
        tools: toolsToRun,
        dependency_graph: dependencyGraph,
        results: {},
        errors: {},
        suggestions: [],
        run_parallel: Boolean(params.run_parallel)
      };
      
      // Cache the analysis session
      this._cacheAnalysisSession(analysisId, analysisSession);
      
      // Start analysis in background
      this._runAnalysis(analysisId, context)
        .catch(error => {
          logger.error('Error in background analysis execution', { 
            error: error.message,
            analysisId,
            site_id: params.site_id
          });
          
          // Update session with error
          const session = this._getCachedAnalysisSession(analysisId);
          if (session) {
            session.status = 'failed';
            session.error = error.message;
            session.updated_at = new Date().toISOString();
            this._cacheAnalysisSession(analysisId, session);
          }
        });
      
      // Return immediately with analysis ID and status
      return createSuccessResponse({
        analysis_id: analysisId,
        status: 'running',
        progress: analysisSession.progress,
        message: 'Analysis started successfully'
      });
    } catch (error) {
      logger.error('Error starting site analysis', { error: error.message });
      return createErrorResponse(
        'SYSTEM_ERROR',
        `Error starting analysis: ${error.message}`,
        { stack: error.stack }
      );
    }
  }

  /**
   * Run the analysis process in background
   * 
   * @private
   * @param {string} analysisId - Analysis session ID
   * @param {Object} context - Request context
   * @returns {Promise<void>}
   */
  async _runAnalysis(analysisId, context) {
    // Get analysis session
    const session = this._getCachedAnalysisSession(analysisId);
    if (!session) {
      throw new Error(`Analysis session not found: ${analysisId}`);
    }
    
    // Get independent tasks that can run immediately
    const readyTasks = this._getReadyTasks(session.dependency_graph);
    
    // Track which tools have completed
    const completedTools = new Set();
    
    // Run analysis tools according to dependency graph
    if (session.run_parallel) {
      // Run independent tools in parallel
      await this._runToolsInParallel(readyTasks, session, completedTools, context);
    } else {
      // Run tools sequentially
      await this._runToolsSequentially(readyTasks, session, completedTools, context);
    }
    
    // Mark analysis as complete
    session.status = 'completed';
    session.updated_at = new Date().toISOString();
    session.progress.completed = session.tools.length;
    session.progress.current_tool = null;
    
    // Generate suggestions based on completed analysis
    await this._generateSuggestions(session);
    
    // Update session in cache
    this._cacheAnalysisSession(analysisId, session);
  }

  /**
   * Run tools in parallel
   * 
   * @private
   * @param {Array<string>} initialTasks - Initial tasks to run
   * @param {Object} session - Analysis session
   * @param {Set<string>} completedTools - Set of completed tools
   * @param {Object} context - Request context
   * @returns {Promise<void>}
   */
  async _runToolsInParallel(initialTasks, session, completedTools, context) {
    // Create a copy of the dependency graph to work with
    const graph = _.cloneDeep(session.dependency_graph);
    
    // Queue of tasks ready to run
    let readyTasks = [...initialTasks];
    
    // Circuit breaker - maximum number of failed tools before stopping
    const maxFailures = Math.ceil(session.tools.length / 3); // Allow up to 1/3 of tools to fail
    let failureCount = 0;
    
    while (readyTasks.length > 0 && failureCount < maxFailures) {
      // Run current batch of ready tasks in parallel
      const results = await Promise.allSettled(
        readyTasks.map(tool => this._runSingleTool(tool, session, context))
      );
      
      // Process results and update completed tools
      results.forEach((result, index) => {
        const tool = readyTasks[index];
        
        if (result.status === 'fulfilled') {
          // Tool completed successfully
          completedTools.add(tool);
          session.results[tool] = result.value;
          session.progress.completed++;
        } else {
          // Tool failed
          failureCount++;
          session.errors[tool] = result.reason.message;
          completedTools.add(tool); // Consider it "completed" even though it failed
          session.progress.completed++;
        }
      });
      
      // Update session
      session.updated_at = new Date().toISOString();
      this._cacheAnalysisSession(session.id, session);
      
      // Find next batch of ready tasks
      readyTasks = this._getReadyTasks(graph, completedTools);
    }
    
    // Check if analysis was aborted due to too many failures
    if (failureCount >= maxFailures && completedTools.size < session.tools.length) {
      session.status = 'failed';
      session.error = `Analysis aborted after ${failureCount} tool failures exceeded threshold`;
      throw new Error(session.error);
    }
  }

  /**
   * Run tools sequentially
   * 
   * @private
   * @param {Array<string>} initialTasks - Initial tasks to run
   * @param {Object} session - Analysis session
   * @param {Set<string>} completedTools - Set of completed tools
   * @param {Object} context - Request context
   * @returns {Promise<void>}
   */
  async _runToolsSequentially(initialTasks, session, completedTools, context) {
    // Create a copy of the dependency graph to work with
    const graph = _.cloneDeep(session.dependency_graph);
    
    // Queue of tasks ready to run
    let readyTasks = [...initialTasks];
    
    // Circuit breaker - maximum number of failed tools before stopping
    const maxFailures = Math.ceil(session.tools.length / 3); // Allow up to 1/3 of tools to fail
    let failureCount = 0;
    
    while (readyTasks.length > 0 && failureCount < maxFailures) {
      // Take first ready task
      const tool = readyTasks.shift();
      
      try {
        // Run the tool
        session.progress.current_tool = tool;
        session.updated_at = new Date().toISOString();
        this._cacheAnalysisSession(session.id, session);
        
        const result = await this._runSingleTool(tool, session, context);
        
        // Tool completed successfully
        completedTools.add(tool);
        session.results[tool] = result;
        session.progress.completed++;
      } catch (error) {
        // Tool failed
        failureCount++;
        session.errors[tool] = error.message;
        completedTools.add(tool); // Consider it "completed" even though it failed
        session.progress.completed++;
        
        logger.error(`Tool failed during analysis: ${tool}`, {
          error: error.message,
          analysisId: session.id,
          tool
        });
      }
      
      // Update session
      session.updated_at = new Date().toISOString();
      this._cacheAnalysisSession(session.id, session);
      
      // Find next batch of ready tasks
      readyTasks = this._getReadyTasks(graph, completedTools);
    }
    
    // Check if analysis was aborted due to too many failures
    if (failureCount >= maxFailures && completedTools.size < session.tools.length) {
      session.status = 'failed';
      session.error = `Analysis aborted after ${failureCount} tool failures exceeded threshold`;
      throw new Error(session.error);
    }
  }

  /**
   * Run a single analysis tool
   * 
   * @private
   * @param {string} tool - Tool name
   * @param {Object} session - Analysis session
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Tool result
   */
  async _runSingleTool(tool, session, context) {
    // Set timeout for tool execution (5 minutes max)
    const timeout = setTimeout(() => {
      throw new Error(`Tool execution timed out: ${tool}`);
    }, 5 * 60 * 1000);
    
    try {
      let result;
      
      switch (tool) {
        case 'sitemap':
          result = await this.sitemapTool.execute({
            action: 'generate',
            site_id: session.site_id
          }, context);
          break;
          
        case 'wireframe':
          result = await this.wireframeTool.execute({
            action: 'generate',
            site_id: session.site_id
          }, context);
          break;
          
        case 'design_tokens':
          result = await this.designTokensTool.execute({
            action: 'extract',
            site_id: session.site_id
          }, context);
          break;
          
        case 'hierarchy':
          result = await this.fullHierarchyTool.execute({
            action: 'map',
            data: {
              contentTypes: ['all'],
              includeTemplates: true,
              includeBlocks: true
            }
          }, context);
          break;
          
        case 'design':
          result = await this.designAnalyzerTool.execute({
            action: 'analyze',
            site_id: session.site_id
          }, context);
          break;
          
        case 'content':
          result = await this.contentAuditTool.execute({
            action: 'audit',
            site_id: session.site_id
          }, context);
          break;
          
        case 'navigation':
          result = await this.navigationOptimizerTool.execute({
            action: 'analyze',
            site_id: session.site_id
          }, context);
          break;
          
        case 'forms':
          result = await this.formAnalysisTool.execute({
            action: 'analyze',
            site_id: session.site_id
          }, context);
          break;
          
        default:
          throw new Error(`Unknown tool: ${tool}`);
      }
      
      if (!result.success) {
        throw new Error(result.error || `Tool execution failed: ${tool}`);
      }
      
      return result.data || result;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Determine which tools to run based on user selection or defaults
   * 
   * @private
   * @param {Array<string>} selectedTools - User-selected tools
   * @returns {Array<string>} - Tools to run
   */
  _determineToolsToRun(selectedTools) {
    const allTools = [
      'sitemap',
      'wireframe',
      'design_tokens',
      'hierarchy',
      'design',
      'content',
      'navigation',
      'forms'
    ];
    
    // If no tools specified, run all
    if (!selectedTools || !Array.isArray(selectedTools) || selectedTools.length === 0) {
      return allTools;
    }
    
    // Filter selected tools to ensure they're valid
    return selectedTools.filter(tool => allTools.includes(tool));
  }

  /**
   * Build dependency graph for selected tools
   * 
   * @private
   * @param {Array<string>} tools - Tools to include in graph
   * @returns {Object} - Dependency graph
   */
  _buildDependencyGraph(tools) {
    // Define dependencies between tools
    const dependencies = {
      'sitemap': [],
      'wireframe': ['sitemap'],
      'design_tokens': [],
      'hierarchy': ['sitemap'],
      'design': ['design_tokens'],
      'content': ['sitemap', 'hierarchy'],
      'navigation': ['sitemap', 'hierarchy'],
      'forms': ['hierarchy']
    };
    
    // Build graph including only selected tools
    const graph = {};
    
    for (const tool of tools) {
      // Only include dependencies that are also in the selected tools
      graph[tool] = dependencies[tool].filter(dep => tools.includes(dep));
    }
    
    return graph;
  }

  /**
   * Get tasks that are ready to run based on completed dependencies
   * 
   * @private
   * @param {Object} graph - Dependency graph
   * @param {Set<string>} [completedTools] - Set of completed tools
   * @returns {Array<string>} - Ready tasks
   */
  _getReadyTasks(graph, completedTools = new Set()) {
    const readyTasks = [];
    
    // Find tools whose dependencies are all satisfied
    for (const [tool, deps] of Object.entries(graph)) {
      // Skip tools already completed
      if (completedTools.has(tool)) {
        continue;
      }
      
      // Check if all dependencies are completed
      const allDepsCompleted = deps.every(dep => completedTools.has(dep));
      
      if (allDepsCompleted) {
        readyTasks.push(tool);
      }
    }
    
    return readyTasks;
  }

  /**
   * Get tool schema for MCP protocol compatibility
   * 
   * @returns {Object} - Tool schema
   */
  getSchema() {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["analyze", "getAnalysisStatus", "getAnalysisResults", "saveAnalysisToDesignDoc", "generateSuggestions", "clearAnalysisCache"],
              description: "Action to perform with the site analyzer tool"
            },
            site_id: {
              type: "string",
              description: "WordPress site identifier"
            },
            user_id: {
              type: "string",
              description: "WordPress user identifier"
            },
            analysis_id: {
              type: "string",
              description: "Identifier for a specific analysis session"
            },
            analysis_tools: {
              type: "array",
              items: {
                type: "string",
                enum: ["sitemap", "wireframe", "design_tokens", "hierarchy", "content", "navigation", "forms", "design"]
              },
              description: "Specific analysis tools to run (defaults to all if not specified)"
            },
            run_parallel: {
              type: "boolean",
              description: "Whether to run independent analysis tools in parallel"
            },
            analysis_data: {
              type: "object",
              description: "Analysis data to save to the design document"
            },
            design_doc_section: {
              type: "string",
              description: "Section of the design document to update with analysis results"
            }
          },
          required: ["action"]
        }
      }
    };
  }

  /**
   * Get status of an analysis session
   * 
   * @param {Object} params - Method parameters
   * @param {string} params.analysis_id - Analysis session ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Analysis status
   */
  async getAnalysisStatus(params, context) {
    try {
      // Validate required parameters
      if (!params.analysis_id) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'Missing required parameter: analysis_id',
          { required: ['analysis_id'] }
        );
      }
      
      // Get analysis session from cache
      const session = this._getCachedAnalysisSession(params.analysis_id);
      
      if (!session) {
        return createErrorResponse(
          'NOT_FOUND',
          `Analysis session not found: ${params.analysis_id}`,
          { analysis_id: params.analysis_id }
        );
      }
      
      return createSuccessResponse({
        analysis_id: session.id,
        status: session.status,
        progress: session.progress,
        started_at: session.started_at,
        updated_at: session.updated_at,
        tools: session.tools,
        error: session.error,
        completed_tools: Object.keys(session.results)
      });
    } catch (error) {
      logger.error('Error getting analysis status', { 
        error: error.message,
        analysis_id: params.analysis_id
      });
      
      return createErrorResponse(
        'SYSTEM_ERROR',
        `Error getting analysis status: ${error.message}`,
        { stack: error.stack }
      );
    }
  }

  /**
   * Get results of an analysis session
   * 
   * @param {Object} params - Method parameters
   * @param {string} params.analysis_id - Analysis session ID
   * @param {string} [params.tool] - Specific tool results to retrieve
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Analysis results
   */
  async getAnalysisResults(params, context) {
    try {
      // Validate required parameters
      if (!params.analysis_id) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'Missing required parameter: analysis_id',
          { required: ['analysis_id'] }
        );
      }
      
      // Get analysis session from cache
      const session = this._getCachedAnalysisSession(params.analysis_id);
      
      if (!session) {
        return createErrorResponse(
          'NOT_FOUND',
          `Analysis session not found: ${params.analysis_id}`,
          { analysis_id: params.analysis_id }
        );
      }
      
      // Check if analysis is still running
      if (session.status === 'running') {
        return createErrorResponse(
          'ANALYSIS_IN_PROGRESS',
          'Analysis is still in progress',
          { 
            analysis_id: session.id,
            progress: session.progress,
            completed_tools: Object.keys(session.results)
          }
        );
      }
      
      // Return specific tool results if requested
      if (params.tool) {
        if (!session.results[params.tool]) {
          return createErrorResponse(
            'TOOL_RESULT_NOT_FOUND',
            `Results for tool ${params.tool} not found`,
            { 
              analysis_id: session.id,
              available_tools: Object.keys(session.results)
            }
          );
        }
        
        return createSuccessResponse({
          analysis_id: session.id,
          tool: params.tool,
          result: session.results[params.tool]
        });
      }
      
      // Return all results
      return createSuccessResponse({
        analysis_id: session.id,
        status: session.status,
        results: session.results,
        errors: session.errors,
        suggestions: session.suggestions
      });
    } catch (error) {
      logger.error('Error getting analysis results', { 
        error: error.message,
        analysis_id: params.analysis_id
      });
      
      return createErrorResponse(
        'SYSTEM_ERROR',
        `Error getting analysis results: ${error.message}`,
        { stack: error.stack }
      );
    }
  }

  /**
   * Save analysis results to design document
   * 
   * @param {Object} params - Method parameters
   * @param {string} params.analysis_id - Analysis session ID
   * @param {string} params.user_id - WordPress user ID
   * @param {string} params.site_id - WordPress site ID
   * @param {string} [params.design_doc_section='site_analysis'] - Design document section to update
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Save result
   */
  async saveAnalysisToDesignDoc(params, context) {
    try {
      // Validate required parameters
      if (!params.analysis_id || !params.user_id || !params.site_id) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'Missing required parameters: analysis_id, user_id, and site_id are required',
          { required: ['analysis_id', 'user_id', 'site_id'] }
        );
      }
      
      // Get analysis session from cache
      const session = this._getCachedAnalysisSession(params.analysis_id);
      
      if (!session) {
        return createErrorResponse(
          'NOT_FOUND',
          `Analysis session not found: ${params.analysis_id}`,
          { analysis_id: params.analysis_id }
        );
      }
      
      // Check if analysis is complete
      if (session.status !== 'completed') {
        return createErrorResponse(
          'ANALYSIS_NOT_COMPLETE',
          `Analysis is not complete: ${session.status}`,
          { 
            analysis_id: session.id,
            status: session.status
          }
        );
      }
      
      // Create analysis data object
      const analysisData = {
        id: session.id,
        timestamp: new Date().toISOString(),
        tools: session.tools,
        results: session.results,
        suggestions: session.suggestions
      };
      
      // Determine section to update
      const section = params.design_doc_section || 'site_analysis';
      
      // Get current design document
      const docResponse = await DesignDocumentTool.getDesignDoc({
        user_id: params.user_id,
        site_id: params.site_id
      }, context);
      
      if (!docResponse.success) {
        return createErrorResponse(
          'DESIGN_DOC_ERROR',
          'Error retrieving design document',
          { original_error: docResponse.error }
        );
      }
      
      // Update doc with analysis data
      const doc = docResponse.data;
      
      // Initialize section if it doesn't exist
      if (!doc[section]) {
        doc[section] = [];
      }
      
      // Add new analysis or update existing
      if (Array.isArray(doc[section])) {
        // Array of analyses - add new one
        doc[section].push(analysisData);
        
        // Limit to last 5 analyses
        if (doc[section].length > 5) {
          doc[section] = doc[section].slice(-5);
        }
      } else {
        // Object - replace with new analysis
        doc[section] = analysisData;
      }
      
      // Save updated document
      const saveResponse = await DesignDocumentTool.updateDesignDoc({
        user_id: params.user_id,
        site_id: params.site_id,
        doc_data: doc,
        create_version: true,
        version_label: 'Site analysis update',
        version_notes: `Updated with new site analysis (${session.id})`
      }, context);
      
      if (!saveResponse.success) {
        return createErrorResponse(
          'DESIGN_DOC_UPDATE_ERROR',
          'Error updating design document with analysis results',
          { original_error: saveResponse.error }
        );
      }
      
      return createSuccessResponse({
        message: 'Analysis results saved to design document successfully',
        design_doc_section: section,
        analysis_id: session.id
      });
    } catch (error) {
      logger.error('Error saving analysis to design document', { 
        error: error.message,
        analysis_id: params.analysis_id
      });
      
      return createErrorResponse(
        'SYSTEM_ERROR',
        `Error saving analysis to design document: ${error.message}`,
        { stack: error.stack }
      );
    }
  }

  /**
   * Generate comprehensive suggestions based on analysis results
   * 
   * @param {Object} params - Method parameters
   * @param {string} params.analysis_id - Analysis session ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Generated suggestions
   */
  async generateSuggestions(params, context) {
    try {
      // Validate required parameters
      if (!params.analysis_id) {
        return createErrorResponse(
          'INVALID_PARAMETERS',
          'Missing required parameter: analysis_id',
          { required: ['analysis_id'] }
        );
      }
      
      // Get analysis session from cache
      const session = this._getCachedAnalysisSession(params.analysis_id);
      
      if (!session) {
        return createErrorResponse(
          'NOT_FOUND',
          `Analysis session not found: ${params.analysis_id}`,
          { analysis_id: params.analysis_id }
        );
      }
      
      // Generate suggestions either from scratch or refresh existing ones
      await this._generateSuggestions(session);
      
      // Update session in cache
      this._cacheAnalysisSession(session.id, session);
      
      return createSuccessResponse({
        analysis_id: session.id,
        suggestions: session.suggestions
      });
    } catch (error) {
      logger.error('Error generating suggestions', { 
        error: error.message,
        analysis_id: params.analysis_id
      });
      
      return createErrorResponse(
        'SYSTEM_ERROR',
        `Error generating suggestions: ${error.message}`,
        { stack: error.stack }
      );
    }
  }

  /**
   * Generate suggestions from analysis results
   * 
   * @private
   * @param {Object} session - Analysis session
   * @returns {Promise<void>}
   */
  async _generateSuggestions(session) {
    // Skip if there aren't enough results
    if (Object.keys(session.results).length < 2) {
      session.suggestions = [{
        type: 'info',
        message: 'Not enough analysis data to generate comprehensive suggestions',
        confidence: 'low'
      }];
      return;
    }
    
    const suggestions = [];
    
    // Process sitemap results
    if (session.results.sitemap) {
      const sitemap = session.results.sitemap;
      
      // Check for deep navigation
      if (sitemap.maxDepth > 3) {
        suggestions.push({
          type: 'navigation',
          category: 'structure',
          message: 'Site navigation is too deep and may confuse users',
          details: `Navigation depth of ${sitemap.maxDepth} levels detected. Consider flattening to 3 or fewer levels.`,
          confidence: 'high',
          impact: 'medium',
          related_tools: ['sitemap', 'navigation']
        });
      }
      
      // Check for orphaned pages
      if (sitemap.orphanedPages && sitemap.orphanedPages.length > 0) {
        suggestions.push({
          type: 'navigation',
          category: 'structure',
          message: 'Orphaned pages detected with no navigation links',
          details: `${sitemap.orphanedPages.length} pages have no incoming links. Consider adding navigation paths.`,
          confidence: 'high',
          impact: 'medium',
          related_tools: ['sitemap', 'navigation']
        });
      }
    }
    
    // Process design tokens results
    if (session.results.design_tokens) {
      const tokens = session.results.design_tokens;
      
      // Check for color consistency
      if (tokens.colors && tokens.colors.length > 12) {
        suggestions.push({
          type: 'design',
          category: 'consistency',
          message: 'Too many different colors used throughout the site',
          details: `${tokens.colors.length} distinct colors detected. Consider consolidating to a more consistent color palette.`,
          confidence: 'medium',
          impact: 'medium',
          related_tools: ['design_tokens', 'design']
        });
      }
      
      // Check for typography consistency
      if (tokens.typography && tokens.typography.fonts && tokens.typography.fonts.length > 3) {
        suggestions.push({
          type: 'design',
          category: 'consistency',
          message: 'Too many different fonts used throughout the site',
          details: `${tokens.typography.fonts.length} different fonts detected. Consider using 2-3 fonts maximum.`,
          confidence: 'medium',
          impact: 'medium',
          related_tools: ['design_tokens', 'design']
        });
      }
    }
    
    // Process content audit results
    if (session.results.content) {
      const content = session.results.content;
      
      // Check for content quality issues
      if (content.qualityIssues && content.qualityIssues.length > 0) {
        suggestions.push({
          type: 'content',
          category: 'quality',
          message: 'Content quality issues detected on multiple pages',
          details: `${content.qualityIssues.length} content quality issues found including ${content.qualityIssues.map(i => i.type).join(', ')}.`,
          confidence: 'medium',
          impact: 'high',
          related_tools: ['content']
        });
      }
      
      // Check for SEO issues
      if (content.seoIssues && content.seoIssues.length > 0) {
        suggestions.push({
          type: 'content',
          category: 'seo',
          message: 'SEO issues detected on multiple pages',
          details: `${content.seoIssues.length} SEO issues found including ${content.seoIssues.map(i => i.type).join(', ')}.`,
          confidence: 'high',
          impact: 'high',
          related_tools: ['content']
        });
      }
    }
    
    // Process form analysis results
    if (session.results.forms) {
      const forms = session.results.forms;
      
      // Check for accessibility issues
      if (forms.accessibilityIssues && forms.accessibilityIssues.length > 0) {
        suggestions.push({
          type: 'forms',
          category: 'accessibility',
          message: 'Form accessibility issues detected',
          details: `${forms.accessibilityIssues.length} form accessibility issues found including ${forms.accessibilityIssues.map(i => i.type).join(', ')}.`,
          confidence: 'high',
          impact: 'high',
          related_tools: ['forms']
        });
      }
    }
    
    // Cross-tool suggestions
    
    // Check for navigation and content alignment
    if (session.results.navigation && session.results.content) {
      const navigation = session.results.navigation;
      const content = session.results.content;
      
      if (navigation.structure && content.structure) {
        const navCategories = new Set(navigation.structure.map(item => item.category).filter(Boolean));
        const contentCategories = new Set(content.structure.map(item => item.category).filter(Boolean));
        
        const misalignment = [...navCategories].filter(cat => !contentCategories.has(cat)).concat(
          [...contentCategories].filter(cat => !navCategories.has(cat))
        );
        
        if (misalignment.length > 0) {
          suggestions.push({
            type: 'structure',
            category: 'alignment',
            message: 'Navigation structure and content categorization are misaligned',
            details: `${misalignment.length} categories don't align between navigation and content. Consider reorganizing.`,
            confidence: 'medium',
            impact: 'medium',
            related_tools: ['navigation', 'content']
          });
        }
      }
    }
    
    // Deduplicate suggestions
    const uniqueSuggestions = [];
    const seenMessages = new Set();
    
    for (const suggestion of suggestions) {
      if (!seenMessages.has(suggestion.message)) {
        seenMessages.add(suggestion.message);
        uniqueSuggestions.push(suggestion);
      }
    }
    
    // Sort by impact (high to low)
    uniqueSuggestions.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact || 'medium'] - impactOrder[b.impact || 'medium'];
    });
    
    // Update session with suggestions
    session.suggestions = uniqueSuggestions;
  }

  /**
   * Clear the analysis cache for a specific session or all sessions
   * 
   * @param {Object} params - Method parameters
   * @param {string} [params.analysis_id] - Specific analysis session ID to clear
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Operation result
   */
  async clearAnalysisCache(params, context) {
    try {
      if (params.analysis_id) {
        // Clear specific analysis session
        const deleted = this._analysisCache.delete(params.analysis_id);
        
        return createSuccessResponse({
          message: deleted
            ? `Analysis cache cleared for session: ${params.analysis_id}`
            : `No cache found for session: ${params.analysis_id}`,
          deleted
        });
      } else {
        // Clear all analysis sessions
        const count = this._analysisCache.size;
        this._analysisCache.clear();
        
        return createSuccessResponse({
          message: `All analysis cache cleared (${count} sessions)`,
          count
        });
      }
    } catch (error) {
      logger.error('Error clearing analysis cache', { error: error.message });
      
      return createErrorResponse(
        'SYSTEM_ERROR',
        `Error clearing analysis cache: ${error.message}`,
        { stack: error.stack }
      );
    }
  }

  /**
   * Get a cached analysis session
   * 
   * @private
   * @param {string} analysisId - Analysis session ID
   * @returns {Object|null} - Cached session or null if not found
   */
  _getCachedAnalysisSession(analysisId) {
    if (!analysisId) return null;
    
    const cached = this._analysisCache.get(analysisId);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this._cacheTTL) {
      this._analysisCache.delete(analysisId);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Cache an analysis session
   * 
   * @private
   * @param {string} analysisId - Analysis session ID
   * @param {Object} session - Analysis session to cache
   */
  _cacheAnalysisSession(analysisId, session) {
    if (!analysisId) return;
    
    this._analysisCache.set(analysisId, {
      timestamp: Date.now(),
      data: _.cloneDeep(session)
    });
    
    // Cleanup old entries if cache is too large (>50 entries)
    if (this._analysisCache.size > 50) {
      const oldestEntry = [...this._analysisCache.entries()]
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      
      if (oldestEntry) {
        this._analysisCache.delete(oldestEntry[0]);
      }
    }
  }
}

module.exports = SiteAnalyzerTool; 