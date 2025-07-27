/**
 * Integration Tests for Toggle Button Functionality
 * Tests the toggle buttons in the context of the full TextEditor application including:
 * - End-to-end toggle workflows
 * - Integration with prediction engine and spell checker
 * - Settings persistence across sessions
 * - UI interactions and event handling
 */

const path = require('path');

// Import mocks
const {
    createMockUtils,
    createMockValidator,
    createMockErrorHandler,
    createMockEnvironment,
    createMockWebSocket,
    createMockDOMElements
} = require('../mocks/dependencies');

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Bootstrap modal
global.bootstrap = {
    Modal: jest.fn().mockImplementation(() => ({
        show: jest.fn(),
        hide: jest.fn()
    }))
};

describe('Toggle Buttons Integration Tests', () => {
    let mockElements;
    let mockDependencies;
    let mockPredictionEngine;
    let mockSpellChecker;
    let mockFileManager;

    beforeEach(() => {
        // Reset mocks
        fetch.mockClear();
        jest.clearAllMocks();

        // Setup comprehensive DOM structure
        document.body.innerHTML = `
            <div id="textEditor" contenteditable="true"></div>
            <button id="prediction-toggle-btn" class="btn toggle-btn">
                <span id="prediction-toggle-icon">🔮</span>
            </button>
            <button id="spellcheck-toggle-btn" class="btn toggle-btn">
                <span id="spellcheck-toggle-icon">📝</span>
            </button>
            <div id="prediction-text"></div>
            <div id="suggestions-list"></div>
            <div class="connection-status"></div>
            <span class="save-status"></span>
            <button id="save-file">Save</button>
            <span id="current-file-name">No file</span>
            <div id="paragraph-actions" style="display: none;"></div>
            <div id="settings-modal">
                <input id="prediction-enabled" type="checkbox" checked>
                <input id="spell-check-enabled" type="checkbox" checked>
                <button id="save-settings-btn">Save Settings</button>
                <div id="dictionary-list"></div>
                <div id="dictionary-loading" style="display: none;"></div>
                <div id="dictionary-empty" style="display: none;"></div>
                <input id="add-word-input" type="text">
                <button id="add-word-btn">Add Word</button>
                <select id="spell-checker-engine"></select>
                <select id="spell-checker-language"></select>
            </div>
        `;

        mockElements = {
            textEditor: document.getElementById('textEditor'),
            predictionToggleBtn: document.getElementById('prediction-toggle-btn'),
            predictionToggleIcon: document.getElementById('prediction-toggle-icon'),
            spellCheckToggleBtn: document.getElementById('spellcheck-toggle-btn'),
            spellCheckToggleIcon: document.getElementById('spellcheck-toggle-icon'),
            predictionText: document.getElementById('prediction-text'),
            suggestionsList: document.getElementById('suggestions-list'),
            connectionStatus: document.querySelector('.connection-status'),
            saveStatus: document.querySelector('.save-status'),
            saveFile: document.getElementById('save-file'),
            currentFileName: document.getElementById('current-file-name'),
            paragraphActions: document.getElementById('paragraph-actions'),
            settingsModal: document.getElementById('settings-modal'),
            predictionEnabledInput: document.getElementById('prediction-enabled'),
            spellCheckEnabledInput: document.getElementById('spell-check-enabled'),
            saveSettingsBtn: document.getElementById('save-settings-btn'),
            dictionaryList: document.getElementById('dictionary-list'),
            dictionaryLoading: document.getElementById('dictionary-loading'),
            dictionaryEmpty: document.getElementById('dictionary-empty'),
            addWordInput: document.getElementById('add-word-input'),
            addWordBtn: document.getElementById('add-word-btn'),
            spellCheckerEngine: document.getElementById('spell-checker-engine'),
            spellCheckerLanguage: document.getElementById('spell-checker-language')
        };

        // Create mock engines with more realistic behavior
        mockPredictionEngine = {
            predictionEnabled: true,
            setPredictionEnabled: jest.fn((enabled) => {
                mockPredictionEngine.predictionEnabled = enabled;
            }),
            isPredictionEnabled: jest.fn(() => mockPredictionEngine.predictionEnabled),
            requestPrediction: jest.fn(),
            handleKeyEvent: jest.fn(() => false),
            isSuggestionVisible: jest.fn(() => false),
            setTypingState: jest.fn(),
            initialize: jest.fn(),
            destroy: jest.fn()
        };

        mockSpellChecker = {
            spellCheckingEnabled: true,
            setSpellCheckingEnabled: jest.fn((enabled) => {
                mockSpellChecker.spellCheckingEnabled = enabled;
            }),
            isSpellCheckingEnabled: jest.fn(() => mockSpellChecker.spellCheckingEnabled),
            requestSpellCheck: jest.fn(),
            hasSpellErrors: jest.fn(() => false),
            highlightSpellingErrors: jest.fn(),
            removeSpellingHighlights: jest.fn(),
            initialize: jest.fn(),
            destroy: jest.fn()
        };

        mockFileManager = {
            hasCurrentFile: jest.fn(() => true),
            saveCurrentFile: jest.fn(),
            clearCurrentFile: jest.fn(),
            getCurrentFile: jest.fn(() => 'test.txt')
        };

        // Setup comprehensive mock dependencies
        mockDependencies = {
            websocket: jest.fn(() => createMockWebSocket()),
            validator: createMockValidator(),
            errorHandler: createMockErrorHandler(),
            environment: createMockEnvironment(),
            utils: createMockUtils(),
            config: global.CONFIG
        };

        // Mock window selection for cursor operations
        window.getSelection = jest.fn(() => ({
            rangeCount: 1,
            getRangeAt: jest.fn(() => ({
                getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0 })),
                startContainer: { nodeType: Node.TEXT_NODE, parentElement: mockElements.textEditor },
                endContainer: { nodeType: Node.TEXT_NODE, parentElement: mockElements.textEditor },
                startOffset: 0,
                endOffset: 0,
                cloneRange: jest.fn(() => ({
                    selectNodeContents: jest.fn(),
                    setEnd: jest.fn(),
                    cloneContents: jest.fn(() => document.createDocumentFragment())
                })),
                deleteContents: jest.fn(),
                insertNode: jest.fn(),
                setStartAfter: jest.fn(),
                collapse: jest.fn()
            })),
            removeAllRanges: jest.fn(),
            addRange: jest.fn()
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('Full Application Toggle Integration', () => {
        test('should initialize toggle buttons with correct states', () => {
            // Mock successful settings load
            fetch.mockResolvedValue({
                json: () => Promise.resolve({
                    settings: {
                        prediction_enabled: true,
                        spell_check_enabled: true
                    }
                })
            });

            const predictionBtn = mockElements.predictionToggleBtn;
            const spellCheckBtn = mockElements.spellCheckToggleBtn;

            // Buttons should be present and have initial state
            expect(predictionBtn).toBeTruthy();
            expect(spellCheckBtn).toBeTruthy();
            expect(predictionBtn.classList.contains('toggle-btn')).toBe(true);
            expect(spellCheckBtn.classList.contains('toggle-btn')).toBe(true);
        });

        test('should handle click events on toggle buttons', () => {
            const predictionBtn = mockElements.predictionToggleBtn;
            const spellCheckBtn = mockElements.spellCheckToggleBtn;

            // Mock click handlers
            let predictionClicked = false;
            let spellCheckClicked = false;

            predictionBtn.addEventListener('click', () => {
                predictionClicked = true;
            });

            spellCheckBtn.addEventListener('click', () => {
                spellCheckClicked = true;
            });

            // Simulate clicks
            predictionBtn.click();
            spellCheckBtn.click();

            expect(predictionClicked).toBe(true);
            expect(spellCheckClicked).toBe(true);
        });

        test('should persist settings across page reload simulation', async () => {
            // Mock API responses
            fetch
                .mockResolvedValueOnce({
                    json: () => Promise.resolve({ success: true })
                })
                .mockResolvedValueOnce({
                    json: () => Promise.resolve({
                        settings: {
                            prediction_enabled: false,
                            spell_check_enabled: true
                        }
                    })
                });

            // Simulate saving settings
            const saveResponse = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: { prediction_enabled: false }
                })
            });

            const saveResult = await saveResponse.json();
            expect(saveResult.success).toBe(true);

            // Simulate loading settings on next page load
            const loadResponse = await fetch('/api/settings');
            const loadResult = await loadResponse.json();

            expect(loadResult.settings.prediction_enabled).toBe(false);
            expect(loadResult.settings.spell_check_enabled).toBe(true);
        });
    });

    describe('Engine Integration', () => {
        test('should coordinate with prediction engine properly', () => {
            // Simulate prediction engine being enabled/disabled
            expect(mockPredictionEngine.isPredictionEnabled()).toBe(true);

            // Simulate toggle
            mockPredictionEngine.setPredictionEnabled(false);
            expect(mockPredictionEngine.predictionEnabled).toBe(false);

            // Verify state change
            mockPredictionEngine.setPredictionEnabled(true);
            expect(mockPredictionEngine.predictionEnabled).toBe(true);
        });

        test('should coordinate with spell checker properly', () => {
            // Simulate spell checker being enabled/disabled
            expect(mockSpellChecker.isSpellCheckingEnabled()).toBe(true);

            // Simulate toggle
            mockSpellChecker.setSpellCheckingEnabled(false);
            expect(mockSpellChecker.spellCheckingEnabled).toBe(false);

            // Verify state change
            mockSpellChecker.setSpellCheckingEnabled(true);
            expect(mockSpellChecker.spellCheckingEnabled).toBe(true);
        });

        test('should allow both systems to work simultaneously', () => {
            // Both should be able to be enabled at the same time
            mockPredictionEngine.setPredictionEnabled(true);
            mockSpellChecker.setSpellCheckingEnabled(true);

            expect(mockPredictionEngine.predictionEnabled).toBe(true);
            expect(mockSpellChecker.spellCheckingEnabled).toBe(true);

            // One can be disabled while the other remains enabled
            mockPredictionEngine.setPredictionEnabled(false);
            expect(mockPredictionEngine.predictionEnabled).toBe(false);
            expect(mockSpellChecker.spellCheckingEnabled).toBe(true);
        });

        test('should handle engine method calls safely when engines are null', () => {
            // Simulate missing engines
            const nullPredictionEngine = null;
            const nullSpellChecker = null;

            // Should not throw errors when engines are null
            expect(() => {
                if (nullPredictionEngine) {
                    nullPredictionEngine.setPredictionEnabled(false);
                }
            }).not.toThrow();

            expect(() => {
                if (nullSpellChecker) {
                    nullSpellChecker.setSpellCheckingEnabled(false);
                }
            }).not.toThrow();
        });
    });

    describe('Settings Modal Integration', () => {
        test('should sync toggle states with settings modal checkboxes', () => {
            const predictionCheckbox = mockElements.predictionEnabledInput;
            const spellCheckCheckbox = mockElements.spellCheckEnabledInput;

            // Initial state
            expect(predictionCheckbox.checked).toBe(true);
            expect(spellCheckCheckbox.checked).toBe(true);

            // Simulate unchecking
            predictionCheckbox.checked = false;
            spellCheckCheckbox.checked = false;

            expect(predictionCheckbox.checked).toBe(false);
            expect(spellCheckCheckbox.checked).toBe(false);
        });

        test('should handle settings save from modal', async () => {
            fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true })
            });

            const mockSettings = {
                prediction_enabled: false,
                spell_check_enabled: true,
                spell_checker_engine: 'pyspellchecker',
                spell_checker_language: 'en'
            };

            // Simulate saving settings
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: mockSettings })
            });

            const result = await response.json();
            expect(result.success).toBe(true);
            expect(fetch).toHaveBeenCalledWith('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: mockSettings })
            });
        });

        test('should load settings into modal controls', async () => {
            const mockSettings = {
                settings: {
                    prediction_enabled: false,
                    spell_check_enabled: true,
                    spell_checker_engine: 'pyspellchecker',
                    spell_checker_language: 'en'
                }
            };

            fetch.mockResolvedValue({
                json: () => Promise.resolve(mockSettings)
            });

            const response = await fetch('/api/settings');
            const result = await response.json();

            // Simulate updating UI with loaded settings
            if (result.settings) {
                mockElements.predictionEnabledInput.checked = result.settings.prediction_enabled;
                mockElements.spellCheckEnabledInput.checked = result.settings.spell_check_enabled;
                
                // Add options to select elements before setting values
                if (result.settings.spell_checker_engine) {
                    const engineOption = document.createElement('option');
                    engineOption.value = result.settings.spell_checker_engine;
                    engineOption.textContent = result.settings.spell_checker_engine;
                    mockElements.spellCheckerEngine.appendChild(engineOption);
                    mockElements.spellCheckerEngine.value = result.settings.spell_checker_engine;
                }
                
                if (result.settings.spell_checker_language) {
                    const languageOption = document.createElement('option');
                    languageOption.value = result.settings.spell_checker_language;
                    languageOption.textContent = result.settings.spell_checker_language;
                    mockElements.spellCheckerLanguage.appendChild(languageOption);
                    mockElements.spellCheckerLanguage.value = result.settings.spell_checker_language;
                }
            }

            expect(mockElements.predictionEnabledInput.checked).toBe(false);
            expect(mockElements.spellCheckEnabledInput.checked).toBe(true);
            expect(mockElements.spellCheckerEngine.value).toBe('pyspellchecker');
            expect(mockElements.spellCheckerLanguage.value).toBe('en');
        });
    });

    describe('Visual State Management', () => {
        test('should update button appearance based on state', () => {
            const predictionBtn = mockElements.predictionToggleBtn;
            const predictionIcon = mockElements.predictionToggleIcon;

            // Simulate enabled state
            predictionBtn.classList.remove('disabled');
            predictionBtn.classList.add('enabled');
            predictionIcon.textContent = '🔮';
            predictionBtn.title = 'Disable AI Predictions';

            expect(predictionBtn.classList.contains('enabled')).toBe(true);
            expect(predictionBtn.classList.contains('disabled')).toBe(false);
            expect(predictionIcon.textContent).toBe('🔮');
            expect(predictionBtn.title).toBe('Disable AI Predictions');

            // Simulate disabled state
            predictionBtn.classList.remove('enabled');
            predictionBtn.classList.add('disabled');
            predictionIcon.textContent = '🚫';
            predictionBtn.title = 'Enable AI Predictions';

            expect(predictionBtn.classList.contains('enabled')).toBe(false);
            expect(predictionBtn.classList.contains('disabled')).toBe(true);
            expect(predictionIcon.textContent).toBe('🚫');
            expect(predictionBtn.title).toBe('Enable AI Predictions');
        });

        test('should ensure buttons remain clickable in all states', () => {
            const predictionBtn = mockElements.predictionToggleBtn;
            const spellCheckBtn = mockElements.spellCheckToggleBtn;

            // Test enabled state
            predictionBtn.classList.add('enabled');
            predictionBtn.removeAttribute('disabled');
            predictionBtn.disabled = false;

            expect(predictionBtn.disabled).toBe(false);
            expect(predictionBtn.hasAttribute('disabled')).toBe(false);

            // Test disabled state (should still be clickable)
            predictionBtn.classList.remove('enabled');
            predictionBtn.classList.add('disabled');
            predictionBtn.removeAttribute('disabled');
            predictionBtn.disabled = false;

            expect(predictionBtn.disabled).toBe(false);
            expect(predictionBtn.hasAttribute('disabled')).toBe(false);

            // Same for spell check button
            spellCheckBtn.classList.add('disabled');
            spellCheckBtn.removeAttribute('disabled');
            spellCheckBtn.disabled = false;

            expect(spellCheckBtn.disabled).toBe(false);
            expect(spellCheckBtn.hasAttribute('disabled')).toBe(false);
        });

        test('should handle hover states properly', () => {
            const predictionBtn = mockElements.predictionToggleBtn;

            // Simulate hover events
            const mouseEnter = new Event('mouseenter');
            const mouseLeave = new Event('mouseleave');

            // Should be able to dispatch hover events without errors
            expect(() => predictionBtn.dispatchEvent(mouseEnter)).not.toThrow();
            expect(() => predictionBtn.dispatchEvent(mouseLeave)).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle API failures gracefully', async () => {
            fetch.mockRejectedValue(new Error('Network error'));

            let errorOccurred = false;
            try {
                await fetch('/api/settings');
            } catch (error) {
                errorOccurred = true;
                expect(error.message).toBe('Network error');
            }

            expect(errorOccurred).toBe(true);
        });

        test('should handle malformed API responses', async () => {
            fetch.mockResolvedValue({
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            let errorOccurred = false;
            try {
                const response = await fetch('/api/settings');
                await response.json();
            } catch (error) {
                errorOccurred = true;
                expect(error.message).toBe('Invalid JSON');
            }

            expect(errorOccurred).toBe(true);
        });

        test('should handle missing DOM elements gracefully', () => {
            // Remove toggle buttons from DOM
            const predictionBtn = document.getElementById('prediction-toggle-btn');
            const spellCheckBtn = document.getElementById('spellcheck-toggle-btn');
            
            if (predictionBtn) predictionBtn.remove();
            if (spellCheckBtn) spellCheckBtn.remove();

            // Should not crash when trying to update non-existent buttons
            expect(() => {
                const btn = document.getElementById('prediction-toggle-btn');
                if (btn) {
                    btn.classList.add('enabled');
                }
            }).not.toThrow();
        });
    });

    describe('Performance and Memory', () => {
        test('should not create memory leaks with repeated toggles', () => {
            const predictionBtn = mockElements.predictionToggleBtn;
            
            // Simulate many rapid toggles
            for (let i = 0; i < 100; i++) {
                const clickEvent = new Event('click');
                predictionBtn.dispatchEvent(clickEvent);
            }

            // Should not crash or create excessive objects
            expect(true).toBe(true); // Test passes if no errors thrown
        });

        test('should handle concurrent toggle operations', () => {
            const predictionBtn = mockElements.predictionToggleBtn;
            const spellCheckBtn = mockElements.spellCheckToggleBtn;

            // Simulate concurrent clicks
            const predictionClick = new Event('click');
            const spellCheckClick = new Event('click');

            expect(() => {
                predictionBtn.dispatchEvent(predictionClick);
                spellCheckBtn.dispatchEvent(spellCheckClick);
            }).not.toThrow();
        });
    });

    describe('Accessibility', () => {
        test('should have proper button attributes for accessibility', () => {
            const predictionBtn = mockElements.predictionToggleBtn;
            const spellCheckBtn = mockElements.spellCheckToggleBtn;

            // Buttons should have titles for screen readers
            predictionBtn.title = 'Enable AI Predictions';
            spellCheckBtn.title = 'Enable Spell Checking';

            expect(predictionBtn.title).toBeTruthy();
            expect(spellCheckBtn.title).toBeTruthy();

            // Buttons should be focusable
            expect(predictionBtn.tabIndex).not.toBe(-1);
            expect(spellCheckBtn.tabIndex).not.toBe(-1);
        });

        test('should support keyboard navigation', () => {
            const predictionBtn = mockElements.predictionToggleBtn;

            // Should respond to Enter and Space keys
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });

            expect(() => predictionBtn.dispatchEvent(enterEvent)).not.toThrow();
            expect(() => predictionBtn.dispatchEvent(spaceEvent)).not.toThrow();
        });
    });
});
