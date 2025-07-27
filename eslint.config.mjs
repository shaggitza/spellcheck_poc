import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
    // Base configuration for all JavaScript files
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2021,
                CONFIG: 'readonly',
                ErrorHandler: 'readonly',
                ENV: 'readonly',
                Utils: 'readonly',
                Validator: 'readonly',
                FileManager: 'readonly',
                bootstrap: 'readonly',
            },
            ecmaVersion: 2022,
            sourceType: "script",
            parserOptions: {
                ecmaFeatures: {
                    impliedStrict: true,
                },
            },
        },
        ...js.configs.recommended,
        rules: {
            // Code quality rules
            "no-unused-vars": ["error", { 
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_" 
            }],
            "no-console": ["warn", { "allow": ["warn", "error"] }],
            "prefer-const": "error",
            "no-var": "error",
            
            // Best practices
            "eqeqeq": ["error", "always"],
            "curly": "error",
            "no-eval": "error",
            "no-implied-eval": "error",
            
            // Style rules (handled by Prettier, but some logical ones)
            "no-multiple-empty-lines": ["error", { "max": 2 }],
            "no-trailing-spaces": "error",
            
            // Frontend specific
            "no-undef": "error",
            "no-global-assign": "error",
        },
    },
    
    // Configuration for static JavaScript files
    {
        files: ["static/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.browser,
                window: "readonly",
                document: "readonly",
                console: "readonly",
                WebSocket: "readonly",
                fetch: "readonly",
                localStorage: "readonly",
                CONFIG: "readonly",
                ErrorHandler: "readonly",
                Environment: "readonly",
                Validator: "readonly",
                Utils: "readonly",
                FileManager: "readonly",
            SpellChecker: "readonly",
                // Bootstrap globals
                bootstrap: "readonly",
                // Typo fixes
                newSpan: "readonly",
                module: "readonly", // For files that might use module.exports
            },
        },
        rules: {
            // Allow console.log in development files
            "no-console": "off",
        },
    },
    
    // Prettier integration - must be last
    prettierConfig,
];
