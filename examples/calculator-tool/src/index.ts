import { createTool, stringField, numberField, enumField } from '@ai-spine/tools';

// Define the input interface for type safety
interface CalculatorInput {
  numero1: number;
  numero2: number;
  operation: 'suma' | 'resta' | 'multiplicacion' | 'division';
}

// Define the configuration interface (minimal for this simple calculator)
interface CalculatorConfig {
  precision?: number;
}

// Create the calculator tool
const calculatorTool = createTool<CalculatorInput, CalculatorConfig>({
  metadata: {
    name: 'calculator-tool',
    version: '1.0.0',
    description: 'Una calculadora simple que realiza operaciones básicas con dos números',
    capabilities: ['arithmetic', 'calculation'],
    author: 'AI Spine Tools',
    license: 'MIT',
  },

  schema: {
    input: {
      numero1: numberField({
        required: true,
        description: 'Primer número para la operación',
      }),
      numero2: numberField({
        required: true,
        description: 'Segundo número para la operación',
      }),
      operation: enumField(
        ['suma', 'resta', 'multiplicacion', 'division'],
        {
          required: true,
          description: 'Operación aritmética a realizar',
        }
      ),
    },

    config: {
      precision: {
        type: 'number',
        required: false,
        description: 'Número de decimales en el resultado (por defecto: 10)',
        default: 10,
        validation: {
          min: 0,
          max: 15,
        },
      },
    },
  },

  async execute(input, config, context) {
    console.log(`Ejecutando calculadora con ID: ${context.executionId}`);

    try {
      const { numero1, numero2, operation } = input;
      const precision = config.precision ?? 10;
      let resultado: number;
      let operationSymbol: string;

      switch (operation) {
        case 'suma':
          resultado = numero1 + numero2;
          operationSymbol = '+';
          break;
        case 'resta':
          resultado = numero1 - numero2;
          operationSymbol = '-';
          break;
        case 'multiplicacion':
          resultado = numero1 * numero2;
          operationSymbol = '×';
          break;
        case 'division':
          if (numero2 === 0) {
            return {
              status: 'error',
              error: {
                code: 'DIVISION_BY_ZERO',
                message: 'No se puede dividir por cero',
                type: 'validation_error'
              }
            };
          }
          resultado = numero1 / numero2;
          operationSymbol = '÷';
          break;
        default:
          return {
            status: 'error',
            error: {
              code: 'INVALID_OPERATION',
              message: `Operación no soportada: ${operation}`,
              type: 'validation_error'
            }
          };
      }

      // Apply precision to avoid floating point issues
      const resultadoFinal = Number(resultado.toFixed(precision));

      return {
        status: 'success',
        data: {
          resultado: resultadoFinal,
          operacion: `${numero1} ${operationSymbol} ${numero2} = ${resultadoFinal}`,
          detalles: {
            numero1,
            numero2,
            operation,
            operationSymbol,
            precision,
          },
          metadata: {
            execution_id: context.executionId,
            timestamp: context.timestamp.toISOString(),
            tool_version: '1.0.0',
          },
        },
        timing: {
          executionTimeMs: Date.now() - context.performance!.startTime,
          startedAt: new Date(context.performance!.startTime).toISOString(),
          completedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error en el cálculo:', error);
      return {
        status: 'error',
        error: {
          code: 'EXECUTION_ERROR',
          message: `Falló el cálculo: ${error instanceof Error ? error.message : String(error)}`,
          type: 'execution_error'
        }
      };

    }
  },
});

// Start the tool server
async function main() {
  try {
    await calculatorTool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
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
    console.error('Failed to start calculator server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Cerrando calculadora graciosamente...');
  await calculatorTool.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Cerrando calculadora graciosamente...');
  await calculatorTool.stop();
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  main();
}

export default calculatorTool;