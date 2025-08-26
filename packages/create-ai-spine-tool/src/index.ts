/**
 * AI Spine Tool Generator - Main API exports
 * 
 * This module provides the main programmatic API for creating AI Spine tools.
 * While the CLI is the primary interface for most users, these exports allow
 * for programmatic tool generation in build scripts, IDEs, or other tools.
 * 
 * @fileoverview Main API exports for create-ai-spine-tool
 * @author AI Spine Team
 * @since 1.0.0
 */

// Core tool creation functionality
export { createTool } from './create-tool';

// Type definitions and interfaces
export * from './types';

// Default export for convenience
export { createTool as default } from './create-tool';