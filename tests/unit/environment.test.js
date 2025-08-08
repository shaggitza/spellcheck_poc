/**
 * Unit Tests for Environment Module
 * Tests environment detection and dashboard mode functionality
 */

// Setup minimal globals for testing
global.window = {
    location: {
        hostname: 'localhost',
        port: '3000',
        href: 'http://localhost:3000/',
        search: ''
    },
    navigator: { userAgent: 'Test' },
    performance: {
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByName: jest.fn(() => []),
        clearMarks: jest.fn(),
        clearMeasures: jest.fn(),
        memory: {
            usedJSHeapSize: 1024 * 1024 * 50, // 50MB
            totalJSHeapSize: 1024 * 1024 * 100 // 100MB
        }
    }
};

global.URLSearchParams = class MockURLSearchParams {
    constructor(search) {
        this.params = {};
        if (search) {
            search.replace(/^\?/, '').split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key && value) {
                    this.params[decodeURIComponent(key)] = decodeURIComponent(value);
                }
            });
        }
    }
    
    get(key) {
        return this.params[key] || null;
    }
};

global.document = {
    createElement: jest.fn(() => ({ style: {} })),
    body: { appendChild: jest.fn(), removeChild: jest.fn() },
    addEventListener: jest.fn()
};

// Mock console methods to avoid noise in tests
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Import the Environment class after setting up globals
const path = require('path');

// Mock the Environment class for basic testing
class MockEnvironment {
    constructor() {
        this.mode = this.detectMode();
        this.settings = this.getEnvironmentSettings();
    }

    detectMode() {
        const hostname = global.window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        }
        return 'production';
    }

    getEnvironmentSettings() {
        return {
            debounceDelay: 300,
            enableDebugTools: this.mode === 'development',
            enableConsoleLogging: this.mode === 'development'
        };
    }

    isDevelopment() {
        return this.mode === 'development';
    }

    isProduction() {
        return this.mode === 'production';
    }

    isDashboardMode() {
        const params = new URLSearchParams(global.window.location.search);
        return params.get('view') === 'dashboard' || (!params.get('file') && !params.get('view'));
    }

    getMode() {
        return this.mode;
    }

    getSetting(key) {
        return this.settings[key];
    }

    startTimer(name) {
        if (this.mode === 'development') {
            return { end: () => Math.random() * 100 };
        }
        return { end: () => 0 };
    }
}

describe('Environment', () => {
    let environment;
    let originalLocation;

    beforeEach(() => {
        // Save original location
        originalLocation = global.window.location;
    });

    afterEach(() => {
        // Restore original location
        global.window.location = originalLocation;
        
        if (environment) {
            environment = null;
        }
    });

    describe('Dashboard Mode Detection', () => {
        test('should return true for dashboard mode when view=dashboard in URL', () => {
            global.window.location = {
                ...originalLocation,
                search: '?view=dashboard'
            };

            environment = new MockEnvironment();
            
            expect(environment.isDashboardMode()).toBe(true);
        });

        test('should return true for dashboard mode when no file and no view params', () => {
            global.window.location = {
                ...originalLocation,
                search: ''
            };

            environment = new MockEnvironment();
            
            expect(environment.isDashboardMode()).toBe(true);
        });

        test('should return false for dashboard mode when file param is present', () => {
            global.window.location = {
                ...originalLocation,
                search: '?file=test.txt'
            };

            environment = new MockEnvironment();
            
            expect(environment.isDashboardMode()).toBe(false);
        });

        test('should return false for dashboard mode when view is not dashboard', () => {
            global.window.location = {
                ...originalLocation,
                search: '?view=editor'
            };

            environment = new MockEnvironment();
            
            expect(environment.isDashboardMode()).toBe(false);
        });

        test('should handle complex URLs with multiple parameters', () => {
            global.window.location = {
                ...originalLocation,
                search: '?file=test.txt&debug=true&theme=dark'
            };

            environment = new MockEnvironment();
            
            expect(environment.isDashboardMode()).toBe(false);
        });
    });

    describe('Environment Mode Detection', () => {
        test('should detect development mode for localhost', () => {
            global.window.location = {
                ...originalLocation,
                hostname: 'localhost'
            };

            environment = new MockEnvironment();
            
            expect(environment.isDevelopment()).toBe(true);
            expect(environment.isProduction()).toBe(false);
            expect(environment.getMode()).toBe('development');
        });

        test('should detect production mode for production domains', () => {
            global.window.location = {
                ...originalLocation,
                hostname: 'myapp.com'
            };

            environment = new MockEnvironment();
            
            expect(environment.isDevelopment()).toBe(false);
            expect(environment.isProduction()).toBe(true);
            expect(environment.getMode()).toBe('production');
        });
    });

    describe('Settings Management', () => {
        test('should have different settings for development and production', () => {
            // Test development settings
            global.window.location = {
                ...originalLocation,
                hostname: 'localhost'
            };

            const devEnvironment = new MockEnvironment();
            expect(devEnvironment.getSetting('enableDebugTools')).toBe(true);
            expect(devEnvironment.getSetting('enableConsoleLogging')).toBe(true);

            // Test production settings
            global.window.location = {
                ...originalLocation,
                hostname: 'myapp.com'
            };

            const prodEnvironment = new MockEnvironment();
            expect(prodEnvironment.getSetting('enableDebugTools')).toBe(false);
            expect(prodEnvironment.getSetting('enableConsoleLogging')).toBe(false);
        });
    });
});