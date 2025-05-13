# TanukiMCP – WordPress Automation Through Integrated Prompt Sets and Tools

## 1. Introduction

TanukiMCP is a comprehensive WordPress automation platform that combines a user-friendly interface with powerful AI-driven prompt sets and specialized tools. It enables users to automate various WordPress tasks efficiently while leveraging the WordPress REST API and other native WordPress capabilities.

### Brand Identity

**Name**: TanukiMCP

**Tagline**: "Intelligent WordPress automation, powered by MCP."

**Colors**:
- Primary: #D35400 (Tanuki Orange)
- Secondary: #27AE60 (WordPress Green)
- Accent: #F1C40F (Accent Yellow)
- Background: #F9F9F9 (Light Gray)
- Text Primary: #333333 (Dark Gray)
- Text Secondary: #555555 (Medium Gray)

**Typography**:
- Font Family: 'Open Sans', sans-serif (WordPress default font)
- H1: 2.5rem, 700
- H2: 2rem, 600
- Body: 1rem, 400

**Spacing**:
- Base unit: 1rem
- Scale: 0.25rem, 0.5rem, 1rem, 1.5rem, 2rem

## 2. Core Concepts

### Prompt Sets Framework

TanukiMCP's core functionality is built on a system of integrated prompt sets. Each prompt set:

1. Explicitly references specific tools that are used in the workflow
2. Follows a sequential structure with clear steps
3. Handles both input (user or system) and output (summary or information for next steps)
4. Provides comprehensive guidance with minimal user input required

**All prompt sets must explicitly reference our specific tools** to ensure consistency and effectiveness. This is a foundational requirement for the entire system.

### User Journeys

User journeys are at the core of TanukiMCP's design. We've identified key journey types:

1. **Website Idea to MVP Implementation**
   - Brief description to full implementation
   - Combines both conceptual and execution tools
   
2. **Specific Website Redesigns**
   - Content, pages, elements, blocks, components
   - Styles, layouts, etc.
   
3. **Design Documentation Building**
   - Sequential prompts for creating comprehensive design docs
   - For both new and existing master design documents
   - Professional quality, formatted for maximum contextual instruction

These journeys are built to be additive, where each prompt in the sequence:
- First examines the current state
- Performs its specific task
- Sets up for the next prompt in the sequence
- Builds toward a complete, consistently formatted deliverable

### Standalone Helper Prompts

In addition to core journeys, TanukiMCP provides standalone helper prompts for niche or specific tasks that:
- May utilize our existing tools but might not fall under core prompt sets
- Can be any combination or solo use of any tool
- Provide utility for specialized WordPress scenarios

## 3. Tool Categories

### 3.1 Conceptual Tools

Conceptual tools focus on planning, design, and structure:

1. **Sitemap Tool**
   - Building or analyzing layout and design
   - Building indexing structure
   
2. **Wireframe Tool**
   - ASCII drawn layouts for each page
   
3. **Design Tokens Tool**
   - Building or indexing design tokens
   
4. **Design Document Tool**
   - Format, build new, modify existing documentation
   
5. **Modification Tool (Conceptual Only)**
   - Conceptual planning for modifications
   
6. **Full Hierarchy Tool**
   - Handles containers, blocks, components, text content, media, etc.
   
7. **Theme Picker Tool**
   - Fetches available WordPress themes
   - Recommends themes based on project requirements
   - Only used when needed (not called if theme already specified)
   
8. **Inspiration Tool**
   - Finds design inspiration for new or existing sites
   - Uses web tools if available, otherwise leverages existing knowledge
   
9. **Business Plan/Monetization Tool**
   - Interactive tool for creating, modifying, and editing monetization strategies

### 3.2 Execution Tools

Execution tools focus on implementation and configuration:

1. **Implement Modification Tool**
   - Core "Worker Bee" / "Doer" functionality
   - Converts concepts into actual implementation
   
2. **Configuration Tool**
   - Interactive WordPress configuration interface
   - Handles:
     - WordPress Native Editor
     - WooCommerce
     - Core WordPress plugins that all users have by default
   - Guides users through configuration regardless of knowledge level
   - Uses intuitive and consistent structure of tool calls
   
