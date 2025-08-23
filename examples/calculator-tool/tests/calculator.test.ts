import calculatorTool from '../src/index';

describe('Calculator Tool', () => {
  const mockConfig = {
    precision: 2,
  };

  describe('suma operation', () => {
    it('should add two positive numbers', async () => {
      const input = {
        numero1: 5,
        numero2: 3,
        operation: 'suma' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(8);
      expect(executeResult.result?.data?.operacion).toBe('5 + 3 = 8');
      expect(executeResult.result?.data?.detalles.operation).toBe('suma');
    });

    it('should add negative numbers', async () => {
      const input = {
        numero1: -5,
        numero2: -3,
        operation: 'suma' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(-8);
      expect(executeResult.result?.data?.operacion).toBe('-5 + -3 = -8');
    });

    it('should add decimal numbers', async () => {
      const input = {
        numero1: 2.5,
        numero2: 3.7,
        operation: 'suma' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(6.2);
      expect(executeResult.result?.data?.operacion).toBe('2.5 + 3.7 = 6.2');
    });
  });

  describe('resta operation', () => {
    it('should subtract two numbers', async () => {
      const input = {
        numero1: 10,
        numero2: 4,
        operation: 'resta' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(6);
      expect(executeResult.result?.data?.operacion).toBe('10 - 4 = 6');
      expect(executeResult.result?.data?.detalles.operation).toBe('resta');
    });

    it('should handle negative results', async () => {
      const input = {
        numero1: 3,
        numero2: 8,
        operation: 'resta' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(-5);
      expect(executeResult.result?.data?.operacion).toBe('3 - 8 = -5');
    });
  });

  describe('multiplicacion operation', () => {
    it('should multiply two positive numbers', async () => {
      const input = {
        numero1: 6,
        numero2: 7,
        operation: 'multiplicacion' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(42);
      expect(executeResult.result?.data?.operacion).toBe('6 × 7 = 42');
      expect(executeResult.result?.data?.detalles.operation).toBe('multiplicacion');
    });

    it('should multiply by zero', async () => {
      const input = {
        numero1: 5,
        numero2: 0,
        operation: 'multiplicacion' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(0);
      expect(executeResult.result?.data?.operacion).toBe('5 × 0 = 0');
    });

    it('should multiply decimal numbers', async () => {
      const input = {
        numero1: 2.5,
        numero2: 4,
        operation: 'multiplicacion' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(10);
      expect(executeResult.result?.data?.operacion).toBe('2.5 × 4 = 10');
    });
  });

  describe('division operation', () => {
    it('should divide two numbers', async () => {
      const input = {
        numero1: 15,
        numero2: 3,
        operation: 'division' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(5);
      expect(executeResult.result?.data?.operacion).toBe('15 ÷ 3 = 5');
      expect(executeResult.result?.data?.detalles.operation).toBe('division');
    });

    it('should handle division with decimals', async () => {
      const input = {
        numero1: 10,
        numero2: 3,
        operation: 'division' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(3.33);
      expect(executeResult.result?.data?.operacion).toBe('10 ÷ 3 = 3.33');
    });

    it('should handle division by zero', async () => {
      const input = {
        numero1: 5,
        numero2: 0,
        operation: 'division' as const,
      };

      const executeResult = await calculatorTool.test(input, mockConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('error');
      expect(executeResult.result?.error?.code).toBe('DIVISION_BY_ZERO');
      expect(executeResult.result?.error?.message).toBe('No se puede dividir por cero');
    });
  });

  describe('precision handling', () => {
    it('should respect precision configuration', async () => {
      const highPrecisionConfig = { precision: 5 };
      const input = {
        numero1: 1,
        numero2: 3,
        operation: 'division' as const,
      };

      const executeResult = await calculatorTool.test(input, highPrecisionConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.resultado).toBe(0.33333);
      expect(executeResult.result?.data?.detalles.precision).toBe(5);
    });

    it('should use default precision when not specified', async () => {
      const emptyConfig = {};
      const input = {
        numero1: 1,
        numero2: 3,
        operation: 'division' as const,
      };

      const executeResult = await calculatorTool.test(input, emptyConfig);

      expect(executeResult.valid).toBe(true);
      expect(executeResult.result?.status).toBe('success');
      expect(executeResult.result?.data?.detalles.precision).toBe(10);
    });
  });

  describe('tool metadata', () => {
    it('should have correct metadata', () => {
      const metadata = calculatorTool.getMetadata();
      
      expect(metadata.name).toBe('calculator-tool');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.description).toBe('Una calculadora simple que realiza operaciones básicas con dos números');
      expect(metadata.capabilities).toContain('arithmetic');
      expect(metadata.capabilities).toContain('calculation');
    });

    it('should have correct schema structure', () => {
      const schema = calculatorTool.getSchema();
      
      expect(schema.input).toHaveProperty('numero1');
      expect(schema.input).toHaveProperty('numero2');
      expect(schema.input).toHaveProperty('operation');
      expect(schema.config).toHaveProperty('precision');
    });
  });
});