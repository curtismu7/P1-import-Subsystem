import js from "@eslint/js";
import globals from "globals";

export default [
  // 1. Global recommended rules for all files
  js.configs.recommended,

  // 2. Browser environment for all client-side code
  {
    files: [
        "public/**/*.js",
        "src/client/**/*.js",
        "ui-subsystem/**/*.js",
        "websocket-subsystem/**/*.js"
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      }
    }
  },

  // 3. Node environment for server-side code, config, and scripts
  {
    files: [
        "**/*.cjs",
        "*.js", // Root-level scripts
        "server.js",
        "routes/**/*.js",
        "server/**/*.js",
        "auth-subsystem/server/**/*.js"
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      }
    }
  },

  // 4. Jest environment for test files (includes node and browser globals)
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser,
      }
    }
  }
];
