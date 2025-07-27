/**
 * SpellChecker - Handles all spell checking functionality including error detection,
 * highlighting, suggestions, and dictionary management.
 * Part of the modular refactoring of the TextEditor application.
 */

class SpellChecker {
    constructor(dependencies) {
        // Dependencies from the main TextEditor
        this.utils = dependencies.utils;
        this.validator = dependencies.validator;
        this.errorHandler = dependencies.errorHandler;
        this.environment = dependencies.environment;
        this.config = dependencies.config;

        // WebSocket and connection management
        this.getWebSocket = dependencies.getWebSocket || dependencies.websocket;
        this.getConnectionState = dependencies.getConnectionState;

        // Editor content and cursor management
        this.getEditorContent = dependencies.getEditorContent;
        this.getCursorPosition = dependencies.getCursorPosition;
        this.setCursorPosition = dependencies.setCursorPosition;
        this.updateEditorContent = dependencies.updateEditorContent;
        this.getTextEditor = dependencies.getTextEditor;

        // State management callbacks
        this.getIsTyping = dependencies.getIsTyping;
        this.getSuggestionVisible = dependencies.getSuggestionVisible;

        // FileManager integration
        this.fileManager = dependencies.fileManager;

        // Timeout management
        this.setTimeoutSafe = dependencies.setTimeoutSafe;
        this.clearTimeoutSafe = dependencies.clearTimeoutSafe;

        // UI callbacks
        this.showSpinner = dependencies.showSpinner;
        this.hideSpinner = dependencies.hideSpinner;
        this.updateStatus = dependencies.updateStatus;
        this.removeSpellingHighlights = dependencies.removeSpellingHighlights;

        // DOM elements
        this.textEditor = dependencies.textEditor;
        this.suggestionsList = dependencies.suggestionsList;

        // Text change and dictionary management
        this.handleTextChange = dependencies.handleTextChange;
        this.addWordToDictionaryCallback = dependencies.addWordToDictionary;

        // State initialization
        this.isChecking = false;
        this.currentErrors = [];
        this.lastKnownContent = '';
        this.selectedSuggestion = null;
        this.currentErrorIndex = 0;
        this.checkTimeout = null;
        this.settings = {
            enableAutoCheck: true,
            checkInterval: 1000,
            maxSuggestions: 5,
        };

        // Legacy state (for compatibility)
        this.spellErrors = {};
        this.spellCheckingEnabled = true;
        this.spellCheckTimeout = null;

        // Initialize debounced methods
        this.setupDebouncedMethods();
    }

    /**
     * Initialize spell checking functionality
     */
    initialize() {
        // Spell checker initialization is done in constructor
        // This method exists for testing compatibility
        console.log('SpellChecker initialized');
    }

    /**
     * Check if there are any spell errors
     * @returns {boolean} True if there are spell errors
     */
    hasSpellErrors() {
        return Object.keys(this.spellErrors).length > 0;
    }

    /**
     * Clear all spell check error badges and reset error cache
     */
    clearSpellCheckBadges() {
        // Remove all spell check error count badges
        const badges = this.textEditor.querySelectorAll(
            `.${this.config.CSS_CLASSES.ERROR_COUNT_BADGE}`
        );
        badges.forEach(badge => {
            console.log('Removing spell check badge:', badge.textContent);
            badge.remove();
        });

        // Also clear the stored spell errors since they're no longer valid
        this.spellErrors = {};

        console.log('Cleared all spell check badges and error cache');
    }

    /**
     * Setup debounced spell check method
     */
    setupDebouncedMethods() {
        this.debouncedSpellCheck = this.utils.debounce(() => {
            this.requestSpellCheck();
        }, this.config.TIMING.SPELL_CHECK_DEBOUNCE);
    }