3. **Helper Tools for Niche Functions**
   - Specialized tools for specific WordPress functionality
   
4. **Media Manager Tool**
   - For both new and existing sites
   - Connects to Unsplash for royalty-free images
   - Links images relevant to WordPress content
   
5. **Build Site Tool**
   - Comprehensive site building tool
   - Works from scratch, from design docs, or for refactoring existing sites

### 3.3 Integration with WordPress REST API

All tools integrate with the WordPress REST API to enable:
1. Automated content creation and management
2. Plugin configuration and customization
3. WooCommerce product management
4. User and permission management
5. Media library interactions

## 4. Prompt Sets & Formatting

### Format Structure

```
#Steps in a sequence
   Input (user or system generated)
   1. Tool Call: <instructions>
   2. Tool Call: <instructions>
   3. Etc.
   Output (summary or information for next steps)
```

### Big Picture Goal

Our goal is to theorize, define, build, and optimize a flagship set of pre-built use-case prompt sets that we could publish as documentation requiring minimal user input. This creates a "no-code" web development experience in WordPress.

We aim to build a complete suite of tools that integrate with the WordPress REST API for automating web development through WordPress' native tools and default capabilities.

### Sequential Prompting Systems

TanukiMCP provides pre-built, sequential prompting systems with properly worded/formatted tool calls, built to be used one by one in a sequence within Claude Desktop or Cursor.

## 5. User Interface Design

The TanukiMCP interface serves as the front-end for accessing and utilizing our prompt sets and tools. It's designed to be intuitive, consistent with WordPress design principles, and focused on automation tasks.

### 5.1 Homepage

The homepage communicates the platform's value proposition, showcases key capabilities, and directs users to key actions.

```ascii
+--------------------------------------------------------------------------------------------------------------------+
|                                              TanukiMCP                                                              |
|  [Logo: TanukiMCP 🦝]                    Features | Pricing | Docs | Blog | Sign Up | Login                         |
+--------------------------------------------------------------------------------------------------------------------+
|                                                                                                                    |
|                             [Hero Image: Tanuki mascot interacting with a WordPress dashboard]                     |
|                                                                                                                    |
|           Headline: "Automate Your WordPress Tasks with TanukiMCP – Effortlessly!"                                 |
|           Subheadline: "Focus on your content, not repetitive tasks. TanukiMCP provides reliable, scalable         |
|                        WordPress automation via a simple API. No infrastructure to manage."                        |
|                                                                                                                    |
|                                      [Get Started Free] [See Pricing]                                              |
|                                                                                                                    |
+--------------------------------------------------------------------------------------------------------------------+
|                                       How It Works                                                         |
|                                                                                                                    |
|  Step 1: CONNECT YOUR SITE           Step 2: DEFINE YOUR WORKFLOWS            Step 3: EXECUTE & MONITOR           |
|  ┌───────────────────────────┐       ┌───────────────────────────┐           ┌───────────────────────────┐       |
|  │ Icon: Connect 🔌          │ --►   │ Icon: Code </>           │ --►       │ Icon: Play ▶️             │       |
|  │ Link your WP site in      │       │ Use our simple interface to │           │ Trigger tasks via API.     │       |
|  │ minutes with our plugin.  │       │ define tasks: post updates, │           │ View real-time status &   │       |
|  │                           │       │ content creation, testing.  │           │ logs in your dashboard.   │       |
|  └───────────────────────────┘       └───────────────────────────┘           └───────────────────────────┘       |
|                                                                                                                    |
+--------------------------------------------------------------------------------------------------------------------+
|                                         WordPress Automation Use Cases                                            |
|                                                                                                                    |
|  ┌───────────────────────────┐    ┌───────────────────────────┐    ┌───────────────────────────┐    ┌───────────────┐ |
|  │ 📄 Content Management     │    │ 🛒 WooCommerce Sync       │    │ 🧪 Site Testing           │    │ 📊 Data Harvest│ |
|  │ Auto-post, update pages,  │    │ Sync product inventory,   │    │ Test forms, user flows,   │    │ Collect data   │ |
|  │ manage media, schedule.   │    │ prices across platforms.  │    │ logins automatically.     │    │ from any site. │ |
|  │ [Learn More ->]           │    │ [Learn More ->]           │    │ [Learn More ->]           │    │ [Learn More ->]│ |
|  └───────────────────────────┘    └───────────────────────────┘    └───────────────────────────┘    └───────────────┘ |
+--------------------------------------------------------------------------------------------------------------------+
```

