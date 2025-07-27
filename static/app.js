/**
 * Text Editor Application - Legacy Monolithic Architecture
 */

class TextEditor {
    constructor() {
        // Initialize error handler first
        this.errorHandler = new ErrorHandler();

        // Initialize environment-aware settings
        this.environment = window.ENV;
        this.settings = this.environment.settings;

        // Initialize validator
        this.validator = window.VALIDATOR;

        // Initialize utilities
        this.utils = window.UTILS;

        // Log initialization in development
        if (this.environment.isDevelopment()) {
            console.log('🚀 Initializing TextEditor in development mode', this.settings);
        }

        // Initialize properties
        this.isConnected = false;
        this.isTyping = false;
        this.actionsVisible = false;
        this.currentParagraph = null;

        // Timeouts for debouncing - use environment-aware delays
        this.saveTimeout = null;
        this.typingTimeout = null;
        this.normalizeTimeout = null;

        // Cleanup tracking for memory leak prevention
        this.eventListeners = new Map(); // Track all event listeners for cleanup
        this.timeouts = new Set(); // Track all timeouts for cleanup
        this.intervals = new Set(); // Track all intervals for cleanup
        this.abortController = new AbortController(); // For aborting fetch requests

        try {
            this.initializeElements();
            this.initializeFileManager();
            this.initializeSpellChecker();
            this.initializePredictionEngine();
            this.setupEventListeners();
            this.setupUrlHandling();
            this.setupDebouncedMethods();
            this.connectWebSocket();
            this.fileManager.loadFileList();

            // Expose to global scope for debugging in development
            if (this.environment.isDevelopment()) {
                window.textEditor = this;
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'constructor', 'Failed to initialize TextEditor');
        }
    }

    setupDebouncedMethods() {
        // Create debounced versions of frequently called methods
        this.debouncedSave = this.utils.debounce(() => {
            this.fileManager.saveCurrentFile();
        }, this.settings.debounceDelay || CONFIG.TIMING.SAVE_DEBOUNCE);

        this.debouncedNormalize = this.utils.debounce(() => {
            if (!this.isTyping) {
                this.normalizeEditorStructure();
            }
        }, CONFIG.TIMING.NORMALIZATION_DELAY);
    }

    /**
     * Memory leak prevention methods
     */

    // Safe event listener management
    addEventListenerSafe(element, event, handler, options = {}) {
        const listenerId = `${element.constructor.name}-${event}-${Date.now()}`;

        // Use AbortSignal for automatic cleanup
        const listenerOptions = {
            ...options,
            signal: this.abortController.signal
        };

        element.addEventListener(event, handler, listenerOptions);

        // Track for manual cleanup if needed
        this.eventListeners.set(listenerId, {
            element,
            event,
            handler,
            options: listenerOptions
        });

        return listenerId;
    }

