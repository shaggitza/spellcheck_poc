/**
 * Jest Test Setup
 * Sets up the testing environment for the text editor application
 */

// Import testing utilities
require('@testing-library/jest-dom');

// Mock global objects that would normally be available in browser
global.CONFIG = {
    CSS_CLASSES: {
        WORD_TOKEN: 'word-token',
        ERROR_HIGHLIGHT: 'spell-error',
        ERROR_COUNT_BADGE: 'error-count-badge',
        CONNECTION_CONNECTED: 'connected',
        CONNECTION_CONNECTING: 'connecting',
        CONNECTION_DISCONNECTED: 'disconnected'
    },
    SELECTORS: {
        CURRENT_SUGGESTION: '#current-inline-suggestion'
    },
    TIMING: {
        PREDICTION_DEBOUNCE: 300,
        PREDICTION_DEBOUNCE_TYPING: 100,
        SPELL_CHECK_DEBOUNCE: 500,
        SAVE_DEBOUNCE: 1000,
        TYPING_TIMEOUT: 2000,
        NORMALIZATION_DELAY: 100,
        NORMALIZATION_AFTER_TYPING: 200,
        BLUR_HIDE_DELAY: 150,
        SUGGESTION_DISPLAY_DELAY: 50,
        CURSOR_POSITION_UPDATE_DELAY: 10,
        PARAGRAPH_HOVER_DELAY: 100,
        WEBSOCKET_RECONNECT_DELAY: 5000
    },
    TEXT: {
        MAX_CURSOR_POSITION_TOLERANCE: 5
    },
    EVENTS: {
        WEBSOCKET: {
            EDIT_RESPONSE: 'edit_response',
            PREDICTION_RESPONSE: 'prediction_response',
            SPELL_CHECK_RESPONSE: 'spell_check_response',
            DICTIONARY_UPDATED: 'dictionary_updated',
            ERROR: 'error'
        }
    },
    SPELL_CHECK: {
        DEFAULT_LANGUAGE: 'en'
    },
    MESSAGES: {
        SUCCESS: {
            CONNECTION_RESTORED: 'Connection restored',
            FILE_SAVED: 'File saved successfully'
        },
        INFO: {
            CONNECTING: 'Connecting...',
            SAVING: 'Saving...'
        },
        ERRORS: {
            CONNECTION_LOST: 'Connection lost',
            SAVE_FAILED: 'Failed to save file'
        }
    }
};

// Mock environment
global.ENV = {
    isDevelopment: () => true,
    isProduction: () => false,
    startTimer: (name) => ({ end: () => 100 }),
    logNetworkRequest: () => {},
    settings: {
        debounceDelay: 1000,
        websocketReconnectDelay: 5000
    }
};

/**
 * Jest Setup for SpellCheck POC Tests
 * Configures the testing environment with necessary mocks and globals
 */

// Mock window.getSelection for DOM tests
Object.defineProperty(window, 'getSelection', {
    writable: true,
    value: jest.fn(() => ({
        rangeCount: 1,
        getRangeAt: jest.fn(() => ({
            collapsed: true, // Indicates cursor position (no selection)
            insertNode: jest.fn((node) => {
                // Actually insert the node into the body for testing
                if (node && node.nodeType === 1) { // Element node
                    console.log('Mock insertNode: Adding element to DOM:', node.id, node.className);
                    document.body.appendChild(node);
                } else {
                    console.log('Mock insertNode: Not adding node (invalid):', node);
                }
            }),
            setStartBefore: jest.fn(),
            collapse: jest.fn()
        })),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
    }))
});

// Mock WebSocket for testing
global.WebSocket = class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.OPEN;
        this.onopen = null;
        this.onclose = null;
        this.onmessage = null;
        this.onerror = null;
        this.send = jest.fn();
        this.close = jest.fn();
    }
};

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    }
});

// Mock CONFIG object for tests
global.CONFIG = {
    CSS_CLASSES: {
        ERROR_COUNT_BADGE: 'error-badge',
        SPELL_ERROR: 'spell-error',
        INLINE_SUGGESTION: 'inline-suggestion'
    },
    SELECTORS: {
        CURRENT_SUGGESTION: '#current-inline-suggestion'
    },
    TEXT: {
        MAX_CURSOR_POSITION_TOLERANCE: 5
    },
    TIMING: {
        SPELL_CHECK_DEBOUNCE: 300,
        PREDICTION_DEBOUNCE: 100,
        PREDICTION_DEBOUNCE_TYPING: 200
    }
};

// Mock ENV object for tests  
global.ENV = {
    isDevelopment: () => true,
    isProduction: () => false,
    getLogLevel: () => 'debug'
};

console.log('✅ Jest setup complete - Global mocks initialized');
global.WebSocket = class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 1; // OPEN
        this.CONNECTING = 0;
        this.OPEN = 1;
        this.CLOSING = 2;
        this.CLOSED = 3;
    }
    
    send(data) {
        // Mock send implementation
    }
    
    close() {
        this.readyState = this.CLOSED;
    }
};

// Mock DOM APIs that aren't available in jsdom
global.Range.prototype.getBoundingClientRect = jest.fn(() => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
}));

global.Range.prototype.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: jest.fn()
}));

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
        getRangeAt: jest.fn(() => new Range()),
        removeAllRanges: jest.fn(),
        addRange: jest.fn(),
        rangeCount: 0,
        collapse: jest.fn(),
        collapseToEnd: jest.fn(),
        collapseToStart: jest.fn(),
        containsNode: jest.fn(),
        deleteFromDocument: jest.fn(),
        empty: jest.fn(),
        extend: jest.fn(),
        modify: jest.fn(),
        selectAllChildren: jest.fn(),
        setBaseAndExtent: jest.fn(),
        setPosition: jest.fn(),
        toString: jest.fn(() => '')
    }))
});

// Mock console methods to reduce noise in tests unless explicitly testing them
const originalConsole = { ...console };
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: originalConsole.error // Keep error for test failures
};

// Cleanup after each test
afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Reset any global state
    delete global.textEditor;
    delete global.app;
});

// Global test utilities
global.createMockElement = (tag = 'div', attrs = {}) => {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    return element;
};

global.createMockWebSocket = () => new global.WebSocket('ws://localhost');
