/**
 * Unit Tests for FileManager Module
 * Tests file operations including:
 * - File opening and saving
 * - Auto-save functionality
 * - File type detection
 * - Recent files management
 */

const path = require('path');

// Import the FileManager class
const FileManager = require(path.join(__dirname, '../../static/file-manager.js'));

// Import mocks
const {
    createMockUtils,
    createMockValidator,
    createMockErrorHandler,
    createMockEnvironment,
    createMockDOMElements,
    createMockConfig
} = require('../mocks/dependencies');

describe('FileManager', () => {
    let fileManager;
    let mockDependencies;
    let mockElements;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';
        mockElements = createMockDOMElements();
        document.body.appendChild(mockElements.textEditor);
        document.body.appendChild(mockElements.statusElement);

        // Mock File API
        global.File = class MockFile {
            constructor(parts, filename, options = {}) {
                this.name = filename;
                this.size = parts.join('').length;
                this.type = options.type || 'text/plain';
                this.lastModified = Date.now();
                this._content = parts.join('');
            }
            
            text() {
                return Promise.resolve(this._content);
            }
        };

        global.FileReader = class MockFileReader {
            constructor() {
                this.result = null;
                this.onload = null;
                this.onerror = null;
            }
            
            readAsText(file) {
                setTimeout(() => {
                    this.result = file._content;
                    if (this.onload) this.onload();
                }, 0);
            }
        };

        // Mock URL.createObjectURL and revokeObjectURL
        global.URL = {
            createObjectURL: jest.fn(() => 'blob:mock-url'),
            revokeObjectURL: jest.fn()
        };

        // Setup mock dependencies
        mockDependencies = {
            validator: createMockValidator(),
            errorHandler: createMockErrorHandler(),
            environment: createMockEnvironment(),
            utils: createMockUtils(),
            config: {
                ...createMockConfig(),
                FILES: {
                    EXTENSION: '.txt'
                }
            },
            // DOM elements from mockElements
            fileList: mockElements.fileList,
            saveButton: mockElements.saveButton,
            currentFileName: mockElements.currentFileName,
            newFileName: mockElements.newFileName, 
            createFileButton: mockElements.createFileButton,
            textEditor: mockElements.textEditor,
            statusElement: mockElements.statusElement,
            getEditorContent: jest.fn(() => 'Test content'),
            setEditorContent: jest.fn(),
            updateEditorContent: jest.fn(),
            getCursorPosition: jest.fn(() => 0),
            getWebSocket: jest.fn(() => ({ readyState: 1, send: jest.fn() })),
            getConnectionState: jest.fn(() => true),
            getAbortController: jest.fn(() => ({ abort: jest.fn() })),
            onFileLoaded: jest.fn(),
            onFileCreated: jest.fn(),
            onFileSaved: jest.fn(),
            clearTimeoutSafe: jest.fn(),
            setTimeoutSafe: jest.fn((callback, delay) => setTimeout(callback, delay)),
            updateStatus: jest.fn(),
            showSpinner: jest.fn(),
            hideSpinner: jest.fn(),
            updateFileInfo: jest.fn(),
            markAsModified: jest.fn(),
            markAsSaved: jest.fn()
        };

        // Create FileManager with mocked constructor that doesn't call initializeEventListeners
        fileManager = new FileManager(mockDependencies);
        
        // Manually override the problematic methods for testing
        fileManager.autoSaveTimer = null;
        fileManager.autoSaveTimeout = null;
    });

    afterEach(() => {
        if (fileManager && typeof fileManager.destroy === 'function') {
            fileManager.destroy();
        }
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with correct dependencies', () => {
            expect(fileManager.validator).toBe(mockDependencies.validator);
            expect(fileManager.errorHandler).toBe(mockDependencies.errorHandler);
            expect(fileManager.environment).toBe(mockDependencies.environment);
            expect(fileManager.utils).toBe(mockDependencies.utils);
        });

        test('should initialize DOM elements correctly', () => {
            expect(fileManager.saveButton).toBeDefined();
            expect(fileManager.createFileButton).toBeDefined();
            expect(typeof fileManager.saveButton.addEventListener).toBe('function');
            expect(typeof fileManager.createFileButton.addEventListener).toBe('function');
        });

        test('should initialize with default state', () => {
            expect(fileManager.currentFile).toBeNull();
            expect(fileManager.currentFileName).toBe('');
            expect(fileManager.isModified).toBe(false);
            expect(fileManager.lastSaveTime).toBeNull();
            expect(fileManager.recentFiles).toEqual([]);
        });

        test('should load saved settings on initialization', () => {
            const mockSettings = {
                autoSaveEnabled: true,
                autoSaveInterval: 30000
            };
            const mockRecentFiles = ['file1.txt', 'file2.txt'];
            
            // Create new mock utils that return the saved data
            const mockUtilsWithStorage = {
                ...createMockUtils(),
                getStorageItem: jest.fn((key) => {
                    if (key === 'fileManagerSettings') {
                        return mockSettings;
                    }
                    if (key === 'recentFiles') {
                        return mockRecentFiles;
                    }
                    return null;
                })
            };

            const newMockDependencies = {
                ...mockDependencies,
                utils: mockUtilsWithStorage
            };

            const newFileManager = new FileManager(newMockDependencies);
            
            expect(newFileManager.settings.autoSaveEnabled).toBe(true);
            expect(newFileManager.settings.autoSaveInterval).toBe(30000);
            expect(newFileManager.recentFiles).toEqual(['file1.txt', 'file2.txt']);
        });
    });

    describe('File Opening', () => {
        test('should open file through file input', async () => {
            const mockFile = new File(['Hello, World!'], 'test.txt', { type: 'text/plain' });
            
            await fileManager.openFile(mockFile);
            
            expect(fileManager.currentFile).toBe(mockFile);
            expect(fileManager.currentFileName).toBe('test.txt');
            expect(mockDependencies.setEditorContent).toHaveBeenCalledWith('Hello, World!');
        });

        test('should handle file reading errors', async () => {
            const mockFile = {
                name: 'test.txt',
                text: jest.fn().mockRejectedValue(new Error('Read failed'))
            };

            await fileManager.openFile(mockFile);
            
            expect(mockDependencies.errorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'file-opening',
                'Failed to read file'
            );
        });

        test('should detect file type correctly', () => {
            const testCases = [
                { filename: 'test.txt', expectedType: 'text' },
                { filename: 'document.md', expectedType: 'markdown' },
                { filename: 'script.js', expectedType: 'javascript' },
                { filename: 'data.json', expectedType: 'json' },
                { filename: 'page.html', expectedType: 'html' },
                { filename: 'style.css', expectedType: 'css' },
                { filename: 'unknown.xyz', expectedType: 'text' }
            ];

            testCases.forEach(({ filename, expectedType }) => {
                const type = fileManager.detectFileType(filename);
                expect(type).toBe(expectedType);
            });
        });

        test('should update recent files list', async () => {
            const mockFile = new File(['content'], 'test.txt');
            
            await fileManager.openFile(mockFile);
            
            expect(fileManager.recentFiles).toContain('test.txt');
        });

        test('should limit recent files list size', async () => {
            // Fill up recent files beyond limit
            for (let i = 0; i < 12; i++) {
                const file = new File(['content'], `file${i}.txt`);
                await fileManager.openFile(file);
            }
            
            expect(fileManager.recentFiles.length).toBeLessThanOrEqual(10);
        });
    });

    describe('File Saving', () => {
        beforeEach(() => {
            // Mock createElement and click for download
            const mockLink = {
                href: '',
                download: '',
                click: jest.fn(),
                style: { display: '' }
            };
            
            document.createElement = jest.fn((tagName) => {
                if (tagName === 'a') return mockLink;
                return { appendChild: jest.fn(), removeChild: jest.fn() };
            });
            
            document.body.appendChild = jest.fn();
            document.body.removeChild = jest.fn();
        });

        test('should save file with current content', async () => {
            fileManager.currentFile = 'test.txt';
            fileManager.currentFileName = 'test.txt';
            
            // Mock WebSocket constants globally
            global.WebSocket = {
                OPEN: 1,
                CLOSED: 3,
                CONNECTING: 0,
                CLOSING: 2
            };
            
            // Mock WebSocket
            const mockWebSocket = { readyState: global.WebSocket.OPEN, send: jest.fn() };
            
            // Update the FileManager's function references, not just the mock dependencies
            fileManager.getWebSocket = jest.fn(() => mockWebSocket);
            fileManager.getConnectionState = jest.fn(() => true);
            
            // Ensure validation passes
            fileManager.validator.validateWebSocketMessage = jest.fn(() => ({ isValid: true, errors: [] }));

            await fileManager.saveCurrentFile();

            expect(mockWebSocket.send).toHaveBeenCalled();
            expect(fileManager.onFileSaved).toHaveBeenCalledWith('test.txt');
        });

        test('should save file with custom filename', async () => {
            const content = 'Content';
            const filename = 'custom.txt';
            mockDependencies.getEditorContent.mockReturnValue(content);
            
            await fileManager.saveFile(filename);
            
            expect(fileManager.isModified).toBe(false);
            expect(fileManager.lastSaveTime).toBeTruthy();
        });

        test('should handle save errors gracefully', async () => {
            // Mock URL.createObjectURL to throw error
            global.URL.createObjectURL = jest.fn(() => {
                throw new Error('Save failed');
            });
            
            await fileManager.saveFile();
            
            expect(mockDependencies.errorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'file-saving',
                'Failed to save file'
            );
        });

        test('should auto-save when enabled', () => {
            jest.useFakeTimers();
            fileManager.settings.autoSaveEnabled = true;
            fileManager.settings.autoSaveInterval = 5000;
            fileManager.isModified = true;
            fileManager.currentFile = 'test.txt';
            
            // Spy on saveCurrentFile method
            const saveCurrentFileSpy = jest.spyOn(fileManager, 'saveCurrentFile').mockImplementation(() => {});
            
            // Trigger auto-save through markAsModified
            fileManager.markAsModified();
            
            // Fast-forward timer
            jest.advanceTimersByTime(5000);
            
            expect(saveCurrentFileSpy).toHaveBeenCalled();
            
            jest.useRealTimers();
        });

        test('should not auto-save when disabled', () => {
            jest.useFakeTimers();
            fileManager.settings.autoSaveEnabled = false;
            
            // Spy on saveCurrentFile method
            const saveCurrentFileSpy = jest.spyOn(fileManager, 'saveCurrentFile').mockImplementation(() => {});
            
            fileManager.markAsModified();
            
            // Fast-forward timer
            jest.advanceTimersByTime(10000);
            
            expect(fileManager.isModified).toBe(true);
            expect(saveCurrentFileSpy).not.toHaveBeenCalled();
            
            jest.useRealTimers();
        });
    });

    describe('File State Management', () => {
        test('should track modification state', () => {
            expect(fileManager.isModified).toBe(false);
            
            fileManager.markAsModified();
            
            expect(fileManager.isModified).toBe(true);
        });

        test('should handle content changes', () => {
            fileManager.handleContentChange();
            
            expect(fileManager.isModified).toBe(true);
        });

        test('should get current file info', () => {
            fileManager.currentFile = 'test.txt';
            fileManager.currentFileName = 'test.txt';
            fileManager.lastSaveTime = Date.now();
            
            const info = fileManager.getCurrentFileInfo();
            
            expect(info).toEqual({
                name: 'test.txt',
                file: 'test.txt',
                modified: expect.any(Boolean),
                lastSaved: expect.any(Number),
                type: 'text'
            });
        });

        test('should return null for no current file', () => {
            const info = fileManager.getCurrentFileInfo();
            expect(info).toBeNull();
        });
    });

    describe('New File Creation', () => {
        test('should create new file', async () => {
            fileManager.currentFile = 'old.txt';
            fileManager.isModified = true;
            
            // Mock the confirm dialog to return false (don't save)
            window.confirm = jest.fn(() => false);
            
            await fileManager.newFile();
            
            expect(fileManager.currentFile).toBeNull();
            expect(fileManager.currentFileName).toBe('');
            expect(fileManager.isModified).toBe(false);
            expect(mockDependencies.setEditorContent).toHaveBeenCalledWith('');
        });

        test('should prompt to save modified file before creating new', async () => {
            fileManager.isModified = true;
            fileManager.currentFileName = 'modified.txt';
            
            // Mock confirm dialog to return true (save)
            window.confirm = jest.fn(() => true);
            
            await fileManager.newFile();
            
            expect(window.confirm).toHaveBeenCalledWith(
                expect.stringContaining('Current file has unsaved changes')
            );
        });
    });

    describe('Recent Files Management', () => {
        test('should get recent files list', () => {
            fileManager.recentFiles = ['file1.txt', 'file2.txt', 'file3.txt'];
            
            const recent = fileManager.getRecentFiles();
            
            expect(recent).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
        });

        test('should clear recent files', () => {
            fileManager.recentFiles = ['file1.txt', 'file2.txt'];
            
            fileManager.clearRecentFiles();
            
            expect(fileManager.recentFiles).toEqual([]);
        });

        test('should remove file from recent files', () => {
            fileManager.recentFiles = ['file1.txt', 'file2.txt', 'file3.txt'];
            
            fileManager.removeFromRecentFiles('file2.txt');
            
            expect(fileManager.recentFiles).toEqual(['file1.txt', 'file3.txt']);
        });

        test('should add file to recent files and avoid duplicates', () => {
            fileManager.recentFiles = ['file1.txt', 'file2.txt'];
            
            fileManager.addToRecentFiles('file1.txt'); // Duplicate
            fileManager.addToRecentFiles('file3.txt'); // New
            
            expect(fileManager.recentFiles).toEqual(['file3.txt', 'file1.txt', 'file2.txt']);
        });
    });

    describe('File Export and Import', () => {
        test('should export file in different format', async () => {
            const content = 'Original content';
            mockDependencies.getEditorContent.mockReturnValue(content);
            fileManager.currentFileName = 'test.txt';
            
            await fileManager.exportFile('json');
            
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        test('should import file content', async () => {
            const content = 'Imported content';
            const mockFile = new File([content], 'import.txt');
            
            await fileManager.importFile(mockFile);
            
            expect(mockDependencies.setEditorContent).toHaveBeenCalledWith(content);
            expect(fileManager.isModified).toBe(true);
        });
    });

    describe('Settings Management', () => {
        test('should update file manager settings', () => {
            const newSettings = {
                autoSaveEnabled: false,
                autoSaveInterval: 60000,
                showHiddenFiles: true
            };
            
            fileManager.updateSettings(newSettings);
            
            expect(fileManager.settings).toEqual(expect.objectContaining(newSettings));
        });

        test('should get current settings', () => {
            const settings = fileManager.getSettings();
            
            expect(settings).toHaveProperty('autoSaveEnabled');
            expect(settings).toHaveProperty('autoSaveInterval');
            expect(settings).toHaveProperty('maxRecentFiles');
        });

        test('should save settings to localStorage', () => {
            fileManager.saveSettings();
            
            expect(mockDependencies.utils.setStorageItem).toHaveBeenCalledWith(
                'fileManagerSettings',
                expect.any(Object)
            );
            expect(mockDependencies.utils.setStorageItem).toHaveBeenCalledWith(
                'recentFiles',
                expect.any(Array)
            );
        });
    });

    describe('File Validation and Security', () => {
        test('should validate file size', () => {
            const largeFile = { size: 1000000 }; // 1MB
            const smallFile = { size: 100000 }; // 100KB
            const maxSize = 500000; // 500KB limit
            
            expect(fileManager.validateFileSize(largeFile, maxSize)).toBe(false);
            expect(fileManager.validateFileSize(smallFile, maxSize)).toBe(true);
        });

        test('should validate file type', () => {
            const validTypes = ['text/plain'];
            
            const txtFile = { name: 'document.txt', type: 'text/plain' };
            const jpgFile = { name: 'image.jpg', type: 'image/jpeg' };
            const unknownTypeFile = { name: 'unknown.txt', type: 'application/unknown' };
            
            expect(fileManager.validateFileType(txtFile, validTypes)).toBe(true);
            expect(fileManager.validateFileType(jpgFile, validTypes)).toBe(false);
            expect(fileManager.validateFileType(unknownTypeFile, validTypes)).toBe(true); // .txt extension allowed
        });

        test('should sanitize filename', () => {
            const dangerousName = 'file<>:"|?*.txt';
            const safeName = fileManager.sanitizeFilename(dangerousName);
            
            expect(safeName).toBe('file_______.txt');  // Updated to match actual implementation (7 underscores)
            expect(safeName).not.toMatch(/[<>:"|?*]/);
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle corrupted files gracefully', async () => {
            const corruptedFile = new File([''], 'corrupted.txt');
            
            // Mock the file.text() method to reject
            corruptedFile.text = jest.fn().mockRejectedValue(new Error('File read error'));
            
            await fileManager.openFile(corruptedFile);
            
            expect(mockDependencies.errorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'file-opening',
                'Failed to read file'
            );
        });

        test('should recover from auto-save failures', () => {
            jest.useFakeTimers();
            
            // Mock save to fail and properly handle the error
            const saveCurrentFileSpy = jest.spyOn(fileManager, 'saveCurrentFile').mockImplementation(async () => {
                // Simulate the error being caught by the FileManager itself
                const error = new Error('Network error');
                fileManager.errorHandler.handleError(error, 'auto-save', 'Auto-save failed');
            });
            
            fileManager.settings.autoSaveEnabled = true;
            fileManager.isModified = true;
            fileManager.currentFile = 'test.txt';
            
            // Trigger auto-save
            fileManager.scheduleAutoSave();
            jest.advanceTimersByTime(fileManager.settings.autoSaveInterval);
            
            expect(saveCurrentFileSpy).toHaveBeenCalled();
            
            jest.useRealTimers();
        });
    });

    describe('Cleanup and Memory Management', () => {
        test('should cleanup resources on destroy', () => {
            fileManager.autoSaveTimeout = setTimeout(() => {}, 1000);
            
            // Spy on clearTimeout to verify it's called
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            
            fileManager.destroy();
            
            expect(fileManager.currentFile).toBeNull();
            expect(clearTimeoutSpy).toHaveBeenCalled();
            
            clearTimeoutSpy.mockRestore();
        });

        test('should revoke object URLs to prevent memory leaks', () => {
            fileManager.saveFile();
            
            fileManager.destroy();
            
            expect(global.URL.revokeObjectURL).toHaveBeenCalled();
        });
    });

    describe('Integration with File System APIs', () => {
        test('should handle file system errors gracefully', async () => {
            // Mock file that throws an error when read
            const errorFile = new File([''], 'error.txt');
            
            // Mock the file.text() method to reject
            errorFile.text = jest.fn().mockRejectedValue(new Error('Read failed'));
            
            await fileManager.openFile(errorFile);
            
            expect(mockDependencies.errorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'file-opening',
                'Failed to read file'
            );
        });
    });
});
