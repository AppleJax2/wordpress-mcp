/**
 * Full Hierarchy Tool
 * Maps the complete site structure and content hierarchy
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');

class FullHierarchyTool extends BaseTool {
  constructor() {
    super('full_hierarchy_tool', 'Maps the complete site structure and content hierarchy');
    this.api = new WordPressAPI();
  }
  
  /**
   * Execute the full hierarchy tool
   * @param {Object} params - Parameters for the hierarchy operation
   * @param {string} params.action - Action to perform (map, analyze, export)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { 
        action = 'map', 
        data = {} 
      } = params;
      
      switch (action) {
        case 'map':
          return await this.mapHierarchy(data);
        case 'analyze':
          return await this.analyzeHierarchy(data);
        case 'export':
          return await this.exportHierarchy(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error('Error executing full hierarchy tool:', error);
      throw error;
    }
  }

  /**
   * Map the site hierarchy
   * @param {Object} data - Parameters for mapping the hierarchy
   * @param {Array} data.contentTypes - Content types to include (default: all)
   * @param {boolean} data.includeTemplates - Whether to include templates
   * @param {boolean} data.includeBlocks - Whether to include blocks
   * @returns {Object} Site hierarchy
   */
  async mapHierarchy(data) {
    const { 
      contentTypes = ['all'], 
      includeTemplates = true,
      includeBlocks = true
    } = data;
    
    const hierarchy = {
      site: await this.getSiteInfo(),
      pages: [],
      posts: [],
      categories: [],
      tags: [],
      customPostTypes: {},
      taxonomies: {},
      templates: [],
      blocks: []
    };
    
    const includeAll = contentTypes.includes('all');
    
    // Map pages
    if (includeAll || contentTypes.includes('pages')) {
      hierarchy.pages = await this.getPages();
    }
    
    // Map posts
    if (includeAll || contentTypes.includes('posts')) {
      hierarchy.posts = await this.getPosts();
    }
    
    // Map categories
    if (includeAll || contentTypes.includes('categories')) {
      hierarchy.categories = await this.getCategories();
    }
    
    // Map tags
    if (includeAll || contentTypes.includes('tags')) {
      hierarchy.tags = await this.getTags();
    }
    
    // Map custom post types
    if (includeAll || contentTypes.includes('custom_post_types')) {
      const customPostTypes = await this.getCustomPostTypes();
      
      for (const postType of customPostTypes) {
        hierarchy.customPostTypes[postType.slug] = {
          name: postType.name,
          items: await this.getCustomPostTypeItems(postType.slug)
        };
      }
    }
    
    // Map taxonomies
    if (includeAll || contentTypes.includes('taxonomies')) {
      const taxonomies = await this.getTaxonomies();
      
      for (const taxonomy of taxonomies) {
        hierarchy.taxonomies[taxonomy.slug] = {
          name: taxonomy.name,
          items: await this.getTaxonomyTerms(taxonomy.slug)
        };
      }
    }
    
    // Map templates
    if (includeTemplates) {
      hierarchy.templates = await this.getTemplates();
    }
    
    // Map blocks
    if (includeBlocks) {
      hierarchy.blocks = await this.getBlocks();
    }
    
    return {
      success: true,
      hierarchy,
      message: 'Site hierarchy mapped successfully'
    };
  }

  /**
   * Analyze the site hierarchy
   * @param {Object} data - Parameters for analyzing the hierarchy
   * @param {Object} data.hierarchy - Hierarchy to analyze (if not provided, will map first)
   * @returns {Object} Analysis results
   */
  async analyzeHierarchy(data) {
    const { hierarchy: providedHierarchy } = data;
    
    // If hierarchy not provided, map it
    const hierarchy = providedHierarchy || (await this.mapHierarchy(data)).hierarchy;
    
    const analysis = {
      contentCounts: {
        pages: hierarchy.pages.length,
        posts: hierarchy.posts.length,
        categories: hierarchy.categories.length,
        tags: hierarchy.tags.length
      },
      structureComplexity: 'simple', // Will be calculated
      depthAnalysis: {
        maxPageDepth: this.calculateMaxPageDepth(hierarchy.pages),
        categoriesDepth: this.calculateMaxCategoryDepth(hierarchy.categories)
      },
      customPostTypes: Object.keys(hierarchy.customPostTypes).length,
      contentDistribution: {},
      issues: [],
      recommendations: []
    };
    
    // Calculate content distribution
    const totalContent = analysis.contentCounts.pages + analysis.contentCounts.posts;
    
    if (totalContent > 0) {
      analysis.contentDistribution = {
        pages: Math.round((analysis.contentCounts.pages / totalContent) * 100) + '%',
        posts: Math.round((analysis.contentCounts.posts / totalContent) * 100) + '%'
      };
    }
    
    // Determine structure complexity
    if (analysis.customPostTypes > 3 || analysis.depthAnalysis.maxPageDepth > 4) {
      analysis.structureComplexity = 'complex';
    } else if (analysis.customPostTypes > 1 || analysis.depthAnalysis.maxPageDepth > 2) {
      analysis.structureComplexity = 'moderate';
    }
    
    // Identify issues and make recommendations
    if (analysis.depthAnalysis.maxPageDepth > 5) {
      analysis.issues.push('Excessive page hierarchy depth can complicate navigation');
      analysis.recommendations.push('Consider flattening page hierarchy to improve user experience');
    }
    
    if (analysis.contentCounts.categories > 20) {
      analysis.issues.push('Large number of categories can overwhelm users');
      analysis.recommendations.push('Consider consolidating categories for better user experience');
    }
    
    return {
      success: true,
      analysis,
      message: 'Site hierarchy analyzed successfully'
    };
  }

  /**
   * Export the site hierarchy to different formats
   * @param {Object} data - Parameters for exporting the hierarchy
   * @param {Object} data.hierarchy - Hierarchy to export (if not provided, will map first)
   * @param {string} data.format - Format to export to (json, xml, csv)
   * @returns {Object} Exported hierarchy
   */
  async exportHierarchy(data) {
    const { hierarchy: providedHierarchy, format = 'json' } = data;
    
    // If hierarchy not provided, map it
    const hierarchy = providedHierarchy || (await this.mapHierarchy(data)).hierarchy;
    
    // Export in the requested format
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(hierarchy, null, 2),
        format: 'json',
        message: 'Hierarchy exported as JSON successfully'
      };
    } else if (format === 'xml') {
      return {
        success: true,
        data: this.convertToXML(hierarchy),
        format: 'xml',
        message: 'Hierarchy exported as XML successfully'
      };
    } else if (format === 'csv') {
      return {
        success: true,
        data: this.convertToCSV(hierarchy),
        format: 'csv',
        message: 'Hierarchy exported as CSV successfully'
      };
    }
    
    return {
      success: false,
      message: `Unsupported export format: ${format}`
    };
  }

  /**
   * Get site information
   * @returns {Object} Site information
   */
  async getSiteInfo() {
    const siteInfo = await this.api.getSiteInfo();
    return {
      name: siteInfo.name,
      description: siteInfo.description,
      url: siteInfo.url,
      version: siteInfo.version,
      theme: siteInfo.theme,
    };
  }

  /**
   * Get pages from the site
   * @returns {Array} List of pages with hierarchy information
   */
  async getPages() {
    const pages = await this.api.getPages();
    const structuredPages = this.buildPageHierarchy(pages);
    return structuredPages;
  }

  /**
   * Get posts from the site
   * @returns {Array} List of posts
   */
  async getPosts() {
    const posts = await this.api.getPosts();
    return posts.map(post => ({
      id: post.id,
      title: post.title.rendered,
      date: post.date,
      slug: post.slug,
      categories: post.categories,
      tags: post.tags
    }));
  }

  /**
   * Get categories from the site
   * @returns {Array} List of categories with hierarchy information
   */
  async getCategories() {
    const categories = await this.api.getCategories();
    const structuredCategories = this.buildCategoryHierarchy(categories);
    return structuredCategories;
  }

  /**
   * Get tags from the site
   * @returns {Array} List of tags
   */
  async getTags() {
    const tags = await this.api.getTags();
    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      count: tag.count
    }));
  }

  /**
   * Get custom post types from the site
   * @returns {Array} List of custom post types
   */
  async getCustomPostTypes() {
    const postTypes = await this.api.getPostTypes();
    
    // Filter out built-in post types
    return postTypes
      .filter(type => !['post', 'page', 'attachment', 'revision', 'nav_menu_item'].includes(type.slug))
      .map(type => ({
        slug: type.slug,
        name: type.name,
        restBase: type.rest_base
      }));
  }

  /**
   * Get items of a specific custom post type
   * @param {string} postType - Custom post type slug
   * @returns {Array} List of custom post type items
   */
  async getCustomPostTypeItems(postType) {
    const items = await this.api.getCustomPostTypeItems(postType);
    
    return items.map(item => ({
      id: item.id,
      title: item.title?.rendered || item.name,
      date: item.date,
      slug: item.slug
    }));
  }

  /**
   * Get taxonomies from the site
   * @returns {Array} List of taxonomies
   */
  async getTaxonomies() {
    const taxonomies = await this.api.getTaxonomies();
    
    // Filter out built-in taxonomies
    return taxonomies
      .filter(tax => !['category', 'post_tag', 'nav_menu', 'link_category', 'post_format'].includes(tax.slug))
      .map(tax => ({
        slug: tax.slug,
        name: tax.name,
        restBase: tax.rest_base
      }));
  }

  /**
   * Get terms for a specific taxonomy
   * @param {string} taxonomy - Taxonomy slug
   * @returns {Array} List of taxonomy terms
   */
  async getTaxonomyTerms(taxonomy) {
    const terms = await this.api.getTaxonomyTerms(taxonomy);
    
    return terms.map(term => ({
      id: term.id,
      name: term.name,
      slug: term.slug,
      count: term.count
    }));
  }

  /**
   * Get templates from the site
   * @returns {Array} List of templates
   */
  async getTemplates() {
    const templates = await this.api.getTemplates();
    
    return templates.map(template => ({
      id: template.id,
      slug: template.slug,
      title: template.title?.rendered || template.slug,
      type: template.template_type
    }));
  }

  /**
   * Get blocks from the site
   * @returns {Array} List of blocks
   */
  async getBlocks() {
    const blocks = await this.api.getBlocks();
    
    return blocks.map(block => ({
      name: block.name,
      title: block.title,
      category: block.category
    }));
  }

  /**
   * Build page hierarchy from flat list of pages
   * @param {Array} pages - Flat list of pages
   * @returns {Array} Hierarchical structure of pages
   */
  buildPageHierarchy(pages) {
    const pageMap = {};
    const roots = [];
    
    // Create page map for lookup
    pages.forEach(page => {
      pageMap[page.id] = {
        id: page.id,
        title: page.title.rendered,
        slug: page.slug,
        parent: page.parent,
        children: []
      };
    });
    
    // Build hierarchy
    pages.forEach(page => {
      const pageItem = pageMap[page.id];
      
      if (page.parent === 0) {
        roots.push(pageItem);
      } else {
        if (pageMap[page.parent]) {
          pageMap[page.parent].children.push(pageItem);
        } else {
          // Orphaned page (parent doesn't exist), add to roots
          roots.push(pageItem);
        }
      }
    });
    
    return roots;
  }

  /**
   * Build category hierarchy from flat list of categories
   * @param {Array} categories - Flat list of categories
   * @returns {Array} Hierarchical structure of categories
   */
  buildCategoryHierarchy(categories) {
    const categoryMap = {};
    const roots = [];
    
    // Create category map for lookup
    categories.forEach(category => {
      categoryMap[category.id] = {
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category.count,
        parent: category.parent,
        children: []
      };
    });
    
    // Build hierarchy
    categories.forEach(category => {
      const categoryItem = categoryMap[category.id];
      
      if (category.parent === 0) {
        roots.push(categoryItem);
      } else {
        if (categoryMap[category.parent]) {
          categoryMap[category.parent].children.push(categoryItem);
        } else {
          // Orphaned category (parent doesn't exist), add to roots
          roots.push(categoryItem);
        }
      }
    });
    
    return roots;
  }

  /**
   * Calculate maximum depth of page hierarchy
   * @param {Array} pages - Hierarchical structure of pages
   * @param {number} currentDepth - Current depth (for recursion)
   * @returns {number} Maximum depth
   */
  calculateMaxPageDepth(pages, currentDepth = 1) {
    if (!pages || pages.length === 0) {
      return currentDepth - 1;
    }
    
    let maxDepth = currentDepth;
    
    pages.forEach(page => {
      if (page.children && page.children.length > 0) {
        const childrenDepth = this.calculateMaxPageDepth(page.children, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childrenDepth);
      }
    });
    
    return maxDepth;
  }

  /**
   * Calculate maximum depth of category hierarchy
   * @param {Array} categories - Hierarchical structure of categories
   * @param {number} currentDepth - Current depth (for recursion)
   * @returns {number} Maximum depth
   */
  calculateMaxCategoryDepth(categories, currentDepth = 1) {
    if (!categories || categories.length === 0) {
      return currentDepth - 1;
    }
    
    let maxDepth = currentDepth;
    
    categories.forEach(category => {
      if (category.children && category.children.length > 0) {
        const childrenDepth = this.calculateMaxCategoryDepth(category.children, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childrenDepth);
      }
    });
    
    return maxDepth;
  }

  /**
   * Convert hierarchy to XML format
   * @param {Object} hierarchy - Hierarchy to convert
   * @returns {string} XML string
   */
  convertToXML(hierarchy) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<hierarchy>\n';
    
    // Site info
    xml += `  <site>\n`;
    xml += `    <name>${this.escapeXML(hierarchy.site.name)}</name>\n`;
    xml += `    <description>${this.escapeXML(hierarchy.site.description)}</description>\n`;
    xml += `    <url>${this.escapeXML(hierarchy.site.url)}</url>\n`;
    xml += `  </site>\n`;
    
    // Pages
    xml += `  <pages>\n`;
    hierarchy.pages.forEach(page => {
      xml += this.pageToXML(page, 4);
    });
    xml += `  </pages>\n`;
    
    // Posts
    xml += `  <posts>\n`;
    hierarchy.posts.forEach(post => {
      xml += `    <post>\n`;
      xml += `      <id>${post.id}</id>\n`;
      xml += `      <title>${this.escapeXML(post.title)}</title>\n`;
      xml += `      <slug>${this.escapeXML(post.slug)}</slug>\n`;
      xml += `    </post>\n`;
    });
    xml += `  </posts>\n`;
    
    xml += '</hierarchy>';
    return xml;
  }

  /**
   * Helper function to convert a page and its children to XML
   * @param {Object} page - Page to convert
   * @param {number} indent - Indentation level
   * @returns {string} XML string
   */
  pageToXML(page, indent) {
    const spaces = ' '.repeat(indent);
    let xml = `${spaces}<page>\n`;
    xml += `${spaces}  <id>${page.id}</id>\n`;
    xml += `${spaces}  <title>${this.escapeXML(page.title)}</title>\n`;
    xml += `${spaces}  <slug>${this.escapeXML(page.slug)}</slug>\n`;
    
    if (page.children && page.children.length > 0) {
      xml += `${spaces}  <children>\n`;
      page.children.forEach(child => {
        xml += this.pageToXML(child, indent + 4);
      });
      xml += `${spaces}  </children>\n`;
    }
    
    xml += `${spaces}</page>\n`;
    return xml;
  }

  /**
   * Escape special characters for XML
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeXML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convert hierarchy to CSV format
   * @param {Object} hierarchy - Hierarchy to convert
   * @returns {string} CSV string
   */
  convertToCSV(hierarchy) {
    let csv = 'Type,ID,Title,Slug,Parent,Depth\n';
    
    // Add pages to CSV
    this.addPagesToCSV(hierarchy.pages, 1, csv);
    
    // Add posts to CSV
    hierarchy.posts.forEach(post => {
      csv += `Post,${post.id},"${this.escapeCSV(post.title)}",${post.slug},0,1\n`;
    });
    
    return csv;
  }

  /**
   * Helper function to add pages to CSV
   * @param {Array} pages - Pages to add
   * @param {number} depth - Current depth
   * @param {string} csv - CSV string being built
   */
  addPagesToCSV(pages, depth, csv) {
    pages.forEach(page => {
      csv += `Page,${page.id},"${this.escapeCSV(page.title)}",${page.slug},${page.parent || 0},${depth}\n`;
      
      if (page.children && page.children.length > 0) {
        this.addPagesToCSV(page.children, depth + 1, csv);
      }
    });
  }

  /**
   * Escape special characters for CSV
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeCSV(str) {
    if (!str) return '';
    return str.replace(/"/g, '""');
  }

  /**
   * Get the schema for the tool
   * @returns {Object} Tool schema
   */
  getSchema() {
    return {
      $id: 'full-hierarchy-tool-schema',
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['map', 'analyze', 'export'],
          description: 'Action to perform with the full hierarchy tool'
        },
        data: {
          type: 'object',
          properties: {
            contentTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['all', 'pages', 'posts', 'categories', 'tags', 'custom_post_types', 'taxonomies']
              },
              description: 'Content types to include in the hierarchy'
            },
            includeTemplates: {
              type: 'boolean',
              description: 'Whether to include templates in the hierarchy'
            },
            includeBlocks: {
              type: 'boolean',
              description: 'Whether to include blocks in the hierarchy'
            },
            hierarchy: {
              type: 'object',
              description: 'Hierarchy data for analysis or export'
            },
            format: {
              type: 'string',
              enum: ['json', 'xml', 'csv'],
              description: 'Format for exporting the hierarchy'
            }
          }
        }
      },
      required: ['action']
    };
  }
}

module.exports = FullHierarchyTool;