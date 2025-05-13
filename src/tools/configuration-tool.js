/**
 * Configuration Tool
 * Manages global site configuration and settings
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');

class ConfigurationTool extends BaseTool {
  constructor() {
    super('configuration_tool', 'Manages global site configuration and settings');
    this.api = new WordPressAPI();
  }
  
  /**
   * Execute the configuration tool
   * @param {Object} params - Parameters for the configuration operation
   * @param {string} params.action - Action to perform (get, set, reset, export, import)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { 
        action = 'get', 
        data = {} 
      } = params;
      
      switch (action) {
        case 'get':
          return await this.getConfiguration(data);
        case 'set':
          return await this.setConfiguration(data);
        case 'reset':
          return await this.resetConfiguration(data);
        case 'export':
          return await this.exportConfiguration(data);
        case 'import':
          return await this.importConfiguration(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error('Error executing configuration tool:', error);
      throw error;
    }
  }

  /**
   * Get configuration settings
   * @param {Object} data - Parameters for getting configuration
   * @param {string} data.section - Configuration section to get (optional)
   * @param {string} data.key - Specific configuration key to get (optional)
   * @returns {Object} Configuration settings
   */
  async getConfiguration(data) {
    const { section, key } = data;
    
    // Get all configuration
    const config = await this.getAllConfiguration();
    
    // Return specific section or key if requested
    if (section) {
      if (!config[section]) {
        return {
          success: false,
          message: `Configuration section '${section}' not found`
        };
      }
      
      if (key) {
        if (config[section][key] === undefined) {
          return {
            success: false,
            message: `Configuration key '${key}' not found in section '${section}'`
          };
        }
        
        return {
          success: true,
          configuration: {
            [section]: {
              [key]: config[section][key]
            }
          },
          message: `Configuration value for '${section}.${key}' retrieved successfully`
        };
      }
      
      return {
        success: true,
        configuration: {
          [section]: config[section]
        },
        message: `Configuration section '${section}' retrieved successfully`
      };
    }
    
    return {
      success: true,
      configuration: config,
      message: 'All configuration settings retrieved successfully'
    };
  }

  /**
   * Set configuration settings
   * @param {Object} data - Parameters for setting configuration
   * @param {string} data.section - Configuration section to set
   * @param {string} data.key - Configuration key to set (optional if setting an entire section)
   * @param {any} data.value - Value to set
   * @returns {Object} Result of the operation
   */
  async setConfiguration(data) {
    const { section, key, value } = data;
    
    if (!section) {
      return {
        success: false,
        message: 'Configuration section is required'
      };
    }
    
    // Get current configuration
    const config = await this.getAllConfiguration();
    
    // Ensure section exists
    if (!config[section]) {
      config[section] = {};
    }
    
    // Set value for specific key or entire section
    if (key) {
      config[section][key] = value;
    } else {
      if (typeof value !== 'object') {
        return {
          success: false,
          message: 'Value must be an object when setting an entire section'
        };
      }
      
      config[section] = value;
    }
    
    // Save the updated configuration
    const result = await this.saveConfiguration(config);
    
    if (!result) {
      return {
        success: false,
        message: 'Failed to save configuration'
      };
    }
    
    return {
      success: true,
      message: key 
        ? `Configuration value for '${section}.${key}' set successfully` 
        : `Configuration section '${section}' set successfully`
    };
  }

  /**
   * Reset configuration settings to defaults
   * @param {Object} data - Parameters for resetting configuration
   * @param {string} data.section - Configuration section to reset (optional)
   * @param {string} data.key - Configuration key to reset (optional)
   * @returns {Object} Result of the operation
   */
  async resetConfiguration(data) {
    const { section, key } = data;
    
    // Get default configuration
    const defaultConfig = await this.getDefaultConfiguration();
    
    // Get current configuration
    const currentConfig = await this.getAllConfiguration();
    
    // Reset specific section, key, or all configuration
    if (section) {
      if (!defaultConfig[section]) {
        return {
          success: false,
          message: `Default configuration section '${section}' not found`
        };
      }
      
      if (key) {
        if (defaultConfig[section][key] === undefined) {
          return {
            success: false,
            message: `Default configuration key '${key}' not found in section '${section}'`
          };
        }
        
        // Reset specific key
        currentConfig[section][key] = defaultConfig[section][key];
      } else {
        // Reset entire section
        currentConfig[section] = { ...defaultConfig[section] };
      }
    } else {
      // Reset all configuration
      Object.keys(defaultConfig).forEach(section => {
        currentConfig[section] = { ...defaultConfig[section] };
      });
    }
    
    // Save the updated configuration
    const result = await this.saveConfiguration(currentConfig);
    
    if (!result) {
      return {
        success: false,
        message: 'Failed to reset configuration'
      };
    }
    
    return {
      success: true,
      message: key 
        ? `Configuration value for '${section}.${key}' reset to default` 
        : section 
          ? `Configuration section '${section}' reset to defaults` 
          : 'All configuration settings reset to defaults'
    };
  }

  /**
   * Export configuration settings
   * @param {Object} data - Parameters for exporting configuration
   * @param {string} data.format - Format to export to (json, php)
   * @param {string} data.section - Configuration section to export (optional)
   * @returns {Object} Exported configuration
   */
  async exportConfiguration(data) {
    const { format = 'json', section } = data;
    
    // Get configuration to export
    const config = await this.getAllConfiguration();
    const exportConfig = section ? { [section]: config[section] } : config;
    
    // Export in the requested format
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(exportConfig, null, 2),
        format: 'json',
        message: section 
          ? `Configuration section '${section}' exported as JSON successfully` 
          : 'All configuration settings exported as JSON successfully'
      };
    } else if (format === 'php') {
      return {
        success: true,
        data: this.configToPHP(exportConfig),
        format: 'php',
        message: section 
          ? `Configuration section '${section}' exported as PHP successfully` 
          : 'All configuration settings exported as PHP successfully'
      };
    }
    
    return {
      success: false,
      message: `Unsupported export format: ${format}`
    };
  }

  /**
   * Import configuration settings
   * @param {Object} data - Parameters for importing configuration
   * @param {string} data.format - Format to import from (json, php)
   * @param {any} data.configuration - Configuration to import
   * @param {boolean} data.overwrite - Whether to overwrite existing settings (default: false)
   * @returns {Object} Result of the operation
   */
  async importConfiguration(data) {
    const { 
      format = 'json', 
      configuration, 
      overwrite = false
    } = data;
    
    if (!configuration) {
      return {
        success: false,
        message: 'Configuration to import is required'
      };
    }
    
    // Parse the configuration based on format
    let parsedConfig;
    try {
      if (format === 'json') {
        parsedConfig = typeof configuration === 'string' 
          ? JSON.parse(configuration) 
          : configuration;
      } else if (format === 'php') {
        // PHP import would require a more complex parser
        // For now, just returning an error
        return {
          success: false,
          message: 'PHP import is not implemented yet'
        };
      } else {
        return {
          success: false,
          message: `Unsupported import format: ${format}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to parse configuration: ${error.message}`
      };
    }
    
    // Get current configuration
    const currentConfig = await this.getAllConfiguration();
    
    // Merge configurations based on overwrite flag
    const mergedConfig = overwrite 
      ? { ...currentConfig, ...parsedConfig } 
      : this.deepMerge(currentConfig, parsedConfig);
    
    // Save the merged configuration
    const result = await this.saveConfiguration(mergedConfig);
    
    if (!result) {
      return {
        success: false,
        message: 'Failed to import configuration'
      };
    }
    
    return {
      success: true,
      message: 'Configuration imported successfully'
    };
  }

  /**
   * Get all configuration settings
   * @returns {Object} All configuration settings
   */
  async getAllConfiguration() {
    // This would fetch real configuration from the database
    // For now, returning sample data
    return {
      general: {
        siteName: 'Example Site',
        tagline: 'Just another WordPress site',
        siteUrl: 'https://example.com',
        adminEmail: 'admin@example.com',
        language: 'en_US',
        timezone: 'UTC'
      },
      reading: {
        postsPerPage: 10,
        showOnFront: 'page',
        pageForPosts: 1,
        pageOnFront: 2
      },
      writing: {
        defaultCategory: 1,
        defaultPostFormat: 'standard',
        useSmilies: true,
        formatForPosts: 'standard'
      },
      discussion: {
        defaultCommentStatus: 'open',
        defaultPingStatus: 'open',
        commentRegistration: false,
        requireNameEmail: true,
        commentModeration: true
      },
      media: {
        imageMaxWidth: 2500,
        imageMaxHeight: 2500,
        thumbnailWidth: 150,
        thumbnailHeight: 150,
        mediumWidth: 300,
        mediumHeight: 300,
        largeWidth: 1024,
        largeHeight: 1024
      },
      permalinks: {
        structure: '/%postname%/',
        categoryBase: '',
        tagBase: ''
      },
      privacy: {
        showPrivacyPolicyPage: true,
        privacyPolicyPage: 3
      }
    };
  }

  /**
   * Get default configuration settings
   * @returns {Object} Default configuration settings
   */
  async getDefaultConfiguration() {
    // This would fetch default configuration
    // For now, returning sample default data
    return {
      general: {
        siteName: 'WordPress Site',
        tagline: 'Just another WordPress site',
        siteUrl: '',
        adminEmail: '',
        language: 'en_US',
        timezone: 'UTC'
      },
      reading: {
        postsPerPage: 10,
        showOnFront: 'posts',
        pageForPosts: 0,
        pageOnFront: 0
      },
      writing: {
        defaultCategory: 1,
        defaultPostFormat: 'standard',
        useSmilies: true,
        formatForPosts: 'standard'
      },
      discussion: {
        defaultCommentStatus: 'open',
        defaultPingStatus: 'open',
        commentRegistration: false,
        requireNameEmail: true,
        commentModeration: true
      },
      media: {
        imageMaxWidth: 2500,
        imageMaxHeight: 2500,
        thumbnailWidth: 150,
        thumbnailHeight: 150,
        mediumWidth: 300,
        mediumHeight: 300,
        largeWidth: 1024,
        largeHeight: 1024
      },
      permalinks: {
        structure: '',
        categoryBase: '',
        tagBase: ''
      },
      privacy: {
        showPrivacyPolicyPage: false,
        privacyPolicyPage: 0
      }
    };
  }

  /**
   * Save configuration settings
   * @param {Object} config - Configuration settings to save
   * @returns {boolean} Whether the save was successful
   */
  async saveConfiguration(config) {
    // This would save real configuration to the database
    // For now, simulating a successful save
    return true;
  }

  /**
   * Convert configuration to PHP code
   * @param {Object} config - Configuration to convert
   * @returns {string} PHP code
   */
  configToPHP(config) {
    // This would convert configuration to PHP code
    // For now, returning a simple representation
    let php = "<?php\n\n";
    php += "// WordPress Configuration\n";
    php += "// Generated by Configuration Tool\n\n";
    
    Object.keys(config).forEach(section => {
      php += `// ${section} settings\n`;
      
      Object.keys(config[section]).forEach(key => {
        const value = config[section][key];
        let phpValue;
        
        if (typeof value === 'string') {
          phpValue = `'${value.replace(/'/g, "\\'")}'`;
        } else if (typeof value === 'boolean') {
          phpValue = value ? 'true' : 'false';
        } else if (value === null) {
          phpValue = 'null';
        } else if (Array.isArray(value)) {
          phpValue = `array(${value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : v).join(', ')})`;
        } else if (typeof value === 'object') {
          // Simple object representation
          const entries = Object.entries(value).map(([k, v]) => {
            const val = typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : v;
            return `'${k}' => ${val}`;
          }).join(', ');
          phpValue = `array(${entries})`;
        } else {
          phpValue = value;
        }
        
        php += `update_option('${section}_${key}', ${phpValue});\n`;
      });
      
      php += "\n";
    });
    
    return php;
  }

  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   * @param {any} item - Value to check
   * @returns {boolean} Whether the value is an object
   */
  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  /**
   * Get the schema for the tool
   * @returns {Object} Tool schema
   */
  getSchema() {
    return {
      $id: 'configuration-tool-schema',
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get', 'set', 'reset', 'export', 'import'],
          description: 'Action to perform with the configuration tool'
        },
        data: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'Configuration section to operate on'
            },
            key: {
              type: 'string',
              description: 'Configuration key to operate on'
            },
            value: {
              type: ['string', 'number', 'boolean', 'object', 'array'],
              description: 'Value to set for the configuration key'
            },
            format: {
              type: 'string',
              enum: ['json', 'php'],
              description: 'Format for exporting or importing configuration'
            },
            configuration: {
              type: ['string', 'object'],
              description: 'Configuration to import'
            },
            overwrite: {
              type: 'boolean',
              description: 'Whether to overwrite existing settings when importing'
            }
          }
        }
      },
      required: ['action']
    };
  }
}

module.exports = ConfigurationTool;