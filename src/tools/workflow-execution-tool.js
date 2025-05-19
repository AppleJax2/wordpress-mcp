const { BaseTool } = require('./base-tool');
const { createSuccessResponse, createErrorResponse } = require('../utils/response-formatter');
const logger = require('../utils/logger');
const LRU = require('lru-cache');
const { wordpressTools } = require('./index');

/**
 * Workflow Execution Tool
 * Executes workflows defined as JSON with nodes and connections.
 * Supports context passing, conditional branching, error handling, and caching.
 *
 * @module tools/workflow-execution-tool
 */
class WorkflowExecutionTool extends BaseTool {
  constructor() {
    super('workflow_execution_tool', 'Executes WordPress automation workflows with context, branching, and error handling.');
    this.registerMethod('executeWorkflow', this.executeWorkflow.bind(this));
    this.cache = new LRU({ max: 100, ttl: 1000 * 60 * 5 }); // 5 min TTL
  }

  /**
   * Main MCP-compatible execution entry point
   */
  async _execute(params, context) {
    if (params.action === 'executeWorkflow') {
      return this.executeWorkflow(params, context);
    }
    return this.createErrorResponse('INVALID_ACTION', 'Unsupported action for workflow execution tool', { action: params.action });
  }

  /**
   * Executes a workflow JSON with nodes and connections
   * @param {Object} params - Parameters
   * @param {Object} params.workflow - Workflow JSON (nodes, connections, context)
   * @param {Object} params.inputContext - Initial context (optional)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Workflow execution result
   */
  async executeWorkflow(params, context) {
    try {
      const { workflow, inputContext = {} } = params;
      if (!workflow || typeof workflow !== 'object') {
        return this.createErrorResponse('INVALID_WORKFLOW', 'Workflow JSON is required and must be an object.');
      }
      const { nodes, connections } = workflow;
      if (!Array.isArray(nodes) || !Array.isArray(connections)) {
        return this.createErrorResponse('INVALID_WORKFLOW_STRUCTURE', 'Workflow must have nodes and connections arrays.');
      }
      // Build node map for fast lookup
      const nodeMap = new Map(nodes.map(node => [node.id, node]));
      // Build adjacency list for connections
      const adjacency = {};
      for (const conn of connections) {
        if (!adjacency[conn.from]) adjacency[conn.from] = [];
        adjacency[conn.from].push(conn.to);
      }
      // Find start node(s) (no incoming connections)
      const allTo = new Set(connections.map(c => c.to));
      const startNodes = nodes.filter(n => !allTo.has(n.id));
      if (startNodes.length === 0) {
        return this.createErrorResponse('NO_START_NODE', 'No start node found in workflow.');
      }
      // State for execution
      let execContext = { ...inputContext };
      let stateCheckpoints = [];
      let visited = new Set();
      let errors = [];
      // BFS/DFS execution (support for branching)
      const executeNode = async (nodeId, contextSnapshot) => {
        if (visited.has(nodeId)) return; // Prevent cycles
        visited.add(nodeId);
        const node = nodeMap.get(nodeId);
        if (!node) {
          errors.push({ nodeId, error: 'Node not found' });
          return;
        }
        // Caching: skip if result cached
        const cacheKey = JSON.stringify({ node, context: contextSnapshot });
        if (this.cache.has(cacheKey)) {
          execContext = { ...execContext, ...this.cache.get(cacheKey) };
          return;
        }
        // Save checkpoint
        stateCheckpoints.push({ nodeId, context: { ...execContext } });
        // Execute node: expects { tool, action, params }
        let nodeResult, nodeError = null;
        try {
          if (!node.tool || !node.action) throw new Error('Node missing tool or action');
          const tool = wordpressTools[node.tool];
          if (!tool) throw new Error(`Tool not found: ${node.tool}`);
          // Merge node params with current context
          const toolParams = { ...node.params, ...execContext, action: node.action };
          nodeResult = await tool.execute(toolParams, context);
          if (!nodeResult.success) throw new Error(nodeResult.error?.message || 'Tool execution failed');
          // Merge result into context
          execContext = { ...execContext, ...nodeResult.data };
          // Cache result
          this.cache.set(cacheKey, nodeResult.data);
        } catch (err) {
          nodeError = err.message;
          errors.push({ nodeId, error: nodeError });
          // Rollback to last checkpoint
          if (stateCheckpoints.length > 0) {
            execContext = { ...stateCheckpoints[stateCheckpoints.length - 1].context };
          }
        }
        // Branching: if node has conditional, evaluate and pick next
        let nextNodes = adjacency[nodeId] || [];
        if (node.conditional && typeof node.conditional === 'function') {
          // Evaluate conditional to determine next node(s)
          nextNodes = node.conditional(execContext) || nextNodes;
        }
        // Continue execution
        for (const nextId of nextNodes) {
          await executeNode(nextId, { ...execContext });
        }
      };
      // Start execution from all start nodes
      for (const startNode of startNodes) {
        await executeNode(startNode.id, { ...execContext });
      }
      // Return result
      if (errors.length > 0) {
        return this.createErrorResponse('WORKFLOW_EXECUTION_ERROR', 'One or more nodes failed', { errors, context: execContext });
      }
      return this.createSuccessResponse(execContext, 'Workflow executed successfully');
    } catch (error) {
      logger.error('Workflow execution failed', { error: error.message, stack: error.stack });
      return this.createErrorResponse('SYSTEM_ERROR', error.message);
    }
  }

  /**
   * Returns the MCP-compatible schema for this tool
   */
  getSchema() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['executeWorkflow'],
              description: 'Action to perform',
              default: 'executeWorkflow'
            },
            workflow: {
              type: 'object',
              description: 'Workflow JSON with nodes and connections',
              properties: {
                nodes: { type: 'array', description: 'Workflow nodes' },
                connections: { type: 'array', description: 'Workflow connections' }
              },
              required: ['nodes', 'connections']
            },
            inputContext: {
              type: 'object',
              description: 'Initial context for workflow execution',
              default: {}
            }
          },
          required: ['action', 'workflow']
        }
      }
    };
  }
}

module.exports = WorkflowExecutionTool; 