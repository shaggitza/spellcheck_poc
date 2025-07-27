/**
 * Application Configuration
 * Centralized configuration for the Text Editor application
 */

const CONFIG = {
    // Timing and Debouncing (in milliseconds)
    TIMING: {
        SAVE_DEBOUNCE: 1000, // Auto-save delay after text changes
        PREDICTION_DEBOUNCE: 300, // Prediction request delay (normal)
        PREDICTION_DEBOUNCE_TYPING: 500, // Prediction request delay (while typing)
        SPELL_CHECK_DEBOUNCE: 500, // Spell check request delay
        TYPING_TIMEOUT: 1000, // Time to wait before considering typing stopped
        NORMALIZATION_DELAY: 2000, // Delay before normalizing editor structure
        NORMALIZATION_AFTER_TYPING: 100, // Normalization delay after typing stops
        CURSOR_POSITION_UPDATE_DELAY: 50, // Delay for cursor position updates on click
        PARAGRAPH_HOVER_DELAY: 100, // Delay before hiding paragraph actions
        SUGGESTION_DISPLAY_DELAY: 100, // Delay before showing new suggestions
        WEBSOCKET_RECONNECT_DELAY: 3000, // WebSocket reconnection delay
        BLUR_HIDE_DELAY: 150, // Delay before hiding elements on blur
    },

    // UI Dimensions and Positions
    UI: {
        PREDICTION_POPUP: {
            OFFSET_X: 10, // Horizontal offset from cursor
            OFFSET_Y: 25, // Vertical offset from cursor
            MAX_WIDTH: 250, // Maximum popup width
            MAX_HEIGHT: 50, // Maximum popup height
        },
        PARAGRAPH_ACTIONS: {
            OFFSET_X: 10, // Horizontal offset from paragraph
            OFFSET_Y: -45, // Vertical offset above paragraph
        },
    },

    // Text Processing
    TEXT: {
        MIN_REMAINING_SUGGESTION_LENGTH: 5, // Minimum chars to keep suggestion visible
        WORD_BOUNDARY_CHARS: /[a-zA-Z0-9']/, // Characters that constitute a word
        WHITESPACE_CHARS: /\s/, // Whitespace character pattern
        AVERAGE_LINE_LENGTH_THRESHOLD: 40, // Threshold for treating single line breaks as paragraphs
        MAX_CURSOR_POSITION_TOLERANCE: 10, // Tolerance for cursor position matching
        MIN_PREDICTION_LENGTH: 1, // Minimum prediction length to show
    },

    // File Management
    FILES: {
        EXTENSION: '.txt', // Required file extension
        MAX_FILENAME_LENGTH: 255, // Maximum filename length
        AUTO_SAVE_ENABLED: true, // Enable automatic saving
    },

    // WebSocket Configuration
    WEBSOCKET: {
        MAX_RECONNECT_ATTEMPTS: 5, // Maximum reconnection attempts
        RECONNECT_BACKOFF_MULTIPLIER: 1.5, // Exponential backoff multiplier
        HEARTBEAT_INTERVAL: 30000, // Heartbeat interval (30 seconds)
        CONNECTION_TIMEOUT: 10000, // Connection timeout (10 seconds)
    },

    // Spell Checking
    SPELL_CHECK: {
        MAX_SUGGESTIONS: 15, // Maximum number of suggestions to show
        CACHE_SIZE: 1000, // Maximum cached spell check results
        DEFAULT_LANGUAGE: 'en', // Default language for spell checking
        ERROR_HIGHLIGHT_COLOR: 'rgba(255,0,0,0.2)', // Error highlight background
        ERROR_BORDER_STYLE: '2px wavy red', // Error border style
    },

    // Prediction System
    PREDICTION: {
        MAX_CONTEXT_LENGTH: 500, // Maximum context length for predictions
        MIN_CONTEXT_LENGTH: 10, // Minimum context length for predictions
        CONFIDENCE_THRESHOLD: 0.3, // Minimum confidence to show prediction
        MAX_PREDICTION_LENGTH: 100, // Maximum prediction length
    },

    // Performance
    PERFORMANCE: {
        MAX_DOM_OPERATIONS_PER_FRAME: 10, // Throttle DOM operations
        VIRTUAL_SCROLL_THRESHOLD: 1000, // Enable virtual scrolling after N paragraphs
        DEBOUNCE_RESIZE: 250, // Window resize debounce
        MAX_UNDO_HISTORY: 50, // Maximum undo history entries
    },

    // Development and Debugging
    DEBUG: {
        ENABLE_CONSOLE_LOGS: true, // Enable console logging
        ENABLE_PERFORMANCE_MONITORING: false, // Enable performance monitoring
        ENABLE_DOM_DEBUGGING: false, // Enable DOM state debugging
        LOG_WEBSOCKET_MESSAGES: false, // Log all WebSocket messages
        LOG_PREDICTION_REQUESTS: true, // Log prediction requests
        LOG_SPELL_CHECK_REQUESTS: true, // Log spell check requests
    },

    // UI Styling (CSS class names and IDs)
    SELECTORS: {
        EDITOR: '#textEditor',
        CURRENT_SUGGESTION: '#current-inline-suggestion',
        FILE_LIST: '#fileList',
        SAVE_STATUS: '#saveStatus',
        CONNECTION_STATUS: '#connectionStatus',
        PREDICTION_TEXT: '#predictionText',
        PARAGRAPH_ACTIONS: '#paragraphActions',
    },

    // CSS Classes
    CSS_CLASSES: {
        WORD_TOKEN: 'word-token',
        SPELL_ERROR: 'spell-error',
        SPELL_ERROR_HIGHLIGHT: 'spell-error-highlight',
        INLINE_SUGGESTION: 'inline-suggestion-text',
        ERROR_COUNT_BADGE: 'error-count-badge',
        ACTIVE_PARAGRAPH: 'active-paragraph',
        ACTIVE_FILE: 'active',
        CONNECTION_CONNECTED: 'connected',
        CONNECTION_CONNECTING: 'connecting',
        CONNECTION_DISCONNECTED: 'disconnected',
    },

    // Event Types
    EVENTS: {
        WEBSOCKET: {
            EDIT_RESPONSE: 'edit_response',
            PREDICTION_RESPONSE: 'prediction_response',
            SPELL_CHECK_RESPONSE: 'spell_check_response',
            DICTIONARY_UPDATED: 'dictionary_updated',
            ERROR: 'error',
        },
        EDITOR: {
            TEXT_CHANGE: 'textchange',
            CURSOR_MOVE: 'cursormove',
            SUGGESTION_ACCEPT: 'suggestionaccept',
            SUGGESTION_REJECT: 'suggestionreject',
        },
    },

    // Error Messages
    MESSAGES: {
        ERRORS: {
            FILE_NOT_FOUND: 'File not found',
            SAVE_FAILED: 'Failed to save file',
            CONNECTION_LOST: 'Connection to server lost',
            INVALID_FILENAME: 'Invalid filename. Must end with .txt',
            EMPTY_FILENAME: 'Please enter a filename',
            WEBSOCKET_ERROR: 'WebSocket connection error',
            PREDICTION_ERROR: 'Failed to get text prediction',
            SPELL_CHECK_ERROR: 'Spell check failed',
        },
        SUCCESS: {
            FILE_SAVED: 'File saved successfully',
            CONNECTION_RESTORED: 'Connection restored',
            WORD_ADDED_TO_DICTIONARY: 'Word added to dictionary',
            SETTINGS_SAVED: 'Settings saved',
        },
        INFO: {
            CONNECTING: 'Connecting to server...',
            SAVING: 'Saving...',
            LOADING: 'Loading...',
            PROCESSING: 'Processing...',
        },
    },

    // Keyboard Shortcuts
    SHORTCUTS: {
        SAVE: { key: 's', ctrl: true },
        ACCEPT_SUGGESTION: { key: 'Tab' },
        ACCEPT_PARTIAL_SUGGESTION: { key: 'ArrowRight', ctrl: true },
        REJECT_SUGGESTION: { key: 'Escape' },
        NEW_PARAGRAPH: { key: 'Enter' },
    },
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
    // Browser environment - can override based on URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);

    // Debug mode from URL parameter
    if (urlParams.get('debug') === 'true') {
        CONFIG.DEBUG.ENABLE_CONSOLE_LOGS = true;
        CONFIG.DEBUG.ENABLE_PERFORMANCE_MONITORING = true;
        CONFIG.DEBUG.ENABLE_DOM_DEBUGGING = true;
        CONFIG.DEBUG.LOG_WEBSOCKET_MESSAGES = true;
    }

    // Load user preferences from localStorage
    const userPrefs = localStorage.getItem('editorConfig');
    if (userPrefs) {
        try {
            const prefs = JSON.parse(userPrefs);
            // Merge user preferences (could be more sophisticated)
            Object.assign(CONFIG.TIMING, prefs.timing || {});
            Object.assign(CONFIG.SPELL_CHECK, prefs.spellCheck || {});
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
        }
    }
}

// Freeze the configuration to prevent accidental modification
Object.freeze(CONFIG.TIMING);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.TEXT);
Object.freeze(CONFIG.FILES);
Object.freeze(CONFIG.WEBSOCKET);
Object.freeze(CONFIG.SPELL_CHECK);
Object.freeze(CONFIG.PREDICTION);
Object.freeze(CONFIG.PERFORMANCE);
Object.freeze(CONFIG.DEBUG);
Object.freeze(CONFIG.SELECTORS);
Object.freeze(CONFIG.CSS_CLASSES);
Object.freeze(CONFIG.EVENTS);
Object.freeze(CONFIG.MESSAGES);
Object.freeze(CONFIG.SHORTCUTS);
Object.freeze(CONFIG);

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
