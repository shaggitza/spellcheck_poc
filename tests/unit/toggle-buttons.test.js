/**
 * Unit Tests for Toggle Button Functionality
 * Tests the toggle buttons for predictions and spell checking including:
 * - Toggle button initialization
 * - State management and persistence
 * - Visual updates and clickability
 * - Settings integration
 * - Engine state synchronization
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

// Mock fetch for settings API calls
global.fetch = jest.fn();

describe('Toggle Buttons Functionality', () => {
    let textEditor;
    let mockDependencies;
    let mockElements;
    let mockPredictionEngine;
    let mockSpellChecker;

    beforeEach(() => {
        // Reset fetch mock
        fetch.mockClear();
        fetch.mockResolvedValue({
            json: () => Promise.resolve({ success: true })
        });

        // Setup DOM
        document.body.innerHTML = '';
        mockElements = createMockDOMElements();
        
        // Create toggle button elements
        const predictionToggleBtn = document.createElement('button');
        predictionToggleBtn.id = 'prediction-toggle-btn';
        predictionToggleBtn.className = 'btn toggle-btn';
        
        const predictionToggleIcon = document.createElement('span');
        predictionToggleIcon.id = 'prediction-toggle-icon';
        predictionToggleBtn.appendChild(predictionToggleIcon);
        
        const spellCheckToggleBtn = document.createElement('button');
        spellCheckToggleBtn.id = 'spellcheck-toggle-btn';
        spellCheckToggleBtn.className = 'btn toggle-btn';
        
        const spellCheckToggleIcon = document.createElement('span');
        spellCheckToggleIcon.id = 'spellcheck-toggle-icon';
        spellCheckToggleBtn.appendChild(spellCheckToggleIcon);

        // Add elements to DOM
        document.body.appendChild(mockElements.textEditor);
        document.body.appendChild(predictionToggleBtn);
        document.body.appendChild(spellCheckToggleBtn);

        // Create mock engines
        mockPredictionEngine = {
            setPredictionEnabled: jest.fn(),
            isPredictionEnabled: jest.fn(() => true),
            initialize: jest.fn(),
            destroy: jest.fn()
        };

        mockSpellChecker = {
            setSpellCheckingEnabled: jest.fn(),
            isSpellCheckingEnabled: jest.fn(() => true),
            initialize: jest.fn(),
            destroy: jest.fn()
        };

        // Setup mock dependencies
        mockDependencies = {
            websocket: jest.fn(() => createMockWebSocket()),
            validator: createMockValidator(),
            errorHandler: createMockErrorHandler(),
            environment: createMockEnvironment(),
            utils: createMockUtils(),
            config: global.CONFIG,
            textEditor: mockElements.textEditor,
            predictionToggleBtn: predictionToggleBtn,
            predictionToggleIcon: predictionToggleIcon,
            spellCheckToggleBtn: spellCheckToggleBtn,
            spellCheckToggleIcon: spellCheckToggleIcon,
            getEditorContent: jest.fn(() => 'Test content'),
            getCursorPosition: jest.fn(() => 5),
            setCursorPosition: jest.fn(),
            handleTextChange: jest.fn(),
            clearTimeoutSafe: jest.fn(),
            setTimeoutSafe: jest.fn((callback, delay) => setTimeout(callback, delay)),
            fileManager: { hasCurrentFile: jest.fn(() => true) }
        };

        // Create a minimal TextEditor-like class for testing
        class TestTextEditor {
            constructor(deps) {
                Object.assign(this, deps);
                this.predictionEnabled = true;
                this.spellCheckingEnabled = true;
                this.predictionEngine = mockPredictionEngine;
                this.spellChecker = mockSpellChecker;
                this.isConnected = true;
            }

            togglePredictions() {
                this.predictionEnabled = !this.predictionEnabled;
                
                if (this.predictionEngine) {
                    this.predictionEngine.setPredictionEnabled(this.predictionEnabled);
                }
                
                this.updateToggleButton('prediction', this.predictionEnabled);
                this.saveSetting('prediction_enabled', this.predictionEnabled);
                
                console.log(`Predictions ${this.predictionEnabled ? 'enabled' : 'disabled'}`);
            }

            toggleSpellCheck() {
                this.spellCheckingEnabled = !this.spellCheckingEnabled;
                
                if (this.spellChecker) {
                    this.spellChecker.setSpellCheckingEnabled(this.spellCheckingEnabled);
                }
                
                this.updateToggleButton('spellCheck', this.spellCheckingEnabled);
                this.saveSetting('spell_check_enabled', this.spellCheckingEnabled);
                
                console.log(`Spell checking ${this.spellCheckingEnabled ? 'enabled' : 'disabled'}`);
            }

            updateToggleButton(type, enabled) {
                let button, icon;
                
                if (type === 'prediction') {
                    button = this.predictionToggleBtn;
                    icon = this.predictionToggleIcon;
                } else if (type === 'spellCheck') {
                    button = this.spellCheckToggleBtn;
                    icon = this.spellCheckToggleIcon;
                }
                
                if (!button || !icon) return;
                
                // Ensure button is never actually disabled (always clickable)
                button.removeAttribute('disabled');
                button.disabled = false;
                
                if (enabled) {
                    button.classList.remove('disabled');
                    button.classList.add('enabled');
                    icon.textContent = type === 'prediction' ? '🔮' : '📝';
                    button.title = `Disable ${type === 'prediction' ? 'AI Predictions' : 'Spell Checking'}`;
                } else {
                    button.classList.remove('enabled');
                    button.classList.add('disabled');
                    icon.textContent = type === 'prediction' ? '🚫' : '❌';
                    button.title = `Enable ${type === 'prediction' ? 'AI Predictions' : 'Spell Checking'}`;
                }
                
                console.log(`Toggle button updated: ${type} = ${enabled ? 'enabled' : 'disabled'} (clickable: true)`);
            }

            async saveSetting(key, value) {
                try {
                    const settings = { [key]: value };
                    
                    const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ settings }),
                    });

                    const data = await response.json();
                    if (!data.success) {
                        console.error('Failed to save setting:', key, value);
                    }
                    return data;
                } catch (error) {
                    console.error('Error saving setting:', error);
                    throw error;
                }
            }

            async loadSettings() {
                try {
                    const response = await fetch('/api/settings');
                    const data = await response.json();

                    if (data.settings) {
                        const settings = data.settings;

                        if (typeof settings.spell_check_enabled === 'boolean') {
                            this.spellCheckingEnabled = settings.spell_check_enabled;
                        }

                        if (typeof settings.prediction_enabled === 'boolean') {
                            this.predictionEnabled = settings.prediction_enabled;
                        }

                        // Update toggle button states based on loaded settings
                        this.updateToggleButton('spellCheck', this.spellCheckingEnabled);
                        this.updateToggleButton('prediction', this.predictionEnabled);

                        // Apply settings to engines
                        if (this.spellChecker) {
                            this.spellChecker.setSpellCheckingEnabled(this.spellCheckingEnabled);
                        }
                        if (this.predictionEngine) {
                            this.predictionEngine.setPredictionEnabled(this.predictionEnabled);
                        }

                        console.log('✅ Settings loaded:', settings);
                    }
                    return data;
                } catch (error) {
                    console.error('Failed to load settings:', error);
                    throw error;
                }
            }
        }

        textEditor = new TestTextEditor(mockDependencies);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Toggle Button Initialization', () => {
        test('should initialize with correct default states', () => {
            expect(textEditor.predictionEnabled).toBe(true);
            expect(textEditor.spellCheckingEnabled).toBe(true);
        });

        test('should have valid button elements', () => {
            expect(textEditor.predictionToggleBtn).toBeDefined();
            expect(textEditor.spellCheckToggleBtn).toBeDefined();
            expect(textEditor.predictionToggleIcon).toBeDefined();
            expect(textEditor.spellCheckToggleIcon).toBeDefined();
        });

        test('should have buttons in DOM', () => {
            expect(document.getElementById('prediction-toggle-btn')).toBeTruthy();
            expect(document.getElementById('spellcheck-toggle-btn')).toBeTruthy();
        });
    });

    describe('Prediction Toggle Functionality', () => {
        test('should toggle prediction state from enabled to disabled', () => {
            // Initially enabled
            expect(textEditor.predictionEnabled).toBe(true);
            
            // Toggle to disabled
            textEditor.togglePredictions();
            
            expect(textEditor.predictionEnabled).toBe(false);
            expect(mockPredictionEngine.setPredictionEnabled).toHaveBeenCalledWith(false);
        });

        test('should toggle prediction state from disabled to enabled', () => {
            // Start with disabled
            textEditor.predictionEnabled = false;
            
            // Toggle to enabled
            textEditor.togglePredictions();
            
            expect(textEditor.predictionEnabled).toBe(true);
            expect(mockPredictionEngine.setPredictionEnabled).toHaveBeenCalledWith(true);
        });

        test('should update button visual state when enabled', () => {
            textEditor.predictionEnabled = true;
            textEditor.updateToggleButton('prediction', true);
            
            const button = textEditor.predictionToggleBtn;
            const icon = textEditor.predictionToggleIcon;
            
            expect(button.classList.contains('enabled')).toBe(true);
            expect(button.classList.contains('disabled')).toBe(false);
            expect(icon.textContent).toBe('🔮');
            expect(button.title).toBe('Disable AI Predictions');
            expect(button.disabled).toBe(false);
            expect(button.hasAttribute('disabled')).toBe(false);
        });

        test('should update button visual state when disabled', () => {
            textEditor.predictionEnabled = false;
            textEditor.updateToggleButton('prediction', false);
            
            const button = textEditor.predictionToggleBtn;
            const icon = textEditor.predictionToggleIcon;
            
            expect(button.classList.contains('enabled')).toBe(false);
            expect(button.classList.contains('disabled')).toBe(true);
            expect(icon.textContent).toBe('🚫');
            expect(button.title).toBe('Enable AI Predictions');
            expect(button.disabled).toBe(false);
            expect(button.hasAttribute('disabled')).toBe(false);
        });

        test('should remain clickable when disabled', () => {
            textEditor.updateToggleButton('prediction', false);
            
            const button = textEditor.predictionToggleBtn;
            
            // Button should have disabled styling but remain clickable
            expect(button.classList.contains('disabled')).toBe(true);
            expect(button.disabled).toBe(false);
            expect(button.hasAttribute('disabled')).toBe(false);
            
            // Should be able to simulate click
            const clickEvent = new Event('click', { bubbles: true });
            expect(() => button.dispatchEvent(clickEvent)).not.toThrow();
        });

        test('should save setting when toggled', () => {
            const saveSpy = jest.spyOn(textEditor, 'saveSetting').mockImplementation(() => {
                return Promise.resolve({ success: true });
            });
            
            textEditor.togglePredictions();
            
            expect(saveSpy).toHaveBeenCalledWith('prediction_enabled', false);
            saveSpy.mockRestore();
        });
    });

    describe('Spell Check Toggle Functionality', () => {
        test('should toggle spell check state from enabled to disabled', () => {
            // Initially enabled
            expect(textEditor.spellCheckingEnabled).toBe(true);
            
            // Toggle to disabled
            textEditor.toggleSpellCheck();
            
            expect(textEditor.spellCheckingEnabled).toBe(false);
            expect(mockSpellChecker.setSpellCheckingEnabled).toHaveBeenCalledWith(false);
        });

        test('should toggle spell check state from disabled to enabled', () => {
            // Start with disabled
            textEditor.spellCheckingEnabled = false;
            
            // Toggle to enabled
            textEditor.toggleSpellCheck();
            
            expect(textEditor.spellCheckingEnabled).toBe(true);
            expect(mockSpellChecker.setSpellCheckingEnabled).toHaveBeenCalledWith(true);
        });

        test('should update button visual state when enabled', () => {
            textEditor.spellCheckingEnabled = true;
            textEditor.updateToggleButton('spellCheck', true);
            
            const button = textEditor.spellCheckToggleBtn;
            const icon = textEditor.spellCheckToggleIcon;
            
            expect(button.classList.contains('enabled')).toBe(true);
            expect(button.classList.contains('disabled')).toBe(false);
            expect(icon.textContent).toBe('📝');
            expect(button.title).toBe('Disable Spell Checking');
            expect(button.disabled).toBe(false);
            expect(button.hasAttribute('disabled')).toBe(false);
        });

        test('should update button visual state when disabled', () => {
            textEditor.spellCheckingEnabled = false;
            textEditor.updateToggleButton('spellCheck', false);
            
            const button = textEditor.spellCheckToggleBtn;
            const icon = textEditor.spellCheckToggleIcon;
            
            expect(button.classList.contains('enabled')).toBe(false);
            expect(button.classList.contains('disabled')).toBe(true);
            expect(icon.textContent).toBe('❌');
            expect(button.title).toBe('Enable Spell Checking');
            expect(button.disabled).toBe(false);
            expect(button.hasAttribute('disabled')).toBe(false);
        });

        test('should remain clickable when disabled', () => {
            textEditor.updateToggleButton('spellCheck', false);
            
            const button = textEditor.spellCheckToggleBtn;
            
            // Button should have disabled styling but remain clickable
            expect(button.classList.contains('disabled')).toBe(true);
            expect(button.disabled).toBe(false);
            expect(button.hasAttribute('disabled')).toBe(false);
            
            // Should be able to simulate click
            const clickEvent = new Event('click', { bubbles: true });
            expect(() => button.dispatchEvent(clickEvent)).not.toThrow();
        });

        test('should save setting when toggled', () => {
            const saveSpy = jest.spyOn(textEditor, 'saveSetting').mockImplementation(() => {
                return Promise.resolve({ success: true });
            });
            
            textEditor.toggleSpellCheck();
            
            expect(saveSpy).toHaveBeenCalledWith('spell_check_enabled', false);
            saveSpy.mockRestore();
        });
    });

    describe('Settings Integration', () => {
        test('should load settings and update toggle states', async () => {
            const mockSettings = {
                settings: {
                    prediction_enabled: false,
                    spell_check_enabled: true
                }
            };

            fetch.mockResolvedValue({
                json: () => Promise.resolve(mockSettings)
            });

            await textEditor.loadSettings();

            expect(textEditor.predictionEnabled).toBe(false);
            expect(textEditor.spellCheckingEnabled).toBe(true);
            expect(mockPredictionEngine.setPredictionEnabled).toHaveBeenCalledWith(false);
            expect(mockSpellChecker.setSpellCheckingEnabled).toHaveBeenCalledWith(true);
        });

        test('should handle settings load failure gracefully', async () => {
            fetch.mockRejectedValue(new Error('Network error'));

            await expect(textEditor.loadSettings()).rejects.toThrow('Network error');
            
            // Should maintain current state on failure
            expect(textEditor.predictionEnabled).toBe(true);
            expect(textEditor.spellCheckingEnabled).toBe(true);
        });

        test('should save individual setting correctly', async () => {
            fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true })
            });

            await textEditor.saveSetting('prediction_enabled', false);

            expect(fetch).toHaveBeenCalledWith('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    settings: { prediction_enabled: false }
                }),
            });
        });

        test('should handle setting save failure', async () => {
            fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: false })
            });

            // Should not throw but log error
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            await textEditor.saveSetting('prediction_enabled', false);
            
            expect(consoleSpy).toHaveBeenCalledWith('Failed to save setting:', 'prediction_enabled', false);
            
            consoleSpy.mockRestore();
        });
    });

    describe('Engine Synchronization', () => {
        test('should synchronize prediction engine state on toggle', () => {
            textEditor.togglePredictions();
            
            expect(mockPredictionEngine.setPredictionEnabled).toHaveBeenCalledWith(false);
        });

        test('should synchronize spell checker state on toggle', () => {
            textEditor.toggleSpellCheck();
            
            expect(mockSpellChecker.setSpellCheckingEnabled).toHaveBeenCalledWith(false);
        });

        test('should handle missing engines gracefully', () => {
            textEditor.predictionEngine = null;
            textEditor.spellChecker = null;
            
            expect(() => textEditor.togglePredictions()).not.toThrow();
            expect(() => textEditor.toggleSpellCheck()).not.toThrow();
        });

        test('should work with both systems enabled simultaneously', () => {
            // Both should be enabled by default
            expect(textEditor.predictionEnabled).toBe(true);
            expect(textEditor.spellCheckingEnabled).toBe(true);
            
            // Both engines should be in enabled state
            expect(mockPredictionEngine.setPredictionEnabled).not.toHaveBeenCalled();
            expect(mockSpellChecker.setSpellCheckingEnabled).not.toHaveBeenCalled();
            
            // Toggling one should not affect the other
            textEditor.togglePredictions();
            expect(textEditor.predictionEnabled).toBe(false);
            expect(textEditor.spellCheckingEnabled).toBe(true);
            
            textEditor.toggleSpellCheck();
            expect(textEditor.predictionEnabled).toBe(false);
            expect(textEditor.spellCheckingEnabled).toBe(false);
        });
    });

    describe('Button State Management', () => {
        test('should handle invalid button type gracefully', () => {
            expect(() => textEditor.updateToggleButton('invalid', true)).not.toThrow();
        });

        test('should handle missing button elements gracefully', () => {
            textEditor.predictionToggleBtn = null;
            textEditor.predictionToggleIcon = null;
            
            expect(() => textEditor.updateToggleButton('prediction', true)).not.toThrow();
        });

        test('should ensure buttons are always clickable', () => {
            // Test both enabled and disabled states
            textEditor.updateToggleButton('prediction', true);
            expect(textEditor.predictionToggleBtn.disabled).toBe(false);
            expect(textEditor.predictionToggleBtn.hasAttribute('disabled')).toBe(false);
            
            textEditor.updateToggleButton('prediction', false);
            expect(textEditor.predictionToggleBtn.disabled).toBe(false);
            expect(textEditor.predictionToggleBtn.hasAttribute('disabled')).toBe(false);
            
            textEditor.updateToggleButton('spellCheck', true);
            expect(textEditor.spellCheckToggleBtn.disabled).toBe(false);
            expect(textEditor.spellCheckToggleBtn.hasAttribute('disabled')).toBe(false);
            
            textEditor.updateToggleButton('spellCheck', false);
            expect(textEditor.spellCheckToggleBtn.disabled).toBe(false);
            expect(textEditor.spellCheckToggleBtn.hasAttribute('disabled')).toBe(false);
        });

        test('should update button titles correctly', () => {
            // Test prediction button titles
            textEditor.updateToggleButton('prediction', true);
            expect(textEditor.predictionToggleBtn.title).toBe('Disable AI Predictions');
            
            textEditor.updateToggleButton('prediction', false);
            expect(textEditor.predictionToggleBtn.title).toBe('Enable AI Predictions');
            
            // Test spell check button titles
            textEditor.updateToggleButton('spellCheck', true);
            expect(textEditor.spellCheckToggleBtn.title).toBe('Disable Spell Checking');
            
            textEditor.updateToggleButton('spellCheck', false);
            expect(textEditor.spellCheckToggleBtn.title).toBe('Enable Spell Checking');
        });

        test('should update button icons correctly', () => {
            // Test prediction button icons
            textEditor.updateToggleButton('prediction', true);
            expect(textEditor.predictionToggleIcon.textContent).toBe('🔮');
            
            textEditor.updateToggleButton('prediction', false);
            expect(textEditor.predictionToggleIcon.textContent).toBe('🚫');
            
            // Test spell check button icons
            textEditor.updateToggleButton('spellCheck', true);
            expect(textEditor.spellCheckToggleIcon.textContent).toBe('📝');
            
            textEditor.updateToggleButton('spellCheck', false);
            expect(textEditor.spellCheckToggleIcon.textContent).toBe('❌');
        });
    });

    describe('Multiple Toggle Operations', () => {
        test('should handle rapid successive toggles', () => {
            const initialState = textEditor.predictionEnabled;
            
            // Multiple rapid toggles
            textEditor.togglePredictions();
            textEditor.togglePredictions();
            textEditor.togglePredictions();
            
            // Should end up in opposite state from start
            expect(textEditor.predictionEnabled).toBe(!initialState);
        });

        test('should maintain independent states for both toggles', () => {
            // Set to different states
            textEditor.predictionEnabled = true;
            textEditor.spellCheckingEnabled = false;
            
            textEditor.updateToggleButton('prediction', true);
            textEditor.updateToggleButton('spellCheck', false);
            
            // Verify independent states
            expect(textEditor.predictionToggleBtn.classList.contains('enabled')).toBe(true);
            expect(textEditor.spellCheckToggleBtn.classList.contains('disabled')).toBe(true);
            
            // Toggle prediction should not affect spell check
            textEditor.togglePredictions();
            expect(textEditor.predictionEnabled).toBe(false);
            expect(textEditor.spellCheckingEnabled).toBe(false); // Should remain unchanged
        });
    });
});
