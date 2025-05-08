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
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'get', 'create', 'update', 'delete'],
          description: 'Action to perform on the WooCommerce resource'
        },
        resource: {
          type: 'string',
          enum: ['product', 'order', 'customer', 'setting'],
          description: 'Type of WooCommerce resource to manage'
        },
        data: {
          type: 'object',
          description: 'Data specific to the action and resource type'
        }
      },
      required: ['action', 'resource']
    };
  }
}

module.exports = WooCommerceManagerTool; 