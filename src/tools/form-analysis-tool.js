/**
 * Form Analysis Tool
 * Evaluates forms for usability and conversion optimization
 */
const BaseTool = require('./base-tool');
const WordPressAPI = require('../api/wordpress');
const WordPressBrowser = require('../browser/browser');
const logger = require('../utils/logger');

class FormAnalysisTool extends BaseTool {
  constructor() {
    super('wordpress_form_analysis', 'Evaluates forms for usability and conversion optimization');
    this.api = new WordPressAPI();
    this.browser = new WordPressBrowser();
  }
  
  /**
   * Execute the tool to analyze forms on the site
   * @param {Object} params - Parameters for form analysis
   * @param {Array} params.pagesToAnalyze - List of page URLs to analyze
   * @param {Array} params.formSelectors - CSS selectors to identify forms (optional)
   * @param {boolean} params.performSubmissionTests - Whether to attempt test submissions
   * @param {boolean} params.accessibilityCheck - Whether to perform accessibility checks
   * @param {number} params.maxFormsPerPage - Maximum number of forms to analyze per page
   */
  async execute(params = {}) {
    try {
      const {
        pagesToAnalyze = ['/'],
        formSelectors = ['form', '.wpcf7-form', '.gform_wrapper form', '.wpforms-form'],
        performSubmissionTests = false,
        accessibilityCheck = true,
        maxFormsPerPage = 5
      } = params;
      
      // Validate parameters
      if (!Array.isArray(pagesToAnalyze) || pagesToAnalyze.length === 0) {
        return {
          success: false,
          error: 'Invalid pagesToAnalyze parameter. Must be a non-empty array of URLs.'
        };
      }
      
      // Base result structure
      const result = {
        success: true,
        data: {
          pagesAnalyzed: 0,
          formsAnalyzed: 0,
          forms: [],
          overallScore: 0,
          recommendations: []
        }
      };
      
      // Launch browser
      await this.browser.launch();
      
      // Analyze forms on each page
      for (const pageUrl of pagesToAnalyze) {
        try {
          // Navigate to page
          await this.browser.navigateTo(pageUrl);
          result.data.pagesAnalyzed++;
          
          // Find forms on the page
          const pageForms = await this.findForms(formSelectors, maxFormsPerPage);
          
          if (pageForms.length === 0) {
            this.logger.info(`No forms found on page: ${pageUrl}`);
            continue;
          }
          
          // Analyze each form
          for (const form of pageForms) {
            // Perform basic form analysis
            const formAnalysis = await this.analyzeForm(form);
            
            // Add page URL to the analysis
            formAnalysis.pageUrl = pageUrl;
            
            // Check accessibility if requested
            if (accessibilityCheck) {
              formAnalysis.accessibility = await this.checkAccessibility(form);
            }
            
            // Test form submission if requested
            if (performSubmissionTests) {
              try {
                formAnalysis.submissionTest = await this.testSubmission(form);
              } catch (error) {
                formAnalysis.submissionTest = {
                  success: false,
                  error: error.message
                };
              }
            }
            
            // Generate recommendations
            formAnalysis.recommendations = this.generateRecommendations(formAnalysis);
            
            // Add to results
            result.data.forms.push(formAnalysis);
            result.data.formsAnalyzed++;
          }
        } catch (error) {
          this.logger.error(`Error analyzing page ${pageUrl}`, { error: error.message });
        }
      }
      
      // Close browser
      await this.browser.close();
      
      // Calculate overall score
      if (result.data.formsAnalyzed > 0) {
        const totalScore = result.data.forms.reduce((sum, form) => sum + form.overallScore, 0);
        result.data.overallScore = Math.round(totalScore / result.data.formsAnalyzed);
      }
      
      // Generate overall recommendations
      result.data.recommendations = this.generateOverallRecommendations(result.data.forms);
      
      return result;
    } catch (error) {
      await this.browser.close();
      return this.handleError(error, 'execute');
    }
  }
  
