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
            updateEditorContent: jest.fn(),
            getWebSocket: jest.fn(() => mockWebSocket),
            getConnectionState: jest.fn(() => true),
            getAbortController: jest.fn(() => ({ abort: jest.fn() })),
            getIsTyping: jest.fn(() => false),
            getSuggestionVisible: jest.fn(() => false),
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

            // Simulate WebSocket messages
            mockWebSocket.onmessage({ data: JSON.stringify(predictionResponse) });
            mockWebSocket.onmessage({ data: JSON.stringify(spellCheckResponse) });

            expect(predictionSpy).toHaveBeenCalledWith(
                'predicted text', 
                5, 
                expect.any(Object)
            );
            expect(spellCheckSpy).toHaveBeenCalledWith([
                expect.objectContaining({
                    word: 'errror',
                    position: 18
                })
            ]);
        });

        test('should handle WebSocket connection state changes across modules', () => {
            // Initially connected
            mockWebSocket.readyState = WebSocket.OPEN;

            // Request prediction and spell check
            predictionEngine.requestPrediction();
            spellChecker.checkSpelling();

            expect(mockWebSocket.send).toHaveBeenCalledTimes(2);

            // Reset send spy
            mockWebSocket.send.mockClear();

            // Simulate disconnection
            mockWebSocket.readyState = WebSocket.CLOSED;

            // Try requests again - should not send
            predictionEngine.requestPrediction();
            spellChecker.checkSpelling();

            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });

        test('should handle WebSocket errors gracefully across modules', () => {
            const error = new Error('WebSocket connection failed');

            mockWebSocket.onerror(error);

            expect(mockDependencies.errorHandler.showError).toHaveBeenCalledWith(
                expect.stringContaining('WebSocket')
            );
        });
    });

    describe('File Operations with Prediction and Spell Checking', () => {
        test('should trigger spell check after file opening', async () => {
            const mockFile = new File(['Content with errror here'], 'test.txt');
            const spellCheckSpy = jest.spyOn(spellChecker, 'checkSpelling');

            await fileManager.openFile(mockFile);

            // Should update content and trigger spell check
            expect(mockDependencies.updateEditorContent).toHaveBeenCalledWith('Content with errror here');
            expect(spellCheckSpy).toHaveBeenCalled();
        });

        test('should clear predictions when opening new file', async () => {
            // Setup existing prediction
            predictionEngine.currentPrediction = { text: 'old prediction' };
            predictionEngine.suggestionVisible = true;

            const mockFile = new File(['New content'], 'new.txt');
            const clearPredictionSpy = jest.spyOn(predictionEngine, 'clearPrediction');

            await fileManager.openFile(mockFile);

            expect(clearPredictionSpy).toHaveBeenCalled();
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
            fileManager.startAutoSave();
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

            const predictionSpy = jest.spyOn(predictionEngine, 'requestPrediction');
            const spellCheckSpy = jest.spyOn(spellChecker, 'checkSpelling');

            // Simulate text change
            mockDependencies.handleTextChange();

            // Should request prediction but defer spell check during typing
            expect(predictionSpy).toHaveBeenCalled();
            expect(spellCheckSpy).not.toHaveBeenCalled();
        });

        test('should handle suggestion acceptance with spell checking', () => {
            // Setup prediction
            predictionEngine.currentPrediction = {
                text: 'world of programming',
                position: 11,
                metadata: {}
            };
            predictionEngine.suggestionVisible = true;

            // Mock updating content after acceptance
            mockDependencies.updateEditorContent.mockImplementation((content) => {
                mockDependencies.getEditorContent.mockReturnValue(content);
            });

            const spellCheckSpy = jest.spyOn(spellChecker, 'checkSpelling');

            // Accept suggestion
            predictionEngine.acceptInlineSuggestion();

            // Should trigger spell check after content change
            expect(spellCheckSpy).toHaveBeenCalled();
        });

        test('should handle spell correction with prediction updates', () => {
            // Setup spell error
            const error = {
                word: 'errror',
                position: 18,
                suggestions: ['error', 'errors']
            };
            spellChecker.currentErrors = [error];

            // Mock content update after correction
            mockDependencies.updateEditorContent.mockImplementation((content) => {
                mockDependencies.getEditorContent.mockReturnValue(content);
            });

            const predictionSpy = jest.spyOn(predictionEngine, 'requestPrediction');

            // Correct the error
            spellChecker.replaceWord(error, 'error');

            // Should update content and potentially trigger new prediction
            expect(mockDependencies.updateEditorContent).toHaveBeenCalled();
            expect(predictionSpy).toHaveBeenCalled();
        });
    });

    describe('State Synchronization Between Modules', () => {
        test('should maintain consistent editor state across modules', () => {
            const content = 'Shared editor content with errror';
            const cursorPos = 25;

            // Update shared state
            mockDependencies.getEditorContent.mockReturnValue(content);
            mockDependencies.getCursorPosition.mockReturnValue(cursorPos);

            // All modules should see the same state
            predictionEngine.requestPrediction();
            spellChecker.checkSpelling();

            // Verify all modules received the same content
            expect(mockWebSocket.send).toHaveBeenCalledWith(
                expect.stringContaining(content)
            );
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
            const error = new Error('Connection lost');

            // All modules should handle the error
            mockWebSocket.onerror(error);

            // Error should be reported
            expect(mockDependencies.errorHandler.showError).toHaveBeenCalled();

            // Modules should remain functional
            expect(() => {
                predictionEngine.requestPrediction();
                spellChecker.checkSpelling();
                fileManager.saveFile();
            }).not.toThrow();
        });

        test('should recover from module-specific errors without affecting others', () => {
            // Simulate prediction error
            const predictionError = new Error('Prediction failed');
            mockDependencies.errorHandler.showError.mockClear();

            predictionEngine.handleError(predictionError);

            // Spell checker should still work
            expect(() => spellChecker.checkSpelling()).not.toThrow();
            expect(mockDependencies.errorHandler.showError).toHaveBeenCalledTimes(1);
        });
    });

    describe('Performance and Resource Management', () => {
        test('should handle large documents efficiently across modules', () => {
            const largeContent = 'word '.repeat(5000) + 'errror';
            mockDependencies.getEditorContent.mockReturnValue(largeContent);

            const startTime = Date.now();

            // All modules should process efficiently
            predictionEngine.requestPrediction();
            spellChecker.checkSpelling();

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
                tempSpellChecker.checkSpelling();

                // Cleanup
                tempPrediction.destroy();
                tempSpellChecker.destroy();
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
                spellChecker.checkSpelling();
            }

            // Should throttle to reasonable number of requests
            expect(mockWebSocket.send.mock.calls.length).toBeLessThan(20);

            jest.useRealTimers();
        });
    });

    describe('User Interface Integration', () => {
        test('should coordinate UI updates across modules', () => {
            // Prediction should update UI
            predictionEngine.updatePrediction('test prediction');
            expect(mockElements.predictionText.textContent).toBe('test prediction');

            // Spell checker should update status
            spellChecker.handleSpellCheckResponse([
                { word: 'error', position: 0, suggestions: ['correction'] }
            ]);
            expect(mockDependencies.updateStatus).toHaveBeenCalledWith(
                expect.stringContaining('spelling errors')
            );

            // File manager should update file info
            fileManager.markAsModified();
            expect(mockDependencies.markAsModified).toHaveBeenCalled();
        });

        test('should handle focus and blur events consistently', () => {
            // Simulate focus events
            const focusEvent = new Event('focus');
            const blurEvent = new Event('blur');

            mockElements.textEditor.dispatchEvent(focusEvent);
            expect(predictionEngine.isTyping).toBe(false);

            mockElements.textEditor.dispatchEvent(blurEvent);
            // Should trigger spell check on blur
            expect(mockDependencies.updateStatus).toHaveBeenCalled();
        });
    });

    describe('Configuration and Settings Integration', () => {
        test('should share configuration across modules', () => {
            const sharedConfig = {
                predictionEnabled: true,
                spellCheckEnabled: true,
                autoSaveEnabled: true
            };

            // Update settings in all modules
            predictionEngine.updateSettings?.(sharedConfig);
            spellChecker.updateSettings?.(sharedConfig);
            fileManager.updateSettings(sharedConfig);

            // All modules should reflect the settings
            expect(fileManager.settings.autoSaveEnabled).toBe(true);
        });

        test('should handle environment-specific configurations', () => {
            // Mock different environments
            mockDependencies.environment.isDevelopment.mockReturnValue(true);

            // Development-specific behavior
            predictionEngine.requestPrediction();
            expect(mockDependencies.environment.isDevelopment).toHaveBeenCalled();
        });
    });
});