### 5.2 Dashboard

The dashboard serves as the control center for accessing prompt sets and tools, monitoring automation tasks, and managing the user's account.

```ascii
+--------------------------------------------------------------------------------------------------------------------+
| [TanukiMCP Logo 🦝] Dashboard                                 [Search Bar] [Notifications 🔔] [User Name ▼]          |
+--------------------------------------------------------------------------------------------------------------------+
| Sidebar Navigation         | Main Content Area                                                                    |
|----------------------------|--------------------------------------------------------------------------------------|
| [🏠 Overview]              | ## Welcome back, [User Name]! 👋                                                    |
| [🧰 Prompt Sets]           |                                                                                      |
| [🔧 Tools]                 | **Quick Actions:**                                                                  |
| [📊 Usage Statistics]      | [+ Create New Workflow]  [🚀 Connect WordPress Site]  [📚 Browse Prompt Sets]       |
| [🔑 API Keys]              |                                                                                      |
| [📜 Recent Activity]       | **Available Prompt Sets:**                                                           |
| [⚙️ Settings]             | - Website Idea to MVP Implementation                                                |
| [💰 Billing]               | - Content Page Redesign                                                             |
| [📚 Documentation]         | - WooCommerce Product Management                                                    |
| [❓ Support]               | - Media Library Optimization                                                        |
| [🚪 Logout]                |                                                                                      |
+----------------------------+--------------------------------------------------------------------------------------+
```

### 5.3 Prompt Set Builder

A specialized interface for creating and customizing prompt sets:

```ascii
+--------------------------------------------------------------------------------------------------------------------+
| [TanukiMCP Logo 🦝] Prompt Set Builder                        [Save] [Test] [Publish] [User Name ▼]                 |
+--------------------------------------------------------------------------------------------------------------------+
| Left Panel                | Main Content Area                                  | Right Panel                      |
|---------------------------|---------------------------------------------------|----------------------------------|
| AVAILABLE TOOLS           | ## New Prompt Set                                 | PROMPT SET STRUCTURE             |
| ▼ Conceptual Tools        |                                                   | [+ Add Step]                     |
|   - Sitemap               | Name: [________________________]                  |                                   |
|   - Wireframe             | Description: [_________________]                  | Step 1: Initial Assessment       |
|   - Design Tokens         |                                                   | - Input: User description        |
|   - etc.                  | ### Step 1: Initial Assessment                    | - Tool: Sitemap                  |
|                           |                                                   | - Output: Site structure         |
| ▼ Execution Tools         | Input Type: [User Input ▼]                         |                                   |
|   - Implement Modification| Input Description: [___________]                  | Step 2: Design Planning          |
|   - Configuration         |                                                   | - Input: Site structure          |
|   - Helper                | Tool Selection: [Sitemap Tool ▼]                   | - Tool: Design Tokens            |
|   - etc.                  | Tool Parameters:                                  | - Output: Design system          |
|                           | [_________________________________]               |                                   |
| TEMPLATES                 |                                                   | Step 3: Implementation           |
| - Website Creation        | Output Format: [Structured JSON ▼]                 | - Input: Design system           |
| - Content Management      | Expected Output: [______________]                 | - Tool: Implement Modification   |
| - WooCommerce             |                                                   | - Output: Implementation plan    |
|                           | [+ Add Tool to Step]                              |                                   |
+---------------------------+---------------------------------------------------+----------------------------------+
```

### 5.4 Documentation Interface

A comprehensive documentation system for prompt sets and tools:

