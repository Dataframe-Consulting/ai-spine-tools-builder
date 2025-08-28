/**
 * Database Tool Example
 * 
 * Demonstrates AI Spine Tools SDK usage with database integration.
 * Features:
 * - PostgreSQL connection management with connection pooling
 * - Query execution with parameterized queries (SQL injection prevention)
 * - Transaction support for data consistency
 * - Connection pooling for performance and scalability
 * - Query timeout and safety controls
 * - Schema introspection capabilities
 * - Read-only mode support for safety
 * - Comprehensive error handling and logging
 */

import { createTool, stringField, booleanField, enumField, numberField } from '@ai-spine/tools';
// import { Pool, PoolClient, Client, QueryResult } from 'pg'; // Commented out for compilation - would be needed in real implementation
import * as dotenv from 'dotenv';

// Type definitions for demonstration (in real app would come from 'pg' package)
interface Pool {
  connect(): Promise<PoolClient>;
  query(text: string, params?: any[]): Promise<QueryResult>;
  end(): Promise<void>;
}

interface PoolClient {
  query(text: string, params?: any[]): Promise<QueryResult>;
  release(): void;
}

interface QueryResult {
  rows: any[];
  rowCount: number | null;
}

// Load environment variables
dotenv.config();

// Define input interface for type safety
interface DatabaseInput {
  query: string;
  params?: any[];
  operation?: 'select' | 'insert' | 'update' | 'delete' | 'schema' | 'transaction';
  transactionQueries?: Array<{
    query: string;
    params?: any[];
  }>;
  schema?: string;
  table?: string;
  useTransaction?: boolean;
  maxRows?: number;
}

// Define configuration interface
interface DatabaseConfig {
  connectionUrl?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxQueryExecutionTime?: number;
  readOnlyMode?: boolean;
  allowedSchemas?: string[];
}

// Database connection pool
let dbPool: Pool | null = null;

// Query classification helper
function classifyQuery(query: string): 'select' | 'insert' | 'update' | 'delete' | 'ddl' | 'other' {
  const normalizedQuery = query.trim().toLowerCase();
  
  if (normalizedQuery.startsWith('select') || normalizedQuery.startsWith('with')) {
    return 'select';
  } else if (normalizedQuery.startsWith('insert')) {
    return 'insert';
  } else if (normalizedQuery.startsWith('update')) {
    return 'update';
  } else if (normalizedQuery.startsWith('delete')) {
    return 'delete';
  } else if (
    normalizedQuery.startsWith('create') ||
    normalizedQuery.startsWith('drop') ||
    normalizedQuery.startsWith('alter') ||
    normalizedQuery.startsWith('truncate')
  ) {
    return 'ddl';
  }
  
  return 'other';
}

