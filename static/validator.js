/**
 * Validation System for TextEditor
 * Provides input validation, data sanitization, and type checking
 */

class Validator {
    constructor() {
        this.rules = this.initializeRules();
        this.customValidators = new Map();
    }

    initializeRules() {
        return {
            // File validation rules
            filename: {
                required: true,
                type: 'string',
                minLength: 1,
                maxLength: 255,
                pattern: /^[a-zA-Z0-9._-]+$/,
                allowedExtensions: ['.txt'],
                forbiddenNames: [
                    'con',
                    'prn',
                    'aux',
                    'nul',
                    'com1',
                    'com2',
                    'com3',
                    'com4',
                    'com5',
                    'com6',
                    'com7',
                    'com8',
                    'com9',
                    'lpt1',
                    'lpt2',
                    'lpt3',
                    'lpt4',
                    'lpt5',
                    'lpt6',
                    'lpt7',
                    'lpt8',
                    'lpt9',
                ],
            },

            // Content validation rules
            content: {
                type: 'string',
                maxLength: 1000000, // 1MB text limit
                allowEmptyString: true,
            },

            // WebSocket message validation
            websocketMessage: {
                required: true,
                type: 'object',
                requiredFields: ['type'],
                allowedTypes: [
                    'edit',
                    'prediction_request',
                    'spell_check_request',
                    'add_word',
                    'save_settings',
                ],
            },

            // Cursor position validation
            cursorPosition: {
                type: 'number',
                min: 0,
                max: 1000000,
            },

            // Word validation for dictionary
            word: {
                required: true,
                type: 'string',
                minLength: 1,
                maxLength: 50,
                pattern: /^[a-zA-Z'-]+$/,
            },

            // Settings validation
            spellCheckEngine: {
                type: 'string',
                allowedValues: ['pyspellchecker', 'hunspell', 'autocorrect', 'neuspell'],
            },

            spellCheckLanguage: {
                type: 'string',
                allowedValues: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
            },

            // URL validation
            url: {
                type: 'string',
                pattern: /^https?:\/\/.+/,
            },

            // Generic validation rules
            email: {
                type: 'string',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            },

            boolean: {
                type: 'boolean',
            },

            positiveInteger: {
                type: 'number',
                min: 1,
                integer: true,
            },

            // String validation rule
            string: {
                type: 'string',
                minLength: 1,
                maxLength: 1000, // Default max length for strings
                allowEmptyString: false,
            },
        };
    }

    /**
     * Validate data against a rule or custom validation function
     * @param {any} data - Data to validate
     * @param {string|object|function} rule - Rule name, rule object, or validation function
     * @param {object} options - Additional validation options
     * @returns {object} Validation result with isValid and errors
     */
    validate(data, rule, options = {}) {
        try {
            // Handle different rule types
            let validationRule;

            if (typeof rule === 'string') {
                // Rule name from predefined rules
                validationRule = this.rules[rule];
                if (!validationRule) {
                    return this.createResult(false, [`Unknown validation rule: ${rule}`]);
                }
            } else if (typeof rule === 'object') {
                // Custom rule object
                validationRule = rule;
            } else if (typeof rule === 'function') {
                // Custom validation function
                try {
                    const result = rule(data, options);
                    return typeof result === 'boolean'
                        ? this.createResult(result, result ? [] : ['Custom validation failed'])
                        : result;
                } catch (error) {
                    return this.createResult(false, [`Custom validation error: ${error.message}`]);
                }
            } else {
                return this.createResult(false, ['Invalid rule type']);
            }

            return this.validateAgainstRule(data, validationRule, options);
        } catch (error) {
            if (window.ENV?.isDevelopment()) {
                console.error('Validation error:', error);
            }
            return this.createResult(false, [`Validation system error: ${error.message}`]);
        }
    }

    validateAgainstRule(data, rule, _options = {}) {
        const errors = [];

        // Check if required
        if (rule.required && (data === null || data === undefined || data === '')) {
            errors.push('This field is required');
            return this.createResult(false, errors);
        }

        // If data is null/undefined and not required, it's valid
        if ((data === null || data === undefined) && !rule.required) {
            return this.createResult(true, []);
        }

        // Type validation
        if (rule.type && !this.validateType(data, rule.type, rule.allowEmptyString)) {
            errors.push(`Expected type ${rule.type}, got ${typeof data}`);
        }

        // String validations
        if (rule.type === 'string' && typeof data === 'string') {
            if (rule.minLength !== undefined && data.length < rule.minLength) {
                errors.push(`Minimum length is ${rule.minLength} characters`);
            }
            if (rule.maxLength !== undefined && data.length > rule.maxLength) {
                errors.push(`Maximum length is ${rule.maxLength} characters`);
            }
            if (rule.pattern && !rule.pattern.test(data)) {
                errors.push('Invalid format');
            }
            if (rule.allowedValues && !rule.allowedValues.includes(data)) {
                errors.push(`Value must be one of: ${rule.allowedValues.join(', ')}`);
            }
            if (rule.forbiddenNames && rule.forbiddenNames.includes(data.toLowerCase())) {
                errors.push('This name is not allowed');
            }
            if (
                rule.allowedExtensions &&
                !rule.allowedExtensions.some(ext => data.toLowerCase().endsWith(ext))
            ) {
                errors.push(
                    `File must have one of these extensions: ${rule.allowedExtensions.join(', ')}`
                );
            }
        }

        // Number validations
        if (rule.type === 'number' && typeof data === 'number') {
            if (rule.min !== undefined && data < rule.min) {
                errors.push(`Minimum value is ${rule.min}`);
            }
            if (rule.max !== undefined && data > rule.max) {
                errors.push(`Maximum value is ${rule.max}`);
            }
            if (rule.integer && !Number.isInteger(data)) {
                errors.push('Value must be an integer');
            }
        }

        // Object validations
        if (rule.type === 'object' && typeof data === 'object' && data !== null) {
            if (rule.requiredFields) {
                for (const field of rule.requiredFields) {
                    if (!(field in data)) {
                        errors.push(`Missing required field: ${field}`);
                    }
                }
            }
            if (rule.allowedTypes && data.type && !rule.allowedTypes.includes(data.type)) {
                errors.push(
                    `Invalid type: ${data.type}. Allowed types: ${rule.allowedTypes.join(', ')}`
                );
            }
        }

        return this.createResult(errors.length === 0, errors);
    }

    validateType(data, expectedType, allowEmptyString = false) {
        switch (expectedType) {
            case 'string':
                return typeof data === 'string' && (allowEmptyString || data !== '');
            case 'number':
                return typeof data === 'number' && !isNaN(data);
            case 'boolean':
                return typeof data === 'boolean';
            case 'object':
                return typeof data === 'object' && data !== null && !Array.isArray(data);
            case 'array':
                return Array.isArray(data);
            case 'function':
                return typeof data === 'function';
            default:
                return false;
        }
    }

    createResult(isValid, errors = []) {
        return {
            isValid,
            errors: Array.isArray(errors) ? errors : [errors],
            hasErrors: errors.length > 0,
        };
    }

    /**
     * Sanitize and clean data
     */
    sanitize = {
        // HTML sanitization
        html: input => {
            if (typeof input !== 'string') return input;

            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML;
        },

        // Filename sanitization
        filename: input => {
            if (typeof input !== 'string') return input;

            return input
                .trim()
                .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
                .replace(/\s+/g, '_') // Replace spaces with underscores
                .substring(0, 255); // Limit length
        },

        // Text content sanitization
        text: input => {
            if (typeof input !== 'string') return input;

            return input
                .trim()
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
                .substring(0, 1000000); // Limit length
        },

        // Word sanitization for dictionary
        word: input => {
            if (typeof input !== 'string') return input;

            return input
                .trim()
                .toLowerCase()
                .replace(/[^a-zA-Z'-]/g, '') // Only letters, apostrophes, and hyphens
                .substring(0, 50); // Limit length
        },

        // Number sanitization
        number: (input, min = -Infinity, max = Infinity) => {
            const num = parseFloat(input);
            if (isNaN(num)) return 0;
            return Math.max(min, Math.min(max, num));
        },

        // URL sanitization
        url: input => {
            if (typeof input !== 'string') return input;

            try {
                const url = new URL(input);
                // Only allow http and https protocols
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    return '';
                }
                return url.toString();
            } catch {
                return '';
            }
        },
    };

    /**
     * Batch validation for multiple fields
     * @param {object} data - Object with data to validate
     * @param {object} rules - Object with validation rules for each field
     * @returns {object} Validation result for all fields
     */
    validateObject(data, rules) {
        const results = {};
        const allErrors = [];
        let isValid = true;

        for (const [field, rule] of Object.entries(rules)) {
            const fieldData = data[field];
            const fieldResult = this.validate(fieldData, rule);

            results[field] = fieldResult;

            if (!fieldResult.isValid) {
                isValid = false;
                allErrors.push(...fieldResult.errors.map(error => `${field}: ${error}`));
            }
        }

        return {
            isValid,
            errors: allErrors,
            hasErrors: allErrors.length > 0,
            fields: results,
        };
    }

    /**
     * Validate WebSocket message structure
     */
    validateWebSocketMessage(message) {
        if (!message || typeof message !== 'object') {
            return this.createResult(false, ['Message must be an object']);
        }

        const baseValidation = this.validate(message, 'websocketMessage');
        if (!baseValidation.isValid) {
            return baseValidation;
        }

        // Type-specific validation
        switch (message.type) {
            case 'edit':
                return this.validateObject(message, {
                    filename: 'filename',
                    content: 'content',
                    cursor_position: 'cursorPosition',
                });

            case 'prediction_request':
                return this.validateObject(message, {
                    prevContext: 'content',
                    currentText: 'content',
                    afterContext: 'content',
                    cursor: 'cursorPosition',
                });

            case 'spell_check_request':
                return this.validateObject(message, {
                    content: 'content',
                });

            case 'add_word':
                return this.validateObject(message, {
                    word: 'word',
                });

            case 'save_settings':
                const settingsRules = {};
                if (message.spell_checker_engine !== undefined) {
                    settingsRules.spell_checker_engine = 'spellCheckEngine';
                }
                if (message.spell_checker_language !== undefined) {
                    settingsRules.spell_checker_language = 'spellCheckLanguage';
                }
                if (message.spell_check_enabled !== undefined) {
                    settingsRules.spell_check_enabled = 'boolean';
                }
                return this.validateObject(message, settingsRules);

            default:
                return this.createResult(false, [`Unknown message type: ${message.type}`]);
        }
    }

    /**
     * Add custom validator
     */
    addCustomValidator(name, validator) {
        if (typeof validator !== 'function') {
            throw new Error('Validator must be a function');
        }
        this.customValidators.set(name, validator);
    }

    /**
     * Get custom validator
     */
    getCustomValidator(name) {
        return this.customValidators.get(name);
    }

    /**
     * Validation shortcuts for common use cases
     */
    shortcuts = {
        isValidFilename: filename => {
            return this.validate(filename, 'filename').isValid;
        },

        isValidWord: word => {
            return this.validate(word, 'word').isValid;
        },

        isValidEmail: email => {
            return this.validate(email, 'email').isValid;
        },

        isValidUrl: url => {
            return this.validate(url, 'url').isValid;
        },

        isPositiveInteger: num => {
            return this.validate(num, 'positiveInteger').isValid;
        },
    };

    /**
     * Format validation errors for user display
     */
    formatErrors(validationResult) {
        if (!validationResult.hasErrors) {
            return '';
        }

        if (validationResult.errors.length === 1) {
            return validationResult.errors[0];
        }

        return `Multiple errors:\n• ${validationResult.errors.join('\n• ')}`;
    }

    /**
     * Create a validation middleware for functions
     */
    createMiddleware(rules) {
        return originalFunction => {
            return function (...args) {
                // Validate arguments
                for (let i = 0; i < rules.length && i < args.length; i++) {
                    if (rules[i]) {
                        const validation = this.validate(args[i], rules[i]);
                        if (!validation.isValid) {
                            throw new Error(
                                `Argument ${i + 1} validation failed: ${validation.errors.join(', ')}`
                            );
                        }
                    }
                }

                return originalFunction.apply(this, args);
            };
        };
    }
}

// Create global validator instance
window.VALIDATOR = new Validator();

// Export validation shortcuts for convenience
window.isValid = window.VALIDATOR.shortcuts;
window.sanitize = window.VALIDATOR.sanitize;
