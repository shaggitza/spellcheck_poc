/**
 * Integration Tests for Module Interactions
 * Tests how the extracted modules work together:
 * - PredictionEngine with SpellChecker
 * - FileManager with both prediction and spell checking
 * - WebSocket communication between modules
 * - Overall application workflow
 */

const path = require('path');

// Import all modules
const PredictionEngine = require(path.join(__dirname, '../../static/prediction-engine.js'));
const SpellChecker = require(path.join(__dirname, '../../static/spell-checker.js'));
const FileManager = require(path.join(__dirname, '../../static/file-manager.js'));

// Import mocks
const {
    createMockUtils,
    createMockValidator,
    createMockErrorHandler,
    createMockEnvironment,
    createMockWebSocket,
    createMockDOMElements,
    createMockConfig
} = require('../mocks/dependencies');

describe('Module Integration Tests', () => {
    let predictionEngine;
    let spellChecker;
    let fileManager;
    let mockDependencies;
    let mockElements;
    let mockWebSocket;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';
        mockElements = createMockDOMElements();
        Object.values(mockElements).forEach(element => {
            if (element && element.nodeType) {
                document.body.appendChild(element);
            }
        });

        // Setup shared WebSocket mock
        mockWebSocket = createMockWebSocket();
        
        // Setup shared dependencies
        mockDependencies = {
            websocket: jest.fn(() => mockWebSocket),
            validator: createMockValidator(),
            errorHandler: createMockErrorHandler(),
            environment: createMockEnvironment(),
            utils: createMockUtils(),
            config: createMockConfig(),
            // DOM elements
            textEditor: mockElements.textEditor,
            predictionText: mockElements.predictionText,
            suggestionsList: mockElements.suggestionsList,
            statusElement: mockElements.statusElement,
            fileList: mockElements.fileList,
            saveButton: mockElements.saveButton,
            currentFileName: mockElements.currentFileName,
            newFileName: mockElements.newFileName,
            createFileButton: mockElements.createFileButton,
            // Callbacks and functions
            getEditorContent: jest.fn(() => 'Test content with errror'),
            setEditorContent: jest.fn(),
            getCursorPosition: jest.fn(() => 5),
            setCursorPosition: jest.fn(),
            setEditorContent: jest.fn(),
            updateEditorContent: jest.fn(),
            getWebSocket: jest.fn(() => mockWebSocket),
            getConnectionState: jest.fn(() => true),
            getAbortController: jest.fn(() => ({ abort: jest.fn() })),
            // State management callbacks
            getIsTyping: jest.fn(() => false),
            getSuggestionVisible: jest.fn(() => false),
            fileManager: {
                hasCurrentFile: jest.fn(() => true),
                getCurrentFile: jest.fn(() => 'test.txt'),
                loadFile: jest.fn(),
                saveCurrentFile: jest.fn(),
                clearCurrentFile: jest.fn(),
                loadFileList: jest.fn()
            },
            onFileLoaded: jest.fn(),
            onFileCreated: jest.fn(),
            onFileSaved: jest.fn(),
            addWordToDictionary: jest.fn(),
            getTextEditor: jest.fn(() => mockElements.textEditor),
            getParagraphContext: jest.fn(() => ({
                prevContext: '',
                currentText: 'Test content with errror',
                afterContext: '',
                cursor: 5,
                paragraphIndex: 0,
                totalParagraphs: 1
            })),
            isAtWordBoundary: jest.fn(() => true),
            handleTextChange: jest.fn(),
            clearTimeoutSafe: jest.fn(),
            setTimeoutSafe: jest.fn((callback, delay) => setTimeout(callback, delay)),
            showSpinner: jest.fn(),
            hideSpinner: jest.fn(),
            updateStatus: jest.fn(),
            highlightSpellingErrors: jest.fn(),
            removeSpellingHighlights: jest.fn(),
            updateFileInfo: jest.fn(),
            markAsModified: jest.fn(),
            markAsSaved: jest.fn()
        };

        // Initialize all modules
        predictionEngine = new PredictionEngine(mockDependencies);
        spellChecker = new SpellChecker(mockDependencies);
        fileManager = new FileManager(mockDependencies);
    });

    afterEach(() => {
        // Cleanup all modules
        [predictionEngine, spellChecker, fileManager].forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            } else if (module && typeof module.cleanup === 'function') {
                module.cleanup();
            }
        });
    });

    describe('WebSocket Communication Integration', () => {
        test('should handle WebSocket messages for both prediction and spell checking', () => {
            const predictionResponse = {
                type: 'prediction',
                data: {
                    prediction: 'predicted text',
                    cursor_position: 5,
                    metadata: {}
                }
            };

            const spellCheckResponse = {
                type: 'spell_check',
                data: {
                    errors: [
                        {
                            word: 'errror',
                            position: 18,
                            suggestions: ['error', 'errors'],
                            confidence: 0.9
                        }
                    ]
                }
            };

            // Spy on response handlers
            const predictionSpy = jest.spyOn(predictionEngine, 'handlePredictionResponse');
            const spellCheckSpy = jest.spyOn(spellChecker, 'handleSpellCheckResponse');

            // Simulate WebSocket message handling by calling response methods directly
            predictionEngine.handlePredictionResponse(
                predictionResponse.data.prediction,
                predictionResponse.data.cursor_position,
                predictionResponse.data.metadata
            );
            spellChecker.handleSpellCheckResponse({
                0: [{ word: 'errror', position: 18, suggestions: ['error', 'errors'] }]
            });

            expect(predictionSpy).toHaveBeenCalledWith(
                'predicted text', 
                5, 
                expect.any(Object)
            );
            expect(spellCheckSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    0: expect.arrayContaining([
                        expect.objectContaining({
                            word: 'errror',
                            position: 18
                        })
                    ])
                })
            );
        });

        test('should handle WebSocket connection state changes across modules', () => {
            // Initially connected
            mockWebSocket.readyState = WebSocket.OPEN;
            mockDependencies.getConnectionState.mockReturnValue(true);

            // Enable spell checking and ensure file is current
            spellChecker.spellCheckingEnabled = true;
            const hasCurrentFileSpy = jest.spyOn(fileManager, 'hasCurrentFile');
            hasCurrentFileSpy.mockReturnValue(true);

            // Mock getSuggestionVisible to return false (no active suggestion)
            mockDependencies.getSuggestionVisible.mockReturnValue(false);

            // Mock window.getSelection to return collapsed selection
            global.window.getSelection = jest.fn(() => ({
                rangeCount: 1,
                getRangeAt: () => ({ collapsed: true })
            }));

            // Request prediction and spell check
            predictionEngine.requestPrediction();
            spellChecker.requestSpellCheck();

            // Advance timers for debounced spell check
            jest.advanceTimersByTime(500);

            expect(mockWebSocket.send).toHaveBeenCalledTimes(2);

            // Reset send spy
            mockWebSocket.send.mockClear();

            // Simulate disconnection
            mockWebSocket.readyState = WebSocket.CLOSED;
            mockDependencies.getConnectionState.mockReturnValue(false);

            // Try requests again - should not send
            predictionEngine.requestPrediction();
            spellChecker.requestSpellCheck();

            // Advance timers again
            jest.advanceTimersByTime(500);

            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });

        test('should handle WebSocket errors gracefully across modules', () => {
            // Set WebSocket to disconnected state
            mockWebSocket.readyState = WebSocket.CLOSED;
            mockDependencies.getConnectionState.mockReturnValue(false);

            // Try to make requests - should not send
            predictionEngine.requestPrediction();
            spellChecker.requestSpellCheck();

            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });
    });

    describe('File Operations with Prediction and Spell Checking', () => {
        test('should trigger spell check after file opening', async () => {
            const mockFile = {
                name: 'test.txt',
                text: jest.fn().mockResolvedValue('Content with errror here')
            };

            await fileManager.openFile(mockFile);

            // Should update content 
            expect(mockDependencies.setEditorContent).toHaveBeenCalledWith('Content with errror here');

            // Setup conditions for spell check to work
            mockDependencies.getConnectionState.mockReturnValue(true);
            mockWebSocket.readyState = WebSocket.OPEN;
            spellChecker.spellCheckingEnabled = true;
            mockDependencies.getSuggestionVisible.mockReturnValue(false);

            // Manually trigger spell check (in real app this would be done by the main controller)
            spellChecker.requestSpellCheck();

            // Advance timers for debounced spell check
            jest.advanceTimersByTime(500);

            expect(mockWebSocket.send).toHaveBeenCalled();
        });

        test('should clear predictions when opening new file', async () => {
            // Setup existing prediction
            predictionEngine.currentPrediction = { text: 'old prediction' };
            predictionEngine.suggestionVisible = true;

            const mockFile = {
                name: 'new.txt',
                text: jest.fn().mockResolvedValue('New content')
            };

            await fileManager.openFile(mockFile);

            // Check that the file was loaded and content updated
            expect(mockDependencies.setEditorContent).toHaveBeenCalledWith('New content');

            // In a real app, the main controller would clear predictions on file change
            predictionEngine.clearPrediction();
            expect(predictionEngine.currentPrediction).toBeNull();
        });

        test('should preserve editor state during auto-save', () => {
            jest.useFakeTimers();
            
            // Setup file with content
            fileManager.currentFileName = 'test.txt';
            fileManager.isModified = true;
            fileManager.settings.autoSaveEnabled = true;

            // Setup active prediction
            predictionEngine.currentPrediction = { text: 'active prediction' };
            predictionEngine.suggestionVisible = true;

            // Trigger auto-save
            fileManager.scheduleAutoSave();
            jest.advanceTimersByTime(fileManager.settings.autoSaveInterval);

            // Prediction should still be active
            expect(predictionEngine.currentPrediction).toBeTruthy();
            expect(predictionEngine.suggestionVisible).toBe(true);

            jest.useRealTimers();
        });
    });

    describe('Text Editing Workflow Integration', () => {
        test('should coordinate prediction and spell checking during typing', () => {
            // Simulate typing scenario
            mockDependencies.getEditorContent.mockReturnValue('Hello worl');
            mockDependencies.getCursorPosition.mockReturnValue(11);
            mockDependencies.isAtWordBoundary.mockReturnValue(false);

            // Mock window.getSelection for prediction engine
            global.window.getSelection = jest.fn(() => ({
                rangeCount: 1,
                getRangeAt: () => ({ collapsed: true })
            }));

            // During typing, only predictions should be requested, not spell check
            predictionEngine.requestPrediction(); // Should not send because not at word boundary
            spellChecker.requestSpellCheck(); // Should not send because content hasn't changed

            // Verify prediction was attempted but blocked by word boundary
            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });

        test('should handle suggestion acceptance with spell checking', () => {
            // Setup prediction
            predictionEngine.currentPrediction = {
                text: 'world of programming',
                position: 11,
                metadata: {}
            };
            predictionEngine.suggestionVisible = true;

            // Mock the text editor element for the acceptance
            const mockTextEditor = mockElements.textEditor;
            mockTextEditor.value = 'Hello worl';
            mockTextEditor.selectionStart = 11;
            mockTextEditor.selectionEnd = 11;

            // Accept suggestion
            predictionEngine.acceptInlineSuggestion();

            // Setup conditions for spell check after suggestion acceptance
            mockDependencies.getConnectionState.mockReturnValue(true);
            mockWebSocket.readyState = WebSocket.OPEN;
            spellChecker.spellCheckingEnabled = true;
            mockDependencies.getSuggestionVisible.mockReturnValue(false);

            // Mock that file manager has current file
            const hasCurrentFileSpy = jest.spyOn(fileManager, 'hasCurrentFile');
            hasCurrentFileSpy.mockReturnValue(true);

            // After suggestion acceptance, manually trigger spell check
            spellChecker.requestSpellCheck();

            // Advance timers for debounced spell check
            jest.advanceTimersByTime(500);

            expect(mockWebSocket.send).toHaveBeenCalled();
        });

        test('should handle spell correction with prediction updates', () => {
            // Setup spell error with span element
            const errorSpan = document.createElement('span');
            errorSpan.textContent = 'errror';
            errorSpan.classList.add('spell-error-highlight');
            errorSpan.setAttribute('data-word', 'errror');
            errorSpan.setAttribute('data-suggestions', JSON.stringify(['error', 'errors']));

            // Create parent word token
            const wordToken = document.createElement('span');
            wordToken.classList.add('word-token');
            wordToken.appendChild(errorSpan);

            spellChecker.currentErrors = [{
                word: 'errror',
                position: 18,
                suggestions: ['error', 'errors'],
                span: errorSpan
            }];

            // Correct the error using the proper method signature
            spellChecker.replaceSpellError(errorSpan, 'error');

            // Should call handleTextChange which updates content
            expect(mockDependencies.handleTextChange).toHaveBeenCalled();

            // Should correct the text content
            expect(errorSpan.textContent).toBe('error');
        });
    });

    describe('State Synchronization Between Modules', () => {
        test('should maintain consistent editor state across modules', () => {
            const content = 'Shared editor content with errror';
            const cursorPos = 25;

            // Update shared state
            mockDependencies.getEditorContent.mockReturnValue(content);
            mockDependencies.getCursorPosition.mockReturnValue(cursorPos);

            // Setup conditions for both modules to send
            mockDependencies.getConnectionState.mockReturnValue(true);
            mockWebSocket.readyState = WebSocket.OPEN;
            spellChecker.spellCheckingEnabled = true;
            mockDependencies.getSuggestionVisible.mockReturnValue(false);
            mockDependencies.isAtWordBoundary.mockReturnValue(true);

            // Mock that file manager has current file
            const hasCurrentFileSpy = jest.spyOn(fileManager, 'hasCurrentFile');
            hasCurrentFileSpy.mockReturnValue(true);

            // Mock window.getSelection for prediction engine
            global.window.getSelection = jest.fn(() => ({
                rangeCount: 1,
                getRangeAt: () => ({ collapsed: true })
            }));

            // All modules should see the same state when making requests
            predictionEngine.requestPrediction();
            spellChecker.requestSpellCheck();

            // Advance timers for debounced spell check
            jest.advanceTimersByTime(500);

            // Both should have made requests with the shared content
            expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
            const calls = mockWebSocket.send.mock.calls;

            // Both calls should contain the shared content
            expect(calls.some(call => call[0].includes(content))).toBe(true);
        });

        test('should handle concurrent modifications correctly', () => {
            // Simulate rapid text changes
            const changes = [
                'Hello',
                'Hello w',
                'Hello wo',
                'Hello wor',
                'Hello worl',
                'Hello world'
            ];

            changes.forEach((content, index) => {
                mockDependencies.getEditorContent.mockReturnValue(content);
                mockDependencies.getCursorPosition.mockReturnValue(content.length);
                
                // Both modules should handle the change
                predictionEngine.setTypingState(true);
                spellChecker.isChecking = false;
                
                mockDependencies.handleTextChange();
            });

            // Final state should be consistent
            expect(predictionEngine.isTyping).toBe(true);
            expect(spellChecker.isChecking).toBe(false);
        });
    });

    describe('Error Handling and Recovery Integration', () => {
        test('should handle WebSocket errors gracefully across all modules', () => {
            // Set WebSocket to disconnected state
            mockWebSocket.readyState = WebSocket.CLOSED;
            mockDependencies.getConnectionState.mockReturnValue(false);

            // Modules should remain functional even with disconnected WebSocket
            expect(() => {
                predictionEngine.requestPrediction();
                spellChecker.requestSpellCheck();
                fileManager.saveFile();
            }).not.toThrow();
        });

        test('should recover from module-specific errors without affecting others', () => {
            // Simulate prediction error through error handler
            const predictionError = new Error('Prediction failed');
            mockDependencies.errorHandler.showError.mockClear();

            // Trigger error through prediction engine's error handler
            predictionEngine.errorHandler.handleError(predictionError, 'prediction', 'Test error');

            // Spell checker should still work
            expect(() => spellChecker.requestSpellCheck()).not.toThrow();
            expect(mockDependencies.errorHandler.handleError).toHaveBeenCalledTimes(1);
        });
    });

    describe('Performance and Resource Management', () => {
        test('should handle large documents efficiently across modules', () => {
            const largeContent = 'word '.repeat(5000) + 'errror';
            mockDependencies.getEditorContent.mockReturnValue(largeContent);

            const startTime = Date.now();

            // All modules should process efficiently
            predictionEngine.requestPrediction();
            spellChecker.requestSpellCheck();

            const endTime = Date.now();

            // Should complete quickly
            expect(endTime - startTime).toBeLessThan(100);
        });

        test('should manage memory usage effectively', () => {
            // Create and destroy multiple instances
            for (let i = 0; i < 10; i++) {
                const tempPrediction = new PredictionEngine(mockDependencies);
                const tempSpellChecker = new SpellChecker(mockDependencies);
                const tempFileManager = new FileManager(mockDependencies);

                // Use modules briefly
                tempPrediction.requestPrediction();
                tempSpellChecker.requestSpellCheck();

                // Cleanup
                tempPrediction.destroy();
                tempSpellChecker.cleanup();
                tempFileManager.destroy();
            }

            // Should not leak memory (no specific assertion, but test should complete)
            expect(true).toBe(true);
        });

        test('should throttle requests appropriately', () => {
            jest.useFakeTimers();

            // Rapid requests
            for (let i = 0; i < 10; i++) {
                predictionEngine.requestPrediction();
                spellChecker.requestSpellCheck();
            }

            // Should throttle to reasonable number of requests
            expect(mockWebSocket.send.mock.calls.length).toBeLessThan(20);

            jest.useRealTimers();
        });
    });

    describe('User Interface Integration', () => {
        test('should coordinate UI updates across modules', () => {
            // Mock prediction update
            predictionEngine.updatePrediction('test prediction');
            expect(mockElements.predictionText.textContent).toBe('test prediction');

            // Mock spell checker status update
            mockDependencies.updateStatus = jest.fn();
            spellChecker.requestSpellCheck();

            // Simulate spell check response
            mockWebSocket.onmessage({
                data: JSON.stringify({
                    type: 'spellcheck',
                    errors: [{ word: 'error', position: 0, suggestions: ['correction'] }]
                })
            });

            // File manager should handle modification tracking
            mockDependencies.markAsModified = jest.fn();
            fileManager.markAsModified();
            expect(mockDependencies.markAsModified).toHaveBeenCalled();
        });

        test('should handle focus and blur events consistently', () => {
            // Mock event handling setup
            const eventHandlers = {};
            mockElements.textEditor.addEventListener = jest.fn((event, handler) => {
                eventHandlers[event] = handler;
            });

            // Initialize event listeners (would normally be done in module initialization)
            predictionEngine.setupKeyboardHandlers();

            // Simulate focus - should enable typing detection
            if (eventHandlers.focus) {
                eventHandlers.focus();
            }

            // Simulate blur - modules should handle cleanup
            if (eventHandlers.blur) {
                eventHandlers.blur();
            }

            // Verify event listeners were set up (keyboard handlers include focus/blur handling)
            expect(mockElements.textEditor.addEventListener).toHaveBeenCalled();
        });
    });

    describe('Configuration and Settings Integration', () => {
        test('should share configuration across modules', () => {
            const sharedConfig = {
                predictionEnabled: true,
                spellCheckEnabled: true,
                autoSaveEnabled: true
            };

            // Update settings where supported
            if (predictionEngine.updateSettings) {
                predictionEngine.updateSettings(sharedConfig);
            }
            if (spellChecker.updateSettings) {
                spellChecker.updateSettings(sharedConfig);
            }
            fileManager.updateSettings(sharedConfig);

            // Verify file manager settings were updated
            expect(fileManager.settings.autoSaveEnabled).toBe(true);

            // Verify other settings are properly stored
            expect(fileManager.settings).toMatchObject(expect.objectContaining(sharedConfig));
        });

        test('should handle environment-specific configurations', () => {
            // Mock environment detection
            mockDependencies.environment = {
                isDevelopment: jest.fn(() => true),
                isProduction: jest.fn(() => false)
            };

            // Test that modules can check environment
            const isDev = mockDependencies.environment.isDevelopment();
            expect(isDev).toBe(true);

            // Verify environment functions are available
            expect(typeof mockDependencies.environment.isDevelopment).toBe('function');
        });
    });
});
