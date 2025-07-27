/**
 * Environment Detection and Configuration
 * Provides development/production mode detection and environment-specific settings
 */

class Environment {
    constructor() {
        this.mode = this.detectMode();
        this.settings = this.getEnvironmentSettings();
        this.init();
    }

    detectMode() {
        // Multiple detection methods for robust environment detection

        // Method 1: Check hostname patterns
        const hostname = window.location.hostname;
        if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.endsWith('.local')
        ) {
            return 'development';
        }

        // Method 2: Check port patterns (common dev ports)
        const port = window.location.port;
        if (
            port &&
            (port === '3000' ||
                port === '5000' ||
                port === '8000' ||
                port === '8080' ||
                port === '3001' ||
                port === '5001')
        ) {
            return 'development';
        }

        // Method 3: Check URL patterns
        const href = window.location.href;
        if (
            href.includes('localhost') ||
            href.includes('127.0.0.1') ||
            href.includes('.dev') ||
            href.includes('staging')
        ) {
            return 'development';
        }

        // Method 4: Check for debug parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug') || urlParams.has('dev')) {
            return 'development';
        }

        // Method 5: Check user agent for development indicators
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Electron') || userAgent.includes('Development')) {
            return 'development';
        }

        // Default to production for safety
        return 'production';
    }

    getEnvironmentSettings() {
        const base = {
            // Common settings
            apiTimeout: 30000,
            retryAttempts: 3,

            // WebSocket settings
            websocketReconnectDelay: 3000,
            websocketMaxReconnectAttempts: 10,

            // Performance settings
            debounceDelay: 300,

            // Feature flags
            enableAnalytics: false,
            enableCrashReporting: false,
        };

        if (this.mode === 'development') {
            return {
                ...base,
                // Development-specific overrides
                logLevel: 'debug',
                enableDebugTools: true,
                enablePerformanceMonitoring: true,
                apiTimeout: 60000, // Longer timeout for debugging
                showDetailedErrors: true,
                enableConsoleLogging: true,
                enableNetworkLogging: true,
                enableStateLogging: true,
                retryAttempts: 1, // Fail faster in dev
                websocketReconnectDelay: 1000, // Reconnect faster in dev

                // Debug features
                enableKeyboardShortcuts: true,
                showDebugInfo: true,
                enableErrorBoundaries: true,

                // Performance
                enablePerformanceMetrics: true,
                logSlowOperations: true,
                performanceThreshold: 100, // Log operations > 100ms

                // Feature flags for development
                enableExperimentalFeatures: true,
                enableBetaFeatures: true,
            };
        } else {
            return {
                ...base,
                // Production-specific overrides
                logLevel: 'warn',
                enableDebugTools: false,
                enablePerformanceMonitoring: false,
                showDetailedErrors: false,
                enableConsoleLogging: false,
                enableNetworkLogging: false,
                enableStateLogging: false,

                // Production features
                enableAnalytics: true,
                enableCrashReporting: true,

                // Performance
                enablePerformanceMetrics: false,
                logSlowOperations: false,
                performanceThreshold: 1000, // Only log very slow operations

                // Feature flags for production
                enableExperimentalFeatures: false,
                enableBetaFeatures: false,
            };
        }
    }

    init() {
        this.setupConsoleLogging();
        this.setupDebugTools();
        this.setupPerformanceMonitoring();
        this.exposeGlobals();
    }

    setupConsoleLogging() {
        if (!this.settings.enableConsoleLogging) {
            // In production, suppress console.log but keep warn and error
            const originalLog = console.log;
            console.log = () => {}; // Suppress logs in production

            // Keep a reference for debug purposes
            console._originalLog = originalLog;
        }

        // Add environment indicator to console
        if (this.isDevelopment()) {
            console.log(
                `%c🚀 TextEditor - Development Mode`,
                'background: #4ade80; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;'
            );
        }
    }

    setupDebugTools() {
        if (this.settings.enableDebugTools) {
            // Add keyboard shortcuts for debugging
            document.addEventListener('keydown', e => {
                // Ctrl+Shift+D: Toggle debug panel
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    this.toggleDebugPanel();
                }

                // Ctrl+Shift+L: Export logs
                if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                    e.preventDefault();
                    this.exportLogs();
                }

                // Ctrl+Shift+C: Clear all caches
                if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    this.clearAllCaches();
                }

                // Ctrl+Shift+R: Force reconnect WebSocket
                if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                    e.preventDefault();
                    this.forceReconnect();
                }
            });
        }
    }

    setupPerformanceMonitoring() {
        if (this.settings.enablePerformanceMonitoring) {
            // Monitor long tasks
            if ('PerformanceObserver' in window) {
                try {
                    const perfObserver = new PerformanceObserver(entryList => {
                        for (const entry of entryList.getEntries()) {
                            if (entry.duration > this.settings.performanceThreshold) {
                                console.warn(
                                    `⚠️ Long task detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`
                                );
                            }
                        }
                    });

                    perfObserver.observe({ entryTypes: ['measure', 'navigation'] });
                } catch (error) {
                    console.warn('Performance monitoring not available:', error);
                }
            }

            // Monitor memory usage (if available)
            if ('memory' in performance) {
                setInterval(() => {
                    const memory = performance.memory;
                    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                    const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);

                    if (usedMB > 100) {
                        // Alert if using > 100MB
                        console.warn(`📊 High memory usage: ${usedMB}MB / ${totalMB}MB`);
                    }
                }, 30000); // Check every 30 seconds
            }
        }
    }

    exposeGlobals() {
        if (this.isDevelopment()) {
            // Expose useful debugging tools globally
            window.__DEV__ = {
                environment: this,
                mode: this.mode,
                settings: this.settings,

                // Utility functions
                logState: () => {
                    if (window.textEditor) {
                        console.log('🔍 Current Editor State:', {
                            currentFile: window.textEditor.currentFile,
                            isConnected: window.textEditor.isConnected,
                            suggestionVisible: window.textEditor.suggestionVisible,
                            isTyping: window.textEditor.isTyping,
                            spellErrors: Object.keys(window.textEditor.spellErrors || {}).length,
                        });
                    }
                },

                exportData: () => {
                    const data = {
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        localStorage: { ...localStorage },
                        settings: this.settings,
                    };

                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                        type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `texteditor-debug-${Date.now()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                },

                clearStorage: () => {
                    localStorage.clear();
                    sessionStorage.clear();
                    console.log('🧹 Storage cleared');
                },
            };
        }
    }

    toggleDebugPanel() {
        let panel = document.getElementById('debug-panel');

        if (panel) {
            panel.remove();
            return;
        }

        panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; z-index: 10000; 
                        background: rgba(0,0,0,0.9); color: white; padding: 15px; 
                        border-radius: 8px; font-family: monospace; font-size: 12px;
                        max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                    <strong>🛠️ Debug Panel</strong>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: #ef4444; color: white; border: none; 
                                   border-radius: 3px; padding: 2px 6px; cursor: pointer; margin-left: 10px;">×</button>
                </div>
                <div id="debug-content">
                    <div><strong>Mode:</strong> ${this.mode}</div>
                    <div><strong>URL:</strong> ${window.location.href}</div>
                    <div><strong>User Agent:</strong> ${navigator.userAgent.slice(0, 50)}...</div>
                    <div style="margin-top: 10px;">
                        <button onclick="window.__DEV__.logState()" 
                                style="background: #3b82f6; color: white; border: none; 
                                       border-radius: 3px; padding: 4px 8px; cursor: pointer; margin: 2px;">
                            Log State
                        </button>
                        <button onclick="window.__DEV__.exportData()" 
                                style="background: #10b981; color: white; border: none; 
                                       border-radius: 3px; padding: 4px 8px; cursor: pointer; margin: 2px;">
                            Export Data
                        </button>
                        <button onclick="window.__DEV__.clearStorage()" 
                                style="background: #f59e0b; color: white; border: none; 
                                       border-radius: 3px; padding: 4px 8px; cursor: pointer; margin: 2px;">
                            Clear Storage
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
    }

    exportLogs() {
        // This would be expanded to include actual log collection
        console.log('📋 Exporting logs...');
        window.__DEV__?.exportData();
    }

    clearAllCaches() {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => caches.delete(cacheName));
            });
        }
        console.log('🧹 All caches cleared');
    }

    forceReconnect() {
        if (window.textEditor && window.textEditor.ws) {
            console.log('🔄 Forcing WebSocket reconnection...');
            window.textEditor.ws.close();
        }
    }

    // Public API
    isDevelopment() {
        return this.mode === 'development';
    }

    isProduction() {
        return this.mode === 'production';
    }

    getSetting(key) {
        return this.settings[key];
    }

    getMode() {
        return this.mode;
    }

    // Performance timing utilities
    startTimer(label) {
        if (this.settings.enablePerformanceMetrics) {
            performance.mark(`${label}-start`);
            return {
                end: () => {
                    performance.mark(`${label}-end`);
                    performance.measure(label, `${label}-start`, `${label}-end`);

                    const measure = performance.getEntriesByName(label)[0];
                    if (measure && measure.duration > this.settings.performanceThreshold) {
                        console.warn(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
                    }

                    // Clean up marks
                    performance.clearMarks(`${label}-start`);
                    performance.clearMarks(`${label}-end`);
                    performance.clearMeasures(label);

                    return measure ? measure.duration : 0;
                },
            };
        }

        // Return a no-op timer for production
        return { end: () => 0 };
    }

    // Network monitoring
    logNetworkRequest(method, url, duration, success = true) {
        if (this.settings.enableNetworkLogging) {
            const status = success ? '✅' : '❌';
            console.log(`🌐 ${status} ${method} ${url} (${duration}ms)`);
        }
    }

    // State logging
    logStateChange(component, oldState, newState) {
        if (this.settings.enableStateLogging) {
            console.log(`🔄 State change in ${component}:`, { oldState, newState });
        }
    }
}

// Create global environment instance
window.ENV = new Environment();