  /**
   * Find forms on a page
   * @param {Array} formSelectors - CSS selectors to identify forms
   * @param {number} maxForms - Maximum number of forms to analyze
   * @returns {Promise<Array>} Array of form information
   */
  async findForms(formSelectors, maxForms) {
    try {
      // Extract forms from current page
      const forms = await this.browser.page.evaluate((selectors, max) => {
        // Find all forms using the provided selectors
        const formElements = [];
        selectors.forEach(selector => {
          const elements = Array.from(document.querySelectorAll(selector));
          formElements.push(...elements);
        });
        
        // Limit to maximum number of forms
        const uniqueForms = Array.from(new Set(formElements)).slice(0, max);
        
        // Extract basic info for each form
        return uniqueForms.map((form, index) => {
          // Try to find form ID or name
          const formId = form.id || form.getAttribute('name') || `form-${index}`;
          
          // Find all form fields
          const fields = Array.from(form.querySelectorAll('input, select, textarea'));
          
          // Count visible fields (excluding hidden fields)
          const visibleFields = fields.filter(field => 
            field.type !== 'hidden' && 
            getComputedStyle(field).display !== 'none'
          );
          
          // Count required fields
          const requiredFields = fields.filter(field => 
            field.required || field.getAttribute('aria-required') === 'true'
          );
          
          // Check if form has submit button
          const hasSubmitButton = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
          
          // Get form dimensions
          const rect = form.getBoundingClientRect();
          
          return {
            formId,
            action: form.action || '',
            method: form.method || 'get',
            fieldCount: fields.length,
            visibleFieldCount: visibleFields.length,
            requiredFieldCount: requiredFields.length,
            hasSubmitButton: !!hasSubmitButton,
            dimensions: {
              width: rect.width,
              height: rect.height
            },
            selectorIndex: index // Store the index for later reference
          };
        });
      }, formSelectors, maxForms);
      
      return forms;
    } catch (error) {
      this.logger.error('Error finding forms', { error: error.message });
      return [];
    }
  }
  
