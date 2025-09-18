# 📋 Tipos Disponibles en AI Spine Tools

## 🔧 **Campos de Input (ToolInputField)**

Estos son los tipos que puedes usar para datos que envían los agentes AI en cada ejecución:

### 📝 **Tipos Básicos**

| Tipo | Función | Descripción | Ejemplo |
|------|---------|-------------|---------|
| `string` | `stringField()` | Texto general | `name: stringField({ required: true })` |
| `number` | `numberField()` | Números enteros/decimales | `age: numberField({ min: 0, max: 120 })` |
| `boolean` | `booleanField()` | Verdadero/falso | `active: booleanField({ default: true })` |
| `enum` | `enumField()` | Conjunto predefinido | `status: enumField(['active', 'inactive'])` |

### 📊 **Tipos Estructurados**

| Tipo | Función | Descripción | Ejemplo |
|------|---------|-------------|---------|
| `array` | `arrayField()` | Lista de elementos | `tags: arrayField(stringField())` |
| `object` | `objectField()` | Objeto complejo | `location: objectField({ lat: numberField(), lng: numberField() })` |

### 📅 **Tipos de Fecha/Tiempo**

| Tipo | Función | Descripción | Formato | Ejemplo |
|------|---------|-------------|---------|---------|
| `date` | `dateField()` | Solo fecha | `YYYY-MM-DD` | `birthDate: dateField()` |
| `time` | `timeField()` | Solo hora | `HH:MM:SS` | `meetingTime: timeField()` |
| `datetime` | `datetimeField()` | Fecha y hora | `ISO 8601` | `createdAt: datetimeField()` |

### 🌐 **Tipos Especiales**

| Tipo | Función | Descripción | Validación | Ejemplo |
|------|---------|-------------|------------|---------|
| `email` | `emailField()` | Email válido | RFC 5322 | `userEmail: emailField()` |
| `url` | `urlField()` | URL válida | HTTP/HTTPS | `website: urlField()` |
| `uuid` | `uuidField()` | UUID v4 | Formato UUID | `userId: uuidField()` |
| `file` | `fileField()` | Archivo subido | MIME + tamaño | `avatar: fileField()` |
| `json` | - | JSON raw | Objeto JSON | `metadata: { type: 'json' }` |

## ⚙️ **Campos de Configuración (ToolConfigField)**

Estos son para configuración de la tool (se setean una vez):

### 🔐 **Tipos de Configuración**

| Tipo | Función | Descripción | Ejemplo |
|------|---------|-------------|---------|
| `string` | `configStringField()` | Texto de configuración | `baseUrl: configStringField()` |
| `number` | `configNumberField()` | Número de configuración | `timeout: configNumberField()` |
| `boolean` | `configBooleanField()` | Flag de configuración | `debug: configBooleanField()` |
| `apiKey` | `apiKeyField()` | Claves API (secretas) | `apiKey: apiKeyField()` |
| `secret` | - | Datos sensibles | `password: { type: 'secret' }` |
| `url` | `configUrlField()` | URLs de endpoints | `webhookUrl: configUrlField()` |
| `enum` | `configEnumField()` | Opciones predefinidas | `environment: configEnumField(['dev', 'prod'])` |
| `json` | - | Configuración compleja | `settings: { type: 'json' }` |

## 📚 **Ejemplos Completos**

### 🎯 **Tool Completa con Todos los Tipos**

