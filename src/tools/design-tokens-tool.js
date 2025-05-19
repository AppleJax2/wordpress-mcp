/**
 * Design Tokens Tool
 * Manages design tokens for WordPress themes (theme.json)
 */
const { BaseTool } = require('./base-tool');
const WordPressAPI = require('../api/wordpress');

class DesignTokensTool extends BaseTool {
  constructor() {
    super('design_tokens_tool', 'Manages design tokens for WordPress themes');
    this.api = new WordPressAPI();
  }
  
  /**
   * Execute the design tokens tool
   * @param {Object} params - Parameters for the design tokens operation
   * @param {string} params.action - Action to perform (get, set, export, import, analyze)
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
          return await this.getDesignTokens(data);
        case 'set':
          return await this.setDesignTokens(data);
        case 'export':
          return await this.exportDesignTokens(data);
        case 'import':
          return await this.importDesignTokens(data);
        case 'analyze':
          return await this.analyzeDesignTokens(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error('Error executing design tokens tool:', error);
      throw error;
    }
  }

  /**
   * Get design tokens from the current theme
   * @param {Object} data - Parameters for getting design tokens
   * @param {string} data.type - Type of tokens to get (colors, typography, spacing, etc.)
   * @returns {Object} Design tokens
   */
  async getDesignTokens(data) {
    const { type } = data;
    
    // Get the current theme.json content
    const themeData = await this.api.getThemeJsonData();
    
    if (!themeData) {
      return { success: false, message: 'Unable to retrieve theme data' };
    }
    
    // If a specific token type is requested, return only that section
    if (type && themeData.settings) {
      if (type === 'colors' && themeData.settings.color) {
        return { 
          success: true, 
          tokens: themeData.settings.color,
          message: 'Retrieved color tokens successfully'
        };
      } else if (type === 'typography' && themeData.settings.typography) {
        return { 
          success: true, 
          tokens: themeData.settings.typography,
          message: 'Retrieved typography tokens successfully'
        };
      } else if (type === 'spacing' && themeData.settings.spacing) {
        return { 
          success: true, 
          tokens: themeData.settings.spacing,
          message: 'Retrieved spacing tokens successfully'
        };
      } else if (type === 'custom' && themeData.settings.custom) {
        return { 
          success: true, 
          tokens: themeData.settings.custom,
          message: 'Retrieved custom tokens successfully'
        };
      } else if (type === 'all') {
        return { 
          success: true, 
          tokens: themeData.settings,
          message: 'Retrieved all design tokens successfully'
        };
      }
      
      return { 
        success: false, 
        message: `Token type '${type}' not found in theme.json` 
      };
    }
    
    // Return all settings if no specific type requested
    return { 
      success: true, 
      tokens: themeData.settings || {},
      message: 'Retrieved all design tokens successfully'
    };
  }

  /**
   * Set design tokens for the current theme
   * @param {Object} data - Parameters for setting design tokens
   * @param {string} data.type - Type of tokens to set (colors, typography, spacing, etc.)
   * @param {Object} data.tokens - The tokens to set
   * @returns {Object} Result of the operation
   */
  async setDesignTokens(data) {
    const { type, tokens } = data;
    
    if (!type || !tokens) {
      return { 
        success: false, 
        message: 'Missing required parameters: type and tokens' 
      };
    }
    
    // Get the current theme.json content
    const themeData = await this.api.getThemeJsonData();
    
    if (!themeData) {
      return { success: false, message: 'Unable to retrieve theme data' };
    }
    
    // Ensure settings object exists
    if (!themeData.settings) {
      themeData.settings = {};
    }
    
    // Update the appropriate section based on token type
    if (type === 'colors') {
      themeData.settings.color = tokens;
    } else if (type === 'typography') {
      themeData.settings.typography = tokens;
    } else if (type === 'spacing') {
      themeData.settings.spacing = tokens;
    } else if (type === 'custom') {
      themeData.settings.custom = tokens;
    } else {
      return { 
        success: false, 
        message: `Unsupported token type: ${type}` 
      };
    }
    
    // Update the theme.json file
    const result = await this.api.updateThemeJsonData(themeData);
    
    return { 
      success: result, 
      message: result 
        ? `Successfully updated ${type} tokens` 
        : `Failed to update ${type} tokens`
    };
  }

