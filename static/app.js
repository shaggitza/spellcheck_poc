/**
 * Text Editor Application - Legacy Monolithic Architecture
 */

class TextEditor {
    constructor() {
        // Initialize properties
        this.currentFile = null;
        this.isConnected = false;
        this.suggestionVisible = false;
        this.currentPrediction = null;
        this.spellErrors = {};
        this.isTyping = false;
        this.actionsVisible = false;
        this.currentParagraph = null;
        this.spellCheckingEnabled = true;
        
        // Timeouts for debouncing
        this.saveTimeout = null;
        this.predictionTimeout = null;
        this.spellCheckTimeout = null;
        this.typingTimeout = null;
        this.normalizeTimeout = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupUrlHandling();
        this.connectWebSocket();
        this.loadFileList();
    }

    initializeElements() {
        this.fileList = document.getElementById('fileList');
        this.textEditor = document.getElementById('textEditor');
        this.currentFileName = document.getElementById('currentFileName');
        this.saveFile = document.getElementById('saveFile');
        this.saveStatus = document.getElementById('saveStatus');
        this.newFileName = document.getElementById('newFileName');
        this.createFile = document.getElementById('createFile');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusText = document.getElementById('statusText');
        this.predictionText = document.getElementById('predictionText');
        this.paragraphActions = document.getElementById('paragraphActions');
        this.dashboardBtn = document.getElementById('dashboardBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.addWordInput = document.getElementById('addWordInput');
        this.addWordBtn = document.getElementById('addWordBtn');
        this.dictionaryList = document.getElementById('dictionaryList');
        this.dictionaryLoading = document.getElementById('dictionaryLoading');
        this.dictionaryEmpty = document.getElementById('dictionaryEmpty');
        this.spellCheckerEngine = document.getElementById('spellCheckerEngine');
        this.spellCheckerLanguage = document.getElementById('spellCheckerLanguage');
        this.spellCheckEnabledInput = document.getElementById('spellCheckEnabled');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    }

    setupEventListeners() {
        // File creation
        this.createFile.addEventListener('click', () => this.createNewFile());
        this.newFileName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createNewFile();
        });

