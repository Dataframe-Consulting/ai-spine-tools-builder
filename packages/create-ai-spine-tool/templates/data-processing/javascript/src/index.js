const { createTool, arrayField, stringField, numberField, booleanField } = require('@ai-spine/tools');
const _ = require('lodash');

// Create the tool
const {{toolNameCamelCase}}Tool = createTool({
  metadata: {
    name: '{{toolName}}',
    version: '1.0.0',
    description: '{{description}}',
    capabilities: ['data-processing', 'data-transformation', 'data-analysis'],
    author: 'Your Name',
    license: 'MIT',
  },

  schema: {
    input: {
      data: arrayField({
        type: 'object',
        required: true,
        description: 'Array of data objects to process',
      }),
      operation: stringField({
        required: true,
        description: 'Type of operation to perform',
        enum: ['filter', 'transform', 'aggregate', 'sort'],
      }),
      parameters: {
        type: 'object',
        required: true,
        description: 'Parameters for the operation',
        properties: {
          filterBy: stringField({
            required: false,
            description: 'Field name to filter by',
          }),
          filterValue: stringField({
            required: false,
            description: 'Value to filter for',
          }),
          transformField: stringField({
            required: false,
            description: 'Field name to transform',
          }),
          transformFunction: stringField({
            required: false,
            description: 'Transformation function to apply',
            enum: ['uppercase', 'lowercase', 'multiply', 'add'],
          }),
          transformValue: numberField({
            required: false,
            description: 'Numeric value for mathematical transformations',
          }),
          aggregateBy: stringField({
            required: false,
            description: 'Field to group by for aggregation',
          }),
          aggregateFunction: stringField({
            required: false,
            description: 'Aggregation function to apply',
            enum: ['sum', 'avg', 'count', 'min', 'max'],
          }),
          sortBy: stringField({
            required: false,
            description: 'Field name to sort by',
          }),
          sortOrder: stringField({
            required: false,
            description: 'Sort order',
            enum: ['asc', 'desc'],
            default: 'asc',
          }),
        },
      },
      outputFormat: stringField({
        required: false,
        description: 'Output format for the results',
        enum: ['array', 'object', 'csv'],
        default: 'array',
      }),
    },

    config: {
      max_records: {
        type: 'number',
        required: false,
        description: 'Maximum number of records to process',
        default: 10000,
        validation: {
          min: 1,
          max: 100000,
        },
      },
      allow_unsafe_operations: {
        type: 'boolean',
        required: false,
        description: 'Allow potentially unsafe operations',
        default: false,
      },
      default_output_format: {
        type: 'string',
        required: false,
        description: 'Default output format',
        default: 'array',
      },
    },
  },

  async execute(input, config, context) {
    console.log(`Executing {{toolName}} tool with execution ID: ${context.executionId}`);

    try {
      // Validate input data size
      const maxRecords = config.max_records || 10000;
      if (input.data.length > maxRecords) {
        throw new Error(`Data size exceeds maximum allowed records (${maxRecords}). Got ${input.data.length} records.`);
      }

      console.log(`Processing ${input.data.length} records with operation: ${input.operation}`);

      let result;
      let processingStats = {
        inputRecords: input.data.length,
        outputRecords: 0,
        operation: input.operation,
        processingTimeMs: 0,
      };

      const startTime = Date.now();

      switch (input.operation) {
        case 'filter':
          result = await performFilter(input.data, input.parameters);
          break;
        case 'transform':
          result = await performTransform(input.data, input.parameters);
          break;
        case 'aggregate':
          result = await performAggregate(input.data, input.parameters);
          break;
        case 'sort':
          result = await performSort(input.data, input.parameters);
          break;
        default:
          throw new Error(`Unsupported operation: ${input.operation}`);
      }

      processingStats.processingTimeMs = Date.now() - startTime;
      processingStats.outputRecords = Array.isArray(result) ? result.length : 1;

      // Format output
      const outputFormat = input.outputFormat || config.default_output_format || 'array';
      const formattedResult = formatOutput(result, outputFormat);

      return {
        status: 'success',
        data: {
          result: formattedResult,
          statistics: processingStats,
          metadata: {
            execution_id: context.executionId,
            timestamp: context.timestamp.toISOString(),
            tool_version: '1.0.0',
            output_format: outputFormat,
          },
        },
      };
    } catch (error) {
      console.error('Error processing data:', error);
      throw new Error(`Data processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Filter data based on field and value
 */
async function performFilter(data, parameters) {
  const { filterBy, filterValue } = parameters;
  
  if (!filterBy) {
    throw new Error('filterBy parameter is required for filter operation');
  }

  return data.filter(item => {
    const fieldValue = _.get(item, filterBy);
    
    if (filterValue === undefined) {
      return fieldValue !== undefined && fieldValue !== null;
    }
    
    return fieldValue === filterValue;
  });
}

/**
 * Transform data by applying functions to specified fields
 */
async function performTransform(data, parameters) {
  const { transformField, transformFunction, transformValue } = parameters;
  
  if (!transformField || !transformFunction) {
    throw new Error('transformField and transformFunction are required for transform operation');
  }

  return data.map(item => {
    const newItem = _.cloneDeep(item);
    const currentValue = _.get(newItem, transformField);

    switch (transformFunction) {
      case 'uppercase':
        if (typeof currentValue === 'string') {
          _.set(newItem, transformField, currentValue.toUpperCase());
        }
        break;
      case 'lowercase':
        if (typeof currentValue === 'string') {
          _.set(newItem, transformField, currentValue.toLowerCase());
        }
        break;
      case 'multiply':
        if (typeof currentValue === 'number' && typeof transformValue === 'number') {
          _.set(newItem, transformField, currentValue * transformValue);
        }
        break;
      case 'add':
        if (typeof currentValue === 'number' && typeof transformValue === 'number') {
          _.set(newItem, transformField, currentValue + transformValue);
        }
        break;
      default:
        throw new Error(`Unsupported transform function: ${transformFunction}`);
    }

    return newItem;
  });
}

/**
 * Aggregate data by grouping and applying aggregation functions
 */
async function performAggregate(data, parameters) {
  const { aggregateBy, aggregateFunction } = parameters;
  
  if (!aggregateBy || !aggregateFunction) {
    throw new Error('aggregateBy and aggregateFunction are required for aggregate operation');
  }

  const grouped = _.groupBy(data, aggregateBy);
  const result = {};

  for (const [key, group] of Object.entries(grouped)) {
    switch (aggregateFunction) {
      case 'count':
        result[key] = group.length;
        break;
      case 'sum':
        result[key] = _.sumBy(group, aggregateBy);
        break;
      case 'avg':
        result[key] = _.meanBy(group, aggregateBy);
        break;
      case 'min':
        result[key] = _.minBy(group, aggregateBy)?.[aggregateBy];
        break;
      case 'max':
        result[key] = _.maxBy(group, aggregateBy)?.[aggregateBy];
        break;
      default:
        throw new Error(`Unsupported aggregate function: ${aggregateFunction}`);
    }
  }

  return result;
}

/**
 * Sort data by specified field and order
 */
async function performSort(data, parameters) {
  const { sortBy, sortOrder = 'asc' } = parameters;
  
  if (!sortBy) {
    throw new Error('sortBy parameter is required for sort operation');
  }

  return _.orderBy(data, [sortBy], [sortOrder]);
}

/**
 * Format output according to specified format
 */
function formatOutput(data, format) {
  switch (format) {
    case 'array':
      return Array.isArray(data) ? data : [data];
    case 'object':
      return data;
    case 'csv':
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        return `${headers}\n${rows}`;
      }
      return '';
    default:
      return data;
  }
}

// Start the tool server
async function main() {
  try {
    await {{toolNameCamelCase}}Tool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: process.env.HOST || '0.0.0.0',
      development: {
        requestLogging: process.env.NODE_ENV === 'development'
      },
      security: {
        requireAuth: process.env.API_KEY_AUTH === 'true',
        apiKeys: process.env.VALID_API_KEYS?.split(','),
      },
    });
  } catch (error) {
    console.error('Failed to start tool server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await {{toolNameCamelCase}}Tool.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await {{toolNameCamelCase}}Tool.stop();
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  main();
}

module.exports = {{toolNameCamelCase}}Tool;