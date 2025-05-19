/**
 * TanukiMCP Data Streaming and Pagination Utility
 * Provides efficient handling of large datasets with streaming and pagination
 */
const { Readable, Transform } = require('stream');
const { promisify } = require('util');
const logger = require('./logger');
const pipeline = promisify(require('stream').pipeline);

/**
 * DataStream - Wrapper for Node.js streams with additional utility methods
 * Provides a convenient API for streaming large datasets with memory efficiency
 */
class DataStream {
  /**
   * Create a DataStream instance
   * 
   * @param {Object|Array|Function|Readable} source - Data source for the stream
   * @param {Object} options - Stream options
   * @param {number} options.highWaterMark - Buffer size limit
   * @param {boolean} options.objectMode - Whether to stream objects (default) or buffers
   * @param {number} options.chunkSize - Size of chunks for batch processing
   */
  constructor(source, { highWaterMark = 16, objectMode = true, chunkSize = 50 } = {}) {
    this.chunkSize = chunkSize;
    
    if (source instanceof Readable) {
      this.stream = source;
    } else if (typeof source === 'function') {
      // Create stream from async generator function
      this.stream = Readable.from(source(), { highWaterMark, objectMode });
    } else if (Array.isArray(source)) {
      // Create stream from array
      this.stream = Readable.from(source, { highWaterMark, objectMode });
    } else if (source && typeof source === 'object') {
      // Create stream from iterable object
      this.stream = Readable.from(source, { highWaterMark, objectMode });
    } else {
      throw new Error('Invalid source type. Must be Readable, Array, Object, or Function');
    }
  }

  /**
   * Transform stream data with the provided function
   * 
   * @param {Function} transformFn - Function to transform each item
   * @param {Object} options - Transform options
   * @returns {DataStream} - New DataStream with transformed data
   */
  map(transformFn, options = {}) {
    const transform = new Transform({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      transform(chunk, encoding, callback) {
        try {
          const result = transformFn(chunk);
          if (result instanceof Promise) {
            result.then(
              transformed => callback(null, transformed),
              err => callback(err)
            );
          } else {
            callback(null, result);
          }
        } catch (err) {
          callback(err);
        }
      }
    });

    const newStream = this.stream.pipe(transform);
    return new DataStream(newStream, { 
      highWaterMark: options.highWaterMark,
      chunkSize: options.chunkSize || this.chunkSize
    });
  }

  /**
   * Filter stream data with the provided predicate function
   * 
   * @param {Function} predicateFn - Function to test each item
   * @param {Object} options - Filter options
   * @returns {DataStream} - New DataStream with filtered data
   */
  filter(predicateFn, options = {}) {
    const transform = new Transform({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      transform(chunk, encoding, callback) {
        try {
          const result = predicateFn(chunk);
          if (result instanceof Promise) {
            result.then(
              include => {
                if (include) {
                  callback(null, chunk);
                } else {
                  callback();
                }
              },
              err => callback(err)
            );
          } else {
            if (result) {
              callback(null, chunk);
            } else {
              callback();
            }
          }
        } catch (err) {
          callback(err);
        }
      }
    });

    const newStream = this.stream.pipe(transform);
    return new DataStream(newStream, { 
      highWaterMark: options.highWaterMark,
      chunkSize: options.chunkSize || this.chunkSize
    });
  }

  /**
   * Process data in batches for better performance
   * 
   * @param {Function} batchFn - Function to process each batch
   * @param {Object} options - Batch options
   * @returns {DataStream} - New DataStream with batch-processed data
   */
  batch(batchFn, options = {}) {
    const batchSize = options.batchSize || this.chunkSize;
    let batch = [];
    
    const transform = new Transform({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      transform(chunk, encoding, callback) {
        batch.push(chunk);
        
        if (batch.length >= batchSize) {
          const currentBatch = batch;
          batch = [];
          
          try {
            const result = batchFn(currentBatch);
            if (result instanceof Promise) {
              result.then(
                processed => {
                  if (Array.isArray(processed)) {
                    processed.forEach(item => this.push(item));
                  } else {
                    this.push(processed);
                  }
                  callback();
                },
                err => callback(err)
              );
            } else {
              if (Array.isArray(result)) {
                result.forEach(item => this.push(item));
              } else {
                this.push(result);
              }
              callback();
            }
          } catch (err) {
            callback(err);
          }
        } else {
          callback();
        }
      },
      flush(callback) {
        if (batch.length > 0) {
          try {
            const result = batchFn(batch);
            if (result instanceof Promise) {
              result.then(
                processed => {
                  if (Array.isArray(processed)) {
                    processed.forEach(item => this.push(item));
                  } else {
                    this.push(processed);
                  }
                  callback();
                },
                err => callback(err)
              );
            } else {
              if (Array.isArray(result)) {
                result.forEach(item => this.push(item));
              } else {
                this.push(result);
              }
              callback();
            }
          } catch (err) {
            callback(err);
          }
        } else {
          callback();
        }
      }
    });

    const newStream = this.stream.pipe(transform);
    return new DataStream(newStream, { 
      highWaterMark: options.highWaterMark,
      chunkSize: options.chunkSize || this.chunkSize
    });
  }

