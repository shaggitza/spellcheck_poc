/**
 * Utility Helper Functions for TextEditor
 * Provides commonly used helper functions to reduce code duplication
 */

class Utils {
    constructor() {
        this.environment = window.ENV;
    }

    // =====================================
    // DOM UTILITIES
    // =====================================

    /**
     * Create DOM element with attributes and content
     * @param {string} tagName - HTML tag name
     * @param {object} attributes - Element attributes
     * @param {string|Node|Array} content - Element content
     * @returns {Element} Created element
     */
    createElement(tagName, attributes = {}, content = null) {
        const element = document.createElement(tagName);

        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // Set content
        if (content !== null) {
            if (typeof content === 'string') {
                element.textContent = content;
            } else if (content instanceof Node) {
                element.appendChild(content);
            } else if (Array.isArray(content)) {
                content.forEach(child => {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else if (child instanceof Node) {
                        element.appendChild(child);
                    }
                });
            }
        }

        return element;
    }

    /**
     * Query element with fallback and error handling
     * @param {string} selector - CSS selector
     * @param {Element} parent - Parent element (default: document)
     * @param {boolean} required - Whether element is required
     * @returns {Element|null} Found element or null
     */
    queryElement(selector, parent = document, required = false) {
        try {
            const element = parent.querySelector(selector);

            if (required && !element) {
                const error = new Error(`Required element not found: ${selector}`);
                if (this.environment?.isDevelopment()) {
                    console.error(error);
                }
                throw error;
            }

            return element;
        } catch (error) {
            if (this.environment?.isDevelopment()) {
                console.error('Error querying element:', { selector, error });
            }
            if (required) throw error;
            return null;
        }
    }