```typescript
import {
  createTool,
  stringField,
  numberField,
  booleanField,
  enumField,
  arrayField,
  objectField,
  dateField,
  timeField,
  datetimeField,
  fileField,
  emailField,
  urlField,
  uuidField,
  apiKeyField,
  configStringField,
  configNumberField,
  configEnumField
} from '@ai-spine/tools';

const completeTool = createTool({
  metadata: {
    name: 'complete-demo-tool',
    version: '1.0.0',
    description: 'Demuestra todos los tipos disponibles',
    capabilities: ['demo']
  },

  schema: {
    input: {
      // 📝 Tipos básicos
      name: stringField({
        required: true,
        minLength: 2,
        maxLength: 50,
        description: 'Nombre del usuario'
      }),

      age: numberField({
        required: true,
        min: 0,
        max: 120,
        integer: true,
        description: 'Edad del usuario'
      }),

      active: booleanField({
        required: false,
        default: true,
        description: 'Estado activo'
      }),

      status: enumField(['pending', 'active', 'inactive'], {
        required: true,
        default: 'pending',
        description: 'Estado del usuario'
      }),

      // 📊 Tipos estructurados
      tags: arrayField(stringField({ minLength: 1 }), {
        required: false,
        minItems: 0,
        maxItems: 10,
        description: 'Etiquetas del usuario'
      }),

      location: objectField({
        latitude: numberField({ required: true, min: -90, max: 90 }),
        longitude: numberField({ required: true, min: -180, max: 180 }),
        city: stringField({ required: false })
      }, {
        required: false,
        description: 'Ubicación geográfica'
      }),

      // 📅 Tipos de fecha/tiempo
      birthDate: dateField({
        required: false,
        description: 'Fecha de nacimiento'
      }),

      meetingTime: timeField({
        required: false,
        description: 'Hora de reunión'
      }),

      // 🌐 Tipos especiales
      email: emailField({
        required: true,
        description: 'Email del usuario'
      }),

      website: urlField({
        required: false,
        description: 'Sitio web personal'
      }),

      userId: uuidField({
        required: false,
        description: 'ID único del usuario'
      }),

      // 📁 Archivos
      avatar: fileField({
        required: false,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
        description: 'Imagen de avatar'
      }),

      document: fileField({
        required: false,
        allowedMimeTypes: ['application/pdf'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        description: 'Documento PDF'
      })
    },

    config: {
      // ⚙️ Configuración
      apiKey: apiKeyField({
        required: true,
        envVar: 'DEMO_API_KEY',
        description: 'Clave API del servicio'
      }),

      baseUrl: configStringField({
        required: false,
        default: 'https://api.example.com',
        description: 'URL base de la API'
      }),

      timeout: configNumberField({
        required: false,
        default: 5000,
        min: 1000,
        max: 30000,
        description: 'Timeout en millisegundos'
      })
    }
  },

  execute: async (input, config, context) => {
    // Acceso a todos los tipos
    console.log('Input recibido:', {
      name: input.name,              // string
      age: input.age,                // number
      active: input.active,          // boolean
      status: input.status,          // enum
      tags: input.tags,              // array
      location: input.location,      // object
      birthDate: input.birthDate,    // date
      meetingTime: input.meetingTime, // time
      email: input.email,            // email
      website: input.website,        // url
      userId: input.userId,          // uuid
      avatar: input.avatar?.filename, // file
      document: input.document?.size  // file
    });

    return {
      status: 'success',
      data: {
        message: 'Todos los tipos procesados correctamente',
        processedFields: Object.keys(input).length
      }
    };
  }
});
```

### 🎨 **Formatos de String Especiales**

```typescript
// String con formato específico
email: stringField({
  required: true,
  format: 'email',  // Validación de email
  description: 'Email address'
}),

website: stringField({
  required: false,
  format: 'url',    // Validación de URL
  description: 'Website URL'
}),

userId: stringField({
  required: false,
  format: 'uuid',   // Validación de UUID
  description: 'User ID'
}),

hostname: stringField({
  required: false,
  format: 'hostname', // Validación de hostname
  description: 'Server hostname'
}),

ipAddress: stringField({
  required: false,
  format: 'ipv4',   // Validación de IPv4
  description: 'IP address'
})
```

## 🎯 **Resumen de Funciones Disponibles**

### **Input Fields** (para datos de cada ejecución):
- `stringField()` - Texto general
- `numberField()` - Números
- `booleanField()` - Verdadero/falso
- `enumField()` - Opciones predefinidas
- `arrayField()` - Arrays/listas
- `objectField()` - Objetos complejos
- `dateField()` - Fechas
- `timeField()` - Horas
- `fileField()` - Archivos
- `emailField()` - Emails (stringField con formato)
- `urlField()` - URLs (stringField con formato)
- `uuidField()` - UUIDs (stringField con formato)

### **Config Fields** (para configuración de la tool):
- `apiKeyField()` - Claves API
- `configStringField()` - Strings de configuración
- `configNumberField()` - Números de configuración
- `configUrlField()` - URLs de configuración
- `configEnumField()` - Opciones de configuración

¡Estos son todos los tipos que puedes usar en las plantillas de las tools!