/**
 * TanukiMCP Streaming & Pagination Examples
 * 
 * This file demonstrates how to use the DataStream and Paginator utilities
 * for memory-efficient processing of large datasets in MCP tools.
 */
const { DataStream, Paginator, processBatches } = require('./data-stream');
const connectionManager = require('../api/connection-manager');
const logger = require('./logger');

// Example 1: Simple data streaming from array
async function streamingExample() {
  // Sample data
  const posts = Array.from({ length: 10000 }, (_, i) => ({
    id: i + 1,
    title: `Post ${i + 1}`,
    content: `Content for post ${i + 1}`,
    status: i % 5 === 0 ? 'draft' : 'published'
  }));

  // Create a stream from array
  const postsStream = new DataStream(posts);

  // Filter and transform in memory-efficient way
  const publishedPostsStream = postsStream
    .filter(post => post.status === 'published')
    .map(post => ({
      id: post.id,
      title: post.title.toUpperCase(),
      excerpt: post.content.substring(0, 50) + '...'
    }));

  // Process in batches (e.g. for batch API operations)
  const batchedStream = publishedPostsStream.batch(batch => {
    logger.info(`Processing batch of ${batch.length} posts`);
    // This would typically be an API call or DB operation
    return batch.map(post => ({
      ...post,
      processed: true,
      timestamp: Date.now()
    }));
  }, { batchSize: 100 });

  // Consume the stream
  let count = 0;
  await batchedStream.forEach(post => {
    count++;
    // Process each post individually
    if (count % 500 === 0) {
      logger.info(`Processed ${count} posts so far`);
    }
  });

  logger.info(`Completed processing ${count} posts`);
}

// Example 2: WordPress API pagination with cursor
async function wordpressPaginationExample() {
  // Get API client
  const api = connectionManager.getApiClient();

  // Create a paginator for WordPress posts
  const postsPaginator = new Paginator({
    fetcher: async (params) => {
      // This uses the WordPress REST API format
      return api.get('/wp/v2/posts', params);
    },
    pageSize: 20,
    cachePages: true
  });

  // Load first page
  const firstPage = await postsPaginator.getCurrentPage();
  logger.info(`Loaded ${firstPage.length} posts from page 1`);

  // Navigate through pages
  if (postsPaginator.hasMore) {
    const secondPage = await postsPaginator.nextPage();
    logger.info(`Loaded ${secondPage.length} posts from page 2`);
  }

  // Get metadata about pagination
  const metadata = postsPaginator.getMetadata();
  logger.info('Pagination metadata:', metadata);

  // Convert paginator to stream for processing all posts efficiently
  const allPostsStream = postsPaginator.toStream();

  // Process the stream with transformation and filtering
  const processedStream = allPostsStream
    .map(post => ({
      id: post.id,
      title: post.title.rendered,
      slug: post.slug,
      date: new Date(post.date)
    }))
    .filter(post => post.date > new Date('2022-01-01'));

  // Collect results (only if needed - otherwise use forEach to avoid loading all into memory)
  const recentPosts = await processedStream.toArray();
  logger.info(`Found ${recentPosts.length} posts from 2022 onwards`);
}

// Example 3: Batch processing with concurrency control
async function batchProcessingExample() {
  // Simulate processing a large number of items
  const items = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: Math.random() * 100
  }));

  // Process in batches with controlled concurrency
  const results = await processBatches(
    items,
    async (batch, batchIndex) => {
      logger.info(`Processing batch ${batchIndex + 1} with ${batch.length} items`);

      // Simulate API call or DB operation
      await new Promise(resolve => setTimeout(resolve, 200));

      return batch.map(item => ({
        ...item,
        processed: true,
        batchIndex
      }));
    },
    { batchSize: 50, concurrency: 3 }
  );

  logger.info(`Processed ${results.length} items in batches`);
}

// Example 4: Streaming from WordPress API pagination
async function apiStreamingExample() {
  // Get API client
  const api = connectionManager.getApiClient();

  // Create a stream directly from paginated API
  const pagesStream = DataStream.fromPagination(
    async (params) => api.get('/wp/v2/pages', params),
    { pageSize: 50, maxPages: 10 }
  );

  // Use batching through connection manager for API requests
  async function updatePageTemplate(pages) {
    return connectionManager.batchApiRequest(async () => {
      logger.info(`Updating template for ${pages.length} pages`);
      
      // This would be handled through connection manager's concurrency control
      return pages.map(page => ({
        ...page,
        template: 'new-template',
        updated: true
      }));
    });
  }

  // Process pages in memory-efficient batches
  const updatedPagesStream = pagesStream.batch(updatePageTemplate, { batchSize: 10 });

  // Count updated pages
  let updatedCount = 0;
  await updatedPagesStream.forEach(page => {
    updatedCount++;
  });

  logger.info(`Updated template for ${updatedCount} pages`);
}

// Export examples
module.exports = {
  streamingExample,
  wordpressPaginationExample,
  batchProcessingExample,
  apiStreamingExample
}; 