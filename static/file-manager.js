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
        this.currentFileNameElement = dependencies.currentFileName;
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
        this.currentFileName = '';
        this.isModified = false;
        this.lastSaveTime = null;
        this.recentFiles = [];
        this.settings = {
            autoSaveEnabled: false,
            autoSaveInterval: 30000,
            maxRecentFiles: 10
        };

        // Load saved settings and recent files
        this.loadSettings();
        
        // Initialize event listeners
        this.initializeEventListeners();
    }

    /**
     * Load saved settings and recent files from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = this.utils.getStorageItem('fileManagerSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...savedSettings };
            }

            const savedRecentFiles = this.utils.getStorageItem('recentFiles');
            if (savedRecentFiles && Array.isArray(savedRecentFiles)) {
                this.recentFiles = savedRecentFiles;
            }
        } catch (error) {
            if (this.environment.isDevelopment()) {
                console.warn('Failed to load file manager settings:', error);
            }
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            this.utils.setStorageItem('fileManagerSettings', this.settings);
            this.utils.setStorageItem('recentFiles', this.recentFiles);
        } catch (error) {
            if (this.environment.isDevelopment()) {
                console.warn('Failed to save file manager settings:', error);
            }
        }
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
        this.currentFileName = filename;
        if (this.currentFileNameElement) {
            this.currentFileNameElement.textContent = filename;
        }

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
        this.currentFileName = filename || '';
        if (this.currentFileNameElement) {
            this.currentFileNameElement.textContent = this.currentFileName;
        }
        if (filename) {
            this.saveButton.disabled = false;
        } else {
            this.saveButton.disabled = true;
        }
    }

    /**
     * Clear the current file state
     */
    clearCurrentFile() {
        this.currentFile = null;
        this.currentFileName = '';
        if (this.currentFileNameElement) {
            this.currentFileNameElement.textContent = '';
        }
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
     * Check if a file is currently loaded
     */
    hasCurrentFile() {
        return this.currentFile !== null;
    }

    /**
     * Open a file from File object (for drag and drop or file input)
     */
    async openFile(file) {
        try {
            const text = await file.text();
            this.currentFile = file;
            this.currentFileName = file.name;
            this.isModified = false;
            this.lastSaveTime = Date.now();

            // Add to recent files
            this.addToRecentFiles(file.name);

            // Set editor content
            if (this.setEditorContent) {
                this.setEditorContent(text);
            }

            // Update UI
            this.updateUIAfterFileLoad(file.name);

            // Notify callback
            if (this.onFileLoaded) {
                this.onFileLoaded(file.name);
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'file-opening', 'Failed to read file');
        }
    }

    /**
     * Detect file type from filename
     */
    detectFileType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const typeMap = {
            'txt': 'text',
            'md': 'markdown',
            'js': 'javascript',
            'json': 'json',
            'html': 'html',
            'css': 'css'
        };
        return typeMap[extension] || 'text';
    }

    /**
     * Add file to recent files list
     */
    addToRecentFiles(filename) {
        // Remove if already exists
        this.recentFiles = this.recentFiles.filter(f => f !== filename);
        // Add to beginning
        this.recentFiles.unshift(filename);
        // Limit size
        this.recentFiles = this.recentFiles.slice(0, this.settings.maxRecentFiles);
        // Save to storage
        this.saveSettings();
    }

    /**
     * Remove file from recent files
     */
    removeFromRecentFiles(filename) {
        this.recentFiles = this.recentFiles.filter(f => f !== filename);
        this.saveSettings();
    }

    /**
     * Get recent files list
     */
    getRecentFiles() {
        return [...this.recentFiles];
    }

    /**
     * Clear recent files
     */
    clearRecentFiles() {
        this.recentFiles = [];
        this.saveSettings();
    }

    /**
     * Save file with custom filename
     */
    async saveFile(filename = null) {
        try {
            const content = this.getEditorContent ? this.getEditorContent() : '';
            const saveFilename = filename || this.currentFileName || 'untitled.txt';

            // Create download link
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = saveFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.isModified = false;
            this.lastSaveTime = Date.now();

            if (this.onFileSaved) {
                this.onFileSaved(saveFilename);
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'file-saving', 'Failed to save file');
        }
    }

    /**
     * Create new file
     */
    async newFile() {
        try {
            // Check if current file is modified
            if (this.isModified) {
                const shouldSave = confirm('Current file has unsaved changes. Save before creating new file?');
                if (shouldSave) {
                    await this.saveFile();
                }
            }

            this.currentFile = null;
            this.currentFileName = '';
            this.isModified = false;
            this.lastSaveTime = null;

            if (this.setEditorContent) {
                this.setEditorContent('');
            }

            this.clearCurrentFile();

            if (this.onFileCreated) {
                this.onFileCreated(null);
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'file-creation', 'Failed to create new file');
        }
    }

    /**
     * Mark file as modified
     */
    markAsModified() {
        this.isModified = true;
        if (this.settings.autoSaveEnabled) {
            this.scheduleAutoSave();
        }
    }

    /**
     * Handle content changes
     */
    handleContentChange() {
        this.markAsModified();
    }

    /**
     * Get current file info
     */
    getCurrentFileInfo() {
        if (!this.currentFile) return null;

        return {
            name: this.currentFileName,
            file: this.currentFile,
            modified: this.isModified,
            lastSaved: this.lastSaveTime,
            type: this.detectFileType(this.currentFileName)
        };
    }

    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        if (this.settings.autoSaveEnabled) {
            this.autoSaveTimeout = setTimeout(() => {
                this.saveCurrentFile();
            }, this.settings.autoSaveInterval);
        }
    }

    /**
     * Export file in different format
     */
    async exportFile(format = 'txt') {
        try {
            const content = this.getEditorContent ? this.getEditorContent() : '';
            let exportContent = content;
            let mimeType = 'text/plain';
            let extension = 'txt';

            switch (format) {
                case 'html':
                    exportContent = `<html><body><pre>${content}</pre></body></html>`;
                    mimeType = 'text/html';
                    extension = 'html';
                    break;
                case 'json':
                    exportContent = JSON.stringify({ content }, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
            }

            const blob = new Blob([exportContent], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentFileName || 'export'}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            this.errorHandler.handleError(error, 'file-export', 'Failed to export file');
        }
    }

    /**
     * Import file content
     */
    async importFile(file) {
        try {
            const content = await file.text();
            if (this.setEditorContent) {
                this.setEditorContent(content);
            }
            this.markAsModified();
        } catch (error) {
            this.errorHandler.handleError(error, 'file-import', 'Failed to import file');
        }
    }

    /**
     * Update file manager settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Validate file size
     */
    validateFileSize(file, maxSize = 10 * 1024 * 1024) { // 10MB default
        return file.size <= maxSize;
    }

    /**
     * Validate file type
     */
    validateFileType(file, allowedTypes = ['text/plain']) {
        return allowedTypes.includes(file.type) || file.name.endsWith('.txt');
    }

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    /**
     * Handle corrupted files
     */
    handleCorruptedFile(file) {
        this.errorHandler.showError('File appears to be corrupted and cannot be opened');
        return null;
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.cleanup();

        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Revoke any object URLs to prevent memory leaks
        this.revokeObjectUrls();
    }

    /**
     * Revoke object URLs to prevent memory leaks
     */
    revokeObjectUrls() {
        // In a real implementation, we'd track created URLs
        // For testing, this is just a placeholder
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

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
}

// Export for use in other modules
window.FileManager = FileManager;