    /**
     * Request spell check from the server
     */
    requestSpellCheck() {
        try {
            if (
                !this.fileManager.hasCurrentFile() ||
                !this.getConnectionState() ||
                !this.spellCheckingEnabled
            ) {
                return;
            }

            // MODIFIED: Don't skip spell check just because prediction is active
            // Both systems should be able to work in parallel
            // if (
            //     this.getSuggestionVisible() &&
            //     document.getElementById(this.config.SELECTORS.CURRENT_SUGGESTION.slice(1))
            // ) {
            //     console.log('Skipping spell check request - inline suggestion is active');
            //     return;
            // }

            // Clear existing timeout
            this.clearTimeoutSafe(this.spellCheckTimeout);

            // Debounce spell check requests
            this.spellCheckTimeout = this.setTimeoutSafe(() => {
                try {
                    // MODIFIED: Allow spell check even if prediction is active
                    // if (
                    //     this.getSuggestionVisible() &&
                    //     document.getElementById(this.config.SELECTORS.CURRENT_SUGGESTION.slice(1))
                    // ) {
                    //     console.log(
                    //         'Skipping delayed spell check - inline suggestion is still active'
                    //     );
                    //     return;
                    // }

                    const content = this.getEditorContent();
                    const lines = content.split('\n\n').map(p => p.replace(/\n/g, ' ')); // Convert paragraphs to lines

                    console.log('Requesting spell check for', lines.length, 'lines');

                    const message = {
                        type: 'spell_check_request',
                        lines: lines,
                        language: this.config.SPELL_CHECK.DEFAULT_LANGUAGE,
                    };

                    // Validate the message before sending
                    const validation = this.validator.validateWebSocketMessage(message);
                    if (!validation.isValid) {
                        const errorMessage = this.validator.formatErrors(validation);
                        this.errorHandler.handleError(
                            new Error(errorMessage),
                            'validation',
                            'Invalid spell check request format'
                        );
                        return;
                    }

                    const ws = this.getWebSocket();
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(message));
                    }
                } catch (error) {
                    this.errorHandler.handleError(
                        error,
                        'spell-check',
                        'Failed to send spell check request'
                    );
                }
            }, this.config.TIMING.SPELL_CHECK_DEBOUNCE);
        } catch (error) {
            this.errorHandler.handleError(error, 'spell-check', 'Error in requestSpellCheck');
        }
    }

    /**
     * Handle spell check response from server
     */
    handleSpellCheckResponse(errors, _language) {
        console.log('=== SPELL CHECK RESPONSE ===');
        console.log('Raw errors received:', errors);
        console.log('Number of lines with errors:', Object.keys(errors).length);

        // Log detailed information about each error
        Object.keys(errors).forEach(lineIndex => {
            const lineErrors = errors[lineIndex];
            console.log(`Line ${lineIndex}: ${lineErrors.length} errors`);
            lineErrors.forEach((error, idx) => {
                console.log(
                    `  Error ${idx + 1}: word="${error.word}", suggestions=[${error.suggestions.slice(0, 5).join(', ')}${error.suggestions.length > 5 ? '...' : ''}] (${error.suggestions.length} total)`
                );
            });
        });

        this.spellErrors = errors;

        // MODIFIED: Allow highlighting even if prediction is active, but be more careful about DOM manipulation
        const hasActivePrediction =
            this.getSuggestionVisible() && document.getElementById('current-inline-suggestion');
        if (hasActivePrediction) {
            console.log(
                'Inline suggestion is active but still highlighting spell errors (with caution)'
            );
        }

        // If user is actively typing, delay highlighting to avoid cursor jumping
        if (this.getIsTyping()) {
            console.log('User is typing, delaying spell error highlighting');
            // Use a longer delay that accounts for the typing timeout (1000ms) plus buffer
            this.clearTimeoutSafe(this.highlightingTimeout);
            this.highlightingTimeout = this.setTimeoutSafe(() => {
                if (!this.getIsTyping()) {
                    console.log('Typing stopped, now highlighting errors');
                    this.highlightSpellingErrors();
                } else {
                    console.log('Still typing, retrying highlighting in 200ms');
                    // Retry with shorter delay if still typing
                    this.highlightingTimeout = this.setTimeoutSafe(() => {
                        console.log('Force highlighting spell errors after extended delay');
                        this.highlightSpellingErrors();
                    }, 200);
                }
            }, 1200); // 1000ms typing timeout + 200ms buffer
        } else {
            console.log('User not typing, highlighting errors immediately');
            this.highlightSpellingErrors();
        }
        console.log('=== END SPELL CHECK RESPONSE ===');
    }

    /**
     * Highlight spelling errors in the editor
     */
    highlightSpellingErrors(isRetry = false) {
        console.log(
            'Starting highlightSpellingErrors with errors:',
            this.spellErrors,
            'isRetry:',
            isRetry
        );

        // MODIFIED: Allow highlighting even if prediction is active in normal highlighting
        const hasActivePrediction =
            this.getSuggestionVisible() && document.getElementById('current-inline-suggestion');
        if (hasActivePrediction) {
            console.log(
                'Inline suggestion is active but still highlighting spell errors (with caution)'
            );
        }

        // Save current cursor position before DOM manipulation
        const savedCursorPosition = this.getCursorPosition();
        const textEditor = this.getTextEditor();

        try {
            // Clear existing error highlights
            this.clearSpellErrorHighlights();

            // Get all paragraphs
            const paragraphs = Array.from(textEditor.querySelectorAll('p'));
            console.log(`Found ${paragraphs.length} paragraphs for spell checking`);

            let totalHighlightedCount = 0;
            let totalErrorCount = 0;

            // Process each paragraph
            paragraphs.forEach((paragraph, paragraphIndex) => {
                const lineErrors = this.spellErrors[paragraphIndex] || [];
                if (lineErrors.length === 0) return;

                console.log(
                    `Processing paragraph ${paragraphIndex} with ${lineErrors.length} errors`
                );

                // Get all word tokens in this paragraph
                const wordTokens = Array.from(paragraph.querySelectorAll('.word-token'));
                let highlightedCount = 0;

                // Process each error in this line
                lineErrors.forEach(error => {
                    const errorWord = error.word.toLowerCase();
                    console.log(`Looking for error word: "${errorWord}"`);

                    // Find matching word tokens
                    wordTokens.forEach(token => {
                        const tokenWord = token.getAttribute('data-word');
                        if (
                            tokenWord === errorWord &&
                            !token.querySelector('.spell-error-highlight')
                        ) {
                            // Create error highlight span
                            const errorSpan = this.utils.createElement(
                                'span',
                                {
                                    'className': 'spell-error-highlight',
                                    'data-word': errorWord,
                                    'data-suggestions': JSON.stringify(error.suggestions),
                                    'style': {
                                        textDecoration: 'underline wavy red',
                                        cursor: 'pointer',
                                    },
                                },
                                token.textContent
                            );

                            // Add event listeners for spell error interactions
                            errorSpan.addEventListener('click', e => this.handleSpellErrorClick(e));
                            errorSpan.addEventListener('contextmenu', e =>
                                this.handleSpellErrorRightClick(e)
                            );

                            // Replace token content with error span
                            token.innerHTML = '';
                            token.appendChild(errorSpan);

                            highlightedCount++;
                            console.log(`Highlighted error word: "${errorWord}"`);
                        }
                    });
                });

                totalHighlightedCount += highlightedCount;
                totalErrorCount += lineErrors.length;

                // Add error count badge to paragraph
                if (lineErrors.length > 0) {
                    this.addErrorCountBadge(paragraph, highlightedCount, lineErrors.length);
                }
            });

            console.log(
                `Spell check highlighting complete: ${totalHighlightedCount}/${totalErrorCount} errors highlighted`
            );

            // Restore cursor position
            if (savedCursorPosition !== null) {
                setTimeout(() => {
                    this.setCursorPosition(savedCursorPosition);
                }, 10);
            }
        } catch (error) {
            this.errorHandler.handleError(
                error,
                'spell-check',
                'Error during spell check highlighting'
            );

            // Retry once if not already retrying
            if (!isRetry) {
                console.log('Retrying spell check highlighting...');
                setTimeout(() => this.highlightSpellingErrors(true), 100);
            }
        }
    }

    /**
     * Clear all spell error highlights
     */
    clearSpellErrorHighlights() {
        const textEditor = this.getTextEditor();

        // Remove all error highlight spans
        const errorHighlights = textEditor.querySelectorAll('.spell-error-highlight');
        errorHighlights.forEach(highlight => {
            const parent = highlight.parentNode;
            if (parent) {
                parent.textContent = highlight.textContent;
            }
        });

        // Remove all error count badges
        const errorBadges = textEditor.querySelectorAll('.error-count-badge');
        errorBadges.forEach(badge => badge.remove());

        console.log('Cleared all spell check badges and error cache');
    }

    /**
     * Add error count badge to a paragraph
     */
    addErrorCountBadge(paragraph, highlightedCount, totalCount) {
        // Don't add badges if user is actively typing to avoid interference
        if (this.getIsTyping && this.getIsTyping()) {
            console.log('Skipping error badge - user is typing');
            return;
        }

        // Remove existing badge if present
        const existingBadge = paragraph.querySelector('.error-count-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Create new badge - positioned outside the editor area and hidden by default
        const badge = this.utils.createElement(
            'span',
            {
                className: 'error-count-badge',
                style: {
                    position: 'absolute',
                    right: '-35px',
                    top: '2px',
                    backgroundColor: highlightedCount === totalCount ? '#dc3545' : '#ffc107',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    zIndex: '10',
                    opacity: '0.7',
                    pointerEvents: 'none', // Don't interfere with text selection
                    visibility: 'hidden', // Hidden by default, only show on hover
                },
                title: `${highlightedCount}/${totalCount} errors highlighted`,
            },
            totalCount.toString()
        );

        // Show badge only on paragraph hover
        paragraph.addEventListener('mouseenter', () => {
            badge.style.visibility = 'visible';
        });

        paragraph.addEventListener('mouseleave', () => {
            badge.style.visibility = 'hidden';
        });

        // Make paragraph relatively positioned to contain the badge
        if (paragraph.style.position !== 'relative') {
            paragraph.style.position = 'relative';
        }

        paragraph.appendChild(badge);
    }

    /**
     * Handle spell error click event
     */
    handleSpellErrorClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const span = e.target;
        const word = span.getAttribute('data-word');
        const suggestionsJson = span.getAttribute('data-suggestions');

        if (!suggestionsJson) {
            console.warn('No suggestions found for spell error');
            return;
        }

        try {
            const suggestions = JSON.parse(suggestionsJson);
            this.showSpellingSuggestions(span, word, suggestions);
        } catch (error) {
            console.error('Error parsing spell check suggestions:', error);
        }
    }

    /**
     * Handle spell error right-click event
     */
    handleSpellErrorRightClick(e) {
        e.preventDefault();
        this.handleSpellErrorClick(e);
    }

    /**
     * Show spelling suggestions menu
     */
    showSpellingSuggestions(span, word, suggestions) {
        // Remove existing menu if present
        const existingMenu = document.querySelector('.spell-suggestions-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create suggestions menu
        const menu = this.utils.createElement('div', {
            className: 'spell-suggestions-menu',
            style: {
                position: 'fixed',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: '1000',
                minWidth: '200px',
                maxWidth: '300px',
                maxHeight: '300px',
                overflowY: 'auto',
            },
        });

        menu.style.flexDirection = 'column';

        // Position menu near the error
        const rect = span.getBoundingClientRect();
        const menuLeft = Math.min(rect.left, window.innerWidth - 320);
        const menuTop = rect.bottom + 5;

        menu.style.left = `${menuLeft}px`;
        menu.style.top = `${menuTop}px`;

        // Add suggestions
        if (suggestions.length > 0) {
            suggestions.slice(0, 10).forEach(suggestion => {
                const suggestionItem = this.utils.createElement(
                    'div',
                    {
                        className: 'spell-suggestion-option',
                        style: {
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee',
                        },
                    },
                    suggestion
                );

                suggestionItem.addEventListener('mouseenter', () => {
                    suggestionItem.style.backgroundColor = '#f8f9fa';
                });

                suggestionItem.addEventListener('mouseleave', () => {
                    suggestionItem.style.backgroundColor = '';
                });

                suggestionItem.addEventListener('click', () => {
                    this.replaceSpellError(span, suggestion);
                    menu.remove();
                });

                menu.appendChild(suggestionItem);
            });
        } else {
            const noSuggestions = this.utils.createElement(
                'div',
                {
                    style: {
                        padding: '8px 12px',
                        fontStyle: 'italic',
                        color: '#666',
                    },
                },
                'No suggestions available'
            );
            menu.appendChild(noSuggestions);
        }

        // Add "Add to dictionary" option
        const addToDictionary = this.utils.createElement('div', {
            className: 'spell-suggestion-option',
            style: {
                padding: '8px 12px',
                cursor: 'pointer',
                fontStyle: 'italic',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #dee2e6',
                fontSize: '0.85rem',
                color: '#28a745',
                fontWeight: '500',
            },
        });

        // Create the content with proper HTML structure
        const plusSpan = document.createElement('span');
        plusSpan.style.marginRight = '6px';
        plusSpan.textContent = '+';

        addToDictionary.appendChild(plusSpan);
        addToDictionary.appendChild(document.createTextNode(`Add "${word}" to dictionary`));

        addToDictionary.addEventListener('mouseenter', () => {
            addToDictionary.style.backgroundColor = '#e9ecef';
        });

        addToDictionary.addEventListener('mouseleave', () => {
            addToDictionary.style.backgroundColor = '#f8f9fa';
        });

        addToDictionary.addEventListener('click', () => {
            this.addWordToDictionary(word);
            menu.remove();
        });

        menu.appendChild(addToDictionary);
        document.body.appendChild(menu);

        // Close menu when clicking outside
        const closeMenu = e => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }

    /**
     * Replace spell error with correction
     */
    replaceSpellError(span, replacement) {
        // Store cursor position
        const savedPosition = this.getCursorPosition();

        // Check if this is a spell-error-highlight span
        if (span.classList.contains('spell-error-highlight')) {
            const parentToken = span.parentNode;
            if (parentToken && parentToken.classList.contains('word-token')) {
                // Update the word token's data attribute
                parentToken.setAttribute('data-word', replacement.toLowerCase());
                // Replace the content
                span.textContent = replacement;
                // Remove error styling
                span.classList.remove('spell-error-highlight');
                span.style.textDecoration = '';
                span.style.cursor = '';
            }
        }

        // Position cursor right after the corrected word
        setTimeout(() => {
            if (savedPosition !== null) {
                this.setCursorPosition(savedPosition);
            }
        }, 0);

        // Trigger save and re-run spell check to update error counts
        this.handleTextChange();

        // Re-run spell check after a short delay to update error badges
        setTimeout(() => {
            this.requestSpellCheck();
        }, 200);
    }

    /**
     * Add word to custom dictionary
     */
    addWordToDictionary(word) {
        console.log('SpellChecker.addWordToDictionary called with word:', word);
        console.log('Callback available:', !!this.addWordToDictionaryCallback);

        // Delegate to the main TextEditor's addWordToDictionary method
        if (this.addWordToDictionaryCallback) {
            console.log('Calling addWordToDictionary callback...');
            this.addWordToDictionaryCallback(word);
        } else {
            console.error('addWordToDictionary callback not available');
        }
    }

    /**
     * Enable or disable spell checking
     */
    setSpellCheckingEnabled(enabled) {
        this.spellCheckingEnabled = enabled;

        if (!enabled) {
            this.clearSpellErrorHighlights();
            this.spellErrors = {};
        } else if (this.fileManager.hasCurrentFile()) {
            // Re-run spell check if enabled and file is loaded
            this.requestSpellCheck();
        }
    }

    /**
     * Get current spell checking enabled state
     */
    isSpellCheckingEnabled() {
        return this.spellCheckingEnabled;
    }

    /**
     * Get current spell errors
     */
    getSpellErrors() {
        return this.spellErrors;
    }

    /**
     * Clear all spell check state
     */
    clearSpellCheckState() {
        this.clearSpellErrorHighlights();
        this.spellErrors = {};
        this.clearTimeoutSafe(this.spellCheckTimeout);
    }

    /**
     * Cleanup method for memory management
     */
    cleanup() {
        this.clearSpellCheckState();
        this.spellCheckTimeout = null;
    }
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpellChecker;
}

// Export for use in other modules
window.SpellChecker = SpellChecker;
