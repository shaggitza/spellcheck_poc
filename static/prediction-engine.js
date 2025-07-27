/**
 * PredictionEngine Module
 * Handles next token prediction functionality including:
 * - WebSocket communication for prediction requests
 * - Inline suggestion display and management
 * - Cursor position tracking and word boundary detection
 * - Suggestion acceptance (full and partial)
 * - Prediction debouncing and timing
 */

class PredictionEngine {
    constructor(dependencies = {}) {
        // Dependencies injection (accept both 'dependencies' and 'options' style)
        const options = dependencies.options || dependencies;
        this.getWebSocket = options.websocket || dependencies.websocket; // This should be a function that returns the websocket
        this.validator = options.validator || dependencies.validator;
        this.errorHandler = options.errorHandler || dependencies.errorHandler;
        this.environment = options.environment || dependencies.environment;
        this.utils = options.utils || dependencies.utils;
        this.config = options.config || dependencies.config;

        // DOM elements
        this.textEditor = options.textEditor || dependencies.textEditor;
        this.predictionText = options.predictionText || dependencies.predictionText;

        // Required callbacks from TextEditor
        this.getEditorContent = options.getEditorContent || dependencies.getEditorContent;
        this.getCursorPosition = options.getCursorPosition || dependencies.getCursorPosition;
        this.setCursorPosition = options.setCursorPosition || dependencies.setCursorPosition;
        this.getParagraphContext = options.getParagraphContext || dependencies.getParagraphContext;
        this.isAtWordBoundary = options.isAtWordBoundary || dependencies.isAtWordBoundary;
        this.handleTextChange = options.handleTextChange || dependencies.handleTextChange;
        this.clearTimeoutSafe = options.clearTimeoutSafe || dependencies.clearTimeoutSafe;
        this.setTimeoutSafe = options.setTimeoutSafe || dependencies.setTimeoutSafe;

        // Prediction state
        this.currentPrediction = null;
        this.suggestionVisible = false;
        this.predictionTimeout = null;
        this.isTyping = false;
        this.preserveSuggestion = false; // Flag to preserve suggestion during partial acceptance
        this.predictionEnabled = true; // Whether prediction is enabled

        console.log('✅ PredictionEngine initialized');
    }

    /**
     * Initialize prediction functionality
     */
    initialize() {
        this.setupKeyboardHandlers();
        console.log('✅ PredictionEngine keyboard handlers initialized');
    }

    /**
     * Setup keyboard event handlers for suggestion controls
     */
    setupKeyboardHandlers() {
        // These handlers are called from TextEditor's handleKeyDown method
        // No direct event listeners needed since TextEditor manages keyboard events
        console.log('PredictionEngine keyboard handlers ready');
    }

    /**
     * Handle prediction response from WebSocket
     */
    handlePredictionResponse(prediction, cursorPosition, metadata = {}) {
        console.log('PredictionEngine: Received prediction:', {
            prediction,
            cursorPosition,
            metadata,
        });

        this.currentPrediction = {
            text: prediction,
            position: cursorPosition,
            metadata: metadata,
        };

        // Update the bottom prediction display
        this.updatePrediction(prediction);

        // Show inline suggestion if we have a meaningful prediction
        const currentCursorPos = this.getCursorPosition();
        console.log(
            'Current cursor position:',
            currentCursorPos,
            'Expected (relative):',
            cursorPosition
        );

        // For contextual predictions, we're more lenient with cursor position matching
        // since we're working with relative positions within paragraph context
        if (
            prediction &&
            prediction.trim() &&
            Math.abs(currentCursorPos - (metadata.original_cursor_position || cursorPosition)) <=
                this.config.TEXT.MAX_CURSOR_POSITION_TOLERANCE
        ) {
            this.showInlineSuggestion(prediction);
        } else {
            console.log('Prediction not shown - cursor position mismatch or empty prediction');
            this.hideInlineSuggestion();
        }
    }