  /**
   * Analyze a form for usability and conversion optimization
   * @param {Object} formInfo - Basic form information
   * @returns {Promise<Object>} Detailed form analysis
   */
  async analyzeForm(formInfo) {
    try {
      // Analyze the form in more detail
      const detailedAnalysis = await this.browser.page.evaluate((formIndex) => {
        // Get the form element
        const forms = document.querySelectorAll('form');
        const form = forms[formIndex] || document.querySelectorAll('form')[0];
        
        if (!form) return { error: 'Form not found' };
        
        // Analyze form fields
        const fields = Array.from(form.querySelectorAll('input, select, textarea'));
        
        const fieldAnalysis = fields.filter(field => field.type !== 'hidden').map(field => {
          // Find associated label
          let labelText = '';
          const labelElement = document.querySelector(`label[for="${field.id}"]`);
          
          if (labelElement) {
            labelText = labelElement.textContent.trim();
          } else if (field.parentNode.tagName === 'LABEL') {
            labelText = field.parentNode.textContent.trim().replace(field.outerHTML, '').trim();
          }
          
          // Check placeholder
          const hasPlaceholder = !!field.getAttribute('placeholder');
          
          // Check if field has helper text
          const fieldId = field.id;
          const helperElements = document.querySelectorAll(`#${fieldId}-description, [aria-describedby="${fieldId}"]`);
          const hasHelperText = helperElements.length > 0;
          
          return {
            type: field.type || field.tagName.toLowerCase(),
            name: field.name || '',
            id: field.id || '',
            required: field.required || field.getAttribute('aria-required') === 'true',
            hasLabel: !!labelText,
            labelText,
            hasPlaceholder,
            hasHelperText,
            maxLength: field.maxLength > 0 ? field.maxLength : null,
            fieldWidth: field.offsetWidth,
            classes: Array.from(field.classList)
          };
        });
        
        // Analyze form layout
        const isSingleColumn = (() => {
          // This is a simplified check - assumes forms with fields all having similar X positions are single column
          const fieldPositions = fields.map(f => {
            const rect = f.getBoundingClientRect();
            return rect.left;
          });
          
          // Get unique positions, allowing for some tolerance
          const uniquePositions = new Set();
          fieldPositions.forEach(pos => {
            // Find if there's already a position within 20px
            let found = false;
            for (const existingPos of uniquePositions) {
              if (Math.abs(existingPos - pos) < 20) {
                found = true;
                break;
              }
            }
            if (!found) uniquePositions.add(pos);
          });
          
          // If we have mostly one position, it's likely single column
          return uniquePositions.size <= 2;
        })();
        
        // Check for error containers
        const errorContainers = form.querySelectorAll('.error, .form-error, .wpcf7-not-valid-tip, .wpforms-error');
        
        // Check for CAPTCHA or anti-spam
        const hasCaptcha = form.querySelector('.g-recaptcha, [data-sitekey], .captcha, [name="recaptcha"]') !== null;
        
        // Check if form has privacy agreement
        const hasPrivacyAgreement = (() => {
          const formText = form.textContent.toLowerCase();
          return formText.includes('privacy') || 
                 formText.includes('terms') || 
                 formText.includes('gdpr') || 
                 form.querySelector('input[type="checkbox"][name*="privacy"], input[type="checkbox"][name*="terms"]') !== null;
        })();
        
        // Check for mobile responsiveness indicators
        const hasResponsiveClasses = (() => {
          const allClasses = Array.from(form.classList).join(' ').toLowerCase();
          return allClasses.includes('responsive') || 
                 allClasses.includes('mobile') || 
                 allClasses.includes('flex') || 
                 allClasses.includes('grid');
        })();
        
        return {
          fieldAnalysis,
          layout: {
            isSingleColumn,
            hasErrorContainers: errorContainers.length > 0,
            usesFieldsets: form.querySelectorAll('fieldset').length > 0,
            hasCaptcha,
            hasPrivacyAgreement,
            hasResponsiveClasses
          }
        };
      }, formInfo.selectorIndex);
      
      // Combine basic form info with detailed analysis
      const analysis = {
        ...formInfo,
        ...detailedAnalysis,
        usabilityScore: 0,
        conversionScore: 0,
        overallScore: 0
      };
      
      // Calculate usability score
      analysis.usabilityScore = this.calculateUsabilityScore(analysis);
      
      // Calculate conversion optimization score
      analysis.conversionScore = this.calculateConversionScore(analysis);
      
      // Calculate overall score
      analysis.overallScore = Math.round((analysis.usabilityScore + analysis.conversionScore) / 2);
      
      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing form', { error: error.message });
      return {
        ...formInfo,
        error: error.message,
        usabilityScore: 0,
        conversionScore: 0,
        overallScore: 0
      };
    }
  }
  