  /**
   * Export design tokens to different formats
   * @param {Object} data - Parameters for exporting design tokens
   * @param {string} data.format - Format to export to (json, css, scss)
   * @param {string} data.type - Type of tokens to export (optional)
   * @returns {Object} Exported tokens
   */
  async exportDesignTokens(data) {
    const { format = 'json', type } = data;
    
    // Get the tokens
    const tokensResult = await this.getDesignTokens({ type: type || 'all' });
    
    if (!tokensResult.success) {
      return tokensResult;
    }
    
    const tokens = tokensResult.tokens;
    
    // Export in the requested format
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(tokens, null, 2),
        message: 'Tokens exported as JSON successfully'
      };
    } else if (format === 'css') {
      return {
        success: true,
        data: this.generateCssVariables(tokens),
        message: 'Tokens exported as CSS variables successfully'
      };
    } else if (format === 'scss') {
      return {
        success: true,
        data: this.generateScssVariables(tokens),
        message: 'Tokens exported as SCSS variables successfully'
      };
    }
    
    return {
      success: false,
      message: `Unsupported export format: ${format}`
    };
  }

  /**
   * Import design tokens from different sources
   * @param {Object} data - Parameters for importing design tokens
   * @param {string} data.source - Source of the tokens (json, figma)
   * @param {Object} data.tokens - The tokens to import
   * @returns {Object} Result of the operation
   */
  async importDesignTokens(data) {
    const { source, tokens } = data;
    
    if (!source || !tokens) {
      return {
        success: false,
        message: 'Missing required parameters: source and tokens'
      };
    }
    
    let parsedTokens;
    try {
      parsedTokens = typeof tokens === 'string' ? JSON.parse(tokens) : tokens;
    } catch (error) {
      return {
        success: false,
        message: 'Invalid tokens format. Expected valid JSON.'
      };
    }
    
    // Get the current theme.json content
    const themeData = await this.api.getThemeJsonData();
    
    if (!themeData) {
      return { success: false, message: 'Unable to retrieve theme data' };
    }
    
    // Ensure version is set
    themeData.version = themeData.version || 2;
    
    // Ensure settings object exists
    if (!themeData.settings) {
      themeData.settings = {};
    }
    
    // Process tokens based on source
    if (source === 'json') {
      // Direct mapping from JSON
      if (parsedTokens.color) {
        themeData.settings.color = parsedTokens.color;
      }
      if (parsedTokens.typography) {
        themeData.settings.typography = parsedTokens.typography;
      }
      if (parsedTokens.spacing) {
        themeData.settings.spacing = parsedTokens.spacing;
      }
      if (parsedTokens.custom) {
        themeData.settings.custom = parsedTokens.custom;
      }
    } else if (source === 'figma') {
      // Process Figma design tokens
      this.processFigmaTokens(themeData, parsedTokens);
    } else {
      return {
        success: false,
        message: `Unsupported import source: ${source}`
      };
    }
    
    // Update the theme.json file
    const result = await this.api.updateThemeJsonData(themeData);
    
    return {
      success: result,
      message: result 
        ? 'Successfully imported design tokens' 
        : 'Failed to import design tokens'
    };
  }

  /**
   * Analyze theme design tokens and provide insights
   * @param {Object} data - Parameters for analyzing design tokens
   * @returns {Object} Analysis results
   */
  async analyzeDesignTokens(data) {
    // Get all tokens
    const tokensResult = await this.getDesignTokens({ type: 'all' });
    
    if (!tokensResult.success) {
      return tokensResult;
    }
    
    const tokens = tokensResult.tokens;
    const analysis = {
      colorCount: 0,
      fontFamiliesCount: 0,
      fontSizesCount: 0,
      customTokensCount: 0,
      issues: [],
      recommendations: []
    };
    
    // Analyze colors
    if (tokens.color && tokens.color.palette) {
      analysis.colorCount = tokens.color.palette.length;
      
      // Check for color contrast issues
      if (analysis.colorCount > 0) {
        const backgroundColor = tokens.color.palette.find(c => c.slug === 'background');
        const textColor = tokens.color.palette.find(c => c.slug === 'text');
        
        if (backgroundColor && textColor) {
          // Simple contrast check - this would need to be replaced with a proper contrast algorithm
          if (backgroundColor.color === textColor.color) {
            analysis.issues.push('Text and background colors are identical, causing readability issues');
          }
        }
        
        if (analysis.colorCount > 10) {
          analysis.recommendations.push('Consider reducing the number of colors for better consistency');
        }
      }
    }
    
    // Analyze typography
    if (tokens.typography) {
      if (tokens.typography.fontFamilies) {
        analysis.fontFamiliesCount = tokens.typography.fontFamilies.length;
        
        if (analysis.fontFamiliesCount > 3) {
          analysis.recommendations.push('Using more than 3 font families can affect performance and design consistency');
        }
      }
      
      if (tokens.typography.fontSizes) {
        analysis.fontSizesCount = tokens.typography.fontSizes.length;
        
        if (analysis.fontSizesCount < 3) {
          analysis.recommendations.push('Consider adding more font size options for better typographic hierarchy');
        }
      }
    }
    
    // Analyze custom tokens
    if (tokens.custom) {
      analysis.customTokensCount = Object.keys(tokens.custom).length;
    }
    
    // Check for missing essential tokens
    if (!tokens.color || !tokens.color.palette || tokens.color.palette.length === 0) {
      analysis.issues.push('No color palette defined');
    }
    
    if (!tokens.typography || !tokens.typography.fontSizes || tokens.typography.fontSizes.length === 0) {
      analysis.issues.push('No font sizes defined');
    }
    
    return {
      success: true,
      analysis,
      message: 'Design tokens analyzed successfully'
    };
  }

  /**
   * Process Figma design tokens and map them to theme.json format
   * @param {Object} themeData - Current theme.json data
   * @param {Object} figmaTokens - Tokens exported from Figma
   */
  processFigmaTokens(themeData, figmaTokens) {
    // Ensure settings objects exist
    if (!themeData.settings.color) themeData.settings.color = {};
    if (!themeData.settings.typography) themeData.settings.typography = {};
    if (!themeData.settings.spacing) themeData.settings.spacing = {};
    if (!themeData.settings.custom) themeData.settings.custom = {};
    
    // Process color tokens
    if (figmaTokens.colors) {
      themeData.settings.color.palette = figmaTokens.colors.map(color => ({
        name: color.name,
        slug: this.slugify(color.name),
        color: color.value
      }));
    }
    
    // Process typography tokens
    if (figmaTokens.typography) {
      // Font families
      if (figmaTokens.typography.fontFamilies) {
        themeData.settings.typography.fontFamilies = figmaTokens.typography.fontFamilies.map(font => ({
          name: font.name,
          slug: this.slugify(font.name),
          fontFamily: font.value
        }));
      }
      
      // Font sizes
      if (figmaTokens.typography.fontSizes) {
        themeData.settings.typography.fontSizes = figmaTokens.typography.fontSizes.map(size => ({
          name: size.name,
          slug: this.slugify(size.name),
          size: size.value
        }));
      }
    }
    
    // Process spacing tokens
    if (figmaTokens.spacing) {
      themeData.settings.spacing.spacingSizes = figmaTokens.spacing.map(space => ({
        name: space.name,
        slug: this.slugify(space.name),
        size: space.value
      }));
    }
    
    // Process other custom tokens
    if (figmaTokens.other) {
      Object.keys(figmaTokens.other).forEach(key => {
        themeData.settings.custom[key] = figmaTokens.other[key];
      });
    }
  }

  /**
   * Generate CSS variables from design tokens
   * @param {Object} tokens - Design tokens
   * @returns {string} CSS variables
   */
  generateCssVariables(tokens) {
    let css = ':root {\n';
    
    // Process color palette
    if (tokens.color && tokens.color.palette) {
      tokens.color.palette.forEach(color => {
        css += `  --wp--preset--color--${color.slug}: ${color.color};\n`;
      });
    }
    
    // Process typography
    if (tokens.typography) {
      // Font sizes
      if (tokens.typography.fontSizes) {
        tokens.typography.fontSizes.forEach(size => {
          css += `  --wp--preset--font-size--${size.slug}: ${size.size}${typeof size.size === 'number' ? 'px' : ''};\n`;
        });
      }
      
      // Font families
      if (tokens.typography.fontFamilies) {
        tokens.typography.fontFamilies.forEach(font => {
          css += `  --wp--preset--font-family--${font.slug}: ${font.fontFamily};\n`;
        });
      }
    }
    
    // Process spacing
    if (tokens.spacing && tokens.spacing.spacingSizes) {
      tokens.spacing.spacingSizes.forEach(space => {
        css += `  --wp--preset--spacing--${space.slug}: ${space.size};\n`;
      });
    }
    
    // Process custom tokens
    if (tokens.custom) {
      this.processCustomTokens(tokens.custom, css, '--wp--custom--');
    }
    
    css += '}\n';
    return css;
  }

  /**
   * Generate SCSS variables from design tokens
   * @param {Object} tokens - Design tokens
   * @returns {string} SCSS variables
   */
  generateScssVariables(tokens) {
    let scss = '// Design tokens generated from theme.json\n\n';
    
    // Process color palette
    if (tokens.color && tokens.color.palette) {
      scss += '// Colors\n';
      tokens.color.palette.forEach(color => {
        scss += `$color-${color.slug}: ${color.color};\n`;
      });
      scss += '\n';
    }
    
    // Process typography
    if (tokens.typography) {
      // Font sizes
      if (tokens.typography.fontSizes) {
        scss += '// Font sizes\n';
        tokens.typography.fontSizes.forEach(size => {
          scss += `$font-size-${size.slug}: ${size.size}${typeof size.size === 'number' ? 'px' : ''};\n`;
        });
        scss += '\n';
      }
      
      // Font families
      if (tokens.typography.fontFamilies) {
        scss += '// Font families\n';
        tokens.typography.fontFamilies.forEach(font => {
          scss += `$font-family-${font.slug}: ${font.fontFamily};\n`;
        });
        scss += '\n';
      }
    }
    
    // Process spacing
    if (tokens.spacing && tokens.spacing.spacingSizes) {
      scss += '// Spacing\n';
      tokens.spacing.spacingSizes.forEach(space => {
        scss += `$spacing-${space.slug}: ${space.size};\n`;
      });
      scss += '\n';
    }
    
    return scss;
  }

  /**
   * Process custom tokens recursively and add them to CSS string
   * @param {Object} customTokens - Custom tokens object
   * @param {string} css - CSS string being built
   * @param {string} prefix - Current variable prefix
   */
  processCustomTokens(customTokens, css, prefix) {
    Object.keys(customTokens).forEach(key => {
      const value = customTokens[key];
      const kebabKey = this.camelToKebab(key);
      const newPrefix = `${prefix}${kebabKey}--`;
      
      if (typeof value === 'object' && value !== null) {
        this.processCustomTokens(value, css, newPrefix);
      } else {
        css += `  ${prefix}${kebabKey}: ${value};\n`;
      }
    });
  }

  /**
   * Convert camelCase to kebab-case
   * @param {string} str - camelCase string
   * @returns {string} kebab-case string
   */
  camelToKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Convert a string to a slug
   * @param {string} str - String to convert
   * @returns {string} Slugified string
   */
  slugify(str) {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get the schema for the tool
   * @returns {Object} Tool schema
   */
  getSchema() {
    return {
      $id: 'design-tokens-tool-schema',
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get', 'set', 'export', 'import', 'analyze'],
          description: 'Action to perform with the design tokens tool'
        },
        data: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['colors', 'typography', 'spacing', 'custom', 'all'],
              description: 'Type of design tokens to work with'
            },
            format: {
              type: 'string',
              enum: ['json', 'css', 'scss'],
              description: 'Format for exporting design tokens'
            },
            source: {
              type: 'string',
              enum: ['json', 'figma'],
              description: 'Source of design tokens for import'
            },
            tokens: {
              type: ['object', 'string'],
              description: 'Design tokens data for import or set operations'
            }
          }
        }
      },
      required: ['action']
    };
  }
}

module.exports = DesignTokensTool;