    /**
     * Show inline suggestion in the editor
     */
    showInlineSuggestion(prediction) {
        if (!prediction || !prediction.trim()) {
            this.hideInlineSuggestion();
            return;
        }

        console.log('PredictionEngine: Showing inline suggestion:', prediction);

        try {
            // Remove any existing inline suggestions
            this.hideInlineSuggestion();

            // Create a span element for the inline suggestion
            const suggestionSpan = document.createElement('span');
            suggestionSpan.className = 'inline-suggestion-text';
            suggestionSpan.textContent = prediction;
            suggestionSpan.id = 'current-inline-suggestion';

            // Insert using selection/range
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.insertNode(suggestionSpan);

                // Move cursor back to before the suggestion
                range.setStartBefore(suggestionSpan);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // No valid selection - cannot show inline suggestion
                console.warn('Cannot show inline suggestion: no valid selection range');
                return;
            }

            this.suggestionVisible = true;

            console.log('PredictionEngine: Inline suggestion displayed');
        } catch (error) {
            console.error('Error showing inline suggestion:', error);
            this.hideInlineSuggestion();
        }
    }

    /**
     * Hide inline suggestion
     */
    hideInlineSuggestion() {
        // Remove any existing inline suggestions
        const existingSuggestion = document.getElementById(
            this.config.SELECTORS.CURRENT_SUGGESTION.slice(1)
        );
        if (existingSuggestion) {
            existingSuggestion.remove();
        }

        this.suggestionVisible = false;
    }

    /**
     * Accept full inline suggestion
     */
    acceptInlineSuggestion() {
        if (!this.currentPrediction) return;

        try {
            const suggestionElement = document.getElementById(
                this.config.SELECTORS.CURRENT_SUGGESTION.slice(1)
            );

            if (suggestionElement) {
                // Replace suggestion span with plain text
                const textNode = document.createTextNode(suggestionElement.textContent);
                suggestionElement.parentNode.insertBefore(textNode, suggestionElement);
                suggestionElement.remove();

                // Position cursor after the inserted text
                const selection = window.getSelection();
                const range = document.createRange();
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            // Clear prediction state
            this.currentPrediction = null;
            this.suggestionVisible = false;

            // Trigger text change to update predictions and save
            this.handleTextChange();

            // Focus back on editor
            this.textEditor.focus();
        } catch (error) {
            console.error('Error applying suggestion:', error);
            // Fallback: just focus the editor
            this.textEditor.focus();
        }
    }

    /**
     * Accept partial inline suggestion (one word)
     */
    acceptPartialSuggestion() {
        console.log('PredictionEngine: acceptPartialSuggestion called', {
            currentPrediction: this.currentPrediction,
            suggestionVisible: this.suggestionVisible,
        });

        if (!this.currentPrediction) {
            console.log('No current prediction available');
            return;
        }

        try {
            const suggestionElement = document.getElementById(
                this.config.SELECTORS.CURRENT_SUGGESTION.slice(1)
            );
            console.log('Suggestion element found:', !!suggestionElement);

            if (suggestionElement) {
                const suggestionText = suggestionElement.textContent;

                console.log('Debug suggestion text:', {
                    text: suggestionText,
                    length: suggestionText.length,
                    charCodes: Array.from(suggestionText).map(c => c.charCodeAt(0)),
                    repr: JSON.stringify(suggestionText),
                });

                // Don't trim - preserve all original spacing
                if (!suggestionText || !suggestionText.trim()) {
                    console.log('Suggestion text is empty or only whitespace');
                    return;
                }

                console.log('Processing suggestion text:', {
                    text: suggestionText,
                    length: suggestionText.length,
                    repr: JSON.stringify(suggestionText),
                });

                // Find the first word and preserve the original spacing before and after it
                // This regex captures: (optional leading whitespace)(first word)(everything else)
                const wordMatch = suggestionText.match(/^(\s*)(\S+)(.*)$/);
                if (!wordMatch) {
                    console.log('Could not parse first word from suggestion');
                    return;
                }

                const leadingSpace = wordMatch[1];
                const firstWord = wordMatch[2];
                const remainingText = wordMatch[3]; // This preserves original spacing after the first word

                console.log('Partial suggestion breakdown:', {
                    original: suggestionText,
                    originalRepr: JSON.stringify(suggestionText),
                    leadingSpace: leadingSpace,
                    leadingSpaceRepr: JSON.stringify(leadingSpace),
                    firstWord: firstWord,
                    firstWordRepr: JSON.stringify(firstWord),
                    remaining: remainingText,
                    remainingRepr: JSON.stringify(remainingText),
                    remainingLength: remainingText.length,
                    hasRemaining: remainingText.length > 0,
                });

                // Replace suggestion with first word as plain text (including any leading space)
                const textNode = document.createTextNode(leadingSpace + firstWord);
                suggestionElement.parentNode.insertBefore(textNode, suggestionElement);

                if (remainingText && remainingText.trim()) {
                    console.log('Before updating suggestion element:', {
                        elementText: suggestionElement.textContent,
                        elementRepr: JSON.stringify(suggestionElement.textContent),
                        newRemainingText: remainingText,
                        newRemainingRepr: JSON.stringify(remainingText),
                    });

                    // Update suggestion with remaining text (preserve original spacing)
                    suggestionElement.textContent = remainingText;

                    console.log('After updating suggestion element:', {
                        elementText: suggestionElement.textContent,
                        elementRepr: JSON.stringify(suggestionElement.textContent),
                    });

                    // Position cursor between accepted text and remaining suggestion
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Update current prediction with remaining text
                    if (this.currentPrediction) {
                        this.currentPrediction.text = remainingText;
                        console.log(
                            'Updated currentPrediction.text:',
                            JSON.stringify(this.currentPrediction.text)
                        );
                    }

                    // Don't trigger text change when there are remaining words
                    // This prevents automatic prediction requests and lets user continue partial acceptance
                    console.log(
                        'Partial acceptance complete - remaining words available, not triggering prediction request'
                    );
                } else {
                    // No remaining text, remove suggestion completely
                    suggestionElement.remove();
                    this.currentPrediction = null;
                    this.suggestionVisible = false;

                    // Position cursor after accepted text
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Only trigger text change when all words are accepted
                    this.handleTextChange();
                    console.log(
                        'All words accepted - triggering text change and prediction request'
                    );
                }
            } else {
                // Fallback if no suggestion element found - still trigger text change
                console.log('No suggestion element found - triggering text change');
                this.handleTextChange();
            }

            // Focus back on editor
            this.textEditor.focus();
        } catch (error) {
            console.error('Error applying partial suggestion:', error);
            this.textEditor.focus();
        }
    }

    /**
     * Request prediction from server
     */
    requestPrediction() {
        try {
            // Skip if prediction is disabled
            if (!this.predictionEnabled) {
                if (this.environment.isDevelopment()) {
                    console.log('Skipping prediction - predictions disabled');
                }
                this.hideInlineSuggestion();
                this.updatePrediction('Predictions disabled');
                return;
            }

            // Start performance timer in development
            const timer = this.environment.startTimer('prediction-request');

            const websocket = this.getWebSocket();
            if (!websocket || websocket.readyState !== WebSocket.OPEN) {
                if (this.environment.isDevelopment()) {
                    console.log('Cannot request prediction - WebSocket not connected');
                }
                return;
            }

            // Check if user has text selected - don't predict if they do
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
                if (this.environment.isDevelopment()) {
                    console.log('Skipping prediction - user has text selected');
                }
                if (!this.preserveSuggestion) {
                    this.hideInlineSuggestion();
                }
                this.updatePrediction(''); // Clear bottom prediction display
                return;
            }

            // Check if we're at a word boundary - only predict at word boundaries
            if (!this.isAtWordBoundary()) {
                if (this.environment.isDevelopment()) {
                    console.log('Skipping prediction - cursor is in middle of word');
                }
                if (!this.preserveSuggestion) {
                    this.hideInlineSuggestion();
                }
                this.updatePrediction(''); // Clear bottom prediction display
                return;
            }

            // Hide current suggestion when requesting new one (unless we're preserving it)
            if (!this.preserveSuggestion) {
                this.hideInlineSuggestion();
            }

            // Debounce prediction requests - longer delay if user is actively typing
            this.clearTimeoutSafe(this.predictionTimeout);
            const delay = this.isTyping
                ? this.config.TIMING.PREDICTION_DEBOUNCE_TYPING
                : this.config.TIMING.PREDICTION_DEBOUNCE;

            this.predictionTimeout = this.setTimeoutSafe(() => {
                try {
                    // Re-check WebSocket connection before sending (connection might have changed)
                    const currentWebsocket = this.getWebSocket();
                    if (!currentWebsocket || currentWebsocket.readyState !== WebSocket.OPEN) {
                        if (this.environment.isDevelopment()) {
                            console.log(
                                'Cannot send prediction request - WebSocket disconnected during debounce'
                            );
                        }
                        return;
                    }

                    const fullContent = this.getEditorContent();
                    const cursorPosition = this.getCursorPosition();

                    // Extract structured paragraph context on frontend
                    const context = this.getParagraphContext(fullContent, cursorPosition);

                    if (this.environment.isDevelopment()) {
                        console.log('PredictionEngine: Sending structured prediction request:', {
                            prevContextLength: context.prevContext.length,
                            currentTextLength: context.currentText.length,
                            afterContextLength: context.afterContext.length,
                            cursor: context.cursor,
                            paragraphIndex: context.paragraphIndex,
                        });
                    }

                    const message = {
                        type: 'prediction_request',
                        prevContext: context.prevContext,
                        currentText: context.currentText,
                        afterContext: context.afterContext,
                        cursor: context.cursor,
                        metadata: {
                            paragraph_index: context.paragraphIndex,
                            total_paragraphs: context.totalParagraphs,
                            original_cursor_position: cursorPosition,
                        },
                    };

                    // Validate the message before sending
                    const validation = this.validator.validateWebSocketMessage(message);
                    if (!validation.isValid) {
                        const errorMessage = this.validator.formatErrors(validation);
                        this.errorHandler.handleError(
                            new Error(errorMessage),
                            'validation',
                            'Invalid prediction request format'
                        );
                        return;
                    }

                    currentWebsocket.send(JSON.stringify(message));

                    // Log network request in development
                    if (this.environment.isDevelopment()) {
                        this.environment.logNetworkRequest(
                            'WS_SEND',
                            'prediction_request',
                            timer.end(),
                            true
                        );
                    }
                } catch (error) {
                    this.errorHandler.handleError(
                        error,
                        'prediction',
                        'Failed to send prediction request'
                    );
                }
            }, delay);
        } catch (error) {
            this.errorHandler.handleError(error, 'prediction', 'Error in requestPrediction');
        }
    }

    /**
     * Update the bottom prediction display
     */
    updatePrediction(prediction) {
        if (prediction && prediction.trim()) {
            this.predictionText.textContent = prediction;
        } else {
            this.predictionText.textContent = 'No prediction (empty line or no context)';
        }
    }

    /**
     * Set typing state for debouncing
     */
    setTypingState(isTyping) {
        this.isTyping = isTyping;
    }

    /**
     * Get current prediction state
     */
    getCurrentPrediction() {
        return this.currentPrediction;
    }

    /**
     * Get suggestion visibility state
     */
    isSuggestionVisible() {
        return this.suggestionVisible;
    }

    /**
     * Clear current prediction
     */
    clearPrediction() {
        this.currentPrediction = null;
        this.hideInlineSuggestion();
        this.updatePrediction('');
    }

    /**
     * Enable or disable predictions
     */
    setPredictionEnabled(enabled) {
        this.predictionEnabled = enabled;

        if (!enabled) {
            // Hide any active suggestions and clear prediction
            this.clearPrediction();
        } else {
            // Re-request prediction if enabled and we have content
            if (this.getEditorContent && this.getEditorContent().trim()) {
                this.requestPrediction();
            }
        }
    }

    /**
     * Get current prediction enabled state
     */
    isPredictionEnabled() {
        return this.predictionEnabled;
    }

    /**
     * Handle key events for suggestion controls
     */
    handleKeyEvent(e) {
        // Handle suggestion controls when suggestion is visible
        if (this.suggestionVisible) {
            console.log('PredictionEngine: Processing key in suggestion controls:', {
                key: e.key,
                ctrlKey: e.ctrlKey,
            });

            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    this.acceptInlineSuggestion();
                    return true; // Event handled
                case 'Escape':
                    e.preventDefault();
                    this.hideInlineSuggestion();
                    return true; // Event handled
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        console.log('Ctrl + Right Arrow - attempting partial acceptance');
                        e.preventDefault();
                        e.stopPropagation();
                        this.acceptPartialSuggestion();
                        return true; // Event handled
                    }
                    break;
                case ' ':
                case 'Enter':
                case 'Backspace':
                case 'Delete':
                    // Hide suggestion on these keys
                    this.hideInlineSuggestion();
                    break;
            }
        }

        // Handle Ctrl + Right Arrow blocking when no suggestions
        if (e.key === 'ArrowRight' && e.ctrlKey && !this.suggestionVisible) {
            console.log('PredictionEngine: Ctrl + Right Arrow blocked - no suggestions visible');
            e.preventDefault();
            e.stopPropagation();
            return true; // Event handled
        }

        return false; // Event not handled
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.clearTimeoutSafe(this.predictionTimeout);
        this.hideInlineSuggestion();
        this.currentPrediction = null;
        console.log('✅ PredictionEngine destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PredictionEngine;
} else {
    window.PredictionEngine = PredictionEngine;
}
