'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.default =
  exports.createToolBuilder =
  exports.simpleCreateTool =
  exports.configUrlField =
  exports.configNumberField =
  exports.configStringField =
  exports.apiKeyField =
  exports.enumField =
  exports.timeField =
  exports.dateField =
  exports.objectField =
  exports.arrayField =
  exports.booleanField =
  exports.numberField =
  exports.stringField =
  exports.ToolBuilder =
  exports.createTool =
    void 0;
// Main tool creation and management
var create_tool_1 = require('./create-tool');
// Core factory functions
Object.defineProperty(exports, 'createTool', {
  enumerable: true,
  get: function () {
    return create_tool_1.createTool;
  },
});
Object.defineProperty(exports, 'ToolBuilder', {
  enumerable: true,
  get: function () {
    return create_tool_1.ToolBuilder;
  },
});
// Input field builders
Object.defineProperty(exports, 'stringField', {
  enumerable: true,
  get: function () {
    return create_tool_1.stringField;
  },
});
Object.defineProperty(exports, 'numberField', {
  enumerable: true,
  get: function () {
    return create_tool_1.numberField;
  },
});
Object.defineProperty(exports, 'booleanField', {
  enumerable: true,
  get: function () {
    return create_tool_1.booleanField;
  },
});
Object.defineProperty(exports, 'arrayField', {
  enumerable: true,
  get: function () {
    return create_tool_1.arrayField;
  },
});
Object.defineProperty(exports, 'objectField', {
  enumerable: true,
  get: function () {
    return create_tool_1.objectField;
  },
});
Object.defineProperty(exports, 'dateField', {
  enumerable: true,
  get: function () {
    return create_tool_1.dateField;
  },
});
Object.defineProperty(exports, 'timeField', {
  enumerable: true,
  get: function () {
    return create_tool_1.timeField;
  },
});
Object.defineProperty(exports, 'enumField', {
  enumerable: true,
  get: function () {
    return create_tool_1.enumField;
  },
});
// Config field builders
Object.defineProperty(exports, 'apiKeyField', {
  enumerable: true,
  get: function () {
    return create_tool_1.apiKeyField;
  },
});
Object.defineProperty(exports, 'configStringField', {
  enumerable: true,
  get: function () {
    return create_tool_1.configStringField;
  },
});
Object.defineProperty(exports, 'configNumberField', {
  enumerable: true,
  get: function () {
    return create_tool_1.configNumberField;
  },
});
Object.defineProperty(exports, 'configUrlField', {
  enumerable: true,
  get: function () {
    return create_tool_1.configUrlField;
  },
});
// Convenience functions
Object.defineProperty(exports, 'simpleCreateTool', {
  enumerable: true,
  get: function () {
    return create_tool_1.simpleCreateTool;
  },
});
Object.defineProperty(exports, 'createToolBuilder', {
  enumerable: true,
  get: function () {
    return create_tool_1.createToolBuilder;
  },
});
// Re-export core types and utilities
__exportStar(require('@ai-spine/tools-core'), exports);
// Default export for convenience
var create_tool_2 = require('./create-tool');
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return create_tool_2.createTool;
  },
});
//# sourceMappingURL=index.js.map
