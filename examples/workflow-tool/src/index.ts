/**
 * Complex Workflow Tool Example
 * 
 * Demonstrates multi-step operations, state management, error recovery,
 * and performance optimization in AI Spine Tools SDK.
 */

import { createTool, stringField, booleanField } from '@ai-spine/tools';

interface WorkflowInput {
  workflowType: 'data-processing' | 'api-chain' | 'validation-pipeline';
  steps: Array<{
    id: string;
    type: 'transform' | 'validate' | 'api-call' | 'aggregate';
    config: any;
  }>;
  data: any;
  continueOnError?: boolean;
}

interface WorkflowConfig {
  maxSteps: number;
  timeout: number;
  enableRollback: boolean;
}

const workflowTool = createTool<WorkflowInput, WorkflowConfig>({
  metadata: {
    name: 'workflow-tool',
    version: '1.0.0',
    description: 'Complex multi-step workflow execution with state management and error recovery',
    capabilities: ['workflow', 'multi-step', 'state-management', 'error-recovery'],
    author: 'AI Spine Tools',
    license: 'MIT',
  },

  schema: {
    input: {
      workflowType: stringField({
        required: true,
        description: 'Type of workflow to execute',
      }),
      steps: {
        type: 'array',
        required: true,
        description: 'Workflow steps to execute',
        items: {
          type: 'object',
          required: false,
          properties: {
            id: stringField({ required: true }),
            type: stringField({ required: true }),
            config: { type: 'object', required: true },
          },
          requiredProperties: ['id', 'type', 'config'],
        },
      },
      data: {
        type: 'object',
        required: true,
        description: 'Input data for workflow',
      },
      continueOnError: booleanField({
        required: false,
        default: false,
        description: 'Continue workflow execution on step errors',
      }),
    },

    config: {
      maxSteps: {
        type: 'number',
        required: false,
        default: 10,
        description: 'Maximum number of workflow steps',
        validation: { min: 1, max: 100 },
      },
      timeout: {
        type: 'number',
        required: false,
        default: 60000,
        description: 'Workflow timeout in milliseconds',
        validation: { min: 1000, max: 300000 },
      },
      enableRollback: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Enable rollback on workflow failure',
      },
    },
  },

  async execute(input, config, context) {
    const { workflowType, steps, data, continueOnError = false } = input;
    const { maxSteps = 10, timeout = 60000, enableRollback = true } = config;

    const executionState = {
      currentStep: 0,
      results: [] as any[],
      errors: [] as any[],
      rollbackActions: [] as (() => Promise<void>)[],
      startTime: Date.now(),
    };

    try {
      // Validate workflow
      if (steps.length > maxSteps) {
        throw new Error(`Workflow exceeds maximum steps limit: ${maxSteps}`);
      }

      let workingData = { ...data };

      // Execute workflow steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        executionState.currentStep = i;

        try {
          // Simulate step execution with different types
          let stepResult;
          
          switch (step.type) {
            case 'transform':
              stepResult = await executeTransformStep(workingData, step.config);
              break;
            case 'validate':
              stepResult = await executeValidationStep(workingData, step.config);
              break;
            case 'api-call':
              stepResult = await executeApiCallStep(workingData, step.config);
              break;
            case 'aggregate':
              stepResult = await executeAggregateStep(workingData, step.config);
              break;
            default:
              throw new Error(`Unknown step type: ${step.type}`);
          }

          // Update working data
          workingData = stepResult.data;
          
          executionState.results.push({
            stepId: step.id,
            stepType: step.type,
            success: true,
            result: stepResult,
            executionTime: Date.now() - executionState.startTime,
          });

          // Add rollback action if applicable
          if (stepResult.rollbackAction && enableRollback) {
            executionState.rollbackActions.unshift(stepResult.rollbackAction);
          }

        } catch (stepError: any) {
          const errorInfo = {
            stepId: step.id,
            stepType: step.type,
            error: stepError.message,
            executionTime: Date.now() - executionState.startTime,
          };

          executionState.errors.push(errorInfo);

          if (!continueOnError) {
            // Execute rollback if enabled
            if (enableRollback && executionState.rollbackActions.length > 0) {
              console.log('Executing rollback actions...');
              for (const rollbackAction of executionState.rollbackActions) {
                try {
                  await rollbackAction();
                } catch (rollbackError) {
                  console.error('Rollback action failed:', rollbackError);
                }
              }
            }

            return {
              status: 'error',
              error: {
                code: 'WORKFLOW_STEP_FAILED',
                message: `Workflow failed at step ${i + 1} (${step.id}): ${stepError.message}`,
                type: 'execution_error',
                details: {
                  failedStep: errorInfo,
                  completedSteps: executionState.results.length,
                  totalSteps: steps.length,
                  rollbackExecuted: enableRollback && executionState.rollbackActions.length > 0,
                },
              },
            };
          }

          console.log(`Step ${step.id} failed, continuing workflow...`);
        }

        // Check timeout
        if (Date.now() - executionState.startTime > timeout) {
          throw new Error('Workflow execution timeout');
        }
      }

      return {
        status: 'success',
        data: {
          workflowType,
          finalData: workingData,
          executionSummary: {
            totalSteps: steps.length,
            completedSteps: executionState.results.length,
            failedSteps: executionState.errors.length,
            executionTime: Date.now() - executionState.startTime,
          },
          stepResults: executionState.results,
          errors: executionState.errors,
          metadata: {
            executionId: context.executionId,
            timestamp: context.timestamp.toISOString(),
            toolVersion: '1.0.0',
          },
        },
        timing: {
          executionTimeMs: Date.now() - context.performance!.startTime,
          startedAt: new Date(context.performance!.startTime).toISOString(),
          completedAt: new Date().toISOString(),
        },
      };

    } catch (error: any) {
      return {
        status: 'error',
        error: {
          code: 'WORKFLOW_EXECUTION_FAILED',
          message: error.message,
          type: 'execution_error',
          details: {
            currentStep: executionState.currentStep,
            executionState,
          },
        },
      };
    }
  },
});

// Helper functions for different step types
async function executeTransformStep(data: any, config: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
  return {
    data: { ...data, transformed: true, transformation: config.type || 'default' },
    rollbackAction: async () => {
      console.log('Rolling back transformation...');
    },
  };
}

async function executeValidationStep(data: any, config: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (config.strict && !data.required_field) {
    throw new Error('Validation failed: required_field is missing');
  }
  
  return {
    data: { ...data, validated: true },
    rollbackAction: null,
  };
}

async function executeApiCallStep(data: any, config: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API call
  
  return {
    data: { ...data, apiResponse: { status: 'success', endpoint: config.endpoint } },
    rollbackAction: async () => {
      console.log('Rolling back API call...');
    },
  };
}

async function executeAggregateStep(data: any, config: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 75));
  
  const aggregated = {
    count: Array.isArray(data.items) ? data.items.length : 0,
    summary: config.type || 'count',
  };
  
  return {
    data: { ...data, aggregated },
    rollbackAction: null,
  };
}

async function main() {
  try {
    await workflowTool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3006,
      host: process.env.HOST || '0.0.0.0',
    });
    console.log('Workflow tool server started on port 3006!');
  } catch (error) {
    console.error('Failed to start workflow server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
main();

export default workflowTool;