  /**
   * Collect all stream data into an array
   * Warning: This loads the entire dataset into memory
   * 
   * @returns {Promise<Array>} - Promise resolving to array of all items
   */
  async toArray() {
    const items = [];
    for await (const item of this.stream) {
      items.push(item);
    }
    return items;
  }

  /**
   * Execute function for each item in the stream
   * 
   * @param {Function} fn - Function to execute for each item
   * @returns {Promise<void>} - Promise that resolves when complete
   */
  async forEach(fn) {
    for await (const item of this.stream) {
      await fn(item);
    }
  }

  /**
   * Pipe stream to destination with promise interface
   * 
   * @param {Writable} destination - Destination stream
   * @param {Object} options - Pipe options
   * @returns {Promise<void>} - Promise that resolves when complete
   */
  async pipeTo(destination, options = {}) {
    return pipeline(this.stream, destination, options);
  }

  /**
   * Create a DataStream from a paginated API
   * 
   * @param {Function} fetcher - Async function that fetches a page of results
   * @param {Object} options - Options for pagination
   * @param {number} options.pageSize - Number of items per page
   * @param {number} options.maxPages - Maximum number of pages to fetch
   * @param {boolean} options.useCursor - Use cursor-based pagination 
   * @returns {DataStream} - Stream of items from all pages
   */
  static fromPagination(fetcher, { pageSize = 100, maxPages = Infinity, useCursor = false } = {}) {
    async function* generator() {
      let page = 1;
      let hasMore = true;
      let cursor = null;
      
      while (hasMore && page <= maxPages) {
        try {
          const params = useCursor 
            ? { cursor, limit: pageSize }
            : { page, per_page: pageSize };
          
          const result = await fetcher(params);
          
          // Handle WordPress REST API format
          const items = result.data || result.items || result;
          
          if (!items || !Array.isArray(items) || items.length === 0) {
            hasMore = false;
            break;
          }
          
          // Yield each item individually
          for (const item of items) {
            yield item;
          }
          
          // Update cursor for cursor-based pagination
          if (useCursor) {
            cursor = result.next_cursor || null;
            hasMore = !!cursor;
          } else {
            // For offset/limit pagination, check if we got a full page
            hasMore = items.length === pageSize;
          }
          
          page++;
        } catch (error) {
          logger.error('Error in pagination fetcher', { error: error.message, page });
          hasMore = false;
        }
      }
    }
    
    return new DataStream(generator);
  }
}

/**
 * Paginator - Provides pagination utilities for large datasets
 * Supports both offset/limit pagination and cursor-based pagination
 */
class Paginator {
  /**
   * Create a paginator instance
   * 
   * @param {Object} options - Paginator options
   * @param {Function} options.fetcher - Async function to fetch a page of data
   * @param {number} options.pageSize - Items per page
   * @param {boolean} options.useCursor - Use cursor-based pagination
   * @param {boolean} options.cachePages - Cache pages in memory
   */
  constructor({ 
    fetcher, 
    pageSize = 50, 
    useCursor = false,
    cachePages = true
  } = {}) {
    if (typeof fetcher !== 'function') {
      throw new Error('Fetcher must be a function');
    }
    
    this.fetcher = fetcher;
    this.pageSize = pageSize;
    this.useCursor = useCursor;
    this.cachePages = cachePages;
    
    // Internal state
    this.currentPage = 1;
    this.totalPages = null;
    this.totalItems = null;
    this.cursor = null;
    this.hasMore = true;
    this.items = [];
    this.pageCache = cachePages ? new Map() : null;
    this.loading = false;
    this.error = null;
  }

