/**
 * WooCommerce Manager Tool
 * Comprehensive tool for managing WooCommerce products, orders, customers, and store settings
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class WooCommerceManagerTool extends BaseTool {
  constructor() {
    super('wordpress_woocommerce_manager', 'Comprehensive tool for managing WooCommerce products, orders, customers, and store settings');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the WooCommerce manager tool
   * @param {Object} params - Parameters for the WooCommerce operation
   * @param {string} params.action - Action to perform
   * @param {string} params.resource - Resource type (product, order, customer, setting)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { 
        action = 'list',
        resource = 'product',
        data = {} 
      } = params;
      
      // Map the action and resource to specific methods
      switch (resource) {
        case 'product':
          switch (action) {
            case 'list': return await this.listProducts(data);
            case 'get': return await this.getProduct(data);
            case 'create': return await this.createProduct(data);
            case 'update': return await this.updateProduct(data);
            case 'delete': return await this.deleteProduct(data);
            default: throw new Error(`Unsupported product action: ${action}`);
          }
        
        case 'order':
          switch (action) {
            case 'list': return await this.listOrders(data);
            case 'get': return await this.getOrder(data);
            case 'update': return await this.updateOrder(data);
            case 'delete': return await this.deleteOrder(data);
            default: throw new Error(`Unsupported order action: ${action}`);
          }
        
        case 'customer':
          switch (action) {
            case 'list': return await this.listCustomers(data);
            case 'get': return await this.getCustomer(data);
            case 'create': return await this.createCustomer(data);
            case 'update': return await this.updateCustomer(data);
            case 'delete': return await this.deleteCustomer(data);
            default: throw new Error(`Unsupported customer action: ${action}`);
          }
        
        case 'setting':
          switch (action) {
            case 'list': return await this.listSettings(data);
            case 'get': return await this.getSetting(data);
            case 'update': return await this.updateSetting(data);
            default: throw new Error(`Unsupported setting action: ${action}`);
          }
        
        default:
          throw new Error(`Unsupported WooCommerce resource: ${resource}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * List WooCommerce products with optional filtering
   */
  async listProducts(data) {
    try {
      const { 
        search = '',
        status = '',
        category = '',
        tag = '',
        type = '',
        sku = '',
        featured = null,
        order = 'desc',
        orderBy = 'date',
        page = 1,
        perPage = 20
      } = data;
      
      // Build parameters
      const params = {
        search,
        status,
        type,
        sku,
        page,
        per_page: perPage,
        order,
        orderby: orderBy
      };
      
      if (category) params.category = category;
      if (tag) params.tag = tag;
      if (featured !== null) params.featured = featured;
      
      // Get products
      const response = await this.api.getWooCommerceProducts(params);
      
      // Extract pagination info
      const totalItems = parseInt(response.headers?.['x-wp-total'] || '0', 10);
      const totalPages = parseInt(response.headers?.['x-wp-totalpages'] || '0', 10);
      
      return {
        success: true,
        data: {
          items: response.data,
          totalItems,
          totalPages,
          currentPage: page
        }
      };
    } catch (error) {
      return this.handleError(error, 'listProducts');
    }
  }
  
  /**
   * Get a single WooCommerce product
   */
  async getProduct(data) {
    try {
      const { id } = data;
      
      if (!id) {
        throw new Error('Product ID is required');
      }
      
      const product = await this.api.getWooCommerceProduct(id);
      
      return {
        success: true,
        data: { product }
      };
    } catch (error) {
      return this.handleError(error, 'getProduct');
    }
  }
  
  /**
   * Create a new WooCommerce product
   */
  async createProduct(data) {
    try {
      const { 
        name,
        type = 'simple',
        status = 'draft',
        featured = false,
        catalog_visibility = 'visible',
        description = '',
        short_description = '',
        sku = '',
        regular_price = '',
        sale_price = '',
        virtual = false,
        downloadable = false,
        categories = [],
        tags = [],
        attributes = [],
        images = [],
        stock_status = 'instock',
        manage_stock = false,
        stock_quantity = null
      } = data;
      
      // Required fields
      if (!name) {
        throw new Error('Product name is required');
      }
      
      // Create the product object
      const productData = {
        name,
        type,
        status,
        featured,
        catalog_visibility,
        description,
        short_description,
        sku,
        regular_price: regular_price.toString(),
        virtual,
        downloadable
      };
      
      // Add optional fields
      if (sale_price) productData.sale_price = sale_price.toString();
      if (categories.length > 0) productData.categories = categories;
      if (tags.length > 0) productData.tags = tags;
      if (attributes.length > 0) productData.attributes = attributes;
      if (images.length > 0) productData.images = images;
      
      // Add stock management fields
      productData.stock_status = stock_status;
      if (manage_stock) {
        productData.manage_stock = true;
        if (stock_quantity !== null) {
          productData.stock_quantity = stock_quantity;
        }
      }
      
      // Create the product
      const product = await this.api.createWooCommerceProduct(productData);
      
      return {
        success: true,
        data: {
          id: product.id,
          name: product.name,
          status: product.status,
          type: product.type,
          permalink: product.permalink
        }
      };
    } catch (error) {
      return this.handleError(error, 'createProduct');
    }
  }
  
  /**
   * Update an existing WooCommerce product
   */
  async updateProduct(data) {
    try {
      const { id, ...updateData } = data;
      
      if (!id) {
        throw new Error('Product ID is required');
      }
      
      // Convert prices to strings if they exist
      if (updateData.regular_price) {
        updateData.regular_price = updateData.regular_price.toString();
      }
      if (updateData.sale_price) {
        updateData.sale_price = updateData.sale_price.toString();
      }
      
      // Update the product
      const product = await this.api.updateWooCommerceProduct(id, updateData);
      
      return {
        success: true,
        data: {
          id: product.id,
          name: product.name,
          status: product.status,
          type: product.type,
          permalink: product.permalink
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateProduct');
    }
  }
  
  /**
   * Delete a WooCommerce product
   */
  async deleteProduct(data) {
    try {
      const { id, force = false } = data;
      
      if (!id) {
        throw new Error('Product ID is required');
      }
      
      await this.api.deleteWooCommerceProduct(id, force);
      
      return {
        success: true,
        data: {
          id,
          message: `Product ${id} successfully deleted`
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteProduct');
    }
  }
  
  /**
   * List WooCommerce orders with optional filtering
   */
  async listOrders(data) {
    try {
      const { 
        status = '',
        customer = '',
        product = '',
        after = '',
        before = '',
        order = 'desc',
        orderBy = 'date',
        page = 1,
        perPage = 20
      } = data;
      
      // Build parameters
      const params = {
        status,
        page,
        per_page: perPage,
        order,
        orderby: orderBy
      };
      
      if (customer) params.customer = customer;
      if (product) params.product = product;
      if (after) params.after = after;
      if (before) params.before = before;
      
      // Get orders
      const response = await this.api.getWooCommerceOrders(params);
      
      // Extract pagination info
      const totalItems = parseInt(response.headers?.['x-wp-total'] || '0', 10);
      const totalPages = parseInt(response.headers?.['x-wp-totalpages'] || '0', 10);
      
      return {
        success: true,
        data: {
          items: response.data,
          totalItems,
          totalPages,
          currentPage: page
        }
      };
    } catch (error) {
      return this.handleError(error, 'listOrders');
    }
  }
  
  /**
   * Get a single WooCommerce order
   */
  async getOrder(data) {
    try {
      const { id } = data;
      
      if (!id) {
        throw new Error('Order ID is required');
      }
      
      const order = await this.api.getWooCommerceOrder(id);
      
      return {
        success: true,
        data: { order }
      };
    } catch (error) {
      return this.handleError(error, 'getOrder');
    }
  }
  
  /**
   * Update an existing WooCommerce order
   */
  async updateOrder(data) {
    try {
      const { id, ...updateData } = data;
      
      if (!id) {
        throw new Error('Order ID is required');
      }
      
      // Update the order
      const order = await this.api.updateWooCommerceOrder(id, updateData);
      
      return {
        success: true,
        data: {
          id: order.id,
          status: order.status,
          total: order.total,
          currency: order.currency
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateOrder');
    }
  }
  
  /**
   * Delete a WooCommerce order
   */
  async deleteOrder(data) {
    try {
      const { id, force = false } = data;
      
      if (!id) {
        throw new Error('Order ID is required');
      }
      
      await this.api.deleteWooCommerceOrder(id, force);
      
      return {
        success: true,
        data: {
          id,
          message: `Order ${id} successfully deleted`
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteOrder');
    }
  }
  
  /**
   * List WooCommerce customers with optional filtering
   */
  async listCustomers(data) {
    try {
      const { 
        search = '',
        email = '',
        role = '',
        order = 'desc',
        orderBy = 'registered_date',
        page = 1,
        perPage = 20
      } = data;
      
      // Build parameters
      const params = {
        search,
        email,
        role,
        page,
        per_page: perPage,
        order,
        orderby: orderBy
      };
      
      // Get customers
      const response = await this.api.getWooCommerceCustomers(params);
      
      // Extract pagination info
      const totalItems = parseInt(response.headers?.['x-wp-total'] || '0', 10);
      const totalPages = parseInt(response.headers?.['x-wp-totalpages'] || '0', 10);
      
      return {
        success: true,
        data: {
          items: response.data,
          totalItems,
          totalPages,
          currentPage: page
        }
      };
    } catch (error) {
      return this.handleError(error, 'listCustomers');
    }
  }
  
  /**
   * Get a single WooCommerce customer
   */
  async getCustomer(data) {
    try {
      const { id } = data;
      
      if (!id) {
        throw new Error('Customer ID is required');
      }
      
      const customer = await this.api.getWooCommerceCustomer(id);
      
      return {
        success: true,
        data: { customer }
      };
    } catch (error) {
      return this.handleError(error, 'getCustomer');
    }
  }
  
  /**
   * Create a new WooCommerce customer
   */
  async createCustomer(data) {
    try {
      const { 
        email,
        first_name,
        last_name,
        username = '',
        password = '',
        billing = {},
        shipping = {}
      } = data;
      
      // Required fields
      if (!email) {
        throw new Error('Customer email is required');
      }
      
      // Create the customer object
      const customerData = {
        email,
        first_name,
        last_name
      };
      
      // Add optional fields
      if (username) customerData.username = username;
      if (password) customerData.password = password;
      if (Object.keys(billing).length > 0) customerData.billing = billing;
      if (Object.keys(shipping).length > 0) customerData.shipping = shipping;
      
      // Create the customer
      const customer = await this.api.createWooCommerceCustomer(customerData);
      
      return {
        success: true,
        data: {
          id: customer.id,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name
        }
      };
    } catch (error) {
      return this.handleError(error, 'createCustomer');
    }
  }
  
  /**
   * Update an existing WooCommerce customer
   */
  async updateCustomer(data) {
    try {
      const { id, ...updateData } = data;
      
      if (!id) {
        throw new Error('Customer ID is required');
      }
      
      // Update the customer
      const customer = await this.api.updateWooCommerceCustomer(id, updateData);
      
      return {
        success: true,
        data: {
          id: customer.id,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name
        }
      };
    } catch (error) {
      return this.handleError(error, 'updateCustomer');
    }
  }
  
  /**
   * Delete a WooCommerce customer
   */
  async deleteCustomer(data) {
    try {
      const { id, force = false } = data;
      
      if (!id) {
        throw new Error('Customer ID is required');
      }
      
      await this.api.deleteWooCommerceCustomer(id, force);
      
      return {
        success: true,
        data: {
          id,
          message: `Customer ${id} successfully deleted`
        }
      };
    } catch (error) {
      return this.handleError(error, 'deleteCustomer');
    }
  }
  
  /**
   * List all WooCommerce setting groups
   */
  async listSettings(data) {
    try {
      const settings = await this.api.getWooCommerceSettings();
      
      return {
        success: true,
        data: { settings }
      };
    } catch (error) {
      return this.handleError(error, 'listSettings');
    }
  }
  
  /**
   * Get settings within a specific WooCommerce setting group
   */
  async getSetting(data) {
    try {
      const { group } = data;
      
      if (!group) {
        throw new Error('Setting group is required');
      }
      
      const settings = await this.api.getWooCommerceSettingGroup(group);
      
      return {
        success: true,
        data: { 
          group,
          settings
        }
      };
    } catch (error) {
      return this.handleError(error, 'getSetting');
    }
  }
  
  /**
   * Update a specific WooCommerce setting
   */
  async updateSetting(data) {
    try {
      const { group, id, value } = data;
      
      if (!group) {
        throw new Error('Setting group is required');
      }
      
      if (!id) {
        throw new Error('Setting ID is required');
      }
      
      if (value === undefined) {
        throw new Error('Setting value is required');
      }
      
      const setting = await this.api.updateWooCommerceSetting(group, id, { value });
      
      return {
        success: true,
        data: { setting }
      };
    } catch (error) {
      return this.handleError(error, 'updateSetting');
    }
  }
  
  /**
   * Get JSON schema for MCP
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
              enum: ["list", "get", "create", "update", "delete"],
              description: "Action to perform on the WooCommerce resource",
              default: "list"
            },
            resource: {
              type: "string",
              enum: ["product", "order", "customer", "setting"],
              description: "Type of WooCommerce resource to manage",
              default: "product"
            },
            id: {
              type: "integer",
              description: "ID of the specific resource for get, update, and delete operations"
            },
            // Common filters and pagination parameters
            search: {
              type: "string",
              description: "Search term for filtering results"
            },
            page: {
              type: "integer",
              description: "Page number for paginated results",
              default: 1,
              minimum: 1
            },
            perPage: {
              type: "integer",
              description: "Number of items per page",
              default: 20,
              minimum: 1,
              maximum: 100
            },
            order: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order (ascending or descending)",
              default: "desc"
            },
            orderBy: {
              type: "string",
              description: "Field to order results by (varies by resource)",
              default: "date"
            },
            force: {
              type: "boolean",
              description: "Whether to permanently delete the resource (true) or move to trash (false)",
              default: false
            },
            // Product specific parameters
            name: {
              type: "string",
              description: "Product name (required for create operation)"
            },
            type: {
              type: "string",
              enum: ["simple", "grouped", "external", "variable"],
              description: "Product type",
              default: "simple"
            },
            status: {
              type: "string",
              enum: ["draft", "pending", "private", "publish"],
              description: "Product status",
              default: "draft"
            },
            featured: {
              type: "boolean",
              description: "Whether the product is featured",
              default: false
            },
            catalog_visibility: {
              type: "string",
              enum: ["visible", "catalog", "search", "hidden"],
              description: "Product visibility in the catalog",
              default: "visible"
            },
            description: {
              type: "string",
              description: "Full product description (HTML allowed)"
            },
            short_description: {
              type: "string",
              description: "Short product description (HTML allowed)"
            },
            sku: {
              type: "string",
              description: "Product stock keeping unit"
            },
            regular_price: {
              type: "string",
              description: "Product regular price (string format, e.g. '29.99')"
            },
            sale_price: {
              type: "string",
              description: "Product sale price (string format, e.g. '19.99')"
            },
            virtual: {
              type: "boolean",
              description: "Whether the product is virtual (doesn't require shipping)",
              default: false
            },
            downloadable: {
              type: "boolean",
              description: "Whether the product is downloadable",
              default: false
            },
            categories: {
              type: "array",
              description: "Product categories (array of objects with id or name)",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string" }
                }
              }
            },
            tags: {
              type: "array",
              description: "Product tags (array of objects with id or name)",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string" }
                }
              }
            },
            images: {
              type: "array",
              description: "Product images (array of objects with src or id)",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  src: { type: "string" },
                  alt: { type: "string" }
                }
              }
            },
            stock_status: {
              type: "string",
              enum: ["instock", "outofstock", "onbackorder"],
              description: "Product stock status",
              default: "instock"
            },
            manage_stock: {
              type: "boolean",
              description: "Whether to enable stock management",
              default: false
            },
            stock_quantity: {
              type: "integer",
              description: "Stock quantity (if manage_stock is true)"
            },
            // Order specific filters
            customer: {
              type: "integer",
              description: "Filter orders by customer ID"
            },
            product: {
              type: "integer",
              description: "Filter orders by product ID"
            },
            after: {
              type: "string",
              description: "Filter orders placed after date (ISO8601 format, e.g. '2023-01-01T00:00:00Z')"
            },
            before: {
              type: "string",
              description: "Filter orders placed before date (ISO8601 format, e.g. '2023-12-31T23:59:59Z')"
            },
            // Customer specific parameters
            email: {
              type: "string",
              description: "Customer email (required for create operation)"
            },
            first_name: {
              type: "string",
              description: "Customer first name"
            },
            last_name: {
              type: "string",
              description: "Customer last name"
            },
            username: {
              type: "string",
              description: "Customer username (defaults to email if not provided)"
            },
            password: {
              type: "string",
              description: "Customer password (for create operation)"
            },
            billing: {
              type: "object",
              description: "Customer billing details",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                company: { type: "string" },
                address_1: { type: "string" },
                address_2: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                postcode: { type: "string" },
                country: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" }
              }
            },
            shipping: {
              type: "object",
              description: "Customer shipping details",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                company: { type: "string" },
                address_1: { type: "string" },
                address_2: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                postcode: { type: "string" },
                country: { type: "string" }
              }
            },
            // Setting specific parameters
            group: {
              type: "string",
              description: "WooCommerce setting group (e.g., 'general', 'products', 'tax', 'shipping')"
            },
            setting_id: {
              type: "string",
              description: "ID of the specific setting to update"
            },
            value: {
              type: "string",
              description: "New value for the setting"
            }
          },
          required: ["action", "resource"]
        }
      }
    };
  }
}

module.exports = WooCommerceManagerTool; 