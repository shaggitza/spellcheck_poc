/**
 * FileManager - Handles all file operations including loading, saving, and creating files
 * Part of the modular refactoring of the TextEditor application
 */

class FileManager {
    constructor(dependencies) {
        // Dependencies from the main TextEditor
        this.utils = dependencies.utils;
        this.validator = dependencies.validator;
        this.errorHandler = dependencies.errorHandler;
        this.environment = dependencies.environment;
        this.config = dependencies.config;
        
        // DOM elements
        this.fileList = dependencies.fileList;
        this.saveButton = dependencies.saveButton;
        this.currentFileName = dependencies.currentFileName;
        this.newFileName = dependencies.newFileName;
        this.createFileButton = dependencies.createFileButton;
        
        // Callbacks for TextEditor integration
        this.onFileLoaded = dependencies.onFileLoaded;
        this.onFileCreated = dependencies.onFileCreated;
        this.onFileSaved = dependencies.onFileSaved;
        
        // WebSocket and connection state
        this.getWebSocket = dependencies.getWebSocket;
        this.getConnectionState = dependencies.getConnectionState;
        this.getAbortController = dependencies.getAbortController;
        
        // Editor content management
        this.getEditorContent = dependencies.getEditorContent;
        this.setEditorContent = dependencies.setEditorContent;
        this.getCursorPosition = dependencies.getCursorPosition;
        
        // State
        this.currentFile = null;
        
        // Initialize event listeners
        this.initializeEventListeners();
    }

