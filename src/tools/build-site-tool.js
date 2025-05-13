/**
 * Build Site Tool
 * Automates the process of building a complete WordPress site from scratch
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');

class BuildSiteTool extends BaseTool {
  constructor() {
    super('build_site_tool', 'Automates the process of building a complete WordPress site from scratch');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the build site tool
   * @param {Object} params - Parameters for the build operation
   * @param {string} params.action - Action to perform (build, plan, status, customize)
   * @param {Object} params.data - Data specific to the action
   */
  async execute(params = {}) {
    try {
      const { 
        action = 'build', 
        data = {} 
      } = params;
      
      switch (action) {
        case 'build':
          return await this.buildSite(data);
        case 'plan':
          return await this.createBuildPlan(data);
        case 'status':
          return await this.getBuildStatus(data);
        case 'customize':
          return await this.customizeBuild(data);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error('Error executing build site tool:', error);
      throw error;
    }
  }

  /**
   * Build a complete WordPress site based on a plan or specifications
   * @param {Object} data - Parameters for building the site
   * @param {number} data.planId - ID of the build plan to use (optional)
   * @param {Object} data.siteSettings - Site settings (if not using a plan)
   * @param {Object} data.design - Design settings (if not using a plan)
   * @param {Object} data.content - Content settings (if not using a plan)
   * @param {Array} data.plugins - Plugins to install (if not using a plan)
   * @returns {Object} Build result
   */
  async buildSite(data) {
    const { 
      planId, 
      siteSettings, 
      design, 
      content, 
      plugins 
    } = data;
    
    // Get build plan if plan ID is provided
    const buildPlan = planId 
      ? await this.getBuildPlanById(planId)
      : this.createDefaultBuildPlan(siteSettings, design, content, plugins);
    
    if (!buildPlan) {
      return {
        success: false,
        message: `Build plan with ID ${planId} not found`
      };
    }
    
    // Create build session
    const buildSession = {
      id: Date.now(),
      plan: buildPlan,
      startTime: new Date().toISOString(),
      status: 'in_progress',
      steps: [],
      currentStep: 0
    };
    
    // Store the build session
    await this.storeBuildSession(buildSession);
    
    // Execute each step in the plan
    let allSuccessful = true;
    
    for (let i = 0; i < buildPlan.steps.length; i++) {
      const step = buildPlan.steps[i];
      
      // Update current step
      buildSession.currentStep = i;
      await this.updateBuildSession(buildSession);
      
      // Execute the step
      const stepResult = await this.executeStep(step, buildPlan);
      
      // Record step result
      buildSession.steps.push({
        ...step,
        result: stepResult
      });
      
      if (!stepResult.success) {
        allSuccessful = false;
        
        // Update build session status
        buildSession.status = 'failed';
        buildSession.endTime = new Date().toISOString();
        buildSession.error = stepResult.message;
        await this.updateBuildSession(buildSession);
        
        return {
          success: false,
          message: `Build failed at step: ${step.name}`,
          error: stepResult.message,
          buildSession
        };
      }
    }
    
    // Update build session status
    buildSession.status = 'completed';
    buildSession.endTime = new Date().toISOString();
    await this.updateBuildSession(buildSession);
    
    return {
      success: true,
      message: 'Site built successfully',
      buildSession
    };
  }

  /**
   * Create a build plan based on specifications
   * @param {Object} data - Parameters for creating the build plan
   * @param {Object} data.siteSettings - Site settings
   * @param {Object} data.design - Design settings
   * @param {Object} data.content - Content settings
   * @param {Array} data.plugins - Plugins to install
   * @returns {Object} Build plan
   */
  async createBuildPlan(data) {
    const { 
      siteSettings, 
      design, 
      content, 
      plugins 
    } = data;
    
    // Create build plan
    const buildPlan = this.createDefaultBuildPlan(siteSettings, design, content, plugins);
    
    // Store the build plan
    const planId = await this.storeBuildPlan(buildPlan);
    
    return {
      success: true,
      planId,
      buildPlan,
      message: 'Build plan created successfully'
    };
  }

  /**
   * Get status of a build
   * @param {Object} data - Parameters for getting build status
   * @param {number} data.sessionId - ID of the build session
   * @returns {Object} Build status
   */
  async getBuildStatus(data) {
    const { sessionId } = data;
    
    if (!sessionId) {
      return {
        success: false,
        message: 'Build session ID is required'
      };
    }
    
    // Get build session
    const buildSession = await this.getBuildSessionById(sessionId);
    
    if (!buildSession) {
      return {
        success: false,
        message: `Build session with ID ${sessionId} not found`
      };
    }
    
    return {
      success: true,
      buildSession,
      message: `Build session status: ${buildSession.status}`
    };
  }

  /**
   * Customize a build plan or in-progress build
   * @param {Object} data - Parameters for customizing the build
   * @param {number} data.planId - ID of the build plan to customize
   * @param {number} data.sessionId - ID of the build session to customize
   * @param {Object} data.customizations - Customizations to apply
   * @returns {Object} Customization result
   */
  async customizeBuild(data) {
    const { 
      planId, 
      sessionId, 
      customizations 
    } = data;
    
    if (!planId && !sessionId) {
      return {
        success: false,
        message: 'Either plan ID or session ID is required'
      };
    }
    
    if (!customizations) {
      return {
        success: false,
        message: 'Customizations are required'
      };
    }
    
    // Customize build plan if plan ID is provided
    if (planId) {
      const buildPlan = await this.getBuildPlanById(planId);
      
      if (!buildPlan) {
        return {
          success: false,
          message: `Build plan with ID ${planId} not found`
        };
      }
      
      // Apply customizations to the build plan
      const customizedPlan = this.applyCustomizationsToPlan(buildPlan, customizations);
      
      // Update the build plan
      await this.updateBuildPlan(planId, customizedPlan);
      
      return {
        success: true,
        buildPlan: customizedPlan,
        message: 'Build plan customized successfully'
      };
    }
    
    // Customize build session if session ID is provided
    if (sessionId) {
      const buildSession = await this.getBuildSessionById(sessionId);
      
      if (!buildSession) {
        return {
          success: false,
          message: `Build session with ID ${sessionId} not found`
        };
      }
      
      if (buildSession.status === 'completed' || buildSession.status === 'failed') {
        return {
          success: false,
          message: `Cannot customize a ${buildSession.status} build session`
        };
      }
      
      // Apply customizations to the build session
      const customizedSession = this.applyCustomizationsToSession(buildSession, customizations);
      
      // Update the build session
      await this.updateBuildSession(customizedSession);
      
      return {
        success: true,
        buildSession: customizedSession,
        message: 'Build session customized successfully'
      };
    }
  }

  /**
   * Create a default build plan
   * @param {Object} siteSettings - Site settings
   * @param {Object} design - Design settings
   * @param {Object} content - Content settings
   * @param {Array} plugins - Plugins to install
   * @returns {Object} Default build plan
   */
  createDefaultBuildPlan(siteSettings = {}, design = {}, content = {}, plugins = []) {
    const defaultSteps = [];
    
    // Basic site setup steps
    defaultSteps.push({
      name: 'Configure Basic Settings',
      description: 'Set up basic site settings',
      type: 'settings',
      settings: {
        siteName: siteSettings.siteName || 'My WordPress Site',
        tagline: siteSettings.tagline || 'Just another WordPress site',
        siteUrl: siteSettings.siteUrl || '',
        adminEmail: siteSettings.adminEmail || '',
        timezone: siteSettings.timezone || 'UTC',
        dateFormat: siteSettings.dateFormat || 'F j, Y',
        timeFormat: siteSettings.timeFormat || 'g:i a'
      }
    });
    
    // Theme setup steps
    defaultSteps.push({
      name: 'Install Theme',
      description: 'Install and activate the selected theme',
      type: 'theme',
      theme: {
        name: design.theme?.name || 'Twenty Twenty-Three',
        source: design.theme?.source || 'repository'
      }
    });
    
    if (design.theme?.customize) {
      defaultSteps.push({
        name: 'Customize Theme',
        description: 'Apply theme customizations',
        type: 'theme_customization',
        customizations: design.theme.customize
      });
    }
    
    // Plugin installation steps
    if (plugins && plugins.length > 0) {
      defaultSteps.push({
        name: 'Install Plugins',
        description: 'Install and activate required plugins',
        type: 'plugins',
        plugins: plugins.map(plugin => ({
          name: plugin.name,
          source: plugin.source || 'repository',
          activate: plugin.activate !== false
        }))
      });
    }
    
    // Content creation steps
    if (content.pages && content.pages.length > 0) {
      defaultSteps.push({
        name: 'Create Pages',
        description: 'Create essential pages',
        type: 'pages',
        pages: content.pages
      });
    }
    
    if (content.posts && content.posts.length > 0) {
      defaultSteps.push({
        name: 'Create Posts',
        description: 'Create initial blog posts',
        type: 'posts',
        posts: content.posts
      });
    }
    
    if (content.menus && content.menus.length > 0) {
      defaultSteps.push({
        name: 'Set Up Menus',
        description: 'Create and configure navigation menus',
        type: 'menus',
        menus: content.menus
      });
    }
    
    // Reading settings
    defaultSteps.push({
      name: 'Configure Reading Settings',
      description: 'Set up homepage and blog page',
      type: 'reading_settings',
      settings: {
        showOnFront: content.frontPage ? 'page' : 'posts',
        pageOnFront: content.frontPage || 0,
        pageForPosts: content.postsPage || 0,
        postsPerPage: content.postsPerPage || 10
      }
    });
    
    // Media setup
    if (content.media && content.media.length > 0) {
      defaultSteps.push({
        name: 'Upload Media',
        description: 'Upload images and other media files',
        type: 'media',
        media: content.media
      });
    }
    
    // Permalink setup
    defaultSteps.push({
      name: 'Configure Permalinks',
      description: 'Set up permalink structure',
      type: 'permalinks',
      structure: content.permalinkStructure || '/%postname%/'
    });
    
    // Final setup
    defaultSteps.push({
      name: 'Finalize Setup',
      description: 'Apply any remaining settings and optimizations',
      type: 'finalize',
      settings: {
        enableXmlrpc: siteSettings.enableXmlrpc !== false,
        discourageSiteIndex: siteSettings.discourageSiteIndex === true,
        cleanupOptions: siteSettings.cleanupOptions !== false
      }
    });
    
    return {
      name: siteSettings.siteName || 'WordPress Site Build',
      description: siteSettings.description || 'Automated WordPress site build',
      created: new Date().toISOString(),
      steps: defaultSteps
    };
  }

  /**
   * Execute a build step
   * @param {Object} step - Build step to execute
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeStep(step, buildPlan) {
    try {
      // Execute appropriate function based on step type
      switch (step.type) {
        case 'settings':
          return await this.executeSettingsStep(step, buildPlan);
        case 'theme':
          return await this.executeThemeStep(step, buildPlan);
        case 'theme_customization':
          return await this.executeThemeCustomizationStep(step, buildPlan);
        case 'plugins':
          return await this.executePluginsStep(step, buildPlan);
        case 'pages':
          return await this.executePagesStep(step, buildPlan);
        case 'posts':
          return await this.executePostsStep(step, buildPlan);
        case 'menus':
          return await this.executeMenusStep(step, buildPlan);
        case 'reading_settings':
          return await this.executeReadingSettingsStep(step, buildPlan);
        case 'media':
          return await this.executeMediaStep(step, buildPlan);
        case 'permalinks':
          return await this.executePermalinksStep(step, buildPlan);
        case 'finalize':
          return await this.executeFinalizeStep(step, buildPlan);
        default:
          return {
            success: false,
            message: `Unknown step type: ${step.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error executing step ${step.name}: ${error.message}`
      };
    }
  }

  /**
   * Execute settings step
   * @param {Object} step - Settings step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeSettingsStep(step, buildPlan) {
    // This would update real site settings
    // For now, simulating a successful update
    const { settings } = step;
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await this.api.updateOption(key, value);
    }
    
    return {
      success: true,
      message: 'Site settings updated successfully'
    };
  }

  /**
   * Execute theme step
   * @param {Object} step - Theme step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeThemeStep(step, buildPlan) {
    // This would install and activate a real theme
    // For now, simulating a successful installation
    const { theme } = step;
    
    // Install theme
    const installResult = await this.api.installTheme(theme.name, theme.source);
    
    if (!installResult.success) {
      return {
        success: false,
        message: `Failed to install theme: ${installResult.message}`
      };
    }
    
    // Activate theme
    const activateResult = await this.api.activateTheme(theme.name);
    
    if (!activateResult.success) {
      return {
        success: false,
        message: `Failed to activate theme: ${activateResult.message}`
      };
    }
    
    return {
      success: true,
      message: `Theme ${theme.name} installed and activated successfully`
    };
  }

  /**
   * Execute theme customization step
   * @param {Object} step - Theme customization step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeThemeCustomizationStep(step, buildPlan) {
    // This would customize a real theme
    // For now, simulating a successful customization
    const { customizations } = step;
    
    // Apply each customization
    for (const [key, value] of Object.entries(customizations)) {
      await this.api.updateThemeModMods(key, value);
    }
    
    return {
      success: true,
      message: 'Theme customizations applied successfully'
    };
  }

  /**
   * Execute plugins step
   * @param {Object} step - Plugins step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executePluginsStep(step, buildPlan) {
    // This would install and activate real plugins
    // For now, simulating a successful installation
    const { plugins } = step;
    
    for (const plugin of plugins) {
      // Install plugin
      const installResult = await this.api.installPlugin(plugin.name, plugin.source);
      
      if (!installResult.success) {
        return {
          success: false,
          message: `Failed to install plugin ${plugin.name}: ${installResult.message}`
        };
      }
      
      // Activate plugin if specified
      if (plugin.activate) {
        const activateResult = await this.api.activatePlugin(plugin.name);
        
        if (!activateResult.success) {
          return {
            success: false,
            message: `Failed to activate plugin ${plugin.name}: ${activateResult.message}`
          };
        }
      }
    }
    
    return {
      success: true,
      message: 'Plugins installed and activated successfully'
    };
  }

  /**
   * Execute pages step
   * @param {Object} step - Pages step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executePagesStep(step, buildPlan) {
    // This would create real pages
    // For now, simulating a successful creation
    const { pages } = step;
    
    const createdPages = [];
    
    for (const page of pages) {
      // Create page
      const createResult = await this.api.createPage(page);
      
      if (!createResult.success) {
        return {
          success: false,
          message: `Failed to create page ${page.title}: ${createResult.message}`
        };
      }
      
      createdPages.push({
        id: createResult.pageId,
        title: page.title,
        slug: page.slug || ''
      });
    }
    
    return {
      success: true,
      createdPages,
      message: `${createdPages.length} pages created successfully`
    };
  }

  /**
   * Execute posts step
   * @param {Object} step - Posts step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executePostsStep(step, buildPlan) {
    // This would create real posts
    // For now, simulating a successful creation
    const { posts } = step;
    
    const createdPosts = [];
    
    for (const post of posts) {
      // Create post
      const createResult = await this.api.createPost(post);
      
      if (!createResult.success) {
        return {
          success: false,
          message: `Failed to create post ${post.title}: ${createResult.message}`
        };
      }
      
      createdPosts.push({
        id: createResult.postId,
        title: post.title,
        slug: post.slug || ''
      });
    }
    
    return {
      success: true,
      createdPosts,
      message: `${createdPosts.length} posts created successfully`
    };
  }

  /**
   * Execute menus step
   * @param {Object} step - Menus step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeMenusStep(step, buildPlan) {
    // This would create real menus
    // For now, simulating a successful creation
    const { menus } = step;
    
    const createdMenus = [];
    
    for (const menu of menus) {
      // Create menu
      const createResult = await this.api.createMenu(menu);
      
      if (!createResult.success) {
        return {
          success: false,
          message: `Failed to create menu ${menu.name}: ${createResult.message}`
        };
      }
      
      createdMenus.push({
        id: createResult.menuId,
        name: menu.name,
        location: menu.location || ''
      });
    }
    
    return {
      success: true,
      createdMenus,
      message: `${createdMenus.length} menus created successfully`
    };
  }

  /**
   * Execute reading settings step
   * @param {Object} step - Reading settings step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeReadingSettingsStep(step, buildPlan) {
    // This would update real reading settings
    // For now, simulating a successful update
    const { settings } = step;
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await this.api.updateOption(`reading_${key}`, value);
    }
    
    return {
      success: true,
      message: 'Reading settings updated successfully'
    };
  }

  /**
   * Execute media step
   * @param {Object} step - Media step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeMediaStep(step, buildPlan) {
    // This would upload real media
    // For now, simulating a successful upload
    const { media } = step;
    
    const uploadedMedia = [];
    
    for (const item of media) {
      // Upload media
      const uploadResult = await this.api.uploadMedia(item);
      
      if (!uploadResult.success) {
        return {
          success: false,
          message: `Failed to upload media ${item.file}: ${uploadResult.message}`
        };
      }
      
      uploadedMedia.push({
        id: uploadResult.mediaId,
        title: item.title || '',
        url: uploadResult.url || ''
      });
    }
    
    return {
      success: true,
      uploadedMedia,
      message: `${uploadedMedia.length} media items uploaded successfully`
    };
  }

  /**
   * Execute permalinks step
   * @param {Object} step - Permalinks step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executePermalinksStep(step, buildPlan) {
    // This would update real permalink settings
    // For now, simulating a successful update
    const { structure } = step;
    
    // Update permalink structure
    await this.api.updateOption('permalink_structure', structure);
    
    return {
      success: true,
      message: 'Permalink structure updated successfully'
    };
  }

  /**
   * Execute finalize step
   * @param {Object} step - Finalize step
   * @param {Object} buildPlan - Complete build plan
   * @returns {Object} Step execution result
   */
  async executeFinalizeStep(step, buildPlan) {
    // This would perform final site setup
    // For now, simulating a successful finalization
    const { settings } = step;
    
    // Apply final settings
    if (settings.enableXmlrpc !== undefined) {
      await this.api.updateOption('enable_xmlrpc', settings.enableXmlrpc);
    }
    
    if (settings.discourageSiteIndex !== undefined) {
      await this.api.updateOption('blog_public', !settings.discourageSiteIndex);
    }
    
    // Perform cleanup if specified
    if (settings.cleanupOptions) {
      await this.performSiteCleanup();
    }
    
    return {
      success: true,
      message: 'Site setup finalized successfully'
    };
  }

  /**
   * Perform site cleanup
   * @returns {boolean} Whether the cleanup was successful
   */
  async performSiteCleanup() {
    // This would perform real site cleanup
    // For now, simulating a successful cleanup
    return true;
  }

  /**
   * Get a build plan by ID
   * @param {number} id - ID of the build plan
   * @returns {Object} Build plan
   */
  async getBuildPlanById(id) {
    // This would get a real build plan from the database
    // For now, returning a simulated plan
    return {
      id,
      name: 'Sample Build Plan',
      description: 'A sample build plan for demonstration',
      created: '2023-01-01T00:00:00.000Z',
      steps: [
        {
          name: 'Configure Basic Settings',
          description: 'Set up basic site settings',
          type: 'settings',
          settings: {
            siteName: 'My WordPress Site',
            tagline: 'Just another WordPress site',
            timezone: 'UTC'
          }
        },
        {
          name: 'Install Theme',
          description: 'Install and activate the selected theme',
          type: 'theme',
          theme: {
            name: 'Twenty Twenty-Three',
            source: 'repository'
          }
        }
      ]
    };
  }

  /**
   * Get a build session by ID
   * @param {number} id - ID of the build session
   * @returns {Object} Build session
   */
  async getBuildSessionById(id) {
    // This would get a real build session from the database
    // For now, returning a simulated session
    return {
      id,
      plan: {
        name: 'Sample Build Plan',
        steps: [
          {
            name: 'Configure Basic Settings',
            type: 'settings'
          },
          {
            name: 'Install Theme',
            type: 'theme'
          }
        ]
      },
      startTime: '2023-01-01T00:00:00.000Z',
      status: 'completed',
      endTime: '2023-01-01T00:10:00.000Z',
      steps: [
        {
          name: 'Configure Basic Settings',
          type: 'settings',
          result: {
            success: true,
            message: 'Site settings updated successfully'
          }
        },
        {
          name: 'Install Theme',
          type: 'theme',
          result: {
            success: true,
            message: 'Theme installed and activated successfully'
          }
        }
      ],
      currentStep: 2
    };
  }

  /**
   * Store a build plan
   * @param {Object} buildPlan - Build plan to store
   * @returns {number} Plan ID
   */
  async storeBuildPlan(buildPlan) {
    // This would store a real build plan to the database
    // For now, returning a simulated ID
    return Date.now();
  }

  /**
   * Update a build plan
   * @param {number} id - ID of the build plan
   * @param {Object} buildPlan - Updated build plan
   * @returns {boolean} Whether the update was successful
   */
  async updateBuildPlan(id, buildPlan) {
    // This would update a real build plan in the database
    // For now, simulating a successful update
    return true;
  }

  /**
   * Store a build session
   * @param {Object} buildSession - Build session to store
   * @returns {boolean} Whether the store was successful
   */
  async storeBuildSession(buildSession) {
    // This would store a real build session to the database
    // For now, simulating a successful store
    return true;
  }

  /**
   * Update a build session
   * @param {Object} buildSession - Updated build session
   * @returns {boolean} Whether the update was successful
   */
  async updateBuildSession(buildSession) {
    // This would update a real build session in the database
    // For now, simulating a successful update
    return true;
  }

  /**
   * Apply customizations to a build plan
   * @param {Object} buildPlan - Build plan to customize
   * @param {Object} customizations - Customizations to apply
   * @returns {Object} Customized build plan
   */
  applyCustomizationsToPlan(buildPlan, customizations) {
    // Create a deep copy of the build plan
    const customizedPlan = JSON.parse(JSON.stringify(buildPlan));
    
    // Apply customizations
    if (customizations.name) {
      customizedPlan.name = customizations.name;
    }
    
    if (customizations.description) {
      customizedPlan.description = customizations.description;
    }
    
    if (customizations.steps) {
      // Apply step customizations
      customizations.steps.forEach(stepCustomization => {
        const stepIndex = customizedPlan.steps.findIndex(step => 
          step.name === stepCustomization.name || step.type === stepCustomization.type
        );
        
        if (stepIndex !== -1) {
          // Update existing step
          customizedPlan.steps[stepIndex] = {
            ...customizedPlan.steps[stepIndex],
            ...stepCustomization
          };
        } else if (stepCustomization.action === 'add') {
          // Add new step
          customizedPlan.steps.push(stepCustomization);
        }
      });
    }
    
    if (customizations.removeSteps) {
      // Remove steps
      customizations.removeSteps.forEach(stepToRemove => {
        const stepIndex = customizedPlan.steps.findIndex(step => 
          step.name === stepToRemove || step.type === stepToRemove
        );
        
        if (stepIndex !== -1) {
          customizedPlan.steps.splice(stepIndex, 1);
        }
      });
    }
    
    if (customizations.reorderSteps) {
      // Reorder steps
      const newOrder = customizations.reorderSteps;
      const reorderedSteps = [];
      
      newOrder.forEach(stepName => {
        const step = customizedPlan.steps.find(s => s.name === stepName || s.type === stepName);
        if (step) {
          reorderedSteps.push(step);
        }
      });
      
      // Add any steps not specified in the new order
      customizedPlan.steps.forEach(step => {
        if (!newOrder.includes(step.name) && !newOrder.includes(step.type)) {
          reorderedSteps.push(step);
        }
      });
      
      customizedPlan.steps = reorderedSteps;
    }
    
    return customizedPlan;
  }

  /**
   * Apply customizations to a build session
   * @param {Object} buildSession - Build session to customize
   * @param {Object} customizations - Customizations to apply
   * @returns {Object} Customized build session
   */
  applyCustomizationsToSession(buildSession, customizations) {
    // Create a deep copy of the build session
    const customizedSession = JSON.parse(JSON.stringify(buildSession));
    
    // Apply customizations to the build plan
    if (customizations.plan) {
      customizedSession.plan = this.applyCustomizationsToPlan(
        customizedSession.plan,
        customizations.plan
      );
    }
    
    return customizedSession;
  }

  /**
   * Get the schema for the tool
   * @returns {Object} Tool schema
   */
  getSchema() {
    return {
      $id: 'build-site-tool-schema',
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['build', 'plan', 'status', 'customize'],
          description: 'Action to perform with the build site tool'
        },
        data: {
          type: 'object',
          properties: {
            planId: {
              type: 'number',
              description: 'ID of the build plan to use'
            },
            sessionId: {
              type: 'number',
              description: 'ID of the build session'
            },
            siteSettings: {
              type: 'object',
              description: 'Site settings'
            },
            design: {
              type: 'object',
              description: 'Design settings'
            },
            content: {
              type: 'object',
              description: 'Content settings'
            },
            plugins: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Plugins to install'
            },
            customizations: {
              type: 'object',
              description: 'Customizations to apply'
            }
          }
        }
      },
      required: ['action']
    };
  }
}

module.exports = BuildSiteTool;