        // Rich text editor events
        this.textEditor.addEventListener('input', () => this.handleTextChange());
        this.textEditor.addEventListener('click', (e) => this.handleEditorClick(e));
        this.textEditor.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.textEditor.addEventListener('paste', (e) => this.handlePaste(e));
        this.textEditor.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideInlineSuggestion();
                this.hideParagraphActions();
            }, 150);
        });

        // Handle paragraph interactions
        this.textEditor.addEventListener('mouseover', (e) => this.handleParagraphHover(e));
        this.textEditor.addEventListener('mouseout', (e) => this.handleParagraphLeave(e));

        // Save button
        this.saveFile.addEventListener('click', () => this.saveCurrentFile());

        // Dashboard button
        if (this.dashboardBtn) {
            this.dashboardBtn.addEventListener('click', () => this.showDashboard());
        }

        // Settings button
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.showSettingsModal());
        }

        // Dictionary management
        if (this.addWordBtn) {
            this.addWordBtn.addEventListener('click', () => this.addWordToDictionaryFromInput());
        }
        if (this.addWordInput) {
            this.addWordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addWordToDictionaryFromInput();
            });
        }

        // Settings management
        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        // Paragraph action buttons (placeholder for now)
        this.paragraphActions.addEventListener('click', (e) => this.handleParagraphAction(e));

        // Auto-save on Ctrl+S
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            }
        });

        // Global Ctrl + Right Arrow listener for debugging
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' && e.ctrlKey) {
                console.log('GLOBAL: Ctrl + Right Arrow detected', {
                    suggestionVisible: this.suggestionVisible,
                    currentPrediction: !!this.currentPrediction,
                    activeElement: document.activeElement,
                    isInEditor: this.textEditor.contains(document.activeElement)
                });
                
                if (this.suggestionVisible && this.currentPrediction) {
                    console.log('GLOBAL: Calling acceptPartialSuggestion');
                    e.preventDefault();
                    e.stopPropagation();
                    this.acceptPartialSuggestion();
                }
            }
        });

        // Hide suggestion when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.textEditor.contains(e.target)) {
                this.hideInlineSuggestion();
            }
            
            if (!this.paragraphActions.contains(e.target) && 
                !this.textEditor.contains(e.target)) {
                this.hideParagraphActions();
            }
        });
    }

    setupUrlHandling() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const filename = this.getFilenameFromUrl();
            const isDashboard = this.isDashboardUrl();
            
            if (isDashboard) {
                this.showDashboard();
            } else if (filename && filename !== this.currentFile) {
                this.loadFile(filename, false); // Don't update URL again
            }
        });
    }

    getFilenameFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('file');
    }

    isDashboardUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('view') === 'dashboard' || (!urlParams.has('file') && !urlParams.has('view'));
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
        // Clear current file state
        this.currentFile = null;
        
        // Update URL to dashboard
        this.updateUrl(null);
        
        // Clear editor content and disable editing
        this.textEditor.innerHTML = '<div class="dashboard-content"><h2>📝 Text Editor Dashboard</h2><p>Welcome to your text editor! Select a file from the sidebar to start editing, or create a new file.</p><div class="dashboard-stats"><p>This dashboard will be enhanced with file statistics, recent files, and more features soon!</p></div></div>';
        this.textEditor.contentEditable = false;
        this.saveFile.disabled = true;
        this.currentFileName.textContent = 'Dashboard';
        
        // Clear active file selection
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Hide suggestions and actions
        this.hideInlineSuggestion();
        this.hideParagraphActions();
        
        console.log('Switched to dashboard mode');
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.updateConnectionStatus('connecting');
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.updateConnectionStatus('connected');
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => this.connectWebSocket(), 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('disconnected');
        };
    }

    updateConnectionStatus(status) {
        this.connectionStatus.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                this.statusText.textContent = 'Connected';
                break;
            case 'connecting':
                this.statusText.textContent = 'Connecting...';
                break;
            case 'disconnected':
                this.statusText.textContent = 'Disconnected';
                break;
        }
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'edit_response':
                if (message.success) {
                    this.showSaveStatus('saved', 'Saved');
                    // No longer handling predictions from save responses
                    // Predictions are handled separately through prediction_request/response
                } else {
                    this.showSaveStatus('error', 'Save failed');
                }
                break;
                
            case 'prediction_response':
                this.handlePredictionResponse(message.prediction, message.cursor_position, message.metadata);
                break;
                
            case 'spell_check_response':
                this.handleSpellCheckResponse(message.errors, message.language);
                break;
                
            case 'dictionary_updated':
                if (message.success) {
                    console.log(`✅ Added '${message.word}' to dictionary`);
                    
                    // Update settings modal if it's open
                    if (this.settingsModal && this.settingsModal.classList.contains('show')) {
                        this.addWordToList(message.word, new Date().toISOString());
                        this.dictionaryEmpty.style.display = 'none';
                    }
                    
                    // Re-run spell check to update highlights
                    this.requestSpellCheck();
                }
                break;
                
            case 'error':
                console.error('WebSocket error:', message.message);
                this.showSaveStatus('error', message.message);
                break;
        }
    }

    handlePredictionResponse(prediction, cursorPosition, metadata = {}) {
        console.log('Received prediction:', { prediction, cursorPosition, metadata });
        
        this.currentPrediction = {
            text: prediction,
            position: cursorPosition,
            metadata: metadata
        };
        
        // Update the bottom prediction display
        this.updatePrediction(prediction);
        
        // Show inline suggestion if we have a meaningful prediction
        const currentCursorPos = this.getCursorPosition();
        console.log('Current cursor position:', currentCursorPos, 'Expected (relative):', cursorPosition);
        
        // For contextual predictions, we're more lenient with cursor position matching
        // since we're working with relative positions within paragraph context
        if (prediction && 
            prediction.trim() && 
            Math.abs(currentCursorPos - (metadata.original_cursor_position || cursorPosition)) <= 10) {
            this.showInlineSuggestion(prediction);
        } else {
            console.log('Not showing suggestion:', { 
                hasPrediction: !!prediction, 
                hasContent: !!(prediction && prediction.trim()),
                cursorMatch: Math.abs(currentCursorPos - (metadata.original_cursor_position || cursorPosition)) <= 10,
                currentPos: currentCursorPos,
                expectedPos: metadata.original_cursor_position || cursorPosition
            });
            this.hideInlineSuggestion();
        }
    }

    showInlineSuggestion(prediction) {
        if (!prediction || !prediction.trim()) {
            this.hideInlineSuggestion();
            return;
        }

        console.log('Showing inline suggestion:', prediction);

        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            
            // Don't show prediction if user has an active selection (text is selected)
            if (!range.collapsed) {
                console.log('Skipping prediction - user has text selected');
                return;
            }
            
            // Remove any existing inline suggestions
            this.hideInlineSuggestion();
            
            // Create a span element for the inline suggestion
            const suggestionSpan = document.createElement('span');
            suggestionSpan.className = 'inline-suggestion-text';
            suggestionSpan.textContent = prediction;
            suggestionSpan.id = 'current-inline-suggestion';
            
            // Make suggestion non-navigable and unselectable
            suggestionSpan.style.userSelect = 'none';
            suggestionSpan.style.pointerEvents = 'none';
            suggestionSpan.contentEditable = false;
            
            // Force clean styling to prevent inheritance from surrounding elements
            suggestionSpan.style.background = 'transparent';
            suggestionSpan.style.backgroundColor = 'transparent';
            suggestionSpan.style.border = 'none';
            suggestionSpan.style.borderBottom = 'none';
            suggestionSpan.style.textDecoration = 'none';
            suggestionSpan.style.color = '#9ca3af';
            suggestionSpan.style.fontStyle = 'italic';
            suggestionSpan.style.cursor = 'default';
            suggestionSpan.style.boxShadow = 'none';
            suggestionSpan.style.outline = 'none';
            
            // Insert the suggestion at cursor position
            range.insertNode(suggestionSpan);
            
            // Move cursor back to before the suggestion
            range.setStartBefore(suggestionSpan);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            this.suggestionVisible = true;
            
            console.log('Inline suggestion displayed');
        } catch (error) {
            console.error('Error showing inline suggestion:', error);
            this.hideInlineSuggestion();
        }
    }

    hideInlineSuggestion() {
        // Remove any existing inline suggestions
        const existingSuggestion = document.getElementById('current-inline-suggestion');
        if (existingSuggestion) {
            existingSuggestion.remove();
        }
        
        this.suggestionVisible = false;
    }

    acceptInlineSuggestion() {
        if (!this.currentPrediction) return;

        try {
            const suggestionElement = document.getElementById('current-inline-suggestion');
            if (suggestionElement) {
                // Replace the suggestion element with actual text
                const textNode = document.createTextNode(this.currentPrediction.text);
                suggestionElement.parentNode.replaceChild(textNode, suggestionElement);
                
                // Move cursor to end of inserted text
                const selection = window.getSelection();
                const range = document.createRange();
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            this.hideInlineSuggestion();
            
            // Clear spell check error badges since content has changed
            this.clearSpellCheckBadges();
            
            this.handleTextChange();
            
            // Focus back on editor
            this.textEditor.focus();
        } catch (error) {
            console.error('Error applying suggestion:', error);
            // Fallback: just focus the editor
            this.textEditor.focus();
        }
    }

    acceptPartialSuggestion() {
        console.log('acceptPartialSuggestion called', {
            currentPrediction: this.currentPrediction,
            suggestionVisible: this.suggestionVisible
        });
        
        if (!this.currentPrediction) {
            console.log('No current prediction available');
            return;
        }

        try {
            const suggestionElement = document.getElementById('current-inline-suggestion');
            console.log('Suggestion element found:', !!suggestionElement);
            
            if (suggestionElement) {
                const fullText = this.currentPrediction.text;
                
                console.log('Full prediction text:', JSON.stringify(fullText));
                
                // Don't trim the original text - preserve leading/trailing spaces
                if (!fullText) {
                    console.log('Prediction text is empty');
                    return;
                }
                
                // Find the first word boundary, preserving any leading spaces
                let firstWord = '';
                let remainingText = '';
                
                // Find the first whitespace character
                const spaceIndex = fullText.search(/\s/);
                if (spaceIndex === -1) {
                    // No whitespace found, use entire text as first word
                    firstWord = fullText;
                    remainingText = '';
                } else {
                    // Take everything up to and including the first space
                    firstWord = fullText.substring(0, spaceIndex + 1);
                    // Take everything after the first space
                    remainingText = fullText.substring(spaceIndex + 1);
                }
                
                console.log('Word extraction:', { 
                    originalText: JSON.stringify(fullText),
                    firstWord: JSON.stringify(firstWord), 
                    remainingText: JSON.stringify(remainingText),
                    remainingLength: remainingText.length 
                });
                
                if (!firstWord) {
                    console.log('No first word extracted');
                    return;
                }
                
                // Insert the first word as actual text
                const textNode = document.createTextNode(firstWord);
                suggestionElement.parentNode.insertBefore(textNode, suggestionElement);
                
                // Handle remaining text
                if (remainingText.length >= 5) {
                    // Enough remaining text - update suggestion without new prediction request
                    this.currentPrediction.text = remainingText;
                    suggestionElement.textContent = remainingText;
                    
                    // Move cursor to between the inserted text and remaining suggestion
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    console.log('Kept remaining suggestion:', remainingText);
                } else {
                    // Not enough remaining text - hide suggestion and request new prediction
                    this.hideInlineSuggestion();
                    
                    // Move cursor to end of inserted text
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    console.log('Remaining text too short, requesting new prediction');
                    // Request new prediction after a short delay
                    setTimeout(() => this.requestPrediction(), 100);
                }
                
                // Clear spell check error badges since content has changed
                this.clearSpellCheckBadges();
                
                // CRITICAL FIX: Don't call handleTextChange() to avoid spell check interference
                // Instead, manually trigger only the necessary save operation
                this.showSaveStatus('saving', 'Saving...');
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveCurrentFile();
                }, 1000);
            }
            
            // Focus back on editor
            this.textEditor.focus();
        } catch (error) {
            console.error('Error applying partial suggestion:', error);
            this.textEditor.focus();
        }
    }

    handleEditorClick(e) {
        // Small delay to ensure cursor position is updated
        setTimeout(() => {
            console.log('Editor clicked, requesting prediction...');
            this.requestPrediction();
        }, 50);
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
            console.log('Pasted text preview:', pastedText.substring(0, 100) + (pastedText.length > 100 ? '...' : ''));
            
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
            let currentP = range.startContainer.nodeType === Node.TEXT_NODE 
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
                .replace(/\r\n/g, '\n')  // Normalize Windows line endings
                .replace(/\r/g, '\n')    // Normalize old Mac line endings
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
                    const avgLineLength = singleLineBreaks.reduce((sum, line) => sum + line.trim().length, 0) / singleLineBreaks.length;
                    if (avgLineLength > 40) {
                        paragraphs = singleLineBreaks;
                    }
                }
            }
            
            // Filter out empty paragraphs and trim whitespace
            paragraphs = paragraphs
                .map(p => p.trim())
                .filter(p => p.length > 0);
            
            console.log(`Parsed ${paragraphs.length} paragraphs from pasted text`);
            
            if (paragraphs.length === 0) {
                console.log('No paragraphs to insert');
                return;
            }
            
            // Save cursor position before making changes
            const savedCursorPosition = this.getCursorPosition();
            
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
            setTimeout(() => this.normalizeEditorStructure(), 100);
            
        } catch (error) {
            console.error('Error inserting text at cursor:', error);
        }
    }

    insertMultipleParagraphs(paragraphs, currentP, range) {
        try {
            const selection = window.getSelection();
            
            // Get text before and after cursor in current paragraph
            const paragraphText = this.extractTextFromParagraph(currentP);
            const cursorPosInParagraph = this.getCursorPositionInParagraph(currentP, range);
            
            const textBefore = paragraphText.substring(0, cursorPosInParagraph);
            const textAfter = paragraphText.substring(cursorPosInParagraph);
            
            console.log('Inserting multiple paragraphs:', {
                total: paragraphs.length,
                textBefore: textBefore.substring(0, 20) + '...',
                textAfter: textAfter.substring(0, 20) + '...',
                cursorPos: cursorPosInParagraph
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
            const walker = document.createTreeWalker(
                paragraph,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentPosition = 0;
            let targetNode = null;
            let targetOffset = 0;
            
            let node;
            while (node = walker.nextNode()) {
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
        // Debug ALL key events to see what's happening
        if (e.ctrlKey || e.key === 'ArrowRight') {
            console.log('Key event detected:', { 
                key: e.key, 
                altKey: e.altKey, 
                ctrlKey: e.ctrlKey, 
                shiftKey: e.shiftKey,
                suggestionVisible: this.suggestionVisible,
                currentPrediction: !!this.currentPrediction
            });
        }

        // PRIORITY: Handle Ctrl + Right Arrow for partial suggestion acceptance
        if (e.key === 'ArrowRight' && e.ctrlKey && this.suggestionVisible && this.currentPrediction) {
            console.log('Ctrl + Right Arrow - attempting partial acceptance');
            e.preventDefault();
            e.stopPropagation();
            this.acceptPartialSuggestion();
            return false; // Ensure event is completely stopped
        }

        // Prevent Ctrl + Right Arrow from moving between paragraphs when no suggestions
        if (e.key === 'ArrowRight' && e.ctrlKey && !this.suggestionVisible) {
            console.log('Ctrl + Right Arrow blocked - no suggestions visible');
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Handle paragraph structure preservation
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const currentP = range.startContainer.nodeType === Node.TEXT_NODE 
                    ? range.startContainer.parentElement.closest('p')
                    : range.startContainer.closest('p');
                
                if (currentP) {
                    // Prevent backspace at beginning of paragraph (would merge with previous)
                    if (e.key === 'Backspace') {
                        const isAtStart = range.startOffset === 0 && 
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
                            const isLastTextNode = textNode === currentP.lastChild || 
                                                 textNode.parentNode === currentP.lastChild;
                            const isAtEndOfText = range.startOffset === textNode.textContent.length;
                            isAtEnd = isLastTextNode && isAtEndOfText;
                        } else {
                            // We're at element level
                            const isAtElementEnd = range.startOffset === range.startContainer.childNodes.length;
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
                const currentP = range.startContainer.nodeType === Node.TEXT_NODE 
                    ? range.startContainer.parentElement.closest('p')
                    : range.startContainer.closest('p');
                
                if (currentP) {
                    // Create new paragraph
                    const newP = document.createElement('p');
                    newP.innerHTML = '<br>';
                    
                    // Insert after current paragraph
                    currentP.parentNode.insertBefore(newP, currentP.nextSibling);
                    
                    // Move cursor to new paragraph
                    const newRange = document.createRange();
                    newRange.setStart(newP, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    
                    // Trigger text change
                    this.handleTextChange();
                }
            }
            return;
        }

        // Handle suggestion controls
        if (this.suggestionVisible) {
            // Debug key events when suggestion is visible
            console.log('Processing key in suggestion controls:', { 
                key: e.key, 
                ctrlKey: e.ctrlKey
            });
            
            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    this.acceptInlineSuggestion();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hideInlineSuggestion();
                    break;
                case 'ArrowRight':
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'ArrowDown':
                    // Regular arrow keys do nothing with predictions
                    // Ctrl + Right is handled at top of function
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
    }

    showInlineSuggestion(prediction, cursorPosition) {
        if (!prediction || !prediction.trim()) {
            this.hideInlineSuggestion();
            return;
        }

        console.log('Showing inline suggestion:', prediction);

        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            
            // Remove any existing inline suggestions
            this.hideInlineSuggestion();
            
            // Create a span element for the inline suggestion
            const suggestionSpan = document.createElement('span');
            suggestionSpan.className = 'inline-suggestion-text';
            suggestionSpan.textContent = prediction;
            suggestionSpan.id = 'current-inline-suggestion';
            
            // Insert the suggestion at cursor position
            range.insertNode(suggestionSpan);
            
            // Move cursor back to before the suggestion
            range.setStartBefore(suggestionSpan);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            this.suggestionVisible = true;
            
            console.log('Inline suggestion displayed');
        } catch (error) {
            console.error('Error showing inline suggestion:', error);
            this.hideInlineSuggestion();
        }
    }

    getCursorPixelPosition(cursorPosition) {
        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return null;
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = this.textEditor.getBoundingClientRect();
            
            return {
                x: Math.min(rect.left - editorRect.left + 10, this.textEditor.clientWidth - 250),
                y: Math.min(rect.top - editorRect.top + 25, this.textEditor.clientHeight - 50)
            };
        } catch (error) {
            console.error('Error calculating cursor position:', error);
            return null;
        }
    }

    async loadFileList() {
        try {
            const response = await fetch('/api/files');
            const data = await response.json();
            
            this.fileList.innerHTML = '';
            
            if (data.files.length === 0) {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = 'No files found';
                li.style.fontStyle = 'italic';
                this.fileList.appendChild(li);
            } else {
                data.files.forEach(file => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.textContent = file.name;
                    li.addEventListener('click', () => this.loadFile(file.name));
                    this.fileList.appendChild(li);
                });
                
                // Priority order for file selection:
                // 1. URL parameter with specific file
                // 2. Dashboard mode (don't auto-open files)
                // 3. localStorage (last opened file) - only if not in dashboard mode
                
                const urlFilename = this.getFilenameFromUrl();
                const isDashboard = this.isDashboardUrl();
                const lastFile = localStorage.getItem('lastOpenedFile');
                
                if (urlFilename && data.files.some(f => f.name === urlFilename)) {
                    // Load specific file from URL
                    console.log('Loading file from URL:', urlFilename);
                    this.loadFile(urlFilename, false); // Don't update URL again
                } else if (isDashboard) {
                    // Stay in dashboard mode
                    console.log('Staying in dashboard mode');
                    this.showDashboard();
                } else if (lastFile && data.files.some(f => f.name === lastFile)) {
                    // Load last file only if not explicitly in dashboard mode
                    console.log('Loading last opened file:', lastFile);
                    this.loadFile(lastFile, true);
                } else {
                    // Default to dashboard
                    this.showDashboard();
                }
            }
        } catch (error) {
            console.error('Failed to load file list:', error);
        }
    }

    async loadFile(filename, updateUrl = true) {
        try {
            const response = await fetch(`/api/files/${filename}`);
            const data = await response.json();
            
            if (data.error) {
                console.error('Failed to load file:', data.error);
                return;
            }
            
            this.currentFile = filename;
            
            // Save to localStorage for persistence
            localStorage.setItem('lastOpenedFile', filename);
            
            // Update URL if requested
            if (updateUrl) {
                this.updateUrl(filename);
            }
            
            this.setEditorContent(data.content);
            this.textEditor.contentEditable = true;
            this.saveFile.disabled = false;
            this.currentFileName.textContent = filename;
            
            // Update active file in list
            document.querySelectorAll('.list-group-item').forEach(item => {
                item.classList.remove('active');
                if (item.textContent === filename) {
                    item.classList.add('active');
                }
            });
            
            // Focus the editor and request prediction + spell check
            this.textEditor.focus();
            setTimeout(() => {
                this.requestPrediction();
                this.requestSpellCheck();
            }, 100);
            
        } catch (error) {
            console.error('Failed to load file:', error);
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
                // Word token - wrap in span for spell checking
                const wordSpan = document.createElement('span');
                wordSpan.className = 'word-token';
                wordSpan.textContent = token;
                wordSpan.setAttribute('data-word', token.toLowerCase());
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
                const suggestions = clone.querySelectorAll('.inline-suggestion-text, #current-inline-suggestion');
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
                acceptNode: function(node) {
                    // Skip inline suggestions
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.classList?.contains('inline-suggestion-text') || 
                         node.id === 'current-inline-suggestion')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Skip error count badges
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.classList?.contains('error-count-badge')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
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

    createNewFile() {
        const filename = this.newFileName.value.trim();
        
        if (!filename) {
            alert('Please enter a filename');
            return;
        }
        
        if (!filename.endsWith('.txt')) {
            alert('Filename must end with .txt');
            return;
        }
        
        // Create empty file by saving empty content
        this.currentFile = filename;
        
        // Save to localStorage for persistence
        localStorage.setItem('lastOpenedFile', filename);
        
        // Update URL
        this.updateUrl(filename);
        
        this.setEditorContent('');
        this.textEditor.contentEditable = true;
        this.saveFile.disabled = false;
        this.currentFileName.textContent = filename;
        this.newFileName.value = '';
        
        this.saveCurrentFile().then(() => {
            this.loadFileList();
        });
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
        }, 100);
    }

    showParagraphActions(paragraph) {
        if (this.actionsVisible && this.currentParagraph === paragraph) return;
        
        this.currentParagraph = paragraph;
        
        // Remove active class from all paragraphs
        this.textEditor.querySelectorAll('p').forEach(p => 
            p.classList.remove('active-paragraph'));
        
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
            alert(`${action.charAt(0).toUpperCase() + action.slice(1)} action clicked!\n\nParagraph: "${this.currentParagraph.innerText.substring(0, 50)}..."\n\nThis will be implemented in the next step.`);
        }
        
        this.hideParagraphActions();
    }

    handleTextChange() {
        if (!this.currentFile) return;
        
        // Mark that user is actively typing
        this.isTyping = true;
        
        this.showSaveStatus('saving', 'Saving...');
        
        // Only normalize structure when user stops typing to avoid cursor jumping
        // Debounce normalization to avoid doing it too frequently
        clearTimeout(this.normalizeTimeout);
        this.normalizeTimeout = setTimeout(() => {
            if (!this.isTyping) {
                this.normalizeEditorStructure();
            }
        }, 2000); // Wait 2 seconds after user stops typing
        
        // Request prediction while typing
        this.requestPrediction();
        
        // Delay spell check until user stops typing to avoid cursor jumping
        this.requestSpellCheck();
        
        // Clear typing flag after a delay
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            // Run normalization after typing stops
            setTimeout(() => this.normalizeEditorStructure(), 100);
        }, 1000);
        
        // Debounce auto-save
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveCurrentFile();
        }, 1000);
    }

    normalizeEditorStructure() {
        // Only normalize if user is not actively typing to avoid cursor jumping
        if (this.isTyping) {
            console.log('Skipping normalization while user is typing');
            return;
        }
        
        // CRITICAL: Skip normalization if there's an active inline suggestion
        if (this.suggestionVisible && document.getElementById('current-inline-suggestion')) {
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
            
            // Look for text nodes that aren't just whitespace AND are not inside word-token spans
            const walker = document.createTreeWalker(
                paragraph,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let textNode;
            const textNodesToProcess = [];
            while (textNode = walker.nextNode()) {
                // Skip text nodes that are just whitespace between word spans
                // Skip text nodes that are already inside word-token spans
                const isWhitespaceOnly = !textNode.textContent.trim();
                const isInsideWordToken = textNode.parentNode.classList && textNode.parentNode.classList.contains('word-token');
                const isInsideSuggestion = textNode.parentNode.classList && textNode.parentNode.classList.contains('inline-suggestion-text');
                
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
                    if (Object.keys(this.spellErrors).length > 0) {
                        console.log('Reapplying spell check highlights after normalization');
                        this.highlightSpellingErrors();
                    }
                }, 50);
            }
        });
    }

    async saveCurrentFile() {
        if (!this.currentFile || !this.isConnected) return;
        
        const content = this.getEditorContent();
        const cursorPosition = this.getCursorPosition();
        
        const message = {
            type: 'edit',
            filename: this.currentFile,
            content: content,  // Still send full content for saving
            cursor_position: cursorPosition  // Keep original position for file operations
        };
        
        this.ws.send(JSON.stringify(message));
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
            if (cursorPosition <= paragraphEnd + 2) { // +2 for \n\n
                currentParagraphIndex = i;
                break;
            }
            
            currentPos = paragraphEnd + 2; // +2 for \n\n separator
        }
        
        // Get context paragraphs
        const prevContext = currentParagraphIndex > 0 ? paragraphs[currentParagraphIndex - 1] : "";
        const currentText = paragraphs[currentParagraphIndex] || "";
        const afterContext = currentParagraphIndex < paragraphs.length - 1 ? paragraphs[currentParagraphIndex + 1] : "";
        
        // Calculate cursor position relative to current paragraph
        const currentParagraphStart = paragraphs.slice(0, currentParagraphIndex)
            .reduce((sum, p) => sum + p.length + 2, 0);
        
        const relativeCursor = Math.max(0, Math.min(
            cursorPosition - currentParagraphStart, 
            currentText.length
        ));
        
        console.log('DEBUG Frontend Context:', {
            totalParagraphs: paragraphs.length,
            currentIdx: currentParagraphIndex,
            prevContext: prevContext.substring(0, 50) + (prevContext.length > 50 ? '...' : ''),
            currentText: currentText.substring(0, 50) + (currentText.length > 50 ? '...' : ''),
            afterContext: afterContext.substring(0, 50) + (afterContext.length > 50 ? '...' : ''),
            relativeCursor: relativeCursor,
            currentTextLength: currentText.length
        });
        
        return {
            prevContext,
            currentText,
            afterContext,
            cursor: relativeCursor,
            paragraphIndex: currentParagraphIndex,
            totalParagraphs: paragraphs.length
        };
    }

    isAtWordBoundary() {
        try {
            const fullContent = this.getEditorContent();
            const cursorPosition = this.getCursorPosition();
            
            // Get character before and after cursor
            const charBefore = cursorPosition > 0 ? fullContent[cursorPosition - 1] : '';
            const charAfter = cursorPosition < fullContent.length ? fullContent[cursorPosition] : '';
            
            // Check if we're at the start of content
            if (cursorPosition === 0) {
                return true; // Start of content is a word boundary
            }
            
            // Check if we're at the end of content
            if (cursorPosition >= fullContent.length) {
                return true; // End of content is a word boundary
            }
            
            // Define word characters (letters, numbers, apostrophes for contractions)
            const isWordChar = (char) => /[a-zA-Z0-9']/.test(char);
            const isWhitespace = (char) => /\s/.test(char);
            
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

    requestPrediction() {
        if (!this.currentFile || !this.isConnected) {
            console.log('Cannot request prediction:', { 
                currentFile: this.currentFile, 
                isConnected: this.isConnected 
            });
            return;
        }
        
        // Check if user has text selected - don't predict if they do
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
            console.log('Skipping prediction - user has text selected');
            this.hideInlineSuggestion();
            this.updatePrediction(''); // Clear bottom prediction display
            return;
        }
        
        // Check if we're at a word boundary - only predict at word boundaries
        if (!this.isAtWordBoundary()) {
            console.log('Skipping prediction - cursor is in middle of word');
            this.hideInlineSuggestion();
            this.updatePrediction(''); // Clear bottom prediction display
            return;
        }
        
        // Hide current suggestion when requesting new one
        this.hideInlineSuggestion();
        
        // Debounce prediction requests - longer delay if user is actively typing
        clearTimeout(this.predictionTimeout);
        const delay = this.isTyping ? 500 : 300; // Longer delay during active typing
        
        this.predictionTimeout = setTimeout(() => {
            const fullContent = this.getEditorContent();
            const cursorPosition = this.getCursorPosition();
            
            // Extract structured paragraph context on frontend
            const context = this.getParagraphContext(fullContent, cursorPosition);
            
            console.log('Sending structured prediction request:', { 
                prevContextLength: context.prevContext.length,
                currentTextLength: context.currentText.length,
                afterContextLength: context.afterContext.length,
                cursor: context.cursor,
                paragraphIndex: context.paragraphIndex
            });
            
            const message = {
                type: 'prediction_request',
                prevContext: context.prevContext,
                currentText: context.currentText,
                afterContext: context.afterContext,
                cursor: context.cursor,
                metadata: {
                    paragraph_index: context.paragraphIndex,
                    total_paragraphs: context.totalParagraphs,
                    original_cursor_position: cursorPosition
                }
            };
            
            this.ws.send(JSON.stringify(message));
        }, delay);
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
                fullContent: this.getEditorContent().slice(0, 100) + '...'
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
        const suggestions = container.querySelectorAll('.inline-suggestion-text, #current-inline-suggestion');
        suggestions.forEach(suggestion => suggestion.remove());
        
        // Remove any error count badges from the cloned content
        const badges = container.querySelectorAll('.error-count-badge');
        badges.forEach(badge => badge.remove());
        
        const paragraphs = Array.from(container.querySelectorAll('p'));
        if (paragraphs.length === 0) {
            // Handle case where selection doesn't include full paragraphs
            return this.extractTextFromParagraph(container);
        }
        
        return paragraphs
            .map(p => this.extractTextFromParagraph(p))
            .join('\n\n');
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
            while (node = walker.nextNode()) {
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

    updatePrediction(prediction) {
        if (prediction && prediction.trim()) {
            this.predictionText.textContent = prediction;
        } else {
            this.predictionText.textContent = 'No prediction (empty line or no context)';
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
            this.dictionaryList.innerHTML = '<div class="text-danger p-3">Failed to load dictionary words.</div>';
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
        if (!word) {
            alert('Please enter a word');
            return;
        }

        if (!/^[a-zA-Z]+$/.test(word)) {
            alert('Word can only contain letters');
            return;
        }

        this.addWordToDictionary(word);
        this.addWordInput.value = '';
    }

    async removeWordFromDictionary(word) {
        if (!confirm(`Remove "${word}" from dictionary?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/dictionary/${encodeURIComponent(word)}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                console.log(`✅ Removed '${word}' from dictionary`);
                
                // Remove from UI
                const wordElement = this.dictionaryList.querySelector(`[data-word="${word}"]`).closest('.dictionary-word');
                if (wordElement) {
                    wordElement.remove();
                }

                // Check if list is now empty
                if (this.dictionaryList.children.length === 0) {
                    this.dictionaryEmpty.style.display = 'block';
                }

                // Re-run spell check to update highlights
                this.requestSpellCheck();
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
                
                if (this.spellCheckEnabledInput && typeof settings.spell_check_enabled === 'boolean') {
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

            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings })
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
                this.requestSpellCheck();
            } else {
                alert('Failed to save settings');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        }
    }

    // === SPELL CHECKING FUNCTIONALITY ===

    clearSpellCheckBadges() {
        // Remove all spell check error count badges
        const badges = this.textEditor.querySelectorAll('.error-count-badge');
        badges.forEach(badge => {
            console.log('Removing spell check badge:', badge.textContent);
            badge.remove();
        });
        
        // Also clear the stored spell errors since they're no longer valid
        this.spellErrors = {};
        
        console.log('Cleared all spell check badges and error cache');
    }

    requestSpellCheck() {
        if (!this.currentFile || !this.isConnected || !this.spellCheckingEnabled) {
            return;
        }

        // CRITICAL: Skip spell check if inline suggestion is active
        if (this.suggestionVisible && document.getElementById('current-inline-suggestion')) {
            console.log('Skipping spell check request - inline suggestion is active');
            return;
        }

        // Clear existing timeout
        clearTimeout(this.spellCheckTimeout);
        
        // Debounce spell check requests
        this.spellCheckTimeout = setTimeout(() => {
            // Double-check suggestion status before sending request
            if (this.suggestionVisible && document.getElementById('current-inline-suggestion')) {
                console.log('Skipping delayed spell check - inline suggestion is still active');
                return;
            }
            
            const content = this.getEditorContent();
            const lines = content.split('\n\n').map(p => p.replace(/\n/g, ' '));  // Convert paragraphs to lines
            
            console.log('Requesting spell check for', lines.length, 'lines');
            
            const message = {
                type: 'spell_check_request',
                lines: lines,
                language: 'en'
            };
            
            this.ws.send(JSON.stringify(message));
        }, 500);  // 500ms debounce
    }

    debugDOMStructure() {
        console.log('=== DOM STRUCTURE DEBUG ===');
        const paragraphs = Array.from(this.textEditor.querySelectorAll('p'));
        console.log(`Total paragraphs: ${paragraphs.length}`);
        
        paragraphs.forEach((p, idx) => {
            const wordSpans = Array.from(p.querySelectorAll('.word-token'));
            const textContent = this.extractTextFromParagraph(p);
            console.log(`Paragraph ${idx}:`);
            console.log(`  Text: "${textContent}"`);
            console.log(`  Word spans (${wordSpans.length}): [${wordSpans.map(s => `"${s.textContent}"`).join(', ')}]`);
            console.log(`  Raw HTML: ${p.innerHTML.substring(0, 200)}${p.innerHTML.length > 200 ? '...' : ''}`);
        });
        console.log('=== END DOM STRUCTURE DEBUG ===');
    }

    handleSpellCheckResponse(errors, language) {
        console.log('=== SPELL CHECK RESPONSE ===');
        console.log('Raw errors received:', errors);
        console.log('Number of lines with errors:', Object.keys(errors).length);
        
        // Log detailed information about each error
        Object.keys(errors).forEach(lineIndex => {
            const lineErrors = errors[lineIndex];
            console.log(`Line ${lineIndex}: ${lineErrors.length} errors`);
            lineErrors.forEach((error, idx) => {
                console.log(`  Error ${idx + 1}: word="${error.word}", suggestions=[${error.suggestions.slice(0, 5).join(', ')}${error.suggestions.length > 5 ? '...' : ''}] (${error.suggestions.length} total)`);
            });
        });
        
        this.spellErrors = errors;
        
        // CRITICAL: Skip spell error highlighting if inline suggestion is active
        if (this.suggestionVisible && document.getElementById('current-inline-suggestion')) {
            console.log('Skipping spell error highlighting - inline suggestion is active');
            return;
        }
        
        // If user is actively typing, delay highlighting to avoid cursor jumping
        if (this.isTyping) {
            console.log('User is typing, delaying spell error highlighting for 500ms');
            setTimeout(() => {
                if (!this.isTyping && !this.suggestionVisible) {
                    console.log('Typing stopped and no active suggestion, now highlighting errors');
                    this.highlightSpellingErrors();
                } else {
                    console.log('Still typing or suggestion active, skipping delayed highlighting');
                }
            }, 500);
        } else {
            console.log('User not typing, highlighting errors immediately');
            this.debugDOMStructure(); // Debug DOM before highlighting
            this.highlightSpellingErrors();
        }
        console.log('=== END SPELL CHECK RESPONSE ===');
    }

    highlightSpellingErrors(isRetry = false) {
        console.log('Starting highlightSpellingErrors with errors:', this.spellErrors, 'isRetry:', isRetry);
        
        // CRITICAL: Skip highlighting if inline suggestion is active
        if (this.suggestionVisible && document.getElementById('current-inline-suggestion')) {
            console.log('Skipping spell error highlighting - inline suggestion is active');
            return;
        }
        
        // Save current cursor position before DOM manipulation
        const savedCursorPosition = this.getCursorPosition();
        
        // Remove existing spell error highlights and restore original word token content
        this.textEditor.querySelectorAll('.word-token').forEach(wordToken => {
            // Skip word tokens that contain inline suggestions
            if (wordToken.querySelector('.inline-suggestion-text') || 
                wordToken.querySelector('#current-inline-suggestion')) {
                console.log('Skipping spell error highlighting for word token with inline suggestion');
                return;
            }
            
            // Check if this word token has spell error highlights
            const errorHighlights = wordToken.querySelectorAll('.spell-error-highlight');
            if (errorHighlights.length > 0) {
                // Extract all text content and restore as plain text
                const fullText = wordToken.textContent;
                wordToken.innerHTML = '';
                wordToken.appendChild(document.createTextNode(fullText));
            }
            
            // Remove any remaining spell error classes and attributes
            wordToken.classList.remove('spell-error');
            wordToken.removeAttribute('data-suggestions');
            wordToken.removeAttribute('title');
            wordToken.removeAttribute('data-word');
            wordToken.removeAttribute('data-all-suggestions');
        });
        
        // Remove any standalone spell error elements (fallback)
        this.textEditor.querySelectorAll('.spell-error, .spell-error-highlight').forEach(element => {
            element.classList.remove('spell-error', 'spell-error-highlight');
            element.removeAttribute('data-suggestions');
            element.removeAttribute('title');
            element.removeAttribute('data-word');
            element.removeAttribute('data-all-suggestions');
        });
        
        // Remove existing error count badges
        this.textEditor.querySelectorAll('.error-count-badge').forEach(badge => badge.remove());

        if (Object.keys(this.spellErrors).length === 0) {
            console.log('No spell errors to highlight');
            // Restore cursor position and return early if no errors
            setTimeout(() => this.setCursorPosition(savedCursorPosition), 0);
            return;
        }

        // Get all paragraphs
        const paragraphs = Array.from(this.textEditor.querySelectorAll('p'));
        console.log('Found paragraphs:', paragraphs.length);
        
        let totalErrorsProcessed = 0;
        let totalErrorsHighlighted = 0;
        
        Object.keys(this.spellErrors).forEach(lineIndex => {
            const paragraphIndex = parseInt(lineIndex);
            const paragraph = paragraphs[paragraphIndex];
            
            console.log(`Processing line ${lineIndex}, paragraph index ${paragraphIndex}, paragraph exists:`, !!paragraph);
            
            if (!paragraph) {
                console.warn(`No paragraph found for line index ${lineIndex}`);
                return;
            }
            
            const errors = this.spellErrors[lineIndex];
            console.log(`Line ${lineIndex} has ${errors.length} errors:`, errors.map(e => e.word));
            
            // Get the full text content of this paragraph to search within
            const paragraphText = this.extractTextFromParagraph(paragraph);
            console.log(`Paragraph ${paragraphIndex} text: "${paragraphText}"`);
            
            let paragraphErrorsHighlighted = 0;
            
            // For each error, find it in the word tokens and create precise highlighting
            errors.forEach(error => {
                totalErrorsProcessed++;
                const errorWord = error.word;
                console.log(`Looking for error word: "${errorWord}" in word tokens`);
                
                // Find word tokens that contain this error word
                const wordSpans = Array.from(paragraph.querySelectorAll('.word-token'));
                let found = false;
                
                for (let span of wordSpans) {
                    const spanText = span.textContent;
                    
                    // Check if this span contains the error word (case insensitive)
                    const lowerSpanText = spanText.toLowerCase();
                    const lowerErrorWord = errorWord.toLowerCase();
                    const errorIndex = lowerSpanText.indexOf(lowerErrorWord);
                    
                    if (errorIndex !== -1) {
                        // Create precise highlighting within the word token
                        const beforeText = spanText.substring(0, errorIndex);
                        const errorText = spanText.substring(errorIndex, errorIndex + errorWord.length);
                        const afterText = spanText.substring(errorIndex + errorWord.length);
                        
                        // Clear the span and rebuild with highlighted error
                        span.innerHTML = '';
                        
                        // Add text before error (if any)
                        if (beforeText) {
                            span.appendChild(document.createTextNode(beforeText));
                        }
                        
                        // Add highlighted error text
                        const errorSpan = document.createElement('span');
                        errorSpan.className = 'spell-error-highlight';
                        errorSpan.textContent = errorText;
                        errorSpan.style.backgroundColor = 'rgba(255,0,0,0.2)';
                        errorSpan.style.borderBottom = '2px wavy red';
                        errorSpan.style.cursor = 'pointer';
                        
                        // Store spell error data on the highlighted span
                        const suggestions = error.suggestions.slice(0, 3).join(', ');
                        errorSpan.setAttribute('data-word', error.word);
                        errorSpan.setAttribute('data-suggestions', suggestions);
                        errorSpan.setAttribute('title', `Suggestions: ${suggestions}`);
                        errorSpan.setAttribute('data-all-suggestions', JSON.stringify(error.suggestions));
                        
                        // Add click handlers to the error span
                        errorSpan.addEventListener('click', (e) => this.handleSpellErrorClick(e));
                        errorSpan.addEventListener('contextmenu', (e) => this.handleSpellErrorRightClick(e));
                        
                        span.appendChild(errorSpan);
                        
                        // Add text after error (if any)
                        if (afterText) {
                            span.appendChild(document.createTextNode(afterText));
                        }
                        
                        totalErrorsHighlighted++;
                        paragraphErrorsHighlighted++;
                        found = true;
                        console.log(`Successfully highlighted error "${errorWord}" within span "${spanText}"`);
                        break; // Only highlight first occurrence to avoid duplicates
                    }
                }
                
                if (!found) {
                    console.warn(`Could not find word token containing "${errorWord}" in paragraph ${paragraphIndex}`);
                    console.warn('Available word tokens:', wordSpans.map(s => `"${s.textContent}"`));
                }
            });
            
            // Add error count badge to paragraph if there are errors
            if (paragraphErrorsHighlighted > 0) {
                this.addErrorCountBadge(paragraph, paragraphErrorsHighlighted, errors.length);
            }
        });
        
        console.log(`Spell error highlighting complete: ${totalErrorsHighlighted}/${totalErrorsProcessed} errors highlighted`);
        
        // Restore cursor position after DOM manipulation
        setTimeout(() => {
            this.setCursorPosition(savedCursorPosition);
        }, 0);
    }

    addErrorCountBadge(paragraph, highlightedCount, totalCount) {
        // Create error count badge
        const badge = document.createElement('span');
        badge.className = 'error-count-badge';
        badge.textContent = `${highlightedCount}/${totalCount} errors`;
        badge.style.position = 'absolute';
        badge.style.right = '10px';
        badge.style.top = '5px';
        badge.style.background = '#dc3545';
        badge.style.color = 'white';
        badge.style.fontSize = '11px';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '10px';
        badge.style.fontWeight = '500';
        badge.style.zIndex = '10';
        badge.style.userSelect = 'none';
        badge.style.pointerEvents = 'none';
        
        // Make paragraph position relative so badge positions correctly
        if (getComputedStyle(paragraph).position === 'static') {
            paragraph.style.position = 'relative';
        }
        
        // Add badge to paragraph
        paragraph.appendChild(badge);
        
        console.log(`Added error count badge to paragraph: ${highlightedCount}/${totalCount} errors`);
    }

    handleSpellErrorClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const span = e.target;
        const word = span.dataset.word;
        const suggestions = span.dataset.suggestions.split(', ').filter(s => s.trim());
        
        this.showSpellingSuggestions(span, word, suggestions);
    }

    handleSpellErrorRightClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const span = e.target;
        const word = span.dataset.word;
        const suggestions = span.dataset.suggestions.split(', ').filter(s => s.trim());
        
        this.showSpellingSuggestions(span, word, suggestions);
    }

    showSpellingSuggestions(span, word, suggestions) {
        // Remove any existing suggestion menu
        document.querySelectorAll('.spell-suggestions').forEach(menu => menu.remove());
        
        const menu = document.createElement('div');
        menu.className = 'spell-suggestions';
        menu.style.position = 'absolute';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.padding = '0';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        menu.style.zIndex = '1000';
        menu.style.minWidth = '200px';
        menu.style.maxWidth = '300px';
        menu.style.maxHeight = '400px';
        menu.style.overflow = 'hidden';
        menu.style.display = 'flex';
        menu.style.flexDirection = 'column';
        
        // Position menu near the error
        const rect = span.getBoundingClientRect();
        const menuLeft = Math.min(rect.left, window.innerWidth - 320); // Ensure menu doesn't go off screen
        const menuTop = rect.bottom + 5;
        
        menu.style.left = `${menuLeft}px`;
        menu.style.top = `${menuTop}px`;
        
        // Add header
        if (suggestions.length > 0) {
            const header = document.createElement('div');
            header.style.padding = '8px 12px';
            header.style.backgroundColor = '#f8f9fa';
            header.style.borderBottom = '1px solid #dee2e6';
            header.style.fontWeight = '600';
            header.style.fontSize = '0.9rem';
            header.style.color = '#495057';
            header.textContent = `Suggestions for "${word}" (${suggestions.length})`;
            menu.appendChild(header);
            
            // Create scrollable suggestions container
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.style.maxHeight = '300px';
            suggestionsContainer.style.overflowY = 'auto';
            suggestionsContainer.style.padding = '4px 0';
            
            suggestions.forEach((suggestion, index) => {
                const option = document.createElement('div');
                option.className = 'spell-suggestion-option';
                option.style.padding = '6px 12px';
                option.style.cursor = 'pointer';
                option.style.borderBottom = index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none';
                option.style.fontSize = '0.9rem';
                option.style.transition = 'background-color 0.15s ease';
                
                // Highlight the suggestion text
                const suggestionText = document.createElement('span');
                suggestionText.textContent = suggestion;
                suggestionText.style.fontWeight = '500';
                option.appendChild(suggestionText);
                
                option.addEventListener('mouseenter', () => {
                    option.style.backgroundColor = '#e3f2fd';
                });
                option.addEventListener('mouseleave', () => {
                    option.style.backgroundColor = 'transparent';
                });
                
                option.addEventListener('click', () => {
                    this.replaceSpellError(span, suggestion);
                    menu.remove();
                });
                
                suggestionsContainer.appendChild(option);
            });
            
            menu.appendChild(suggestionsContainer);
            
            // Add separator
            const separator = document.createElement('div');
            separator.style.height = '1px';
            separator.style.backgroundColor = '#dee2e6';
            separator.style.margin = '4px 0';
            menu.appendChild(separator);
        } else {
            // No suggestions available
            const noSuggestions = document.createElement('div');
            noSuggestions.style.padding = '12px';
            noSuggestions.style.textAlign = 'center';
            noSuggestions.style.color = '#6c757d';
            noSuggestions.style.fontStyle = 'italic';
            noSuggestions.textContent = 'No suggestions available';
            menu.appendChild(noSuggestions);
            
            // Add separator
            const separator = document.createElement('div');
            separator.style.height = '1px';
            separator.style.backgroundColor = '#dee2e6';
            separator.style.margin = '4px 0';
            menu.appendChild(separator);
        }
        
        // Add "Add to dictionary" option
        const addToDictionary = document.createElement('div');
        addToDictionary.className = 'spell-suggestion-option';
        addToDictionary.style.padding = '8px 12px';
        addToDictionary.style.cursor = 'pointer';
        addToDictionary.style.fontStyle = 'italic';
        addToDictionary.style.backgroundColor = '#f8f9fa';
        addToDictionary.style.borderTop = '1px solid #dee2e6';
        addToDictionary.style.fontSize = '0.85rem';
        addToDictionary.style.color = '#28a745';
        addToDictionary.style.fontWeight = '500';
        addToDictionary.style.transition = 'background-color 0.15s ease';
        addToDictionary.innerHTML = `<span style="margin-right: 6px;">+</span>Add "${word}" to dictionary`;
        
        addToDictionary.addEventListener('mouseenter', () => {
            addToDictionary.style.backgroundColor = '#e8f5e8';
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
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }

    replaceSpellError(span, replacement) {
        // Store cursor position
        const savedPosition = this.getCursorPosition();
        
        // Check if this is a spell-error-highlight span (precise highlighting) or a word-token span (legacy)
        if (span.classList.contains('spell-error-highlight')) {
            // This is a precise highlight within a word token
            const wordToken = span.parentNode;
            const originalWord = span.getAttribute('data-word');
            
            // Get the current content of the word token
            const currentText = wordToken.textContent;
            
            // Replace the error word with the replacement in the text
            const newText = currentText.replace(originalWord, replacement);
            
            // Replace the entire word token content with the corrected text
            wordToken.innerHTML = '';
            wordToken.appendChild(document.createTextNode(newText));
            wordToken.setAttribute('data-word', newText.toLowerCase());
            
        } else {
            // Legacy handling: this is a word-token span with spell-error class
            span.textContent = replacement;
            span.classList.remove('spell-error');
            span.removeAttribute('data-suggestions');
            span.removeAttribute('title');
            span.setAttribute('data-word', replacement.toLowerCase());
            
            // Ensure no residual styling
            span.style.removeProperty('background-color');
            span.style.removeProperty('border-bottom');
            span.style.removeProperty('border');
            span.style.removeProperty('text-decoration');
            span.style.removeProperty('cursor');
            
            // Remove event listeners by cloning the node
            const newSpan = span.cloneNode(true);
            newSpan.className = 'word-token'; // Ensure clean class
            span.parentNode.replaceChild(newSpan, span);
        }
        
        // Position cursor right after the corrected word
        setTimeout(() => {
            try {
                const selection = window.getSelection();
                const range = document.createRange();
                range.setStartAfter(newSpan);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (error) {
                console.error('Error positioning cursor after spell correction:', error);
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

    addWordToDictionary(word) {
        if (!this.isConnected) return;
        
        const message = {
            type: 'add_to_dictionary',
            word: word
        };
        
        this.ws.send(JSON.stringify(message));
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