    /**
     * Query all elements with error handling
     * @param {string} selector - CSS selector
     * @param {Element} parent - Parent element (default: document)
     * @returns {NodeList} Found elements
     */
    queryElements(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            if (this.environment?.isDevelopment()) {
                console.error('Error querying elements:', { selector, error });
            }
            return [];
        }
    }

    /**
     * Add CSS class(es) to element
     * @param {Element} element - Target element
     * @param {string|Array} classes - Class name(s) to add
     */
    addClass(element, classes) {
        if (!element) return;

        const classNames = Array.isArray(classes) ? classes : [classes];
        classNames.forEach(className => {
            if (className) element.classList.add(className);
        });
    }

    /**
     * Remove CSS class(es) from element
     * @param {Element} element - Target element
     * @param {string|Array} classes - Class name(s) to remove
     */
    removeClass(element, classes) {
        if (!element) return;

        const classNames = Array.isArray(classes) ? classes : [classes];
        classNames.forEach(className => {
            if (className) element.classList.remove(className);
        });
    }

    /**
     * Toggle CSS class on element
     * @param {Element} element - Target element
     * @param {string} className - Class name to toggle
     * @param {boolean} force - Force add/remove
     * @returns {boolean} Whether class is present after toggle
     */
    toggleClass(element, className, force = undefined) {
        if (!element || !className) return false;
        return element.classList.toggle(className, force);
    }

    /**
     * Get element's position relative to viewport
     * @param {Element} element - Target element
     * @returns {object} Position information
     */
    getElementPosition(element) {
        if (!element) return { top: 0, left: 0, width: 0, height: 0 };

        const rect = element.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
        };
    }

    // =====================================
    // EVENT UTILITIES
    // =====================================

    /**
     * Add event listener with automatic cleanup tracking
     * @param {Element} element - Target element
     * @param {string} event - Event name
     * @param {function} handler - Event handler
     * @param {object} options - Event options
     * @returns {function} Cleanup function
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) return () => {};

        element.addEventListener(event, handler, options);

        // Return cleanup function
        return () => {
            element.removeEventListener(event, handler, options);
        };
    }

    /**
     * Create delegated event listener
     * @param {Element} parent - Parent element
     * @param {string} selector - Child selector
     * @param {string} event - Event name
     * @param {function} handler - Event handler
     * @returns {function} Cleanup function
     */
    delegateEvent(parent, selector, event, handler) {
        const delegatedHandler = e => {
            const target = e.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, e);
            }
        };

        return this.addEventListener(parent, event, delegatedHandler);
    }

    /**
     * Debounce function execution
     * @param {function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {function} Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function execution
     * @param {function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {function} Throttled function
     */
    throttle(func, delay) {
        let lastExecution = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastExecution >= delay) {
                lastExecution = now;
                return func.apply(this, args);
            }
        };
    }

    // =====================================
    // DATA UTILITIES
    // =====================================

    /**
     * Deep clone an object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
        return obj;
    }

    /**
     * Merge objects deeply
     * @param {object} target - Target object
     * @param {...object} sources - Source objects
     * @returns {object} Merged object
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Check if value is an object
     * @param {any} item - Value to check
     * @returns {boolean} Whether value is an object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Get nested property value safely
     * @param {object} obj - Source object
     * @param {string} path - Property path (e.g., 'user.profile.name')
     * @param {any} defaultValue - Default value if path not found
     * @returns {any} Property value or default
     */
    getNestedProperty(obj, path, defaultValue = undefined) {
        try {
            return (
                path.split('.').reduce((current, key) => {
                    return current && current[key] !== undefined ? current[key] : undefined;
                }, obj) ?? defaultValue
            );
        } catch {
            return defaultValue;
        }
    }

    /**
     * Set nested property value safely
     * @param {object} obj - Target object
     * @param {string} path - Property path
     * @param {any} value - Value to set
     */
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    }

    // =====================================
    // STRING UTILITIES
    // =====================================

    /**
     * Capitalize first letter of string
     * @param {string} str - Input string
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        if (typeof str !== 'string' || str.length === 0) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Convert camelCase to kebab-case
     * @param {string} str - Input string
     * @returns {string} kebab-case string
     */
    camelToKebab(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Convert kebab-case to camelCase
     * @param {string} str - Input string
     * @returns {string} camelCase string
     */
    kebabToCamel(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    }

    /**
     * Truncate string with ellipsis
     * @param {string} str - Input string
     * @param {number} maxLength - Maximum length
     * @param {string} suffix - Suffix to add (default: '...')
     * @returns {string} Truncated string
     */
    truncate(str, maxLength, suffix = '...') {
        if (typeof str !== 'string') return str;
        if (str.length <= maxLength) return str;
        return str.slice(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Generate random string
     * @param {number} length - String length
     * @param {string} charset - Character set to use
     * @returns {string} Random string
     */
    randomString(
        length = 8,
        charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    ) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    // =====================================
    // ARRAY UTILITIES
    // =====================================

    /**
     * Remove duplicates from array
     * @param {Array} arr - Input array
     * @param {string|function} key - Key or function to determine uniqueness
     * @returns {Array} Array without duplicates
     */
    unique(arr, key = null) {
        if (!Array.isArray(arr)) return arr;

        if (!key) {
            return [...new Set(arr)];
        }

        const seen = new Set();
        return arr.filter(item => {
            const keyValue = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(keyValue)) {
                return false;
            }
            seen.add(keyValue);
            return true;
        });
    }

    /**
     * Chunk array into smaller arrays
     * @param {Array} arr - Input array
     * @param {number} size - Chunk size
     * @returns {Array} Array of chunks
     */
    chunk(arr, size) {
        if (!Array.isArray(arr) || size <= 0) return arr;

        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Flatten nested array
     * @param {Array} arr - Input array
     * @param {number} depth - Depth to flatten (default: Infinity)
     * @returns {Array} Flattened array
     */
    flatten(arr, depth = Infinity) {
        if (!Array.isArray(arr)) return arr;
        return arr.flat(depth);
    }

    // =====================================
    // ASYNC UTILITIES
    // =====================================

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry async function with exponential backoff
     * @param {function} fn - Async function to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} delay - Initial delay in milliseconds
     * @returns {Promise} Promise that resolves with function result
     */
    async retry(fn, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (i === maxRetries) {
                    throw error;
                }

                if (this.environment?.isDevelopment()) {
                    console.warn(`Retry attempt ${i + 1}/${maxRetries + 1} failed:`, error);
                }

                await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
            }
        }

        throw lastError;
    }

    /**
     * Race multiple promises with timeout
     * @param {Array} promises - Array of promises
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} Promise that resolves with first successful result
     */
    async raceWithTimeout(promises, timeout) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), timeout);
        });

        return Promise.race([...promises, timeoutPromise]);
    }

    // =====================================
    // STORAGE UTILITIES
    // =====================================

    /**
     * Get item from localStorage with JSON parsing
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key not found
     * @returns {any} Parsed value or default
     */
    getStorageItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            if (this.environment?.isDevelopment()) {
                console.warn('Error parsing localStorage item:', { key, error });
            }
            return defaultValue;
        }
    }

    /**
     * Set item in localStorage with JSON stringification
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @returns {boolean} Whether operation was successful
     */
    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            if (this.environment?.isDevelopment()) {
                console.warn('Error setting localStorage item:', { key, error });
            }
            return false;
        }
    }

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Whether operation was successful
     */
    removeStorageItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            if (this.environment?.isDevelopment()) {
                console.warn('Error removing localStorage item:', { key, error });
            }
            return false;
        }
    }

    // =====================================
    // URL UTILITIES
    // =====================================

    /**
     * Parse URL parameters
     * @param {string} url - URL to parse (default: current URL)
     * @returns {object} Parsed parameters
     */
    parseUrlParams(url = window.location.href) {
        try {
            const urlObj = new URL(url);
            const params = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            return params;
        } catch (error) {
            if (this.environment?.isDevelopment()) {
                console.warn('Error parsing URL parameters:', { url, error });
            }
            return {};
        }
    }

    /**
     * Build URL with parameters
     * @param {string} baseUrl - Base URL
     * @param {object} params - Parameters to add
     * @returns {string} Built URL
     */
    buildUrl(baseUrl, params = {}) {
        try {
            const url = new URL(baseUrl);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    url.searchParams.set(key, value);
                }
            });
            return url.toString();
        } catch (error) {
            if (this.environment?.isDevelopment()) {
                console.warn('Error building URL:', { baseUrl, params, error });
            }
            return baseUrl;
        }
    }

    // =====================================
    // FORMAT UTILITIES
    // =====================================

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format time duration in human readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Format number with thousands separators
     * @param {number} num - Number to format
     * @param {string} separator - Thousands separator (default: ',')
     * @returns {string} Formatted number
     */
    formatNumber(num, separator = ',') {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    }
}

// Create global utils instance
window.UTILS = new Utils();

// Export common utilities to global scope for convenience
window.utils = {
    createElement: window.UTILS.createElement.bind(window.UTILS),
    queryElement: window.UTILS.queryElement.bind(window.UTILS),
    debounce: window.UTILS.debounce.bind(window.UTILS),
    throttle: window.UTILS.throttle.bind(window.UTILS),
    sleep: window.UTILS.sleep.bind(window.UTILS),
    deepClone: window.UTILS.deepClone.bind(window.UTILS),
};