```ascii
+--------------------------------------------------------------------------------------------------------------------+
|  [TanukiMCP Logo 🦝]         Features | Pricing | Docs | Blog | [Search Docs: ______________🔍] | Sign Up | Login   |
+--------------------------------------------------------------------------------------------------------------------+
| Sidebar Navigation (TOC)   | Main Content Area                                           | On This Page (Scrollspy) |
|----------------------------|-------------------------------------------------------------|--------------------------|
| ▼ Getting Started          | # Using the Website Idea to MVP Prompt Set                  | - Overview               |
|   - Welcome                |                                                             | - Prerequisites          |
|   - Account Setup          | This guide explains how to use our Website Idea to MVP      | - Step 1: Initial Brief  |
|   - WordPress Connection   | prompt set to go from a concept to a fully implemented      | - Step 2: Design Planning|
|                            | WordPress website.                                          | - Step 3: Implementation |
| ▼ Prompt Sets              |                                                             | - Common Issues          |
|   - Website Idea to MVP    | ## Overview                                                 |                          |
|   - Content Redesign       |                                                             |                          |
|   - WooCommerce Management | The Website Idea to MVP prompt set utilizes a sequence of   |                          |
|                            | tools to transform your initial concept into a working      |                          |
| ▼ Tool Reference           | WordPress site. It combines both conceptual and execution   |                          |
|   - Conceptual Tools       | tools in a logical sequence.                                |                          |
|   - Execution Tools        |                                                             |                          |
|   - Helper Tools           | ## Prerequisites                                            |                          |
|                            |                                                             |                          |
| ▼ API Reference            | - WordPress site (version 5.8+)                            |                          |
|   - Authentication         | - Administrator access                                      |                          |
|   - Endpoints              | - TanukiMCP API key                                         |                          |
|                            |                                                             |                          |
+----------------------------+-------------------------------------------------------------+--------------------------+
```

## 6. Implementation Strategy

### 6.1 WordPress Integration

TanukiMCP integrates with WordPress through:

1. **REST API Integration**
   - Leverages WordPress REST API for all site operations
   - Authenticated API calls for protected operations
   - Custom endpoints for specialized functionalities

2. **Plugin Ecosystem**
   - Core plugin for connectivity and API extension
   - Optional integrations with popular plugins:
     - WooCommerce
     - Yoast SEO
     - Elementor/Gutenberg
     - Contact Form 7/WPForms

3. **Theme Compatibility**
   - Works with Twenty Twenty-Five and other block themes
   - Theme customization via WordPress APIs
   - Custom block patterns and templates

### 6.2 Development and Deployment

1. **WordPress Theme Customization**
   - Base theme: Twenty Twenty-Five (or latest WordPress default theme)
   - Customization via theme.json:
     ```json
     {
       "settings": {
         "color": {
           "palette": [
             {
               "name": "Tanuki Orange",
               "slug": "primary",
               "color": "#D35400"
             },
             {
               "name": "WordPress Green",
               "slug": "secondary",
               "color": "#27AE60"
             }
             // Additional colors...
           ]
         }
       }
     }
     ```

2. **Block Patterns and Templates**
   - Custom block patterns for common components
   - Templates for specialized page types
   - Theme compatibility testing

3. **Testing and Quality Assurance**
   - Comprehensive testing of all prompt sets and tools
   - Cross-browser and device compatibility
   - WordPress version compatibility testing

## 7. Conclusion

TanukiMCP represents a new approach to WordPress automation, combining powerful prompt-driven tools with a user-friendly interface. By explicitly referencing specific tools in every prompt set and creating logical sequences of operations, we enable users to achieve complex WordPress automation tasks with minimal input.

The platform's focus on user journeys ensures that real-world scenarios are handled efficiently, from initial website concepts to complex WooCommerce integrations. The integration with WordPress's native capabilities through the REST API ensures compatibility and future-proofing.

By developing pre-built, sequential prompting systems that can be used one by one in Claude Desktop or Cursor, we're creating a "no-code" web development experience that greatly simplifies WordPress development and management tasks while maintaining professional quality results.