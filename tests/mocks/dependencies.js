/**
 * Mock Dependencies for Testing
 * Provides mock implementations of our modular dependencies
 */

// Mock Config
const createMockConfig = () => ({
    TIMING: {
        PREDICTION_DEBOUNCE: 300,
        PREDICTION_DEBOUNCE_TYPING: 500,
        SPELL_CHECK_DEBOUNCE: 500
    },
    TEXT: {
        MAX_CURSOR_POSITION_TOLERANCE: 10
    },
    SELECTORS: {
        CURRENT_SUGGESTION: '#current-inline-suggestion'
    },
    CSS_CLASSES: {
        ERROR_COUNT_BADGE: 'spell-error-badge'
    },
    FILES: {
        EXTENSION: '.txt'
    },
    SPELL_CHECK: {
        DEFAULT_LANGUAGE: 'en-US'
    }
});

// Mock Utils
const createMockUtils = () => ({
    queryElement: jest.fn((selector, parent = document, required = false) => {
        const element = (parent || document).querySelector(selector);
        if (!element && required) {
            throw new Error(`Required element not found: ${selector}`);
        }
        return element;
    }),
    
    createElement: jest.fn((tag, attrs = {}, content = '') => {
        const element = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                // Apply style object to element.style
                Object.entries(value).forEach(([styleKey, styleValue]) => {
                    element.style[styleKey] = styleValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        if (content) element.textContent = content;
        return element;
    }),
    
    parseUrlParams: jest.fn(() => ({})),
    
    debounce: jest.fn((fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }),
    
    throttle: jest.fn((fn, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }),
    
    getStorageItem: jest.fn((key) => {
        // Return null by default, can be overridden in tests
        return null;
    }),
    
    setStorageItem: jest.fn((key, value) => {
        // Mock implementation
        return true;
    })
});

// Mock Validator
const createMockValidator = () => ({
    validate: jest.fn(() => ({ isValid: true, errors: [] })),
    validateWebSocketMessage: jest.fn(() => ({ isValid: true, errors: [] })),
    formatErrors: jest.fn((validation) => validation.errors.join(', ')),
    sanitize: {
        word: jest.fn((word) => word.trim().toLowerCase()),
        filename: jest.fn((filename) => filename.replace(/[^a-zA-Z0-9.-]/g, '_')),
        content: jest.fn((content) => content)
    }
});

// Mock Error Handler
const createMockErrorHandler = () => ({
    handleError: jest.fn((error, context, userMessage, metadata) => {
        console.error('Mock Error:', error, context, userMessage, metadata);
    }),
    showError: jest.fn((error) => {
        console.error('Mock Show Error:', error);
    }),
    showNotification: jest.fn((message, type = 'info') => {
        console.log(`Mock Notification [${type}]:`, message);
    })
});

// Mock Environment
const createMockEnvironment = () => ({
    isDevelopment: jest.fn(() => true),
    isProduction: jest.fn(() => false),
    startTimer: jest.fn((name) => ({
        end: jest.fn(() => Math.random() * 100)
    })),
    logNetworkRequest: jest.fn(),
    settings: {
        debounceDelay: 1000,
        websocketReconnectDelay: 5000
    }
});

// Mock FileManager
const createMockFileManager = () => ({
    hasCurrentFile: jest.fn(() => true),
    getCurrentFile: jest.fn(() => 'test.txt'),
    loadFile: jest.fn(),
    saveCurrentFile: jest.fn(),
    clearCurrentFile: jest.fn(),
    loadFileList: jest.fn()
});

// Mock DOM Elements
/**
 * Creates mock DOM elements for testing
 */
function createMockDOMElements() {
    // Helper function to create proper DOM elements
    const createElement = (tagName, attributes = {}) => {
        const element = document.createElement(tagName);
        
        // Add addEventListener if it doesn't exist (for mock elements)
        if (!element.addEventListener) {
            element.addEventListener = jest.fn();
        }
        
        // Add removeEventListener if it doesn't exist (for mock elements)
        if (!element.removeEventListener) {
            element.removeEventListener = jest.fn();
        }
        
        Object.keys(attributes).forEach(key => {
            if (key === 'class' || key === 'className') {
                element.className = attributes[key];
            } else if (key === 'style' && typeof attributes[key] === 'object') {
                Object.assign(element.style, attributes[key]);
            } else if (key === 'onClick') {
                element.addEventListener('click', attributes[key]);
            } else if (typeof attributes[key] === 'string' || typeof attributes[key] === 'number') {
                try {
                    if (element.setAttribute) {
                        element.setAttribute(key, attributes[key]);
                    } else {
                        element[key] = attributes[key];
                    }
                } catch (error) {
                    // Fallback for problematic attributes
                    element[key] = attributes[key];
                }
            }
        });
        return element;
    };

    return {
        textEditor: createElement('div', { 
            id: 'text-editor', 
            contenteditable: 'true',
            class: 'text-editor'
        }),
        predictionText: createElement('div', { 
            id: 'prediction-text',
            class: 'prediction-display'
        }),
        suggestionsList: createElement('ul', { 
            id: 'suggestions-list',
            class: 'suggestions-list'
        }),
        statusElement: createElement('div', { 
            id: 'status',
            class: 'status-bar'
        }),
        fileList: createElement('select', { 
            id: 'file-list',
            class: 'file-list'
        }),
        saveButton: createElement('button', { 
            id: 'save-button',
            class: 'save-btn'
        }),
        currentFileName: createElement('span', { 
            id: 'current-file-name',
            class: 'file-name'
        }),
        newFileName: createElement('input', { 
            id: 'new-file-name',
            type: 'text',
            class: 'file-input'
        }),
        createFileButton: createElement('button', { 
            id: 'create-file-button',
            class: 'create-btn'
        }),
        fileInput: createElement('input', { 
            id: 'file-input',
            type: 'file',
            class: 'file-input-hidden'
        })
    };
}

// Mock WebSocket
const createMockWebSocket = () => {
    const ws = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        url: 'ws://localhost:8000/ws',
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    };
    
    // Helper methods for testing
    ws.simulateMessage = (message) => {
        if (ws.onmessage) {
            ws.onmessage({ data: JSON.stringify(message) });
        }
    };
    
    ws.simulateOpen = () => {
        ws.readyState = WebSocket.OPEN;
        if (ws.onopen) ws.onopen();
    };
    
    ws.simulateClose = () => {
        ws.readyState = WebSocket.CLOSED;
        if (ws.onclose) ws.onclose();
    };
    
    ws.simulateError = (error) => {
        if (ws.onerror) ws.onerror(error);
    };
    
    return ws;
};

// Export mocks
module.exports = {
    createMockUtils,
    createMockValidator,
    createMockErrorHandler,
    createMockEnvironment,
    createMockWebSocket,
    createMockDOMElements,
    createMockConfig
};
