/**
 * Resource Tracker Module for TanukiMCP
 * Provides centralized resource usage tracking across all MCP tools
 */
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const v8 = require('v8');
const logger = require('./logger');
const config = require('../config');

class ResourceTracker {
  constructor() {
    // Initialize resource tracking state
    this.operations = new Map(); // operation ID -> operation tracking data
    this.dataFile = path.join(__dirname, '..', '..', 'data', 'resource-usage.json');
    this.aggregatedStats = {
      totalOperations: 0,
      apiCalls: {
        total: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0
      },
      browserOperations: {
        total: 0,
        avgDuration: 0
      },
      cpu: {
        maxUsage: 0,
        avgUsage: 0,
        samples: 0
      },
      memory: {
        maxUsage: 0,
        avgUsage: 0,
        samples: 0
      }
    };
    
    // Resource thresholds
    this.thresholds = {
      cpu: config.resourceTracking?.thresholds?.cpu || 80, // CPU usage percentage
      memory: config.resourceTracking?.thresholds?.memory || 80, // Memory usage percentage
      responseTime: config.resourceTracking?.thresholds?.responseTime || 1000, // Response time in ms
      operationTime: config.resourceTracking?.thresholds?.operationTime || 10000 // Operation time in ms
    };
    
    // Initialize state
    this.initialized = false;
    this.saveInterval = null;
    
    // Read settings from config
    this.trackResources = config.resourceTracking?.enabled !== false;
    this.saveIntervalMs = config.resourceTracking?.saveIntervalMs || 300000; // 5 minutes default
    this.maxOperations = config.resourceTracking?.maxOperations || 1000; // Maximum operations to track
    this.samplingIntervalMs = config.resourceTracking?.samplingIntervalMs || 1000; // 1 second default
    
    // LRU tracking
    this.operationTimestamps = new Map(); // For LRU eviction
    
    // Initialize resource tracking
    this.init();
  }
  