    // Safe timeout management  
    setTimeoutSafe(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.timeouts.delete(timeoutId);
            callback();
        }, delay);

        this.timeouts.add(timeoutId);
        return timeoutId;
    }

    // Safe interval management
    setIntervalSafe(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this.intervals.add(intervalId);
        return intervalId;
    }

    // Clear timeout safely
    clearTimeoutSafe(timeoutId) {
        if (timeoutId && this.timeouts.has(timeoutId)) {
            clearTimeout(timeoutId);
            this.timeouts.delete(timeoutId);
        }
    }

    // Clear interval safely
    clearIntervalSafe(intervalId) {
        if (intervalId && this.intervals.has(intervalId)) {
            clearInterval(intervalId);
            this.intervals.delete(intervalId);
        }
    }

    /**
     * Comprehensive cleanup method to prevent memory leaks
     */
    cleanup() {
        if (this.environment.isDevelopment()) {
            console.log('🧹 Starting TextEditor cleanup...');
        }

        try {
            // 1. Clear all timeouts and intervals
            this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.timeouts.clear();

            this.intervals.forEach(intervalId => clearInterval(intervalId));
            this.intervals.clear();

            // 2. Clear specific debounce timeouts
            this.clearTimeoutSafe(this.saveTimeout);
            this.clearTimeoutSafe(this.spellCheckTimeout);
            this.clearTimeoutSafe(this.typingTimeout);
            this.clearTimeoutSafe(this.normalizeTimeout);

            // 3. Abort any pending fetch requests
            this.abortController.abort();

            // 4. Close WebSocket connection
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
                this.ws = null;
            }

            // 5. Remove all event listeners via AbortController
            // (Most listeners will be automatically removed via abortController.abort())

            // 6. Clear DOM references to prevent circular references
            this.currentParagraph = null;

            // 7. Clean up modules
            if (this.spellChecker) {
                this.spellChecker.cleanup();
            }

            // 9. Reset state
            this.isConnected = false;
            this.isTyping = false;
            this.actionsVisible = false;

            if (this.environment.isDevelopment()) {
                console.log('✅ TextEditor cleanup completed successfully');
            }

        } catch (error) {
            this.errorHandler.handleError(error, 'cleanup', 'Error during cleanup process');
        }
    }

    /**
     * Destructor-like method - call this when the component is being destroyed
     */
    destroy() {
        this.cleanup();

        // Remove global reference
        if (window.textEditor === this) {
            delete window.textEditor;
        }
    }

    /**
     * Clean up file-specific state when switching files
     */
    cleanupFileState() {
        try {
            // Clear all debounce timeouts
            this.clearTimeoutSafe(this.saveTimeout);
            this.clearTimeoutSafe(this.typingTimeout);
            this.clearTimeoutSafe(this.normalizeTimeout);

            // Reset file-specific state
            if (this.predictionEngine) {
                this.predictionEngine.hideInlineSuggestion();
                this.predictionEngine.clearPrediction();
            }
            this.hideParagraphActions();
            this.isTyping = false;

            // Clear spell checker state
            if (this.spellChecker) {
                this.spellChecker.clearSpellCheckState();
            }

            if (this.environment.isDevelopment()) {
                console.log('🧹 File state cleaned up for file switch');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'cleanup', 'Error during file state cleanup');
        }
    }

    initializeElements() {
        // Use utilities for safer element querying
        this.fileList = this.utils.queryElement('#fileList', document, true);
        this.textEditor = this.utils.queryElement('#textEditor', document, true);
        this.currentFileName = this.utils.queryElement('#currentFileName', document, true);
        this.saveFile = this.utils.queryElement('#saveFile', document, true);
        this.saveStatus = this.utils.queryElement('#saveStatus', document, true);
        this.newFileName = this.utils.queryElement('#newFileName', document, true);
        this.createFile = this.utils.queryElement('#createFile', document, true);
        this.connectionStatus = this.utils.queryElement('#connectionStatus', document, true);
        this.statusText = this.utils.queryElement('#statusText', document, true);
        this.predictionText = this.utils.queryElement('#predictionText', document, true);
        this.paragraphActions = this.utils.queryElement('#paragraphActions', document, true);
        this.dashboardBtn = this.utils.queryElement('#dashboardBtn');
        this.settingsBtn = this.utils.queryElement('#settingsBtn');
        this.settingsModal = this.utils.queryElement('#settingsModal');
        this.addWordInput = this.utils.queryElement('#addWordInput');
        this.addWordBtn = this.utils.queryElement('#addWordBtn');
        this.dictionaryList = this.utils.queryElement('#dictionaryList');
        this.dictionaryLoading = this.utils.queryElement('#dictionaryLoading');
        this.dictionaryEmpty = this.utils.queryElement('#dictionaryEmpty');
        this.spellCheckerEngine = this.utils.queryElement('#spellCheckerEngine');
        this.spellCheckerLanguage = this.utils.queryElement('#spellCheckerLanguage');
        this.spellCheckEnabledInput = this.utils.queryElement('#spellCheckEnabled');
        this.saveSettingsBtn = this.utils.queryElement('#saveSettingsBtn');
    }

    initializeFileManager() {
        // Create FileManager with dependencies
        this.fileManager = new FileManager({
            // Dependencies
            utils: this.utils,
            validator: this.validator,
            errorHandler: this.errorHandler,
            environment: this.environment,
            config: CONFIG,

            // DOM elements
            fileList: this.fileList,
            saveButton: this.saveFile,
            currentFileName: this.currentFileName,
            newFileName: this.newFileName,
            createFileButton: this.createFile,

            // Callbacks for integration
            onFileLoaded: (filename) => this.handleFileLoaded(filename),
            onFileCreated: (filename) => this.handleFileCreated(filename),
            onFileSaved: (filename) => this.handleFileSaved(filename),

            // WebSocket and state getters
            getWebSocket: () => this.ws,
            getConnectionState: () => this.isConnected,
            getAbortController: () => this.abortController,

            // Editor content management
            getEditorContent: () => this.getEditorContent(),
            setEditorContent: (content) => this.setEditorContent(content),
            getCursorPosition: () => this.getCursorPosition(),
        });
    }

    initializeSpellChecker() {
        // Create SpellChecker with dependencies
        this.spellChecker = new SpellChecker({
            // Dependencies
            utils: this.utils,
            validator: this.validator,
            errorHandler: this.errorHandler,
            environment: this.environment,
            config: CONFIG,

            // WebSocket and connection management
            getWebSocket: () => this.ws,
            getConnectionState: () => this.isConnected,

            // Editor content and cursor management
            getEditorContent: () => this.getEditorContent(),
            getCursorPosition: () => this.getCursorPosition(),
            setCursorPosition: (position) => this.setCursorPosition(position),
            getTextEditor: () => this.textEditor,

            // State management callbacks
            getIsTyping: () => this.isTyping,
            getSuggestionVisible: () => this.predictionEngine ? this.predictionEngine.isSuggestionVisible() : false,

            // FileManager integration
            fileManager: this.fileManager,

            // Timeout management
            setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
            clearTimeoutSafe: (timeoutId) => this.clearTimeoutSafe(timeoutId),

            // Text change and dictionary management
            handleTextChange: () => this.handleTextChange(),
            addWordToDictionary: (word) => this.addWordToDictionary(word),
        });
    }

    initializePredictionEngine() {
        // Create PredictionEngine with dependencies
        this.predictionEngine = new PredictionEngine({
            // Dependencies
            websocket: () => this.ws,
            validator: this.validator,
            errorHandler: this.errorHandler,
            environment: this.environment,
            utils: this.utils,
            config: CONFIG,

            // DOM elements
            textEditor: this.textEditor,
            predictionText: this.predictionText,

            // Required callbacks from TextEditor
            getEditorContent: () => this.getEditorContent(),
            getCursorPosition: () => this.getCursorPosition(),
            setCursorPosition: (position) => this.setCursorPosition(position),
            getParagraphContext: (content, cursor) => this.getParagraphContext(content, cursor),
            isAtWordBoundary: () => this.isAtWordBoundary(),
            handleTextChange: () => this.handleTextChange(),
            clearTimeoutSafe: (timeoutId) => this.clearTimeoutSafe(timeoutId),
            setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
        });

        this.predictionEngine.initialize();
        console.log('✅ PredictionEngine initialized');
    }

    setupEventListeners() {
        // Rich text editor events
        this.addEventListenerSafe(this.textEditor, 'input', () => this.handleTextChange());
        this.addEventListenerSafe(this.textEditor, 'click', e => this.handleEditorClick(e));
        this.addEventListenerSafe(this.textEditor, 'keydown', e => this.handleKeyDown(e));
        this.addEventListenerSafe(this.textEditor, 'paste', e => this.handlePaste(e));
        this.addEventListenerSafe(this.textEditor, 'blur', () => {
            this.setTimeoutSafe(() => {
                if (this.predictionEngine) {
                    this.predictionEngine.hideInlineSuggestion();
                }
                this.hideParagraphActions();
            }, CONFIG.TIMING.BLUR_HIDE_DELAY);
        });

        // Handle paragraph interactions
        this.addEventListenerSafe(this.textEditor, 'mouseover', e => this.handleParagraphHover(e));
        this.addEventListenerSafe(this.textEditor, 'mouseout', e => this.handleParagraphLeave(e));

        // Dashboard button
        if (this.dashboardBtn) {
            this.addEventListenerSafe(this.dashboardBtn, 'click', () => this.showDashboard());
        }

        // Settings button
        if (this.settingsBtn) {
            this.addEventListenerSafe(this.settingsBtn, 'click', () => this.showSettingsModal());
        }

        // Dictionary management
        if (this.addWordBtn) {
            this.addEventListenerSafe(this.addWordBtn, 'click', () => this.addWordToDictionaryFromInput());
        }
        if (this.addWordInput) {
            this.addEventListenerSafe(this.addWordInput, 'keypress', _e => {
                if (_e.key === 'Enter') this.addWordToDictionaryFromInput();
            });
        }

        // Settings management
        if (this.saveSettingsBtn) {
            this.addEventListenerSafe(this.saveSettingsBtn, 'click', () => this.saveSettings());
        }

        // Paragraph action buttons
        this.addEventListenerSafe(this.paragraphActions, 'click', e => this.handleParagraphAction(e));

        // Global keyboard shortcuts
        this.addEventListenerSafe(document, 'keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.fileManager.saveCurrentFile();
            }
        });

        // Global Ctrl + Right Arrow listener for suggestions
        this.addEventListenerSafe(document, 'keydown', e => {
            if (e.key === 'ArrowRight' && e.ctrlKey) {
                console.log('GLOBAL: Ctrl + Right Arrow detected', {
                    suggestionVisible: this.predictionEngine ? this.predictionEngine.isSuggestionVisible() : false,
                    currentPrediction: this.predictionEngine ? !!this.predictionEngine.getCurrentPrediction() : false,
                    activeElement: document.activeElement,
                    isInEditor: this.textEditor.contains(document.activeElement),
                });

                if (this.predictionEngine && this.predictionEngine.isSuggestionVisible() && this.predictionEngine.getCurrentPrediction()) {
                    console.log('GLOBAL: Calling acceptPartialSuggestion');
                    e.preventDefault();
                    e.stopPropagation();
                    this.predictionEngine.acceptPartialSuggestion();
                }
            }
        });

        // Hide suggestion when clicking outside
        this.addEventListenerSafe(document, 'click', e => {
            if (!this.textEditor.contains(e.target)) {
                if (this.predictionEngine) {
                    this.predictionEngine.hideInlineSuggestion();
                }
            }

            if (!this.paragraphActions.contains(e.target) && !this.textEditor.contains(e.target)) {
                this.hideParagraphActions();
            }
        });

        // Cleanup on page unload to prevent memory leaks
        this.addEventListenerSafe(window, 'beforeunload', () => {
            this.cleanup();
        });

        // Auto-save on visibility change (page blur)
        this.addEventListenerSafe(document, 'visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.fileManager.hasCurrentFile()) {
                this.fileManager.saveCurrentFile();
            }
        });
    }

    // FileManager callback methods
    handleFileLoaded(filename) {
        if (filename === null) {
            // Cleanup signal from FileManager
            this.cleanupFileState();
            return;
        }

        this.currentFile = filename;
        this.textEditor.contentEditable = true;

        // Focus the editor and request prediction + spell check
        this.textEditor.focus();
        this.setTimeoutSafe(() => {
            if (this.predictionEngine) {
                this.predictionEngine.requestPrediction();
            }
            if (this.spellChecker) {
                this.spellChecker.requestSpellCheck();
            }
        }, 100);
    }

    handleFileCreated(filename) {
        this.currentFile = filename;
        this.textEditor.contentEditable = true;
        this.textEditor.focus();
    }

    handleFileSaved(filename) {
        // Could add save status indicators here in the future
        if (this.environment.isDevelopment()) {
            console.log(`File saved: ${filename}`);
        }
    }

    setupUrlHandling() {
        // Handle browser back/forward buttons
        this.addEventListenerSafe(window, 'popstate', _e => {
            const filename = this.getFilenameFromUrl();
            const isDashboard = this.isDashboardUrl();

            if (isDashboard) {
                this.showDashboard();
            } else if (filename && filename !== this.fileManager.getCurrentFile()) {
                this.fileManager.loadFile(filename, false); // Don't update URL again
            }
        });
    }

    getFilenameFromUrl() {
        const params = this.utils.parseUrlParams();
        return params.file || null;
    }

    isDashboardUrl() {
        const params = this.utils.parseUrlParams();
        return params.view === 'dashboard' || (!params.file && !params.view);
    }

    updateUrl(filename, updateHistory = true) {
        const url = new URL(window.location);
        if (filename) {
            url.searchParams.set('file', filename);
            url.searchParams.delete('view');
        } else {
            url.searchParams.delete('file');
            url.searchParams.set('view', 'dashboard');
        }

        if (updateHistory) {
            window.history.pushState({ file: filename }, '', url);
        } else {
            window.history.replaceState({ file: filename }, '', url);
        }
    }

    showDashboard() {
        // Clear file manager state
        this.fileManager.clearCurrentFile();

        // Update URL to dashboard
        this.updateUrl(null);

        // Clear editor content and disable editing
        this.textEditor.innerHTML =
            '<div class="dashboard-content"><h2>📝 Text Editor Dashboard</h2><p>Welcome to your text editor! Select a file from the sidebar to start editing, or create a new file.</p><div class="dashboard-stats"><p>This dashboard will be enhanced with file statistics, recent files, and more features soon!</p></div></div>';
        this.textEditor.contentEditable = false;
        this.saveFile.disabled = true;
        this.currentFileName.textContent = 'Dashboard';

        // Clear active file selection
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
        });

        // Hide suggestions and actions
        if (this.predictionEngine) {
            this.predictionEngine.hideInlineSuggestion();
        }
        this.hideParagraphActions();

        console.log('Switched to dashboard mode');
    }

    connectWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            this.updateConnectionStatus(CONFIG.CSS_CLASSES.CONNECTION_CONNECTING);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus(CONFIG.CSS_CLASSES.CONNECTION_CONNECTED);
            };

            this.ws.onmessage = event => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    this.errorHandler.handleError(
                        error,
                        'websocket',
                        'Failed to parse WebSocket message',
                        { data: event.data }
                    );
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus(CONFIG.CSS_CLASSES.CONNECTION_DISCONNECTED);

                // Attempt to reconnect after environment-aware delay
                const reconnectDelay =
                    this.settings.websocketReconnectDelay ||
                    CONFIG.TIMING.WEBSOCKET_RECONNECT_DELAY;
                setTimeout(() => this.connectWebSocket(), reconnectDelay);
            };

            this.ws.onerror = error => {
                this.errorHandler.handleError(error, 'websocket', 'WebSocket connection error');
                this.updateConnectionStatus(CONFIG.CSS_CLASSES.CONNECTION_DISCONNECTED);
            };
        } catch (error) {
            this.errorHandler.handleError(
                error,
                'websocket',
                'Failed to initialize WebSocket connection'
            );
        }
    }

    updateConnectionStatus(status) {
        this.connectionStatus.className = `connection-status ${status}`;

        switch (status) {
            case CONFIG.CSS_CLASSES.CONNECTION_CONNECTED:
                this.statusText.textContent = CONFIG.MESSAGES.SUCCESS.CONNECTION_RESTORED;
                break;
            case CONFIG.CSS_CLASSES.CONNECTION_CONNECTING:
                this.statusText.textContent = CONFIG.MESSAGES.INFO.CONNECTING;
                break;
            case CONFIG.CSS_CLASSES.CONNECTION_DISCONNECTED:
                this.statusText.textContent = CONFIG.MESSAGES.ERRORS.CONNECTION_LOST;
                break;
        }
    }

    handleWebSocketMessage(message) {
        try {
            switch (message.type) {
                case CONFIG.EVENTS.WEBSOCKET.EDIT_RESPONSE:
                    if (message.success) {
                        this.showSaveStatus('saved', CONFIG.MESSAGES.SUCCESS.FILE_SAVED);
                        // No longer handling predictions from save responses
                        // Predictions are handled separately through prediction_request/response
                    } else {
                        this.showSaveStatus('error', CONFIG.MESSAGES.ERRORS.SAVE_FAILED);
                    }
                    break;

                case CONFIG.EVENTS.WEBSOCKET.PREDICTION_RESPONSE:
                    if (this.predictionEngine) {
                        this.predictionEngine.handlePredictionResponse(
                            message.prediction,
                            message.cursor_position,
                            message.metadata
                        );
                    }
                    break;

                case CONFIG.EVENTS.WEBSOCKET.SPELL_CHECK_RESPONSE:
                    if (this.spellChecker) {
                        this.spellChecker.handleSpellCheckResponse(message.errors, message.language);
                    }
                    break;

                case CONFIG.EVENTS.WEBSOCKET.DICTIONARY_UPDATED:
                    if (message.success) {
                        console.log(`✅ Added '${message.word}' to dictionary`);

                        // Update settings modal if it's open
                        if (this.settingsModal && this.settingsModal.classList.contains('show')) {
                            this.addWordToList(message.word, new Date().toISOString());
                            this.dictionaryEmpty.style.display = 'none';
                        }

                        // Re-run spell check to update highlights
                        if (this.spellChecker) {
                            this.spellChecker.requestSpellCheck();
                        }
                    }
                    break;

                case CONFIG.EVENTS.WEBSOCKET.ERROR:
                    console.error('WebSocket error:', message.message);
                    this.showSaveStatus('error', message.message);
                    break;

                default:
                    console.warn('Unknown WebSocket message type:', message.type);
                    break;
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'websocket', 'Error handling WebSocket message', {
                messageType: message.type,
            });
        }
    }

    handleEditorClick(_e) {
        // Small delay to ensure cursor position is updated
        setTimeout(() => {
            console.log('Editor clicked, requesting prediction...');
            if (this.predictionEngine) {
                this.predictionEngine.requestPrediction();
            }
        }, CONFIG.TIMING.CURSOR_POSITION_UPDATE_DELAY);
    }

    handlePaste(e) {
        e.preventDefault(); // Prevent default paste behavior

        console.log('Paste event detected');

        try {
            // Get clipboard data
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text/plain');

            if (!pastedText) {
                console.log('No text data in clipboard');
                return;
            }

            console.log('Pasted text length:', pastedText.length);
            console.log(
                'Pasted text preview:',
                pastedText.substring(0, 100) + (pastedText.length > 100 ? '...' : '')
            );

            // Insert the text with proper paragraph structure
            this.insertTextWithParagraphs(pastedText);
        } catch (error) {
            console.error('Error handling paste:', error);
            // Fallback: allow default paste behavior
            e.target.focus();
        }
    }

    insertTextWithParagraphs(text) {
        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) {
                console.log('No selection range available');
                return;
            }

            const range = selection.getRangeAt(0);

            // Find the current paragraph
            let currentP =
                range.startContainer.nodeType === Node.TEXT_NODE
                    ? range.startContainer.parentElement.closest('p')
                    : range.startContainer.closest('p');

            if (!currentP || !this.textEditor.contains(currentP)) {
                console.log('Could not find current paragraph, creating new one');
                // Create a new paragraph if we can't find the current one
                currentP = document.createElement('p');
                currentP.appendChild(document.createElement('br'));
                this.textEditor.appendChild(currentP);

                // Set cursor in the new paragraph
                const newRange = document.createRange();
                newRange.setStart(currentP, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }

            // Clean and normalize the pasted text
            const cleanText = text
                .replace(/\r\n/g, '\n') // Normalize Windows line endings
                .replace(/\r/g, '\n') // Normalize old Mac line endings
                .trim();

            if (!cleanText) {
                console.log('No content to paste after cleaning');
                return;
            }

            // Split into paragraphs - handle both single and double line breaks
            let paragraphs = cleanText.split(/\n\s*\n/); // Double line breaks for paragraph separation

            // If no double line breaks found, try single line breaks
            if (paragraphs.length === 1) {
                const singleLineBreaks = cleanText.split(/\n/);
                if (singleLineBreaks.length > 1) {
                    // Decide whether to treat single line breaks as paragraph breaks
                    // If lines are substantial (>40 chars each), treat as separate paragraphs
                    const avgLineLength =
                        singleLineBreaks.reduce((sum, line) => sum + line.trim().length, 0) /
                        singleLineBreaks.length;
                    if (avgLineLength > 40) {
                        paragraphs = singleLineBreaks;
                    }
                }
            }

            // Filter out empty paragraphs and trim whitespace
            paragraphs = paragraphs.map(p => p.trim()).filter(p => p.length > 0);

            console.log(`Parsed ${paragraphs.length} paragraphs from pasted text`);

            if (paragraphs.length === 0) {
                console.log('No paragraphs to insert');
                return;
            }

            // Save cursor position before making changes
            const _savedCursorPosition = this.getCursorPosition();

            // Handle insertion based on cursor position and content
            if (paragraphs.length === 1) {
                // Single paragraph - insert inline at cursor position
                this.insertTextAtCursor(paragraphs[0]);
            } else {
                // Multiple paragraphs - insert as separate paragraph elements
                this.insertMultipleParagraphs(paragraphs, currentP, range);
            }

            // Trigger text change to update predictions and spell check
            this.handleTextChange();

            console.log('Paste operation completed successfully');
        } catch (error) {
            console.error('Error inserting pasted text:', error);
        }
    }

    insertTextAtCursor(text) {
        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);

            // Delete any selected content first
            range.deleteContents();

            // Create a text node with the content
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);

            // Move cursor to end of inserted text
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            // Trigger normalization to wrap words in spans
            setTimeout(
                () => this.normalizeEditorStructure(),
                CONFIG.TIMING.SUGGESTION_DISPLAY_DELAY
            );
        } catch (error) {
            console.error('Error inserting text at cursor:', error);
        }
    }

    insertMultipleParagraphs(paragraphs, currentP, range) {
        try {
            const _selection = window.getSelection();

            // Get text before and after cursor in current paragraph
            const paragraphText = this.extractTextFromParagraph(currentP);
            const cursorPosInParagraph = this.getCursorPositionInParagraph(currentP, range);

            const textBefore = paragraphText.substring(0, cursorPosInParagraph);
            const textAfter = paragraphText.substring(cursorPosInParagraph);

            console.log('Inserting multiple paragraphs:', {
                total: paragraphs.length,
                textBefore: textBefore.substring(0, 20) + '...',
                textAfter: textAfter.substring(0, 20) + '...',
                cursorPos: cursorPosInParagraph,
            });

            // Create document fragment to hold all new elements
            const fragment = document.createDocumentFragment();

            // First paragraph: combine text before cursor + first pasted paragraph
            const firstParagraphText = textBefore + paragraphs[0];
            if (firstParagraphText.trim()) {
                const firstP = document.createElement('p');
                this.populateParagraphWithWords(firstP, firstParagraphText);
                fragment.appendChild(firstP);
            }

            // Middle paragraphs: insert as-is
            for (let i = 1; i < paragraphs.length - 1; i++) {
                const middleP = document.createElement('p');
                this.populateParagraphWithWords(middleP, paragraphs[i]);
                fragment.appendChild(middleP);
            }

            // Last paragraph: last pasted paragraph + text after cursor
            let lastP = null;
            if (paragraphs.length > 1) {
                const lastParagraphText = paragraphs[paragraphs.length - 1] + textAfter;
                lastP = document.createElement('p');
                if (lastParagraphText.trim()) {
                    this.populateParagraphWithWords(lastP, lastParagraphText);
                } else {
                    lastP.appendChild(document.createElement('br'));
                }
                fragment.appendChild(lastP);
            } else if (textAfter.trim()) {
                // If only one paragraph pasted, create separate paragraph for text after
                lastP = document.createElement('p');
                this.populateParagraphWithWords(lastP, textAfter);
                fragment.appendChild(lastP);
            }

            // Replace current paragraph with the fragment
            currentP.parentNode.insertBefore(fragment, currentP);
            currentP.remove();

            // Position cursor at the end of last pasted content
            if (lastP) {
                // Calculate cursor position in last paragraph
                const lastPastedText = paragraphs[paragraphs.length - 1];
                const cursorPosInLastP = textBefore.length + lastPastedText.length;

                this.setCursorPositionInParagraph(lastP, cursorPosInLastP);
            }
        } catch (error) {
            console.error('Error inserting multiple paragraphs:', error);
        }
    }

    getCursorPositionInParagraph(paragraph, range) {
        try {
            // Create a range from start of paragraph to cursor position
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(paragraph);
            preCaretRange.setEnd(range.startContainer, range.startOffset);

            // Extract text content up to cursor
            const preCaretContent = this.getContentFromRange(preCaretRange);
            return preCaretContent.length;
        } catch (error) {
            console.error('Error getting cursor position in paragraph:', error);
            return 0;
        }
    }

    setCursorPositionInParagraph(paragraph, position) {
        try {
            const selection = window.getSelection();
            const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, null, false);

            let currentPosition = 0;
            let targetNode = null;
            let targetOffset = 0;

            let node;
            while ((node = walker.nextNode())) {
                const nodeLength = node.textContent.length;

                if (currentPosition + nodeLength >= position) {
                    targetNode = node;
                    targetOffset = position - currentPosition;
                    break;
                }

                currentPosition += nodeLength;
            }

            if (targetNode) {
                const range = document.createRange();
                range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent.length));
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // Fallback: position at end of paragraph
                const range = document.createRange();
                range.selectNodeContents(paragraph);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (error) {
            console.error('Error setting cursor position in paragraph:', error);
        }
    }

    handleKeyDown(e) {
        // Delegate prediction-related key events to PredictionEngine first
        if (this.predictionEngine && this.predictionEngine.handleKeyEvent(e)) {
            return; // Event was handled by PredictionEngine
        }

        // Handle paragraph structure preservation
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const currentP =
                    range.startContainer.nodeType === Node.TEXT_NODE
                        ? range.startContainer.parentElement.closest('p')
                        : range.startContainer.closest('p');

                if (currentP) {
                    // Prevent backspace at beginning of paragraph (would merge with previous)
                    if (e.key === 'Backspace') {
                        const isAtStart =
                            range.startOffset === 0 &&
                            (range.startContainer === currentP.firstChild ||
                                range.startContainer === currentP);
                        if (isAtStart) {
                            e.preventDefault();
                            return;
                        }
                    }

                    // Prevent delete at end of paragraph (would merge with next)
                    if (e.key === 'Delete') {
                        // Check if we're at the end of the paragraph
                        let isAtEnd = false;

                        if (range.startContainer.nodeType === Node.TEXT_NODE) {
                            // We're in a text node
                            const textNode = range.startContainer;
                            const isLastTextNode =
                                textNode === currentP.lastChild ||
                                textNode.parentNode === currentP.lastChild;
                            const isAtEndOfText = range.startOffset === textNode.textContent.length;
                            isAtEnd = isLastTextNode && isAtEndOfText;
                        } else {
                            // We're at element level
                            const isAtElementEnd =
                                range.startOffset === range.startContainer.childNodes.length;
                            isAtEnd = isAtElementEnd && range.startContainer === currentP;
                        }

                        if (isAtEnd && currentP.nextElementSibling) {
                            e.preventDefault();
                            return;
                        }
                    }
                }
            }
        }

        // Handle Enter key to maintain paragraph structure
        if (e.key === 'Enter') {
            e.preventDefault();

            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const currentP =
                    range.startContainer.nodeType === Node.TEXT_NODE
                        ? range.startContainer.parentElement.closest('p')
                        : range.startContainer.closest('p');

                if (currentP) {
                    // Create new paragraph
                    const newP = document.createElement('p');

                    // Insert after current paragraph
                    currentP.parentNode.insertBefore(newP, currentP.nextSibling);

                    // Move cursor to new paragraph - ensure proper cursor positioning
                    // We need to set this up so the user can immediately start typing
                    const newRange = document.createRange();

                    // Add an empty text node to ensure proper cursor positioning
                    const textNode = document.createTextNode('');
                    newP.appendChild(textNode);

                    // Position cursor at the start of the text node
                    newRange.setStart(textNode, 0);
                    newRange.collapse(true);

                    selection.removeAllRanges();
                    selection.addRange(newRange);

                    // Focus the editor to ensure proper cursor visibility
                    this.textEditor.focus();

                    // Don't trigger text change immediately - let the user start typing first
                    // This prevents interference with the first keystroke
                    console.log('New paragraph created, ready for user input');
                }
            }
            return;
        }
    }

    getCursorPixelPosition(_cursorPosition) {
        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return null;

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = this.textEditor.getBoundingClientRect();

            return {
                x: Math.min(rect.left - editorRect.left + 10, this.textEditor.clientWidth - 250),
                y: Math.min(rect.top - editorRect.top + 25, this.textEditor.clientHeight - 50),
            };
        } catch (error) {
            console.error('Error calculating cursor position:', error);
            return null;
        }
    }

    setEditorContent(content) {
        // Convert plain text to structured word-based DOM
        const paragraphs = content.split('\n\n').filter(p => p.trim());

        // Clear existing content
        this.textEditor.innerHTML = '';

        if (paragraphs.length === 0) {
            const emptyP = document.createElement('p');
            emptyP.appendChild(document.createElement('br'));
            this.textEditor.appendChild(emptyP);
        } else {
            paragraphs.forEach(paragraphText => {
                const p = document.createElement('p');
                this.populateParagraphWithWords(p, paragraphText);
                this.textEditor.appendChild(p);
            });
        }
    }

    populateParagraphWithWords(paragraph, text) {
        // Split text into words and spaces, preserving all whitespace
        const tokens = text.split(/(\s+)/);

        tokens.forEach(token => {
            if (token.trim() === '') {
                // Whitespace token - add as text node
                if (token) {
                    paragraph.appendChild(document.createTextNode(token));
                }
            } else {
                // Word token - wrap in span for spell checking using utilities
                const wordSpan = this.utils.createElement(
                    'span',
                    {
                        'className': CONFIG.CSS_CLASSES.WORD_TOKEN,
                        'data-word': token.toLowerCase(),
                    },
                    token
                );
                paragraph.appendChild(wordSpan);
            }
        });

        // Ensure paragraph has content (add br if empty)
        if (paragraph.childNodes.length === 0) {
            paragraph.appendChild(document.createElement('br'));
        }
    }

    getEditorContent() {
        // Extract content from word-based DOM structure, excluding inline suggestions and error badges
        const paragraphs = Array.from(this.textEditor.querySelectorAll('p'));
        return paragraphs
            .map(p => {
                // Clone paragraph to avoid modifying original
                const clone = p.cloneNode(true);
                // Remove any inline suggestions from the clone
                const suggestions = clone.querySelectorAll(
                    '.inline-suggestion-text, #current-inline-suggestion'
                );
                suggestions.forEach(suggestion => suggestion.remove());
                // Remove any error count badges from the clone
                const badges = clone.querySelectorAll('.error-count-badge');
                badges.forEach(badge => badge.remove());
                // Extract text content from word-based structure
                return this.extractTextFromParagraph(clone);
            })
            .join('\n\n')
            .trim();
    }

    extractTextFromParagraph(paragraph) {
        // Walk through all child nodes and extract text
        let text = '';
        const walker = document.createTreeWalker(
            paragraph,
            NodeFilter.SHOW_ALL,
            {
                acceptNode: function (node) {
                    // Skip inline suggestions
                    if (
                        node.nodeType === Node.ELEMENT_NODE &&
                        (node.classList?.contains('inline-suggestion-text') ||
                            node.id === 'current-inline-suggestion')
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Skip error count badges
                    if (
                        node.nodeType === Node.ELEMENT_NODE &&
                        node.classList?.contains('error-count-badge')
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                },
            },
            false
        );

        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeName === 'BR') {
                // Convert <br> back to space for line breaks within paragraphs
                text += ' ';
            }
        }

        return text.trim();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleParagraphHover(e) {
        if (e.target.tagName === 'P') {
            this.showParagraphActions(e.target);
        }
    }

    handleParagraphLeave(e) {
        // Don't hide immediately - let click events process
        if (!this.actionsVisible) return;

        setTimeout(() => {
            if (!this.paragraphActions.matches(':hover') && !e.target.matches(':hover')) {
                this.hideParagraphActions();
            }
        }, CONFIG.TIMING.PARAGRAPH_HOVER_DELAY);
    }

    showParagraphActions(paragraph) {
        if (this.actionsVisible && this.currentParagraph === paragraph) return;

        this.currentParagraph = paragraph;

        // Remove active class from all paragraphs
        this.textEditor.querySelectorAll('p').forEach(p => p.classList.remove('active-paragraph'));

        // Add active class to current paragraph
        paragraph.classList.add('active-paragraph');

        // Position the actions above the paragraph
        const rect = paragraph.getBoundingClientRect();
        const editorRect = this.textEditor.getBoundingClientRect();

        this.paragraphActions.style.left = `${rect.left - editorRect.left + 10}px`;
        this.paragraphActions.style.top = `${rect.top - editorRect.top - 45}px`;
        this.paragraphActions.style.display = 'block';
        this.actionsVisible = true;
    }

    hideParagraphActions() {
        this.paragraphActions.style.display = 'none';
        this.actionsVisible = false;

        if (this.currentParagraph) {
            this.currentParagraph.classList.remove('active-paragraph');
            this.currentParagraph = null;
        }
    }

    handleParagraphAction(e) {
        const btn = e.target.closest('.action-btn');
        if (!btn || !this.currentParagraph) return;

        const action = btn.className.match(/(delete|rewrite|expand|summarize|improve)-btn/)?.[1];

        if (action) {
            console.log(`Action: ${action} on paragraph:`, this.currentParagraph.innerText);
            // Placeholder for actual implementation
            alert(
                `${action.charAt(0).toUpperCase() + action.slice(1)} action clicked!\n\nParagraph: "${this.currentParagraph.innerText.substring(0, 50)}..."\n\nThis will be implemented in the next step.`
            );
        }

        this.hideParagraphActions();
    }

    handleTextChange() {
        try {
            if (!this.fileManager.hasCurrentFile()) return;

            // Mark that user is actively typing
            this.isTyping = true;

            this.showSaveStatus('saving', CONFIG.MESSAGES.INFO.SAVING);

            // Only normalize structure when user stops typing to avoid cursor jumping
            // Debounce normalization to avoid doing it too frequently
            this.clearTimeoutSafe(this.normalizeTimeout);
            this.normalizeTimeout = this.setTimeoutSafe(() => {
                if (!this.isTyping) {
                    this.normalizeEditorStructure();
                }
            }, CONFIG.TIMING.NORMALIZATION_DELAY);

            // Request prediction while typing
            if (this.predictionEngine) {
                this.predictionEngine.setTypingState(true);
                this.predictionEngine.requestPrediction();
            }

            // Delay spell check until user stops typing to avoid cursor jumping
            if (this.spellChecker) {
                this.spellChecker.requestSpellCheck();
            }

            // Clear typing flag after a delay
            this.clearTimeoutSafe(this.typingTimeout);
            this.typingTimeout = this.setTimeoutSafe(() => {
                this.isTyping = false;
                // Notify PredictionEngine about typing state change
                if (this.predictionEngine) {
                    this.predictionEngine.setTypingState(false);
                }
            // Run normalization after typing stops
                this.setTimeoutSafe(
                    () => this.normalizeEditorStructure(),
                    CONFIG.TIMING.NORMALIZATION_AFTER_TYPING
                );
            }, CONFIG.TIMING.TYPING_TIMEOUT);

            // Debounce auto-save with environment-aware delay
            this.clearTimeoutSafe(this.saveTimeout);
            const saveDelay = this.settings.debounceDelay || CONFIG.TIMING.SAVE_DEBOUNCE;
            this.saveTimeout = this.setTimeoutSafe(() => {
                this.fileManager.saveCurrentFile();
            }, saveDelay);
        } catch (error) {
            this.errorHandler.handleError(
                error,
                'text-editing',
                'Error during text change handling'
            );
        }
    }

    normalizeEditorStructure() {
        try {
            // Only normalize if user is not actively typing to avoid cursor jumping
            if (this.isTyping) {
                console.log('Skipping normalization while user is typing');
                return;
            }

            // CRITICAL: Skip normalization if there's an active inline suggestion
            if (this.predictionEngine && this.predictionEngine.isSuggestionVisible() && document.getElementById('current-inline-suggestion')) {
                console.log('Skipping normalization - inline suggestion is active');
                return;
            }

            // After user input, we need to restructure any plain text nodes back into word spans
            const paragraphs = Array.from(this.textEditor.querySelectorAll('p'));

            paragraphs.forEach(paragraph => {
                // Check if this paragraph contains an inline suggestion - skip it
                if (paragraph.querySelector('#current-inline-suggestion')) {
                    console.log('Skipping paragraph normalization - contains inline suggestion');
                    return;
                }

                // Check if this paragraph needs restructuring - be more conservative
                let needsRestructure = false;

                // Skip normalization for very new/empty paragraphs that might just have been created
                const hasOnlyBrOrEmpty = paragraph.childNodes.length === 0 ||
                    (paragraph.childNodes.length === 1 && paragraph.firstChild.nodeName === 'BR') ||
                    (paragraph.childNodes.length === 1 && paragraph.firstChild.nodeType === Node.TEXT_NODE && paragraph.firstChild.textContent === '');

                if (hasOnlyBrOrEmpty) {
                    console.log('Skipping normalization for empty/new paragraph');
                    return;
                }                // Look for text nodes that aren't just whitespace AND are not inside word-token spans
                const walker = document.createTreeWalker(
                    paragraph,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let textNode;
                const textNodesToProcess = [];
                while ((textNode = walker.nextNode())) {
                    // Skip text nodes that are just whitespace between word spans
                    // Skip text nodes that are already inside word-token spans
                    const isWhitespaceOnly = !textNode.textContent.trim();
                    const isInsideWordToken =
                        textNode.parentNode.classList &&
                        textNode.parentNode.classList.contains('word-token');
                    const isInsideSuggestion =
                        textNode.parentNode.classList &&
                        textNode.parentNode.classList.contains('inline-suggestion-text');

                    if (!isWhitespaceOnly && !isInsideWordToken && !isInsideSuggestion) {
                        // Only restructure if there's significant unstructured text
                        if (textNode.textContent.length > 1) {
                            textNodesToProcess.push(textNode);
                            needsRestructure = true;
                        }
                    }
                }

                if (needsRestructure && textNodesToProcess.length > 0) {
                    // Save cursor position relative to this paragraph
                    const savedPosition = this.getCursorPosition();

                    console.log('Normalizing paragraph structure');

                    // Save any existing error count badge before restructuring
                    const existingBadge = paragraph.querySelector('.error-count-badge');
                    let savedBadge = null;
                    if (existingBadge) {
                        savedBadge = existingBadge.cloneNode(true);
                        console.log('Preserving error count badge during normalization');
                    }

                    // Extract all content and restructure
                    const paragraphText = this.extractTextFromParagraph(paragraph);

                    // Clear and repopulate with word structure
                    paragraph.innerHTML = '';
                    this.populateParagraphWithWords(paragraph, paragraphText);

                    // Restore the error count badge if it existed
                    if (savedBadge) {
                        paragraph.appendChild(savedBadge);
                        console.log('Restored error count badge after normalization');
                    }

                    // Restore cursor position
                    setTimeout(() => this.setCursorPosition(savedPosition), 0);

                    // Reapply spell checking highlights after normalization
                    // Use a timeout to ensure DOM is stable after restructuring
                    setTimeout(() => {
                        if (this.spellChecker && this.spellChecker.hasSpellErrors()) {
                            console.log('Reapplying spell check highlights after normalization');
                            this.spellChecker.highlightSpellingErrors();
                        }
                    }, 50);
                }
            });
        } catch (error) {
            this.errorHandler.handleError(
                error,
                'dom-manipulation',
                'Error during editor structure normalization'
            );
        }
    }

    getParagraphContext(content, cursorPosition) {
        // Split content into paragraphs
        const paragraphs = content.split('\n\n');

        // Find which paragraph contains the cursor
        let currentPos = 0;
        let currentParagraphIndex = 0;

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraphEnd = currentPos + paragraphs[i].length;

            // Check if cursor is in this paragraph (including the \n\n separator)
            if (cursorPosition <= paragraphEnd + 2) {
            // +2 for \n\n
                currentParagraphIndex = i;
                break;
            }

            currentPos = paragraphEnd + 2; // +2 for \n\n separator
        }

        // Get context paragraphs
        const prevContext = currentParagraphIndex > 0 ? paragraphs[currentParagraphIndex - 1] : '';
        const currentText = paragraphs[currentParagraphIndex] || '';
        const afterContext =
            currentParagraphIndex < paragraphs.length - 1
                ? paragraphs[currentParagraphIndex + 1]
                : '';

        // Calculate cursor position relative to current paragraph
        const currentParagraphStart = paragraphs
            .slice(0, currentParagraphIndex)
            .reduce((sum, p) => sum + p.length + 2, 0);

        const relativeCursor = Math.max(
            0,
            Math.min(cursorPosition - currentParagraphStart, currentText.length)
        );

        console.log('DEBUG Frontend Context:', {
            totalParagraphs: paragraphs.length,
            currentIdx: currentParagraphIndex,
            prevContext: prevContext.substring(0, 50) + (prevContext.length > 50 ? '...' : ''),
            currentText: currentText.substring(0, 50) + (currentText.length > 50 ? '...' : ''),
            afterContext: afterContext.substring(0, 50) + (afterContext.length > 50 ? '...' : ''),
            relativeCursor: relativeCursor,
            currentTextLength: currentText.length,
        });

        return {
            prevContext,
            currentText,
            afterContext,
            cursor: relativeCursor,
            paragraphIndex: currentParagraphIndex,
            totalParagraphs: paragraphs.length,
        };
    }

    isAtWordBoundary() {
        try {
            const fullContent = this.getEditorContent();
            const cursorPosition = this.getCursorPosition();

            // Get character before and after cursor
            const charBefore = cursorPosition > 0 ? fullContent[cursorPosition - 1] : '';
            const charAfter =
                cursorPosition < fullContent.length ? fullContent[cursorPosition] : '';

            // Check if we're at the start of content
            if (cursorPosition === 0) {
                return true; // Start of content is a word boundary
            }

            // Check if we're at the end of content
            if (cursorPosition >= fullContent.length) {
                return true; // End of content is a word boundary
            }

            // Define word characters (letters, numbers, apostrophes for contractions)
            const isWordChar = char => CONFIG.TEXT.WORD_BOUNDARY_CHARS.test(char);
            const isWhitespace = char => CONFIG.TEXT.WHITESPACE_CHARS.test(char);

            // We're at a word boundary if:
            // 1. Character before is whitespace or punctuation, OR
            // 2. Character after is whitespace or punctuation, OR
            // 3. We're between a word character and non-word character

            const beforeIsWord = isWordChar(charBefore);
            const afterIsWord = isWordChar(charAfter);

            // At word boundary if:
            // - Previous char is not a word char (space, punctuation, etc.)
            // - Next char is not a word char (space, punctuation, etc.)
            // - We're at the transition between word and non-word characters

            if (isWhitespace(charBefore) || (!beforeIsWord && charBefore !== '')) {
                return true; // After whitespace or punctuation
            }

            if (isWhitespace(charAfter) || (!afterIsWord && charAfter !== '')) {
                return true; // Before whitespace or punctuation
            }

            // If we're in the middle of word characters, not at boundary
            if (beforeIsWord && afterIsWord) {
                return false; // In middle of word
            }

            return true; // Default to word boundary for edge cases
        } catch (error) {
            console.error('Error checking word boundary:', error);
            return true; // Default to allowing predictions on error
        }
    }

    getCursorPosition() {
        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return 0;

            const range = selection.getRangeAt(0);

            // Create a range that spans from the beginning of the editor to the cursor
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(this.textEditor);
            preCaretRange.setEnd(range.endContainer, range.endOffset);

            // Get the text content and convert it to match our plain text format
            const textContent = this.getContentFromRange(preCaretRange);

            console.log('DEBUG getCursorPosition:', {
                position: textContent.length,
                textLength: this.getEditorContent().length,
                textSample: textContent.slice(-20),
                fullContent: this.getEditorContent().slice(0, 100) + '...',
            });

            return textContent.length;
        } catch (error) {
            console.error('Error getting cursor position:', error);
            return 0;
        }
    }

    getContentFromRange(range) {
        // Get the content and convert it similar to getEditorContent
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        // Remove any inline suggestions from the cloned content
        const suggestions = container.querySelectorAll(
            '.inline-suggestion-text, #current-inline-suggestion'
        );
        suggestions.forEach(suggestion => suggestion.remove());

        // Remove any error count badges from the cloned content
        const badges = container.querySelectorAll('.error-count-badge');
        badges.forEach(badge => badge.remove());

        const paragraphs = Array.from(container.querySelectorAll('p'));
        if (paragraphs.length === 0) {
            // Handle case where selection doesn't include full paragraphs
            return this.extractTextFromParagraph(container);
        }

        return paragraphs.map(p => this.extractTextFromParagraph(p)).join('\n\n');
    }

    setCursorPosition(position) {
        try {
            const selection = window.getSelection();
            const range = document.createRange();

            let currentPos = 0;
            const walker = document.createTreeWalker(
                this.textEditor,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while ((node = walker.nextNode())) {
                const nodeLength = node.textContent.length;
                if (currentPos + nodeLength >= position) {
                    range.setStart(node, position - currentPos);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return;
                }
                currentPos += nodeLength;
            }

            // If position is beyond content, place at end
            range.selectNodeContents(this.textEditor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (error) {
            console.error('Error setting cursor position:', error);
        }
    }

    showSaveStatus(type, message) {
        this.saveStatus.className = `ms-2 text-muted ${type}`;
        this.saveStatus.textContent = message;

        if (type === 'saved') {
            setTimeout(() => {
                this.saveStatus.textContent = '';
                this.saveStatus.className = 'ms-2 text-muted';
            }, 2000);
        }
    }

    // === SETTINGS AND DICTIONARY MANAGEMENT ===

    showSettingsModal() {
        // Load dictionary words and settings when opening modal
        this.loadDictionaryWords();
        this.loadSettings();

        // Show the modal using Bootstrap
        const modal = new bootstrap.Modal(this.settingsModal);
        modal.show();
    }

    async loadDictionaryWords() {
        this.dictionaryLoading.style.display = 'block';
        this.dictionaryEmpty.style.display = 'none';
        this.dictionaryList.innerHTML = '';

        try {
            const response = await fetch('/api/dictionary');
            const data = await response.json();

            this.dictionaryLoading.style.display = 'none';

            if (data.words && data.words.length > 0) {
                this.dictionaryList.innerHTML = '';
                data.words.forEach(wordData => {
                    this.addWordToList(wordData.word, wordData.created_at);
                });
            } else {
                this.dictionaryEmpty.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load dictionary:', error);
            this.dictionaryLoading.style.display = 'none';
            this.dictionaryList.innerHTML =
                '<div class="text-danger p-3">Failed to load dictionary words.</div>';
        }
    }

    addWordToList(word, createdAt) {
        const wordElement = document.createElement('div');
        wordElement.className = 'dictionary-word';
        wordElement.innerHTML = `
            <div class="dictionary-word-info">
                <div class="dictionary-word-text">${word}</div>
                <div class="dictionary-word-date">Added: ${new Date(createdAt).toLocaleDateString()}</div>
            </div>
            <div class="dictionary-word-actions">
                <button class="btn-remove-word" data-word="${word}" title="Remove word">
                    ×
                </button>
            </div>
        `;

        // Add click handler for remove button
        const removeBtn = wordElement.querySelector('.btn-remove-word');
        removeBtn.addEventListener('click', () => this.removeWordFromDictionary(word));

        this.dictionaryList.appendChild(wordElement);
    }

    addWordToDictionaryFromInput() {
        const word = this.addWordInput.value.trim();

        // Validate the word using the validation system
        const validation = this.validator.validate(word, 'word');

        if (!validation.isValid) {
            const errorMessage = this.validator.formatErrors(validation);
            this.errorHandler.showNotification(errorMessage, 'warning');
            return;
        }

        // Sanitize the word
        const sanitizedWord = this.validator.sanitize.word(word);
        if (sanitizedWord !== word && this.environment.isDevelopment()) {
            console.log('Word was sanitized:', { original: word, sanitized: sanitizedWord });
        }

        this.addWordToDictionary(sanitizedWord);
        this.addWordInput.value = '';
    }

    async removeWordFromDictionary(word) {
        if (!confirm(`Remove "${word}" from dictionary?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/dictionary/${encodeURIComponent(word)}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                console.log(`✅ Removed '${word}' from dictionary`);

                // Remove from UI
                const wordElement = this.dictionaryList
                    .querySelector(`[data-word="${word}"]`)
                    .closest('.dictionary-word');
                if (wordElement) {
                    wordElement.remove();
                }

                // Check if list is now empty
                if (this.dictionaryList.children.length === 0) {
                    this.dictionaryEmpty.style.display = 'block';
                }

                // Re-run spell check to update highlights
                if (this.spellChecker) {
                    this.spellChecker.requestSpellCheck();
                }
            } else {
                alert('Failed to remove word from dictionary');
            }
        } catch (error) {
            console.error('Failed to remove word:', error);
            alert('Failed to remove word from dictionary');
        }
    }

    // === SETTINGS MANAGEMENT ===

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();

            if (data.settings) {
                const settings = data.settings;

                // Update UI elements with current settings
                if (this.spellCheckerEngine && settings.spell_checker_engine) {
                    this.spellCheckerEngine.value = settings.spell_checker_engine;
                }

                if (this.spellCheckerLanguage && settings.spell_checker_language) {
                    this.spellCheckerLanguage.value = settings.spell_checker_language;
                }

                if (
                    this.spellCheckEnabledInput &&
                    typeof settings.spell_check_enabled === 'boolean'
                ) {
                    this.spellCheckEnabledInput.checked = settings.spell_check_enabled;
                    this.spellCheckingEnabled = settings.spell_check_enabled;
                }

                console.log('✅ Settings loaded:', settings);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {};

            // Collect settings from UI
            if (this.spellCheckerEngine) {
                settings.spell_checker_engine = this.spellCheckerEngine.value;
            }

            if (this.spellCheckerLanguage) {
                settings.spell_checker_language = this.spellCheckerLanguage.value;
            }

            if (this.spellCheckEnabledInput) {
                settings.spell_check_enabled = this.spellCheckEnabledInput.checked;
                this.spellCheckingEnabled = this.spellCheckEnabledInput.checked;
            }

            // Validate settings before sending
            const validationRules = {};
            if (settings.spell_checker_engine !== undefined) {
                validationRules.spell_checker_engine = 'spellCheckEngine';
            }
            if (settings.spell_checker_language !== undefined) {
                validationRules.spell_checker_language = 'spellCheckLanguage';
            }
            if (settings.spell_check_enabled !== undefined) {
                validationRules.spell_check_enabled = 'boolean';
            }

            const validation = this.validator.validateObject(settings, validationRules);
            if (!validation.isValid) {
                const errorMessage = this.validator.formatErrors(validation);
                this.errorHandler.showNotification(errorMessage, 'error');
                return;
            }

            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings }),
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Settings saved successfully');

                // Show success message
                const saveBtn = this.saveSettingsBtn;
                const originalText = saveBtn.textContent;
                saveBtn.textContent = '✅ Saved!';
                saveBtn.disabled = true;

                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.disabled = false;
                }, 2000);

                // Re-run spell check to apply new settings
                if (this.spellChecker) {
                    this.spellChecker.requestSpellCheck();
                }
            } else {
                this.errorHandler.showNotification('Failed to save settings', 'error');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'settings', 'Failed to save settings');
        }
    }

    addWordToDictionary(word) {
        console.log('TextEditor.addWordToDictionary called with word:', word);
        console.log('WebSocket connected:', this.isConnected);

        if (!this.isConnected) {
            console.error('Cannot add word to dictionary - WebSocket not connected');
            return;
        }

        const message = {
            type: 'add_word',
            word: word,
        };

        console.log('Sending add_word message:', message);

        // Validate the message before sending
        const validation = this.validator.validateWebSocketMessage(message);
        if (!validation.isValid) {
            const errorMessage = this.validator.formatErrors(validation);
            this.errorHandler.handleError(
                new Error(errorMessage),
                'validation',
                'Invalid add word request format'
            );
            return;
        }

        this.ws.send(JSON.stringify(message));
        console.log('Add word message sent successfully');
    }
}

// Export TextEditor to global scope for fallback scenarios
window.TextEditor = TextEditor;

// Initialize the editor when the page loads (only if not using new architecture)
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if no other architecture is being used and no initialization is in progress
    if (!window.app && !window.architectureInitializing) {
        setTimeout(() => {
            // Double check after a small delay to avoid race conditions
            if (!window.app && !window.architectureInitializing) {
                console.log('Legacy TextEditor auto-initializing...');
                window.app = new TextEditor();
            }
        }, 100);
    }
});
