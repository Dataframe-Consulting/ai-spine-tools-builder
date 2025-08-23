# Calculator Tool

Una calculadora simple que realiza operaciones básicas de aritmética con dos números.

## Características

- **Suma**: Suma dos números
- **Resta**: Resta el segundo número del primero
- **Multiplicación**: Multiplica dos números
- **División**: Divide el primer número por el segundo (con validación para división por cero)

## Entrada de Datos

La herramienta acepta los siguientes parámetros de entrada:

- `numero1` (number, requerido): Primer número para la operación
- `numero2` (number, requerido): Segundo número para la operación
- `operation` (enum, requerido): Tipo de operación a realizar
  - `"suma"`: Suma
  - `"resta"`: Resta
  - `"multiplicacion"`: Multiplicación
  - `"division"`: División

## Configuración

- `precision` (number, opcional): Número de decimales en el resultado (por defecto: 10, rango: 0-15)

## Ejemplo de Uso

### Suma
```json
{
  "numero1": 15,
  "numero2": 25,
  "operation": "suma"
}
```

**Resultado:**
```json
{
  "resultado": 40,
  "operacion": "15 + 25 = 40",
  "detalles": {
    "numero1": 15,
    "numero2": 25,
    "operation": "suma",
    "operationSymbol": "+",
    "precision": 10
  }
}
```

### División
```json
{
  "numero1": 10,
  "numero2": 3,
  "operation": "division"
}
```

**Resultado:**
```json
{
  "resultado": 3.3333333333,
  "operacion": "10 ÷ 3 = 3.3333333333",
  "detalles": {
    "numero1": 10,
    "numero2": 3,
    "operation": "division",
    "operationSymbol": "÷",
    "precision": 10
  }
}
```

## Ejecutar la Herramienta

### Desarrollo
```bash
npm install
npm run dev
```

### Producción
```bash
npm install
npm run build
npm start
```

### Pruebas
```bash
npm test
```

La herramienta se ejecutará en el puerto 3001 por defecto.

## Manejo de Errores

- **División por cero**: La herramienta devuelve un error si se intenta dividir por cero
- **Operación inválida**: Error si se especifica una operación no soportada
- **Entrada inválida**: Validación automática de tipos y valores requeridos

## API Endpoints

Una vez iniciada, la herramienta expone los siguientes endpoints:

- `POST /api/execute`: Ejecuta la operación de calculadora
- `GET /health`: Verificación de salud del servicio
- `GET /schema`: Esquema OpenAPI de la herramienta
- `GET /metrics`: Métricas de rendimiento y uso
- `GET /`: Información básica de la herramienta

## Ejemplos de uso con cURL

### Ejecutar una suma
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"input_data": {"numero1": 15, "numero2": 25, "operation": "suma"}}'
```

### Ejecutar una división
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"input_data": {"numero1": 10, "numero2": 3, "operation": "division"}}'
```

### Verificar estado de salud
```bash
curl http://localhost:3001/health
```

### Obtener esquema de la API
```bash
curl http://localhost:3001/schema
```

## Formato de entrada

**Importante**: Los datos de entrada deben enviarse dentro del campo `input_data`:

```json
{
  "input_data": {
    "numero1": 15,
    "numero2": 25,
    "operation": "suma"
  }
}
```

## Formato de respuesta exitosa

```json
{
  "execution_id": "ec4ed174-1c63-4fa7-987f-19a0d506d577",
  "status": "success",
  "output_data": {
    "resultado": 40,
    "operacion": "15 + 25 = 40",
    "detalles": {
      "numero1": 15,
      "numero2": 25,
      "operation": "suma",
      "operationSymbol": "+",
      "precision": 10
    },
    "metadata": {
      "execution_id": "ec4ed174-1c63-4fa7-987f-19a0d506d577",
      "timestamp": "2025-08-23T19:05:43.359Z",
      "tool_version": "1.0.0"
    }
  },
  "execution_time_ms": 2.33,
  "timestamp": "2025-08-23T19:05:43.362Z"
}