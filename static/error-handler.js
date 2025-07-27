/**
 * Error Handling System
 * Centralized error management for the Text Editor application
 */

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = CONFIG.PERFORMANCE.MAX_UNDO_HISTORY || 50;
        this.notificationContainer = null;
        this.retryCallbacks = new Map();
        this.initializeNotificationContainer();
        this.setupGlobalErrorHandlers();
    }

    initializeNotificationContainer() {
        // Create notification container if it doesn't exist
        this.notificationContainer = document.getElementById('error-notifications');
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'error-notifications';
            this.notificationContainer.className = 'error-notifications-container';
            this.notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(this.notificationContainer);
        }
    }

    setupGlobalErrorHandlers() {
        // Global JavaScript error handler
        window.addEventListener('error', event => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                severity: 'high',
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', event => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || 'Unknown promise rejection',
                stack: event.reason?.stack,
                severity: 'high',
            });
        });

        // WebSocket error monitoring
        this.setupWebSocketErrorHandling();
    }

    setupWebSocketErrorHandling() {
        // This will be called by the TextEditor class to register WebSocket errors
        this.registerWebSocketHandlers = websocket => {
            websocket.addEventListener('error', _event => {
                this.handleError({
                    type: 'WebSocket Error',
                    message: CONFIG.MESSAGES.ERRORS.WEBSOCKET_ERROR,
                    context: 'websocket-connection',
                    severity: 'medium',
                    retry: () => this.retryWebSocketConnection(),
                });
            });

            websocket.addEventListener('close', event => {
                if (event.code !== 1000) {
                    // Not a normal closure
                    this.handleError({
                        type: 'WebSocket Connection Lost',
                        message: CONFIG.MESSAGES.ERRORS.CONNECTION_LOST,
                        context: 'websocket-connection',
                        severity: 'medium',
                        code: event.code,
                        retry: () => this.retryWebSocketConnection(),
                    });
                }
            });
        };
    }

    /**
     * Main error handling method
     * @param {Object} errorInfo - Error information object
     * @param {string} errorInfo.type - Type of error
     * @param {string} errorInfo.message - Error message
     * @param {string} [errorInfo.context] - Context where error occurred
     * @param {string} [errorInfo.severity] - Error severity (low, medium, high)
     * @param {Function} [errorInfo.retry] - Retry function
     * @param {Object} [errorInfo.details] - Additional error details
     */
    handleError(errorInfo) {
        const error = {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            type: errorInfo.type || 'Unknown Error',
            message: errorInfo.message || 'An unknown error occurred',
            context: errorInfo.context || 'general',
            severity: errorInfo.severity || 'medium',
            details: errorInfo.details || {},
            stack: errorInfo.stack,
            retry: errorInfo.retry,
            attempts: 0,
            maxAttempts: 3,
        };

        // Store error for debugging
        this.errors.push(error);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift(); // Remove oldest error
        }

        // Log error for debugging
        this.logError(error);

        // Show user notification
        this.showErrorNotification(error);

        // Send to analytics if available
        this.trackError(error);

        return error.id;
    }

    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    logError(error) {
        if (!CONFIG.DEBUG.ENABLE_CONSOLE_LOGS) return;

        const logLevel =
            {
                low: 'warn',
                medium: 'error',
                high: 'error',
            }[error.severity] || 'error';

        console[logLevel](`[${error.type}] ${error.message}`, {
            id: error.id,
            context: error.context,
            timestamp: error.timestamp,
            details: error.details,
            stack: error.stack,
        });
    }

    showErrorNotification(error) {
        const notification = this.createNotificationElement(error);
        this.notificationContainer.appendChild(notification);

        // Auto-remove notification after delay
        const autoRemoveDelay =
            {
                low: 3000,
                medium: 5000,
                high: 8000,
            }[error.severity] || 5000;

        setTimeout(() => {
            this.removeNotification(notification);
        }, autoRemoveDelay);
    }

    createNotificationElement(error) {
        const notification = document.createElement('div');
        notification.className = `error-notification severity-${error.severity}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(error.severity)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            pointer-events: auto;
            animation: slideInRight 0.3s ease-out;
            position: relative;
            max-width: 100%;
            word-wrap: break-word;
        `;

        const icon = this.getErrorIcon(error.severity);
        const retryButton = error.retry ? this.createRetryButton(error) : '';
        const dismissButton = this.createDismissButton();

        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 16px; margin-top: 2px;">${icon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${error.type}</div>
                    <div style="font-size: 14px; opacity: 0.9;">${error.message}</div>
                    ${error.context !== 'general' ? `<div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Context: ${error.context}</div>` : ''}
                </div>
                <div style="display: flex; gap: 4px; margin-left: 8px;">
                    ${retryButton}
                    ${dismissButton}
                </div>
            </div>
        `;

        return notification;
    }

    getNotificationColor(severity) {
        return (
            {
                low: '#f59e0b', // Yellow/Orange
                medium: '#ef4444', // Red
                high: '#dc2626', // Dark Red
            }[severity] || '#ef4444'
        );
    }

    getErrorIcon(severity) {
        return (
            {
                low: '⚠️',
                medium: '❌',
                high: '🚨',
            }[severity] || '❌'
        );
    }

    createRetryButton(error) {
        return `
            <button onclick="window.errorHandler.retryError('${error.id}')" 
                    style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                           color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; 
                           cursor: pointer; hover:background: rgba(255,255,255,0.3);">
                Retry
            </button>
        `;
    }

    createDismissButton() {
        return `
            <button onclick="this.closest('.error-notification').remove()" 
                    style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                           color: white; padding: 4px 6px; border-radius: 4px; font-size: 12px; 
                           cursor: pointer; hover:background: rgba(255,255,255,0.3);">
                ×
            </button>
        `;
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }

    retryError(errorId) {
        const error = this.errors.find(e => e.id === errorId);
        if (!error || !error.retry) return;

        if (error.attempts >= error.maxAttempts) {
            this.handleError({
                type: 'Retry Limit Exceeded',
                message: `Maximum retry attempts (${error.maxAttempts}) exceeded for: ${error.message}`,
                context: error.context,
                severity: 'high',
            });
            return;
        }

        error.attempts++;

        try {
            error.retry();
            this.showSuccessNotification(`Retry attempt ${error.attempts} initiated`);
        } catch (retryError) {
            this.handleError({
                type: 'Retry Failed',
                message: `Retry failed: ${retryError.message}`,
                context: error.context,
                severity: 'medium',
            });
        }
    }

    showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: #10b981;
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            pointer-events: auto;
            animation: slideInRight 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>✅</span>
                <span>${message}</span>
            </div>
        `;

        this.notificationContainer.appendChild(notification);
        setTimeout(() => this.removeNotification(notification), 3000);
    }

    trackError(error) {
        // Placeholder for analytics tracking
        if (CONFIG.DEBUG.ENABLE_PERFORMANCE_MONITORING) {
            console.log('📊 Error tracked for analytics:', {
                type: error.type,
                context: error.context,
                severity: error.severity,
                timestamp: error.timestamp,
            });
        }
    }

    // Helper methods for specific error types
    handleFileError(filename, operation, originalError) {
        return this.handleError({
            type: 'File Operation Error',
            message: `Failed to ${operation} file: ${filename}`,
            context: 'file-management',
            severity: 'medium',
            details: { filename, operation, originalError: originalError.message },
        });
    }

    handleNetworkError(url, operation, originalError) {
        return this.handleError({
            type: 'Network Error',
            message: `Network ${operation} failed`,
            context: 'network',
            severity: 'medium',
            details: { url, operation, originalError: originalError.message },
            retry: () => this.retryNetworkOperation(url, operation),
        });
    }

    handleValidationError(field, value, rule) {
        return this.handleError({
            type: 'Validation Error',
            message: `Invalid ${field}: ${rule}`,
            context: 'validation',
            severity: 'low',
            details: { field, value, rule },
        });
    }

    // Utility methods
    getErrorsReport() {
        return {
            total: this.errors.length,
            bySeverity: {
                high: this.errors.filter(e => e.severity === 'high').length,
                medium: this.errors.filter(e => e.severity === 'medium').length,
                low: this.errors.filter(e => e.severity === 'low').length,
            },
            byContext: this.errors.reduce((acc, error) => {
                acc[error.context] = (acc[error.context] || 0) + 1;
                return acc;
            }, {}),
            recent: this.errors.slice(-10),
        };
    }

    clearErrors() {
        this.errors = [];
        // Clear notification container
        if (this.notificationContainer) {
            this.notificationContainer.innerHTML = '';
        }
    }
}

// Add CSS animations
const errorHandlerStyles = document.createElement('style');
errorHandlerStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .error-notification:hover {
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        transform: translateY(-1px);
        transition: all 0.2s ease;
    }
`;
document.head.appendChild(errorHandlerStyles);

// Global error handler instance
window.errorHandler = new ErrorHandler();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