  /**
   * Calculate usability score based on form properties
   * @param {Object} analysis - Form analysis data
   * @returns {number} Usability score (0-100)
   */
  calculateUsabilityScore(analysis) {
    let score = 0;
    const { fieldAnalysis, layout } = analysis;
    
    // Start with a base score
    score = 50;
    
    // Check if all fields have labels
    const allFieldsHaveLabels = fieldAnalysis.every(field => field.hasLabel);
    if (allFieldsHaveLabels) score += 10;
    
    // Check if required fields are marked
    const requiredFieldsCount = fieldAnalysis.filter(field => field.required).length;
    if (requiredFieldsCount === analysis.requiredFieldCount) score += 5;
    
    // Check form layout
    if (layout.isSingleColumn) score += 5;
    if (layout.hasErrorContainers) score += 5;
    if (layout.usesFieldsets) score += 5;
    
    // Check for submit button
    if (analysis.hasSubmitButton) score += 5;
    
    // Check for mobile-friendly classes
    if (layout.hasResponsiveClasses) score += 5;
    
    // Check form field types variety
    const fieldTypes = new Set(fieldAnalysis.map(field => field.type));
    if (fieldTypes.size > 1) score += 5;
    
    // Check form size - penalize very large forms
    if (analysis.visibleFieldCount > 10) score -= 10;
    if (analysis.visibleFieldCount > 5 && analysis.visibleFieldCount <= 10) score -= 5;
    
    // Cap score between 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculate conversion optimization score based on form properties
   * @param {Object} analysis - Form analysis data
   * @returns {number} Conversion score (0-100)
   */
  calculateConversionScore(analysis) {
    let score = 0;
    const { fieldAnalysis, layout } = analysis;
    
    // Start with a base score
    score = 50;
    
    // Fewer fields is generally better for conversion
    if (analysis.visibleFieldCount <= 3) score += 15;
    else if (analysis.visibleFieldCount <= 5) score += 10;
    else if (analysis.visibleFieldCount <= 7) score += 5;
    else if (analysis.visibleFieldCount > 10) score -= 10;
    
    // Check for presence of privacy agreement (good for trust)
    if (layout.hasPrivacyAgreement) score += 10;
    
    // CAPTCHA can reduce spam but adds friction
    if (layout.hasCaptcha) score += 5;
    
    // Single column forms typically convert better
    if (layout.isSingleColumn) score += 10;
    
    // Good error handling improves form completion
    if (layout.hasErrorContainers) score += 5;
    
    // Check if important fields have helper text
    const criticalFieldsWithHelperText = fieldAnalysis.filter(field => 
      field.required && field.hasHelperText
    ).length;
    
    const requiredFields = fieldAnalysis.filter(field => field.required).length;
    if (requiredFields > 0 && criticalFieldsWithHelperText / requiredFields >= 0.5) {
      score += 5;
    }
    
    // Cap score between 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Test form submission behavior
   * @param {Object} formInfo - Basic form information
   * @returns {Promise<Object>} Submission test results
   */
  async testSubmission(formInfo) {
    try {
      // This is a limited test that just checks if the form has client-side validation
      const validationResult = await this.browser.page.evaluate((formIndex) => {
        // Get the form element
        const forms = document.querySelectorAll('form');
        const form = forms[formIndex];
        
        if (!form) return { success: false, error: 'Form not found' };
        
        // Try to submit the form without filling required fields
        const originalSubmit = form.submit;
        
        let validationTriggered = false;
        let validationMessages = [];
        
        // Override submit to detect if it would have been submitted
        form.submit = function() {
          validationTriggered = true;
          return false;
        };
        
        // Find required fields
        const requiredFields = Array.from(form.querySelectorAll('[required], [aria-required="true"]'));
        
        // Check if any fields become :invalid when trying to submit
        requiredFields.forEach(field => {
          // Check validity
          const isValid = field.checkValidity();
          if (!isValid) {
            validationTriggered = true;
            validationMessages.push({
              fieldName: field.name || field.id,
              message: field.validationMessage
            });
          }
        });
        
        // Restore original submit
        form.submit = originalSubmit;
        
        // Check if form has client-side validation by checking the required fields
        return {
          hasClientValidation: validationTriggered,
          requiredFieldsCount: requiredFields.length,
          validationMessages: validationMessages
        };
      }, formInfo.selectorIndex);
      
      return {
        success: true,
        ...validationResult
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check form accessibility
   * @param {Object} formInfo - Basic form information
   * @returns {Promise<Object>} Accessibility check results
   */
  async checkAccessibility(formInfo) {
    try {
      // Perform basic accessibility checks
      const accessibilityResults = await this.browser.page.evaluate((formIndex) => {
        // Get the form element
        const forms = document.querySelectorAll('form');
        const form = forms[formIndex];
        
        if (!form) return { error: 'Form not found' };
        
        // Check for labels on all interactive elements
        const inputsWithoutLabels = Array.from(form.querySelectorAll('input, select, textarea'))
          .filter(input => input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button')
          .filter(input => {
            // Check for explicit label
            if (input.id && document.querySelector(`label[for="${input.id}"]`)) {
              return false;
            }
            // Check for wrapping label
            if (input.closest('label')) {
              return false;
            }
            // Check for aria-labelledby
            if (input.getAttribute('aria-labelledby')) {
              return false;
            }
            // Check for aria-label
            if (input.getAttribute('aria-label')) {
              return false;
            }
            return true;
          });
        
        // Check for color contrast (simplified)
        const potentialContrastIssues = Array.from(form.querySelectorAll('label, input, select, textarea, button'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            // Very simplified check - just detecting if color and background are very similar
            const color = style.color;
            const bgColor = style.backgroundColor;
            
            // If either is transparent or we can't get values, skip
            if (color.includes('rgba(0, 0, 0, 0)') || bgColor.includes('rgba(0, 0, 0, 0)')) {
              return false;
            }
            
            // Very basic check - proper contrast check would be much more complex
            return color === bgColor;
          });
        
        // Check for keyboard navigation
        const elementsWithoutTabIndex = Array.from(form.querySelectorAll('a, button, input, select, textarea'))
          .filter(el => el.tabIndex < 0);
        
        // Check for error handling with aria
        const hasAriaLive = form.querySelector('[aria-live]') !== null;
        
        return {
          inputsWithoutLabels: inputsWithoutLabels.length,
          potentialContrastIssues: potentialContrastIssues.length,
          elementsWithoutTabIndex: elementsWithoutTabIndex.length,
          hasAriaLive,
          score: 0 // Will calculate this below
        };
      }, formInfo.selectorIndex);
      
      // Calculate accessibility score
      let accessibilityScore = 100;
      
      // Deduct points for accessibility issues
      if (accessibilityResults.inputsWithoutLabels > 0) {
        accessibilityScore -= 20 * (Math.min(1, accessibilityResults.inputsWithoutLabels / formInfo.visibleFieldCount));
      }
      
      if (accessibilityResults.potentialContrastIssues > 0) {
        accessibilityScore -= 15;
      }
      
      if (accessibilityResults.elementsWithoutTabIndex > 0) {
        accessibilityScore -= 10;
      }
      
      if (!accessibilityResults.hasAriaLive) {
        accessibilityScore -= 10;
      }
      
      // Add score to results
      accessibilityResults.score = Math.max(0, Math.min(100, accessibilityScore));
      
      return accessibilityResults;
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }
  
  /**
   * Generate recommendations based on form analysis
   * @param {Object} formAnalysis - Form analysis data
   * @returns {Array} List of recommendations
   */
  generateRecommendations(formAnalysis) {
    const recommendations = [];
    
    // Check for missing labels
    if (formAnalysis.fieldAnalysis) {
      const fieldsWithoutLabels = formAnalysis.fieldAnalysis.filter(field => !field.hasLabel);
      if (fieldsWithoutLabels.length > 0) {
        recommendations.push({
          issue: 'Missing field labels',
          impact: 'High',
          description: `${fieldsWithoutLabels.length} form fields don't have proper labels`,
          solution: 'Add descriptive labels for all form fields to improve usability and accessibility'
        });
      }
    }
    
    // Check for excessive fields
    if (formAnalysis.visibleFieldCount > 7) {
      recommendations.push({
        issue: 'Too many form fields',
        impact: 'High',
        description: `Form has ${formAnalysis.visibleFieldCount} visible fields, which may reduce conversion rates`,
        solution: 'Reduce the number of form fields or split into multiple steps'
      });
    }
    
    // Check for accessibility issues
    if (formAnalysis.accessibility && formAnalysis.accessibility.score < 70) {
      recommendations.push({
        issue: 'Poor accessibility',
        impact: 'Medium',
        description: 'Form has accessibility issues that may prevent some users from completing it',
        solution: 'Improve form accessibility by adding proper labels, ARIA attributes, and ensuring keyboard navigability'
      });
    }
    
    // Check for mobile responsiveness
    if (formAnalysis.layout && !formAnalysis.layout.hasResponsiveClasses) {
      recommendations.push({
        issue: 'Potential mobile responsiveness issues',
        impact: 'Medium',
        description: 'Form may not be fully responsive on mobile devices',
        solution: 'Ensure the form uses responsive design techniques for mobile compatibility'
      });
    }
    
    // Check for validation
    if (formAnalysis.submissionTest && !formAnalysis.submissionTest.hasClientValidation) {
      recommendations.push({
        issue: 'Missing client-side validation',
        impact: 'Medium',
        description: 'Form doesn\'t appear to have client-side validation',
        solution: 'Add client-side validation to provide immediate feedback to users'
      });
    }
    
    // Check for multi-column layout
    if (formAnalysis.layout && !formAnalysis.layout.isSingleColumn) {
      recommendations.push({
        issue: 'Multi-column layout',
        impact: 'Low',
        description: 'Form uses a multi-column layout, which can be confusing and reduce completion rates',
        solution: 'Consider switching to a single-column layout for better usability'
      });
    }
    
    // Check for privacy policy
    if (formAnalysis.layout && !formAnalysis.layout.hasPrivacyAgreement) {
      recommendations.push({
        issue: 'Missing privacy agreement',
        impact: 'Medium',
        description: 'Form doesn\'t appear to have a privacy policy or terms agreement',
        solution: 'Add a privacy policy checkbox to build trust and comply with regulations like GDPR'
      });
    }
    
    // Check if form is very short
    if (formAnalysis.visibleFieldCount === 1) {
      recommendations.push({
        issue: 'Very short form',
        impact: 'Positive',
        description: 'Form has only one visible field, which is excellent for conversions',
        solution: 'Consider A/B testing to see if you can collect additional useful information without hurting conversion'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate overall recommendations based on all forms analyzed
   * @param {Array} forms - Form analysis results
   * @returns {Array} List of overall recommendations
   */
  generateOverallRecommendations(forms) {
    const recommendations = [];
    
    // Check for consistency among forms
    const formScores = forms.map(form => form.overallScore);
    const inconsistentForms = formScores.some(score => 
      Math.abs(score - formScores[0]) > 20
    );
    
    if (inconsistentForms && forms.length > 1) {
      recommendations.push({
        issue: 'Inconsistent form quality',
        impact: 'Medium',
        description: 'Forms across the site have inconsistent quality and usability scores',
        solution: 'Apply the best practices from your highest scoring forms to all forms for consistency'
      });
    }
    
    // Check for overall accessibility issues
    const accessibilityScores = forms
      .filter(form => form.accessibility && !form.accessibility.error)
      .map(form => form.accessibility.score);
    
    if (accessibilityScores.length > 0) {
      const avgAccessibilityScore = accessibilityScores.reduce((sum, score) => sum + score, 0) / accessibilityScores.length;
      
      if (avgAccessibilityScore < 70) {
        recommendations.push({
          issue: 'Site-wide accessibility concerns',
          impact: 'High',
          description: 'Forms across the site have accessibility issues that should be addressed',
          solution: 'Implement a comprehensive accessibility audit and remediation plan'
        });
      }
    }
    
    // Check for conversion optimization potential
    const avgConversionScore = forms.reduce((sum, form) => sum + form.conversionScore, 0) / forms.length;
    
    if (avgConversionScore < 60) {
      recommendations.push({
        issue: 'Poor conversion optimization',
        impact: 'High',
        description: 'Forms are not optimized for conversions',
        solution: 'Implement A/B testing and simplify forms to improve conversion rates'
      });
    }
    
    // Add general recommendation for low-scoring forms
    if (forms.some(form => form.overallScore < 50)) {
      recommendations.push({
        issue: 'Low-performing forms',
        impact: 'High',
        description: 'Some forms on the site score poorly and may be losing potential conversions',
        solution: 'Prioritize redesigning the lowest-scoring forms based on the specific recommendations'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Get schema for MCP integration
   */
  getSchema() {
    return {
      type: 'object',
      required: ['pagesToAnalyze'],
      properties: {
        pagesToAnalyze: {
          type: 'array',
          items: {
            type: 'string'
          },
          default: ['/'],
          description: 'List of page URLs to analyze'
        },
        formSelectors: {
          type: 'array',
          items: {
            type: 'string'
          },
          default: ['form', '.wpcf7-form', '.gform_wrapper form', '.wpforms-form'],
          description: 'CSS selectors to identify forms'
        },
        performSubmissionTests: {
          type: 'boolean',
          default: false,
          description: 'Whether to attempt test submissions'
        },
        accessibilityCheck: {
          type: 'boolean',
          default: true,
          description: 'Whether to perform accessibility checks'
        },
        maxFormsPerPage: {
          type: 'number',
          default: 5,
          description: 'Maximum number of forms to analyze per page'
        }
      }
    };
  }
}

module.exports = FormAnalysisTool; 