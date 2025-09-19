// Test file para verificar autocompletado de FileInput
import { FileInput } from './packages/ai-spine-tools-core/src/types';

// Simulamos un testFile de tipo FileInput
const testFile: FileInput = {
  name: 'example.pdf',
  size: 1024,
  type: 'application/pdf',
  content: 'base64content...',
  encoding: 'base64'
};

// Prueba el autocompletado aquí - pon el cursor después del punto y presiona Ctrl+Space
console.log(testFile.);

// También prueba si el tipo se muestra correctamente
console.log('Type:', typeof testFile.content); // Debería mostrar string, no any