    /**
     * Initialize event listeners for file management UI
     */
    initializeEventListeners() {
        // Save file button
        this.saveButton.addEventListener('click', () => this.saveCurrentFile());
        
        // Create new file button
        this.createFileButton.addEventListener('click', () => this.createNewFile());
        
        // Enter key on new file name input
        this.newFileName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createNewFile();
            }
        });
    }

    /**
     * Load and display the list of available files
     */
    async loadFileList() {
        try {
            const response = await fetch('/api/files');
            const data = await response.json();

            this.fileList.innerHTML = '';

            if (data.files.length === 0) {
                const li = this.utils.createElement(
                    'li',
                    {
                        className: 'list-group-item',
                        style: { fontStyle: 'italic' },
                    },
                    'No files found'
                );
                this.fileList.appendChild(li);
            } else {
                data.files.forEach(file => {
                    const li = this.utils.createElement(
                        'li',
                        {
                            className: 'list-group-item',
                            onClick: () => this.loadFile(file.name),
                        },
                        file.name
                    );
                    this.fileList.appendChild(li);
                });

                // Handle file selection based on URL parameters or last opened file
                await this.handleInitialFileSelection(data.files);
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'file-loading', 'Failed to load file list');
        }
    }

    /**
     * Handle initial file selection based on URL parameters or last opened file
     */
    async handleInitialFileSelection(files) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlFilename = urlParams.get('file');
        
        if (urlFilename && files.some(f => f.name === urlFilename)) {
            // Priority 1: URL parameter with specific file
            await this.loadFile(urlFilename, false); // Don't update URL again
        } else if (!this.environment.isDashboardMode()) {
            // Priority 2: Last opened file (if not in dashboard mode)
            const lastFile = this.utils.getStorageItem('lastOpenedFile');
            if (lastFile && files.some(f => f.name === lastFile)) {
                await this.loadFile(lastFile, true);
            }
        }
        // Priority 3: Dashboard mode - don't auto-open files
    }

    /**
     * Load a specific file by filename
     * @param {string} filename - The name of the file to load
     * @param {boolean} updateUrl - Whether to update the browser URL
     */
    async loadFile(filename, updateUrl = true) {
        try {
            // Clean up previous file state to prevent memory leaks
            if (this.currentFile !== filename && this.onFileLoaded) {
                this.onFileLoaded(null); // Signal cleanup
            }

            const abortController = this.getAbortController();
            const response = await fetch(`/api/files/${filename}`, {
                signal: abortController.signal
            });
            const data = await response.json();

            if (data.error) {
                this.errorHandler.handleError(
                    new Error(data.error),
                    'file-loading',
                    `Failed to load file: ${filename}`,
                    { filename }
                );
                return;
            }

            this.currentFile = filename;

            // Save to localStorage for persistence
            this.utils.setStorageItem('lastOpenedFile', filename);

            // Update URL if requested
            if (updateUrl) {
                this.updateUrl(filename);
            }

            // Set editor content and update UI
            this.setEditorContent(data.content);
            this.updateUIAfterFileLoad(filename);

            // Notify TextEditor that file was loaded
            if (this.onFileLoaded) {
                this.onFileLoaded(filename);
            }

        } catch (error) {
            this.errorHandler.handleError(
                error,
                'file-loading',
                `Failed to load file: ${filename}`,
                { filename }
            );
        }
    }

    /**
     * Update UI elements after a file is loaded
     */
    updateUIAfterFileLoad(filename) {
        this.saveButton.disabled = false;
        this.currentFileName.textContent = filename;

        // Update active file in list
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
            if (item.textContent === filename) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Create a new file with the name specified in the input field
     */
    async createNewFile() {
        try {
            const filename = this.newFileName.value.trim();

            // Validate filename using the validation system
            const validation = this.validator.validate(filename, 'filename');

            if (!validation.isValid) {
                const errorMessage = this.validator.formatErrors(validation);
                this.errorHandler.showNotification(errorMessage, 'warning');
                return;
            }

            // Additional check for .txt extension
            if (!filename.endsWith(this.config.FILES.EXTENSION)) {
                this.errorHandler.showNotification(
                    `Filename must end with ${this.config.FILES.EXTENSION}`,
                    'warning'
                );
                return;
            }

            // Sanitize filename
            const sanitizedFilename = this.validator.sanitize.filename(filename);
            if (sanitizedFilename !== filename) {
                if (this.environment.isDevelopment()) {
                    console.log('Filename was sanitized:', {
                        original: filename,
                        sanitized: sanitizedFilename,
                    });
                }
            }

            // Create empty file
            this.currentFile = sanitizedFilename;

            // Save to localStorage for persistence
            this.utils.setStorageItem('lastOpenedFile', sanitizedFilename);

            // Update URL
            this.updateUrl(sanitizedFilename);

            // Set empty content and update UI
            this.setEditorContent('');
            this.updateUIAfterFileLoad(sanitizedFilename);
            this.newFileName.value = '';

            // Save the new empty file
            await this.saveCurrentFile();
            
            // Reload file list to show the new file
            await this.loadFileList();

            // Notify TextEditor that file was created
            if (this.onFileCreated) {
                this.onFileCreated(sanitizedFilename);
            }

        } catch (error) {
            this.errorHandler.handleError(error, 'file-creation', 'Failed to create new file');
        }
    }

    /**
     * Save the currently loaded file
     */
    async saveCurrentFile() {
        try {
            if (!this.currentFile || !this.getConnectionState()) {
                return;
            }

            const content = this.getEditorContent();
            const cursorPosition = this.getCursorPosition();

            const message = {
                type: 'edit',
                filename: this.currentFile,
                content: content,
                cursor_position: cursorPosition,
            };

            // Validate the message before sending
            const validation = this.validator.validateWebSocketMessage(message);
            if (!validation.isValid) {
                const errorMessage = this.validator.formatErrors(validation);
                this.errorHandler.handleError(
                    new Error(errorMessage),
                    'validation',
                    'Invalid message format'
                );
                return;
            }

            const ws = this.getWebSocket();
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
                
                // Notify TextEditor that file was saved
                if (this.onFileSaved) {
                    this.onFileSaved(this.currentFile);
                }
            } else {
                throw new Error('WebSocket connection not available');
            }

        } catch (error) {
            this.errorHandler.handleError(error, 'file-saving', 'Failed to save current file', {
                filename: this.currentFile,
            });
        }
    }

    /**
     * Update the browser URL with the current file parameter
     */
    updateUrl(filename) {
        if (!filename) return;
        
        const url = new URL(window.location);
        url.searchParams.set('file', filename);
        window.history.pushState(null, '', url.toString());
    }

    /**
     * Get the currently loaded file name
     */
    getCurrentFile() {
        return this.currentFile;
    }

    /**
     * Set the current file (used for external updates)
     */
    setCurrentFile(filename) {
        this.currentFile = filename;
        if (filename) {
            this.currentFileName.textContent = filename;
            this.saveButton.disabled = false;
        } else {
            this.currentFileName.textContent = '';
            this.saveButton.disabled = true;
        }
    }

    /**
     * Clear the current file state
     */
    clearCurrentFile() {
        this.currentFile = null;
        this.currentFileName.textContent = '';
        this.saveButton.disabled = true;
        
        // Clear active state from file list
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    /**
     * Check if a file is currently loaded
     */
    hasCurrentFile() {
        return this.currentFile !== null;
    }

    /**
     * Cleanup method for memory management
     */
    cleanup() {
        // Remove event listeners
        this.saveButton.removeEventListener('click', () => this.saveCurrentFile());
        this.createFileButton.removeEventListener('click', () => this.createNewFile());
        this.newFileName.removeEventListener('keypress', () => {});
        
        // Clear state
        this.currentFile = null;
    }
}

// Export for use in other modules
window.FileManager = FileManager;