// SQL injection detection helper
function detectSqlInjection(query: string): boolean {
  const suspiciousPatterns = [
    /;\s*drop\s+/i,
    /;\s*delete\s+/i,
    /;\s*truncate\s+/i,
    /union\s+select/i,
    /'\s*or\s+\d+\s*=\s*\d+/i,
    /'\s*or\s+'[^']*'\s*=\s*'[^']*/i,
    /--\s*$/,
    /\/\*.*\*\//,
    /exec\s*\(/i,
    /xp_\w+/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(query));
}

// Schema validation helper
function isSchemaAllowed(schema: string, allowedSchemas?: string[]): boolean {
  if (!allowedSchemas || allowedSchemas.length === 0) {
    return true; // If no restrictions, allow all
  }
  
  return allowedSchemas.includes(schema.toLowerCase());
}

// Connection pool initialization (simulated for compilation)
async function initializePool(config: DatabaseConfig): Promise<Pool> {
  if (dbPool) {
    return dbPool;
  }
  
  console.log('Initializing database pool (simulated):', {
    host: config.host || 'localhost',
    port: config.port || 5432,
    database: config.database,
    ssl: config.ssl
  });
  
  // Simulate pool creation (in real app would use actual Pool from 'pg')
  dbPool = {
    connect: async (): Promise<PoolClient> => ({
      query: async (text: string, params?: any[]): Promise<QueryResult> => ({
        rows: [{ now: new Date().toISOString() }],
        rowCount: 1
      }),
      release: () => {}
    }),
    query: async (text: string, params?: any[]): Promise<QueryResult> => ({
      rows: [{ result: 'simulated' }],
      rowCount: 1
    }),
    end: async () => {}
  };
  
  return dbPool;
}

// Execute query with timeout and safety checks
async function executeQuery(
  client: PoolClient | Pool,
  query: string,
  params?: any[],
  timeoutMs: number = 30000
): Promise<QueryResult> {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    try {
      const result = await client.query(query, params);
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Get table schema information
async function getTableSchema(client: PoolClient | Pool, schemaName: string, tableName: string): Promise<any> {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `;
  
  const result = await executeQuery(client, query, [schemaName, tableName]);
  return result.rows;
}

// Get database schema information
async function getDatabaseSchemas(client: PoolClient | Pool): Promise<any> {
  const query = `
    SELECT 
      schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY schema_name
  `;
  
  const result = await executeQuery(client, query);
  return result.rows;
}

// Get tables in schema
async function getSchemaTablesList(client: PoolClient | Pool, schemaName: string): Promise<any> {
  const query = `
    SELECT 
      table_name,
      table_type
    FROM information_schema.tables
    WHERE table_schema = $1
    ORDER BY table_name
  `;
  
  const result = await executeQuery(client, query, [schemaName]);
  return result.rows;
}

// Create the database tool
const databaseTool = createTool<DatabaseInput, DatabaseConfig>({
  metadata: {
    name: 'database-tool',
    version: '1.0.0',
    description: 'Execute SQL queries and manage database operations with PostgreSQL integration',
    capabilities: ['database', 'sql', 'postgresql', 'transactions', 'schema-introspection'],
    author: 'AI Spine Tools',
    license: 'MIT',
  },

  schema: {
    input: {
      query: stringField({
        required: true,
        minLength: 1,
        maxLength: 10000,
        description: 'SQL query to execute',
        example: 'SELECT * FROM users WHERE active = true',
      }),
      params: {
        type: 'array',
        required: false,
        maxItems: 100,
        description: 'Parameters for parameterized query (prevents SQL injection)',
        example: ['value1', 'value2'],
        items: { type: 'string', required: false },
      },
      operation: enumField(['select', 'insert', 'update', 'delete', 'schema', 'transaction'], {
        required: false,
        description: 'Type of database operation (auto-detected if not specified)',
      }),
      transactionQueries: {
        type: 'array',
        required: false,
        maxItems: 50,
        description: 'Multiple queries to execute in a single transaction',
        items: {
          type: 'object',
          required: false,
          properties: {
            query: stringField({ required: true }),
            params: {
              type: 'array',
              required: false,
              items: { type: 'string', required: false },
            },
          },
          requiredProperties: ['query'],
        },
      },
      schema: stringField({
        required: false,
        description: 'Database schema to query (for schema introspection)',
        example: 'public',
      }),
      table: stringField({
        required: false,
        description: 'Table name (for schema introspection)',
        example: 'users',
      }),
      useTransaction: booleanField({
        required: false,
        description: 'Execute query within a transaction',
        default: false,
      }),
      maxRows: numberField({
        required: false,
        description: 'Maximum number of rows to return (for SELECT queries)',
        min: 1,
        max: 10000,
        default: 1000,
      }),
    },

    config: {
      connectionUrl: {
        type: 'string',
        required: false,
        description: 'Full PostgreSQL connection URL',
        example: 'postgresql://user:password@localhost:5432/database',
      },
      host: {
        type: 'string',
        required: false,
        description: 'Database host',
        default: 'localhost',
      },
      port: {
        type: 'number',
        required: false,
        description: 'Database port',
        default: 5432,
        validation: {
          min: 1,
          max: 65535,
        },
      },
      database: {
        type: 'string',
        required: false,
        description: 'Database name',
      },
      user: {
        type: 'string',
        required: false,
        description: 'Database user',
      },
      password: {
        type: 'string',
        required: false,
        description: 'Database password',
      },
      ssl: {
        type: 'boolean',
        required: false,
        description: 'Enable SSL connection',
        default: false,
      },
      maxConnections: {
        type: 'number',
        required: false,
        description: 'Maximum number of connections in pool',
        default: 20,
        validation: {
          min: 1,
          max: 100,
        },
      },
      idleTimeoutMillis: {
        type: 'number',
        required: false,
        description: 'Connection idle timeout in milliseconds',
        default: 30000,
        validation: {
          min: 1000,
          max: 300000,
        },
      },
      connectionTimeoutMillis: {
        type: 'number',
        required: false,
        description: 'Connection timeout in milliseconds',
        default: 5000,
        validation: {
          min: 1000,
          max: 30000,
        },
      },
      maxQueryExecutionTime: {
        type: 'number',
        required: false,
        description: 'Maximum query execution time in milliseconds',
        default: 30000,
        validation: {
          min: 1000,
          max: 300000,
        },
      },
      readOnlyMode: {
        type: 'boolean',
        required: false,
        description: 'Enable read-only mode (only SELECT queries allowed)',
        default: false,
      },
      allowedSchemas: {
        type: 'json',
        required: false,
        description: 'Allowed database schemas for queries (JSON array of strings)',
      },
    },
  },

  async execute(input, config, context) {
    console.log(`Executing database operation with ID: ${context.executionId}`);

    const {
      query,
      params = [],
      operation,
      transactionQueries = [],
      schema,
      table,
      useTransaction = false,
      maxRows = 1000,
    } = input;

    const {
      maxQueryExecutionTime = 30000,
      readOnlyMode = false,
      allowedSchemas,
    } = config;

    try {
      // Initialize connection pool
      const pool = await initializePool(config);

      // Determine operation type
      const actualOperation = operation || classifyQuery(query);

      // Check read-only mode restrictions
      if (readOnlyMode && !['select', 'schema'].includes(actualOperation)) {
        return {
          status: 'error',
          error: {
            code: 'READ_ONLY_MODE_VIOLATION',
            message: `Operation '${actualOperation}' not allowed in read-only mode`,
            type: 'validation_error',
          },
        };
      }

      // Check for SQL injection attempts
      if (detectSqlInjection(query)) {
        return {
          status: 'error',
          error: {
            code: 'SUSPICIOUS_QUERY',
            message: 'Query contains potentially malicious patterns',
            type: 'validation_error',
          },
        };
      }

      // Check schema restrictions
      if (schema && !isSchemaAllowed(schema, allowedSchemas)) {
        return {
          status: 'error',
          error: {
            code: 'SCHEMA_NOT_ALLOWED',
            message: `Schema '${schema}' is not in the allowed schemas list`,
            type: 'validation_error',
            details: {
              allowedSchemas: allowedSchemas,
            },
          },
        };
      }

      let result: any;
      
      // Handle different operation types
      if (actualOperation === 'schema') {
        // Schema introspection operations
        if (table && schema) {
          // Get specific table schema
          const tableSchema = await getTableSchema(pool, schema, table);
          result = {
            type: 'table_schema',
            schema: schema,
            table: table,
            columns: tableSchema,
          };
        } else if (schema) {
          // Get tables in schema
          const tables = await getSchemaTablesList(pool, schema);
          result = {
            type: 'schema_tables',
            schema: schema,
            tables: tables,
          };
        } else {
          // Get all schemas
          const schemas = await getDatabaseSchemas(pool);
          result = {
            type: 'database_schemas',
            schemas: schemas,
          };
        }
      } else if (transactionQueries.length > 0) {
        // Execute multiple queries in a transaction
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          const results = [];
          for (const txQuery of transactionQueries) {
            const queryResult = await executeQuery(
              client,
              txQuery.query,
              txQuery.params,
              maxQueryExecutionTime
            );
            results.push({
              query: txQuery.query,
              rowCount: queryResult.rowCount,
              rows: actualOperation === 'select' ? queryResult.rows.slice(0, maxRows) : undefined,
            });
          }
          
          await client.query('COMMIT');
          
          result = {
            type: 'transaction',
            queries: results,
            totalQueries: transactionQueries.length,
          };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } else if (useTransaction) {
        // Execute single query in transaction
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const queryResult = await executeQuery(client, query, params, maxQueryExecutionTime);
          await client.query('COMMIT');
          
          result = {
            type: 'single_transaction',
            query: query,
            rowCount: queryResult.rowCount,
            rows: actualOperation === 'select' ? queryResult.rows.slice(0, maxRows) : undefined,
          };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } else {
        // Execute single query without transaction
        const queryResult = await executeQuery(pool, query, params, maxQueryExecutionTime);
        
        result = {
          type: 'single_query',
          query: query,
          rowCount: queryResult.rowCount,
          rows: actualOperation === 'select' ? queryResult.rows.slice(0, maxRows) : undefined,
        };
      }

      return {
        status: 'success',
        data: {
          operation: actualOperation,
          result: result,
          executionInfo: {
            parametersUsed: params.length > 0,
            parameterCount: params.length,
            transactionUsed: useTransaction || transactionQueries.length > 0,
            readOnlyMode: readOnlyMode,
            maxRowsLimit: actualOperation === 'select' ? maxRows : null,
          },
          metadata: {
            executionId: context.executionId,
            timestamp: context.timestamp.toISOString(),
            toolVersion: '1.0.0',
            databaseProvider: 'PostgreSQL',
          },
        },
        timing: {
          executionTimeMs: Date.now() - context.performance!.startTime,
          startedAt: new Date(context.performance!.startTime).toISOString(),
          completedAt: new Date().toISOString(),
        },
      };

    } catch (error: any) {
      console.error('Database operation failed:', error);

      // Handle specific PostgreSQL errors
      if (error.code) {
        const pgErrorMap: Record<string, { code: string, type: 'validation_error' | 'configuration_error' | 'execution_error' | 'network_error' | 'timeout_error' | 'system_error' | 'client_error' | 'server_error' }> = {
          '28P01': { code: 'AUTHENTICATION_FAILED', type: 'client_error' },
          '3D000': { code: 'DATABASE_NOT_EXISTS', type: 'system_error' },
          '28000': { code: 'INVALID_AUTHORIZATION', type: 'client_error' },
          '42P01': { code: 'TABLE_NOT_EXISTS', type: 'validation_error' },
          '42703': { code: 'COLUMN_NOT_EXISTS', type: 'validation_error' },
          '23505': { code: 'UNIQUE_CONSTRAINT_VIOLATION', type: 'execution_error' },
          '23503': { code: 'FOREIGN_KEY_VIOLATION', type: 'execution_error' },
          '23502': { code: 'NOT_NULL_VIOLATION', type: 'execution_error' },
          '42601': { code: 'SYNTAX_ERROR', type: 'validation_error' },
        };

        const mappedError = pgErrorMap[error.code];
        if (mappedError) {
          return {
            status: 'error',
            error: {
              code: mappedError.code,
              message: error.message,
              type: mappedError.type,
              details: {
                pgErrorCode: error.code,
                pgErrorMessage: error.message,
                position: error.position,
              },
            },
          };
        }
      }

      // Handle connection errors
      if (error.message?.includes('timeout') || error.message?.includes('Query timeout')) {
        return {
          status: 'error',
          error: {
            code: 'QUERY_TIMEOUT',
            message: `Query execution timeout after ${maxQueryExecutionTime}ms`,
            type: 'execution_error',
          },
        };
      }

      if (error.message?.includes('connect') || error.message?.includes('connection')) {
        return {
          status: 'error',
          error: {
            code: 'CONNECTION_FAILED',
            message: `Database connection failed: ${error.message}`,
            type: 'network_error',
          },
        };
      }

      // Generic error handling
      return {
        status: 'error',
        error: {
          code: 'DATABASE_OPERATION_FAILED',
          message: `Database operation failed: ${error.message}`,
          type: 'execution_error',
          details: {
            errorCode: error.code,
            errorMessage: error.message,
          },
        },
      };
    }
  },
});

// Start the tool server
async function main() {
  try {
    await databaseTool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3004,
      host: process.env.HOST || '0.0.0.0',
      development: {
        requestLogging: process.env.NODE_ENV === 'development',
      },
      security: {
        requireAuth: process.env.API_KEY_AUTH === 'true',
        apiKeys: process.env.VALID_API_KEYS?.split(','),
      },
    });
    
    console.log('Database tool server started successfully!');
    console.log('Available endpoints:');
    console.log('- POST /api/execute - Execute SQL queries');
    console.log('- GET /health - Health check');
    console.log('- GET /schema - API documentation');
    
  } catch (error) {
    console.error('Failed to start database server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down database tool gracefully...');
  if (dbPool) {
    await dbPool.end();
  }
  await databaseTool.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down database tool gracefully...');
  if (dbPool) {
    await dbPool.end();
  }
  await databaseTool.stop();
  process.exit(0);
});

// Start the server if this file is run directly
main();

export default databaseTool;