  /**
   * Initialize resource tracking module
   */
  async init() {
    try {
      // Skip if resource tracking is disabled
      if (!this.trackResources) {
        logger.info('Resource usage tracking is disabled in configuration');
        return;
      }
      
      // Create data directory if it doesn't exist
      const dataDir = path.join(__dirname, '..', '..', 'data');
      try {
        await fs.mkdir(dataDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
      
      // Load existing data
      try {
        const data = await fs.readFile(this.dataFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Initialize from saved data
        if (parsed.aggregatedStats) {
          this.aggregatedStats = parsed.aggregatedStats;
        }
        
        logger.info('Loaded resource usage data');
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.error('Error loading resource usage data', err);
        } else {
          logger.info('No existing resource usage data found, starting fresh');
        }
      }
      
      // Set up periodic saving
      this.saveInterval = setInterval(() => this.saveData(), this.saveIntervalMs);
      
      this.initialized = true;
      logger.info('Resource tracking module initialized successfully', {
        trackResources: this.trackResources,
        saveIntervalMs: this.saveIntervalMs,
        samplingIntervalMs: this.samplingIntervalMs,
        maxOperations: this.maxOperations
      });
    } catch (error) {
      logger.error('Failed to initialize resource tracking module', error);
    }
  }
  
  /**
   * Start tracking resources for a specific operation
   * 
   * @param {string} operationId - Unique operation identifier
   * @param {string} toolName - Name of the tool being executed
   * @param {Object} params - Operation parameters (sanitized)
   * @param {string} userId - User ID performing the operation
   * @returns {string} - Operation ID for continued tracking
   */
  startTracking(operationId, toolName, params = {}, userId = 'anonymous') {
    if (!this.initialized || !this.trackResources) return operationId;
    
    // Generate operation ID if not provided
    if (!operationId) {
      operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }
    
    // Check if we've reached max operations and need to evict
    if (this.operations.size >= this.maxOperations) {
      this._evictOldestOperation();
    }
    
    // Initialize operation tracking
    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    const initialCpuUsage = process.cpuUsage();
    
    this.operations.set(operationId, {
      id: operationId,
      toolName,
      userId,
      startTime,
      endTime: null,
      duration: 0,
      completed: false,
      apiCalls: [],
      samples: [],
      initialState: {
        memory: {
          rss: initialMemory.rss,
          heapTotal: initialMemory.heapTotal,
          heapUsed: initialMemory.heapUsed,
          external: initialMemory.external,
          arrayBuffers: initialMemory.arrayBuffers
        },
        cpu: {
          user: initialCpuUsage.user,
          system: initialCpuUsage.system
        }
      },
      paramsSignature: this._sanitizeParams(params)
    });
    
    // Set timestamp for LRU
    this.operationTimestamps.set(operationId, startTime);
    
    // Start sampling resource usage
    this._startSampling(operationId);
    
    logger.debug(`Started resource tracking for operation ${operationId}`, {
      toolName,
      userId
    });
    
    return operationId;
  }
  
  /**
   * Stop tracking resources for an operation
   * 
   * @param {string} operationId - Operation ID to stop tracking
   * @param {boolean} success - Whether the operation completed successfully
   * @param {string} result - Result summary (optional)
   * @returns {Object} - Resource usage report
   */
  stopTracking(operationId, success = true, result = null) {
    if (!this.initialized || !this.trackResources || !operationId || !this.operations.has(operationId)) {
      return null;
    }
    
    // Get operation tracking data
    const operation = this.operations.get(operationId);
    
    // Stop sampling
    this._stopSampling(operationId);
    
    // Calculate final stats
    const endTime = Date.now();
    const duration = endTime - operation.startTime;
    const finalMemory = process.memoryUsage();
    const finalCpuUsage = process.cpuUsage();
    
    // Calculate deltas
    const memoryDelta = {
      rss: finalMemory.rss - operation.initialState.memory.rss,
      heapTotal: finalMemory.heapTotal - operation.initialState.memory.heapTotal,
      heapUsed: finalMemory.heapUsed - operation.initialState.memory.heapUsed,
      external: finalMemory.external - operation.initialState.memory.external,
      arrayBuffers: finalMemory.arrayBuffers - operation.initialState.memory.arrayBuffers
    };
    
    const cpuDelta = {
      user: finalCpuUsage.user - operation.initialState.cpu.user,
      system: finalCpuUsage.system - operation.initialState.cpu.system,
      total: (finalCpuUsage.user + finalCpuUsage.system) - 
        (operation.initialState.cpu.user + operation.initialState.cpu.system)
    };
    
    // Update operation with final data
    operation.endTime = endTime;
    operation.duration = duration;
    operation.completed = true;
    operation.success = success;
    operation.result = result;
    operation.finalState = {
      memory: {
        rss: finalMemory.rss,
        heapTotal: finalMemory.heapTotal,
        heapUsed: finalMemory.heapUsed,
        external: finalMemory.external,
        arrayBuffers: finalMemory.arrayBuffers
      },
      cpu: {
        user: finalCpuUsage.user,
        system: finalCpuUsage.system
      }
    };
    operation.delta = {
      memory: memoryDelta,
      cpu: cpuDelta
    };
    
    // Calculate summary stats
    const apiCallCount = operation.apiCalls.length;
    const successfulApiCalls = operation.apiCalls.filter(call => call.success).length;
    const failedApiCalls = apiCallCount - successfulApiCalls;
    
    let totalResponseTime = 0;
    operation.apiCalls.forEach(call => {
      totalResponseTime += call.duration;
    });
    
    const avgResponseTime = apiCallCount > 0 ? totalResponseTime / apiCallCount : 0;
    
    // Analyze samples to find peak resource usage
    let maxCpuUsage = 0;
    let maxMemoryUsage = 0;
    let totalCpuUsage = 0;
    let totalMemoryUsage = 0;
    
    operation.samples.forEach(sample => {
      maxCpuUsage = Math.max(maxCpuUsage, sample.cpuUsagePercent);
      maxMemoryUsage = Math.max(maxMemoryUsage, sample.memoryUsagePercent);
      totalCpuUsage += sample.cpuUsagePercent;
      totalMemoryUsage += sample.memoryUsagePercent;
    });
    
    const avgCpuUsage = operation.samples.length > 0 ? totalCpuUsage / operation.samples.length : 0;
    const avgMemoryUsage = operation.samples.length > 0 ? totalMemoryUsage / operation.samples.length : 0;
    
    // Create summary
    operation.summary = {
      duration,
      apiCallCount,
      successfulApiCalls,
      failedApiCalls,
      avgResponseTime,
      maxCpuUsage,
      maxMemoryUsage,
      avgCpuUsage,
      avgMemoryUsage
    };
    
    // Update aggregate stats
    this._updateAggregateStats(operation);
    
    // Check if any thresholds were exceeded
    const thresholdsExceeded = this._checkThresholds(operation);
    if (thresholdsExceeded.length > 0) {
      logger.warn(`Resource thresholds exceeded for operation ${operationId}`, {
        toolName: operation.toolName,
        duration,
        thresholdsExceeded
      });
      
      operation.thresholdsExceeded = thresholdsExceeded;
    }
    
    logger.debug(`Stopped resource tracking for operation ${operationId}`, {
      toolName: operation.toolName,
      duration,
      success
    });
    
    // Update timestamp for LRU
    this.operationTimestamps.set(operationId, endTime);
    
    return {
      operationId,
      duration,
      apiCallCount,
      successfulApiCalls,
      failedApiCalls,
      avgResponseTime,
      maxCpuUsage,
      maxMemoryUsage,
      avgCpuUsage,
      avgMemoryUsage,
      thresholdsExceeded: thresholdsExceeded || []
    };
  }
  
  /**
   * Track an API call within an operation
   * 
   * @param {string} operationId - Operation ID
   * @param {string} endpoint - API endpoint called
   * @param {string} method - HTTP method used
   * @param {Object} params - Request parameters (sanitized)
   * @returns {string} - API call ID for tracking completion
   */
  trackApiCall(operationId, endpoint, method, params = {}) {
    if (!this.initialized || !this.trackResources || !operationId || !this.operations.has(operationId)) {
      return null;
    }
    
    const operation = this.operations.get(operationId);
    const apiCallId = `api_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Track API call
    operation.apiCalls.push({
      id: apiCallId,
      endpoint,
      method,
      params: this._sanitizeParams(params),
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      completed: false,
      success: false,
      statusCode: null,
      error: null
    });
    
    // Update timestamp for LRU
    this.operationTimestamps.set(operationId, Date.now());
    
    return apiCallId;
  }
  
  /**
   * Complete tracking for an API call
   * 
   * @param {string} operationId - Operation ID
   * @param {string} apiCallId - API call ID
   * @param {boolean} success - Whether the API call was successful
   * @param {number} statusCode - HTTP status code (optional)
   * @param {string} error - Error message if failed (optional)
   */
  completeApiCall(operationId, apiCallId, success = true, statusCode = 200, error = null) {
    if (!this.initialized || !this.trackResources || !operationId || !this.operations.has(operationId)) {
      return;
    }
    
    const operation = this.operations.get(operationId);
    const apiCall = operation.apiCalls.find(call => call.id === apiCallId);
    
    if (!apiCall) {
      return;
    }
    
    // Update API call
    apiCall.endTime = Date.now();
    apiCall.duration = apiCall.endTime - apiCall.startTime;
    apiCall.completed = true;
    apiCall.success = success;
    apiCall.statusCode = statusCode;
    apiCall.error = error;
    
    // Update timestamp for LRU
    this.operationTimestamps.set(operationId, Date.now());
  }
  
  /**
   * Get resource usage statistics
   * 
   * @param {string} operationId - Optional operation ID to get stats for
   * @param {boolean} detailed - Whether to include detailed stats
   * @returns {Object} - Resource usage statistics
   */
  getStats(operationId = null, detailed = false) {
    if (!this.initialized) {
      return { error: 'Resource tracking module not initialized' };
    }
    
    if (operationId) {
      // Get stats for a specific operation
      const operation = this.operations.get(operationId);
      if (!operation) {
        return { message: 'No resource tracking data for this operation' };
      }
      
      // Clone data to avoid exposing the reference
      const stats = { ...operation };
      
      // Filter out sensitive data
      delete stats.paramsSignature;
      if (!detailed) {
        delete stats.samples;
        // Include only summary API call data
        if (stats.apiCalls) {
          stats.apiCallSummary = {
            total: stats.apiCalls.length,
            success: stats.apiCalls.filter(call => call.success).length,
            failed: stats.apiCalls.filter(call => !call.success).length,
            endpoints: {}
          };
          
          // Group by endpoint
          stats.apiCalls.forEach(call => {
            const key = `${call.method} ${call.endpoint}`;
            if (!stats.apiCallSummary.endpoints[key]) {
              stats.apiCallSummary.endpoints[key] = {
                count: 0,
                success: 0,
                failed: 0,
                totalDuration: 0
              };
            }
            
            stats.apiCallSummary.endpoints[key].count++;
            if (call.success) {
              stats.apiCallSummary.endpoints[key].success++;
            } else {
              stats.apiCallSummary.endpoints[key].failed++;
            }
            stats.apiCallSummary.endpoints[key].totalDuration += call.duration;
          });
          
          delete stats.apiCalls;
        }
      }
      
      return stats;
    } else {
      // Get aggregated stats for all operations
      const currentMemory = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      
      // Get CPU load average (1, 5, 15 minutes)
      const cpuLoadAverage = os.loadavg();
      
      const v8Stats = v8.getHeapStatistics();
      
      const summary = {
        ...this.aggregatedStats,
        currentState: {
          uptime: process.uptime(),
          memory: {
            total: totalMem,
            free: freeMem,
            usagePercent: memoryUsage,
            rss: currentMemory.rss,
            heapTotal: currentMemory.heapTotal,
            heapUsed: currentMemory.heapUsed,
            external: currentMemory.external,
            arrayBuffers: currentMemory.arrayBuffers
          },
          cpu: {
            loadAvg1m: cpuLoadAverage[0],
            loadAvg5m: cpuLoadAverage[1],
            loadAvg15m: cpuLoadAverage[2],
            cores: os.cpus().length
          },
          v8: {
            heapSizeLimit: v8Stats.heap_size_limit,
            totalHeapSize: v8Stats.total_heap_size,
            totalHeapSizeExecutable: v8Stats.total_heap_size_executable,
            totalPhysicalSize: v8Stats.total_physical_size,
            usedHeapSize: v8Stats.used_heap_size,
            heapSpaceStats: v8.getHeapSpaceStatistics()
          }
        },
        activeOperations: this.operations.size,
        completedOperations: this.aggregatedStats.totalOperations
      };
      
      // Add operations currently being tracked
      if (detailed) {
        summary.operations = {};
        this.operations.forEach((operation, id) => {
          if (operation.completed) {
            summary.operations[id] = {
              toolName: operation.toolName,
              startTime: operation.startTime,
              endTime: operation.endTime,
              duration: operation.duration,
              completed: true,
              success: operation.success,
              summary: operation.summary
            };
          } else {
            summary.operations[id] = {
              toolName: operation.toolName,
              startTime: operation.startTime,
              inProgress: true,
              elapsedTime: Date.now() - operation.startTime
            };
          }
        });
      }
      
      return summary;
    }
  }
  
  /**
   * Get top resource-consuming operations
   * 
   * @param {number} limit - Maximum number of operations to return
   * @param {string} sortBy - Metric to sort by (duration, memory, cpu)
   * @returns {Array} - Top resource-consuming operations
   */
  getTopOperations(limit = 10, sortBy = 'duration') {
    if (!this.initialized) {
      return { error: 'Resource tracking module not initialized' };
    }
    
    // Get all completed operations
    const completedOperations = [];
    this.operations.forEach(operation => {
      if (operation.completed) {
        completedOperations.push({
          id: operation.id,
          toolName: operation.toolName,
          userId: operation.userId,
          startTime: operation.startTime,
          endTime: operation.endTime,
          duration: operation.duration,
          success: operation.success,
          apiCallCount: operation.apiCalls.length,
          maxMemoryUsage: operation.summary ? operation.summary.maxMemoryUsage : 0,
          maxCpuUsage: operation.summary ? operation.summary.maxCpuUsage : 0
        });
      }
    });
    
    // Sort operations by specified metric
    let sortedOperations;
    switch (sortBy) {
      case 'memory':
        sortedOperations = completedOperations.sort((a, b) => b.maxMemoryUsage - a.maxMemoryUsage);
        break;
      case 'cpu':
        sortedOperations = completedOperations.sort((a, b) => b.maxCpuUsage - a.maxCpuUsage);
        break;
      case 'duration':
      default:
        sortedOperations = completedOperations.sort((a, b) => b.duration - a.duration);
        break;
    }
    
    // Return top operations
    return sortedOperations.slice(0, limit);
  }
  
  /**
   * Save resource usage data to file
   */
  async saveData() {
    if (!this.initialized) return;
    
    try {
      // Save aggregated stats and current operation summaries (not full tracking data)
      const dataToSave = {
        aggregatedStats: this.aggregatedStats,
        timestamp: Date.now(),
        operationSummaries: {}
      };
      
      // Add operation summaries
      this.operations.forEach((operation, id) => {
        if (operation.completed) {
          dataToSave.operationSummaries[id] = {
            toolName: operation.toolName,
            startTime: operation.startTime,
            endTime: operation.endTime,
            duration: operation.duration,
            success: operation.success,
            summary: operation.summary || null
          };
        }
      });
      
      // Write to file
      await fs.writeFile(this.dataFile, JSON.stringify(dataToSave, null, 2), 'utf8');
      logger.debug(`Saved resource usage data with ${Object.keys(dataToSave.operationSummaries).length} operation summaries`);
    } catch (error) {
      logger.error('Failed to save resource usage data', error);
    }
  }
  
  /**
   * Start sampling resource usage for an operation
   * @private
   */
  _startSampling(operationId) {
    if (!this.operations.has(operationId)) return;
    
    const operation = this.operations.get(operationId);
    
    // Create sampling interval
    operation.samplingInterval = setInterval(() => {
      // Get current resource usage
      const memory = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculate percentages
      const totalMem = os.totalmem();
      const memoryUsagePercent = (memory.rss / totalMem) * 100;
      
      // CPU usage is more complex - this is an approximation
      // We could use process.cpuUsage() delta from previous sample for better accuracy
      const cpuCount = os.cpus().length;
      const cpuUserUsage = cpuUsage.user;
      const cpuSystemUsage = cpuUsage.system;
      const cpuTotalUsage = cpuUserUsage + cpuSystemUsage;
      
      // Convert from microseconds to percentage (very rough estimate)
      // This divides by CPU count to normalize across different machines
      const elapsedMs = Date.now() - operation.startTime;
      const cpuUsagePercent = Math.min(
        100,
        (cpuTotalUsage / 1000 / elapsedMs / cpuCount) * 100
      );
      
      // Add sample
      operation.samples.push({
        timestamp: Date.now(),
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
          arrayBuffers: memory.arrayBuffers
        },
        memoryUsagePercent,
        cpu: {
          user: cpuUserUsage,
          system: cpuSystemUsage,
          total: cpuTotalUsage
        },
        cpuUsagePercent
      });
      
      // Limit samples to prevent memory growth
      if (operation.samples.length > 100) {
        operation.samples = operation.samples.slice(-100);
      }
    }, this.samplingIntervalMs);
  }
  
  /**
   * Stop sampling resource usage for an operation
   * @private
   */
  _stopSampling(operationId) {
    if (!this.operations.has(operationId)) return;
    
    const operation = this.operations.get(operationId);
    
    // Clear sampling interval
    if (operation.samplingInterval) {
      clearInterval(operation.samplingInterval);
      operation.samplingInterval = null;
    }
  }
  
  /**
   * Update aggregate statistics with operation data
   * @private
   */
  _updateAggregateStats(operation) {
    // Update total operations
    this.aggregatedStats.totalOperations++;
    
    // Update API call stats
    const apiCallCount = operation.apiCalls.length;
    const successfulApiCalls = operation.apiCalls.filter(call => call.success).length;
    const failedApiCalls = apiCallCount - successfulApiCalls;
    
    this.aggregatedStats.apiCalls.total += apiCallCount;
    this.aggregatedStats.apiCalls.success += successfulApiCalls;
    this.aggregatedStats.apiCalls.failed += failedApiCalls;
    
    // Update API response time
    if (apiCallCount > 0) {
      let totalResponseTime = 0;
      operation.apiCalls.forEach(call => {
        if (call.duration) {
          totalResponseTime += call.duration;
        }
      });
      
      const currentTotalTime = this.aggregatedStats.apiCalls.avgResponseTime * 
        (this.aggregatedStats.apiCalls.total - apiCallCount);
        
      this.aggregatedStats.apiCalls.avgResponseTime = 
        (currentTotalTime + totalResponseTime) / this.aggregatedStats.apiCalls.total;
    }
    
    // Update resource usage stats
    if (operation.summary) {
      // Update CPU stats
      if (operation.summary.maxCpuUsage > this.aggregatedStats.cpu.maxUsage) {
        this.aggregatedStats.cpu.maxUsage = operation.summary.maxCpuUsage;
      }
      
      const currentTotalCpuUsage = this.aggregatedStats.cpu.avgUsage * this.aggregatedStats.cpu.samples;
      this.aggregatedStats.cpu.samples++;
      this.aggregatedStats.cpu.avgUsage = 
        (currentTotalCpuUsage + operation.summary.avgCpuUsage) / this.aggregatedStats.cpu.samples;
      
      // Update memory stats
      if (operation.summary.maxMemoryUsage > this.aggregatedStats.memory.maxUsage) {
        this.aggregatedStats.memory.maxUsage = operation.summary.maxMemoryUsage;
      }
      
      const currentTotalMemoryUsage = this.aggregatedStats.memory.avgUsage * this.aggregatedStats.memory.samples;
      this.aggregatedStats.memory.samples++;
      this.aggregatedStats.memory.avgUsage = 
        (currentTotalMemoryUsage + operation.summary.avgMemoryUsage) / this.aggregatedStats.memory.samples;
    }
  }
  
  /**
   * Check if any resource thresholds were exceeded
   * @private
   */
  _checkThresholds(operation) {
    const thresholdsExceeded = [];
    
    // Check CPU usage
    if (operation.summary && operation.summary.maxCpuUsage > this.thresholds.cpu) {
      thresholdsExceeded.push({
        type: 'cpu',
        threshold: this.thresholds.cpu,
        actual: operation.summary.maxCpuUsage
      });
    }
    
    // Check memory usage
    if (operation.summary && operation.summary.maxMemoryUsage > this.thresholds.memory) {
      thresholdsExceeded.push({
        type: 'memory',
        threshold: this.thresholds.memory,
        actual: operation.summary.maxMemoryUsage
      });
    }
    
    // Check operation duration
    if (operation.duration > this.thresholds.operationTime) {
      thresholdsExceeded.push({
        type: 'duration',
        threshold: this.thresholds.operationTime,
        actual: operation.duration
      });
    }
    
    // Check API response times
    let slowApiCalls = 0;
    operation.apiCalls.forEach(call => {
      if (call.duration > this.thresholds.responseTime) {
        slowApiCalls++;
      }
    });
    
    if (slowApiCalls > 0 && operation.apiCalls.length > 0) {
      thresholdsExceeded.push({
        type: 'api_response_time',
        threshold: this.thresholds.responseTime,
        count: slowApiCalls,
        total: operation.apiCalls.length
      });
    }
    
    return thresholdsExceeded;
  }
  
  /**
   * Sanitize parameters for logging (remove sensitive data)
   * @private
   */
  _sanitizeParams(params) {
    if (!params) return null;
    
    // Clone params to avoid modifying the original
    const sanitized = { ...params };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'auth', 'key', 'secret', 'credential'];
    
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if this is a sensitive field
      const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this._sanitizeParams(sanitized[key]);
      }
    });
    
    return sanitized;
  }
  
  /**
   * Evict the oldest operation based on LRU policy
   * @private
   */
  _evictOldestOperation() {
    if (this.operationTimestamps.size === 0) return;
    
    // Find the least recently used operation
    let oldestId = null;
    let oldestTime = Date.now();
    
    for (const [id, timestamp] of this.operationTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestId = id;
      }
    }
    
    if (oldestId) {
      // Remove from tracking
      this.operations.delete(oldestId);
      this.operationTimestamps.delete(oldestId);
      
      logger.debug(`Evicted oldest operation from tracking: ${oldestId}`);
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // Stop all sampling intervals
    this.operations.forEach(operation => {
      if (operation.samplingInterval) {
        clearInterval(operation.samplingInterval);
      }
    });
    
    // Save data one last time
    this.saveData();
  }
}

// Create and export singleton instance
const resourceTracker = new ResourceTracker();

// Handle process exit
process.on('exit', () => {
  resourceTracker.cleanup();
});

module.exports = resourceTracker; 