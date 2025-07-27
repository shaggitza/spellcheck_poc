/**
 * Unit Tests for PredictionEngine Module
 * Tests the core prediction functionality including:
 * - Prediction request handling
 * - Inline suggestion display
 * - Partial and full suggestion acceptance
 * - State management
 */

const path = require('path');

// Import the PredictionEngine class
const PredictionEngine = require(path.join(__dirname, '../../static/prediction-engine.js'));

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

describe('PredictionEngine', () => {
    let predictionEngine;
    let mockDependencies;
    let mockElements;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';
        mockElements = createMockDOMElements();
        document.body.appendChild(mockElements.textEditor);
        document.body.appendChild(mockElements.predictionText);

        // Setup mock dependencies
        mockDependencies = {
            websocket: jest.fn(() => createMockWebSocket()),
            validator: createMockValidator(),
            errorHandler: createMockErrorHandler(),
            environment: createMockEnvironment(),
            utils: createMockUtils(),
            config: createMockConfig(),
            textEditor: mockElements.textEditor,
            predictionText: mockElements.predictionText,
            getEditorContent: jest.fn(() => 'Test content'),
            getCursorPosition: jest.fn(() => 5),
            setCursorPosition: jest.fn(),
            getParagraphContext: jest.fn(() => ({
                prevContext: '',
                currentText: 'Test content',
                afterContext: '',
                cursor: 5,
                paragraphIndex: 0,
                totalParagraphs: 1
            })),
            isAtWordBoundary: jest.fn(() => true),
            handleTextChange: jest.fn(),
            clearTimeoutSafe: jest.fn(),
            setTimeoutSafe: jest.fn((callback, delay) => {
                // Use real setTimeout for testing
                return setTimeout(callback, delay || 0);
            })
        };

        predictionEngine = new PredictionEngine(mockDependencies);
    });

    afterEach(() => {
        if (predictionEngine && typeof predictionEngine.destroy === 'function') {
            predictionEngine.destroy();
        }
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with correct dependencies', () => {
            expect(predictionEngine.getWebSocket).toBe(mockDependencies.websocket);
            expect(predictionEngine.validator).toBe(mockDependencies.validator);
            expect(predictionEngine.errorHandler).toBe(mockDependencies.errorHandler);
            expect(predictionEngine.environment).toBe(mockDependencies.environment);
            expect(predictionEngine.utils).toBe(mockDependencies.utils);
        });

        test('should initialize with default state', () => {
            expect(predictionEngine.currentPrediction).toBeNull();
            expect(predictionEngine.suggestionVisible).toBe(false);
            expect(predictionEngine.isTyping).toBe(false);
            expect(predictionEngine.preserveSuggestion).toBe(false);
        });

        test('should initialize prediction functionality', () => {
            const initializeSpy = jest.spyOn(predictionEngine, 'initialize');
            predictionEngine.initialize();
            expect(initializeSpy).toHaveBeenCalled();
        });
    });

    describe('Prediction Response Handling', () => {
        test('should handle prediction response correctly', () => {
            const prediction = 'predicted text';
            const cursorPosition = 5;
            const metadata = { original_cursor_position: 5 };

            predictionEngine.handlePredictionResponse(prediction, cursorPosition, metadata);

            expect(predictionEngine.currentPrediction).toEqual({
                text: prediction,
                position: cursorPosition,
                metadata: metadata
            });
        });

        test('should update prediction display', () => {
            const prediction = 'test prediction';
            
            predictionEngine.updatePrediction(prediction);
            
            expect(mockElements.predictionText.textContent).toBe(prediction);
        });

        test('should show no prediction message for empty prediction', () => {
            predictionEngine.updatePrediction('');
            
            expect(mockElements.predictionText.textContent).toBe('No prediction (empty line or no context)');
        });
    });

    describe('Inline Suggestion Management', () => {
        beforeEach(() => {
            // Mock window.getSelection
            const mockRange = {
                insertNode: jest.fn((node) => {
                    // Actually add the node to the DOM for testing
                    document.body.appendChild(node);
                }),
                setStartBefore: jest.fn(),
                collapse: jest.fn()
            };
            
            window.getSelection.mockReturnValue({
                rangeCount: 1,
                getRangeAt: jest.fn(() => mockRange),
                removeAllRanges: jest.fn(),
                addRange: jest.fn()
            });
        });

        test('should show inline suggestion for valid prediction', () => {
            const prediction = 'suggested text';
            
            predictionEngine.showInlineSuggestion(prediction);
            
            expect(predictionEngine.suggestionVisible).toBe(true);
            
            // Check if suggestion element was created
            const suggestionElement = document.getElementById('current-inline-suggestion');
            expect(suggestionElement).toBeTruthy();
            expect(suggestionElement.textContent).toBe(prediction);
            expect(suggestionElement.className).toBe('inline-suggestion-text');
        });

        test('should not show suggestion for empty prediction', () => {
            predictionEngine.showInlineSuggestion('');
            
            expect(predictionEngine.suggestionVisible).toBe(false);
        });

        test('should hide inline suggestion', () => {
            // First show a suggestion
            predictionEngine.showInlineSuggestion('test');
            expect(predictionEngine.suggestionVisible).toBe(true);
            
            // Then hide it
            predictionEngine.hideInlineSuggestion();
            
            expect(predictionEngine.suggestionVisible).toBe(false);
            const suggestionElement = document.getElementById('current-inline-suggestion');
            expect(suggestionElement).toBeNull();
        });
    });

    describe('Suggestion Acceptance', () => {
        beforeEach(() => {
            // Setup a current prediction
            predictionEngine.currentPrediction = {
                text: 'hello world test',
                position: 5,
                metadata: {}
            };
            
            // Create and add suggestion element to DOM
            const suggestionElement = createMockElement('span', {
                id: 'current-inline-suggestion',
                class: 'inline-suggestion-text'
            });
            suggestionElement.textContent = 'hello world test';
            mockElements.textEditor.appendChild(suggestionElement);
            
            predictionEngine.suggestionVisible = true;
        });

        test('should accept full inline suggestion', () => {
            predictionEngine.acceptInlineSuggestion();
            
            expect(predictionEngine.currentPrediction).toBeNull();
            expect(predictionEngine.suggestionVisible).toBe(false);
            expect(mockDependencies.handleTextChange).toHaveBeenCalled();
        });

        test('should accept partial suggestion and preserve remaining text', () => {
            predictionEngine.acceptPartialSuggestion();
            
            // Should still have remaining prediction
            expect(predictionEngine.currentPrediction).toBeTruthy();
            expect(predictionEngine.currentPrediction.text).toContain('world test');
            
            // Should not trigger text change when there's remaining text
            expect(mockDependencies.handleTextChange).not.toHaveBeenCalled();
        });

        test('should handle partial suggestion with single word', () => {
            // Update suggestion to single word
            const suggestionElement = document.getElementById('current-inline-suggestion');
            suggestionElement.textContent = 'single';
            predictionEngine.currentPrediction.text = 'single';
            
            predictionEngine.acceptPartialSuggestion();
            
            // Should clear prediction for single word
            expect(predictionEngine.currentPrediction).toBeNull();
            expect(predictionEngine.suggestionVisible).toBe(false);
            expect(mockDependencies.handleTextChange).toHaveBeenCalled();
        });

        test('should handle no current prediction gracefully', () => {
            predictionEngine.currentPrediction = null;
            
            expect(() => {
                predictionEngine.acceptInlineSuggestion();
            }).not.toThrow();
            
            expect(() => {
                predictionEngine.acceptPartialSuggestion();
            }).not.toThrow();
        });
    });

    describe('Prediction Requests', () => {
        let mockWebSocket;

        beforeEach(() => {
            mockWebSocket = createMockWebSocket();
            mockDependencies.websocket.mockReturnValue(mockWebSocket);
        });

        test('should request prediction when conditions are met', () => {
            // Mock setTimeoutSafe to execute callback immediately
            predictionEngine.setTimeoutSafe = jest.fn((callback, delay) => {
                callback(); // Execute immediately
                return 123; // Return a fake timer ID
            });
            
            predictionEngine.requestPrediction();
            
            expect(mockDependencies.getEditorContent).toHaveBeenCalled();
            expect(mockDependencies.getCursorPosition).toHaveBeenCalled();
            expect(mockDependencies.getParagraphContext).toHaveBeenCalled();
        });

        test('should not request prediction when WebSocket is not connected', () => {
            mockWebSocket.readyState = WebSocket.CLOSED;
            
            predictionEngine.requestPrediction();
            
            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });

        test('should not request prediction when not at word boundary', () => {
            mockDependencies.isAtWordBoundary.mockReturnValue(false);
            
            predictionEngine.requestPrediction();
            
            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });

        test('should respect preserveSuggestion flag', () => {
            predictionEngine.preserveSuggestion = true;
            const hideInlineSuggestionSpy = jest.spyOn(predictionEngine, 'hideInlineSuggestion');
            
            predictionEngine.requestPrediction();
            
            expect(hideInlineSuggestionSpy).not.toHaveBeenCalled();
        });
    });

    describe('State Management', () => {
        test('should set typing state', () => {
            predictionEngine.setTypingState(true);
            expect(predictionEngine.isTyping).toBe(true);
            
            predictionEngine.setTypingState(false);
            expect(predictionEngine.isTyping).toBe(false);
        });

        test('should return current prediction state', () => {
            const prediction = { text: 'test', position: 0, metadata: {} };
            predictionEngine.currentPrediction = prediction;
            
            expect(predictionEngine.getCurrentPrediction()).toBe(prediction);
        });

        test('should return suggestion visibility state', () => {
            predictionEngine.suggestionVisible = true;
            expect(predictionEngine.isSuggestionVisible()).toBe(true);
            
            predictionEngine.suggestionVisible = false;
            expect(predictionEngine.isSuggestionVisible()).toBe(false);
        });

        test('should clear prediction state', () => {
            predictionEngine.currentPrediction = { text: 'test' };
            predictionEngine.suggestionVisible = true;
            
            predictionEngine.clearPrediction();
            
            expect(predictionEngine.currentPrediction).toBeNull();
            expect(predictionEngine.suggestionVisible).toBe(false);
        });
    });

    describe('Key Event Handling', () => {
        beforeEach(() => {
            predictionEngine.suggestionVisible = true;
            predictionEngine.currentPrediction = { text: 'test suggestion' };
        });

        test('should handle Tab key to accept suggestion', () => {
            const acceptSpy = jest.spyOn(predictionEngine, 'acceptInlineSuggestion');
            const event = { key: 'Tab', preventDefault: jest.fn() };
            
            const result = predictionEngine.handleKeyEvent(event);
            
            expect(result).toBe(true);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(acceptSpy).toHaveBeenCalled();
        });

        test('should handle Escape key to hide suggestion', () => {
            const hideSpy = jest.spyOn(predictionEngine, 'hideInlineSuggestion');
            const event = { key: 'Escape', preventDefault: jest.fn() };
            
            const result = predictionEngine.handleKeyEvent(event);
            
            expect(result).toBe(true);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(hideSpy).toHaveBeenCalled();
        });

        test('should handle Ctrl+Right Arrow for partial acceptance', () => {
            const partialSpy = jest.spyOn(predictionEngine, 'acceptPartialSuggestion');
            const event = { 
                key: 'ArrowRight', 
                ctrlKey: true, 
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };
            
            const result = predictionEngine.handleKeyEvent(event);
            
            expect(result).toBe(true);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(partialSpy).toHaveBeenCalled();
        });

        test('should hide suggestion on disruptive keys', () => {
            // First make suggestion visible
            predictionEngine.suggestionVisible = true;
            const hideSpy = jest.spyOn(predictionEngine, 'hideInlineSuggestion');
            
            ['Enter', ' ', 'Backspace', 'Delete'].forEach(key => {
                predictionEngine.suggestionVisible = true; // Reset for each key
                const event = { key };
                predictionEngine.handleKeyEvent(event);
                expect(hideSpy).toHaveBeenCalled();
                hideSpy.mockClear();
            });
        });

        test('should block Ctrl+Right Arrow when no suggestions visible', () => {
            predictionEngine.suggestionVisible = false;
            const event = { 
                key: 'ArrowRight', 
                ctrlKey: true, 
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };
            
            const result = predictionEngine.handleKeyEvent(event);
            
            expect(result).toBe(true);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('Cleanup and Memory Management', () => {
        test('should cleanup resources on destroy', () => {
            predictionEngine.predictionTimeout = setTimeout(() => {}, 1000);
            predictionEngine.currentPrediction = { text: 'test' };
            
            predictionEngine.destroy();
            
            expect(mockDependencies.clearTimeoutSafe).toHaveBeenCalled();
            expect(predictionEngine.currentPrediction).toBeNull();
        });
    });
});