  /**
   * Get the current page data
   * 
   * @returns {Promise<Array>} - Current page items
   */
  async getCurrentPage() {
    if (this.loading) {
      throw new Error('Already loading data');
    }
    
    try {
      this.loading = true;
      this.error = null;
      
      // Check cache first
      if (this.cachePages && this.pageCache?.has(this.currentPage)) {
        this.items = this.pageCache.get(this.currentPage);
        return this.items;
      }
      
      // Fetch data
      const params = this.useCursor
        ? { cursor: this.cursor, limit: this.pageSize }
        : { page: this.currentPage, per_page: this.pageSize };
      
      const result = await this.fetcher(params);
      
      // Parse response
      const items = result.data || result.items || result;
      
      if (!Array.isArray(items)) {
        throw new Error('Invalid response format');
      }
      
      // Update pagination info
      if (result.total_pages) {
        this.totalPages = result.total_pages;
      }
      
      if (result.total) {
        this.totalItems = result.total;
      }
      
      if (this.useCursor) {
        this.cursor = result.next_cursor || null;
        this.hasMore = !!this.cursor;
      } else {
        this.hasMore = items.length === this.pageSize;
      }
      
      // Update items and cache
      this.items = items;
      
      if (this.cachePages) {
        this.pageCache.set(this.currentPage, items);
      }
      
      return items;
    } catch (error) {
      this.error = error.message;
      logger.error('Error fetching page', { 
        page: this.currentPage, 
        error: error.message 
      });
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Navigate to the next page
   * 
   * @returns {Promise<Array>} - Next page items
   */
  async nextPage() {
    if (!this.hasMore) {
      return this.items;
    }
    
    this.currentPage++;
    return this.getCurrentPage();
  }

  /**
   * Navigate to the previous page
   * 
   * @returns {Promise<Array>} - Previous page items
   */
  async prevPage() {
    if (this.currentPage <= 1) {
      return this.items;
    }
    
    this.currentPage--;
    return this.getCurrentPage();
  }

  /**
   * Navigate to a specific page
   * 
   * @param {number} page - Page number to navigate to
   * @returns {Promise<Array>} - Page items
   */
  async goToPage(page) {
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    
    if (this.totalPages && page > this.totalPages) {
      throw new Error(`Page ${page} exceeds total pages ${this.totalPages}`);
    }
    
    if (this.useCursor && page < this.currentPage) {
      throw new Error('Cannot navigate backwards with cursor-based pagination');
    }
    
    this.currentPage = page;
    return this.getCurrentPage();
  }

  /**
   * Reset pagination to the first page
   * 
   * @returns {Promise<Array>} - First page items
   */
  async reset() {
    this.currentPage = 1;
    this.cursor = null;
    this.hasMore = true;
    return this.getCurrentPage();
  }

  /**
   * Clear the page cache
   */
  clearCache() {
    if (this.pageCache) {
      this.pageCache.clear();
    }
  }

  /**
   * Get all items across all pages
   * Warning: This loads the entire dataset into memory
   * 
   * @param {number} maxPages - Maximum number of pages to fetch
   * @returns {Promise<Array>} - All items
   */
  async getAllItems(maxPages = 100) {
    const allItems = [];
    let page = 1;
    let hasMore = true;
    let cursor = null;
    
    while (hasMore && page <= maxPages) {
      try {
        const params = this.useCursor
          ? { cursor, limit: this.pageSize }
          : { page, per_page: this.pageSize };
        
        const result = await this.fetcher(params);
        
        const items = result.data || result.items || result;
        
        if (!Array.isArray(items) || items.length === 0) {
          hasMore = false;
          break;
        }
        
        allItems.push(...items);
        
        if (this.useCursor) {
          cursor = result.next_cursor || null;
          hasMore = !!cursor;
        } else {
          hasMore = items.length === this.pageSize;
        }
        
        page++;
      } catch (error) {
        logger.error('Error fetching all items', { error: error.message, page });
        throw error;
      }
    }
    
    return allItems;
  }

  /**
   * Create a DataStream from this paginator
   * 
   * @returns {DataStream} - Stream of all items
   */
  toStream() {
    return DataStream.fromPagination(this.fetcher, {
      pageSize: this.pageSize,
      useCursor: this.useCursor
    });
  }

  /**
   * Get pagination metadata
   * 
   * @returns {Object} - Pagination metadata
   */
  getMetadata() {
    return {
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      totalPages: this.totalPages,
      totalItems: this.totalItems,
      hasMore: this.hasMore,
      loading: this.loading,
      error: this.error,
      useCursor: this.useCursor
    };
  }
}

/**
 * Process an array in batches with controlled concurrency
 * 
 * @param {Array} items - Array of items to process
 * @param {Function} processFn - Function to process each batch
 * @param {Object} options - Options for batch processing
 * @param {number} options.batchSize - Number of items per batch
 * @param {number} options.concurrency - Maximum concurrent batches
 * @returns {Promise<Array>} - Results from all batches
 */
async function processBatches(items, processFn, { batchSize = 50, concurrency = 3 } = {}) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  if (items.length === 0) {
    return [];
  }
  
  // Create batches
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  const results = [];
  let activeBatches = 0;
  let batchIndex = 0;
  
  return new Promise((resolve, reject) => {
    const processNextBatch = async () => {
      if (batchIndex >= batches.length) {
        if (activeBatches === 0) {
          resolve(results.flat());
        }
        return;
      }
      
      const currentBatchIndex = batchIndex++;
      const batch = batches[currentBatchIndex];
      activeBatches++;
      
      try {
        const result = await processFn(batch, currentBatchIndex);
        results[currentBatchIndex] = result;
      } catch (error) {
        logger.error('Error processing batch', { 
          batchIndex: currentBatchIndex, 
          error: error.message 
        });
        reject(error);
        return;
      }
      
      activeBatches--;
      processNextBatch();
    };
    
    // Start initial batches up to concurrency limit
    for (let i = 0; i < Math.min(concurrency, batches.length); i++) {
      processNextBatch();
    }
  });
}

module.exports = {
  DataStream,
  Paginator,
  processBatches
}; 