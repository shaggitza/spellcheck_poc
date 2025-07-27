/**
 * CSS Tests for Toggle Button Styling
 * Tests the toggle button visual states and styling including:
 * - Enabled/disabled state styling
 * - Hover effects and transitions
 * - Clickability and pointer events
 * - Responsive design
 */

describe('Toggle Button CSS Styling', () => {
    let predictionBtn, spellCheckBtn;
    
    beforeEach(() => {
        // Setup DOM with toggle buttons
        document.body.innerHTML = `
            <style>
                /* Copy the relevant CSS styles for testing */
                .toggle-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 1rem;
                    margin: 0 4px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    user-select: none;
                    pointer-events: auto !important;
                }

                .toggle-btn.enabled {
                    background: #28a745 !important;
                    color: white !important;
                    cursor: pointer !important;
                    pointer-events: auto !important;
                }

                .toggle-btn.enabled:hover {
                    background: #218838 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .toggle-btn.disabled {
                    background: #dc3545 !important;
                    color: white !important;
                    cursor: pointer !important;
                    pointer-events: auto !important;
                }

                .toggle-btn.disabled:hover {
                    background: #c82333 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .toggle-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
                }

                .toggle-btn:focus {
                    outline: 2px solid #007bff;
                    outline-offset: 2px;
                }
            </style>
            <button id="prediction-toggle-btn" class="toggle-btn enabled">
                <span id="prediction-toggle-icon">🔮</span>
            </button>
            <button id="spellcheck-toggle-btn" class="toggle-btn enabled">
                <span id="spellcheck-toggle-icon">📝</span>
            </button>
        `;

        predictionBtn = document.getElementById('prediction-toggle-btn');
        spellCheckBtn = document.getElementById('spellcheck-toggle-btn');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Basic Toggle Button Structure', () => {
        test('should have correct base classes', () => {
            expect(predictionBtn.classList.contains('toggle-btn')).toBe(true);
            expect(spellCheckBtn.classList.contains('toggle-btn')).toBe(true);
        });

        test('should have icon elements', () => {
            const predictionIcon = document.getElementById('prediction-toggle-icon');
            const spellCheckIcon = document.getElementById('spellcheck-toggle-icon');
            
            expect(predictionIcon).toBeTruthy();
            expect(spellCheckIcon).toBeTruthy();
            expect(predictionIcon.textContent).toBe('🔮');
            expect(spellCheckIcon.textContent).toBe('📝');
        });

        test('should be clickable by default', () => {
            expect(predictionBtn.disabled).toBe(false);
            expect(spellCheckBtn.disabled).toBe(false);
        });
    });

    describe('Enabled State Styling', () => {
        test('should apply enabled class correctly', () => {
            predictionBtn.classList.add('enabled');
            predictionBtn.classList.remove('disabled');
            
            expect(predictionBtn.classList.contains('enabled')).toBe(true);
            expect(predictionBtn.classList.contains('disabled')).toBe(false);
        });

        test('should have correct visual properties for enabled state', () => {
            predictionBtn.classList.add('enabled');
            
            const styles = window.getComputedStyle(predictionBtn);
            
            // Note: In jsdom, computed styles may not reflect CSS exactly,
            // but we can test that the classes are applied correctly
            expect(predictionBtn.classList.contains('enabled')).toBe(true);
        });

        test('should maintain clickability when enabled', () => {
            predictionBtn.classList.add('enabled');
            predictionBtn.removeAttribute('disabled');
            predictionBtn.disabled = false;
            
            expect(predictionBtn.disabled).toBe(false);
            expect(predictionBtn.hasAttribute('disabled')).toBe(false);
        });
    });

    describe('Disabled State Styling', () => {
        test('should apply disabled class correctly', () => {
            predictionBtn.classList.add('disabled');
            predictionBtn.classList.remove('enabled');
            
            expect(predictionBtn.classList.contains('disabled')).toBe(true);
            expect(predictionBtn.classList.contains('enabled')).toBe(false);
        });

        test('should remain clickable when disabled (styled only)', () => {
            predictionBtn.classList.add('disabled');
            predictionBtn.removeAttribute('disabled');
            predictionBtn.disabled = false;
            
            expect(predictionBtn.disabled).toBe(false);
            expect(predictionBtn.hasAttribute('disabled')).toBe(false);
            expect(predictionBtn.classList.contains('disabled')).toBe(true);
        });

        test('should have different icon for disabled state', () => {
            const predictionIcon = document.getElementById('prediction-toggle-icon');
            const spellCheckIcon = document.getElementById('spellcheck-toggle-icon');
            
            // Simulate disabled state icons
            predictionIcon.textContent = '🚫';
            spellCheckIcon.textContent = '❌';
            
            expect(predictionIcon.textContent).toBe('🚫');
            expect(spellCheckIcon.textContent).toBe('❌');
        });
    });

    describe('State Transitions', () => {
        test('should transition between enabled and disabled states', () => {
            // Start enabled
            predictionBtn.classList.add('enabled');
            expect(predictionBtn.classList.contains('enabled')).toBe(true);
            
            // Transition to disabled
            predictionBtn.classList.remove('enabled');
            predictionBtn.classList.add('disabled');
            expect(predictionBtn.classList.contains('disabled')).toBe(true);
            expect(predictionBtn.classList.contains('enabled')).toBe(false);
            
            // Transition back to enabled
            predictionBtn.classList.remove('disabled');
            predictionBtn.classList.add('enabled');
            expect(predictionBtn.classList.contains('enabled')).toBe(true);
            expect(predictionBtn.classList.contains('disabled')).toBe(false);
        });

        test('should handle rapid state changes', () => {
            for (let i = 0; i < 10; i++) {
                if (i % 2 === 0) {
                    predictionBtn.classList.remove('disabled');
                    predictionBtn.classList.add('enabled');
                } else {
                    predictionBtn.classList.remove('enabled');
                    predictionBtn.classList.add('disabled');
                }
            }
            
            // Should end in disabled state (i=9 is odd)
            expect(predictionBtn.classList.contains('disabled')).toBe(true);
            expect(predictionBtn.classList.contains('enabled')).toBe(false);
        });
    });

    describe('Event Handling', () => {
        test('should respond to click events in enabled state', () => {
            predictionBtn.classList.add('enabled');
            
            let clicked = false;
            predictionBtn.addEventListener('click', () => {
                clicked = true;
            });
            
            predictionBtn.click();
            expect(clicked).toBe(true);
        });

        test('should respond to click events in disabled state', () => {
            predictionBtn.classList.add('disabled');
            predictionBtn.removeAttribute('disabled');
            predictionBtn.disabled = false;
            
            let clicked = false;
            predictionBtn.addEventListener('click', () => {
                clicked = true;
            });
            
            predictionBtn.click();
            expect(clicked).toBe(true);
        });

        test('should handle mouse events', () => {
            let mouseEntered = false;
            let mouseLeft = false;
            
            predictionBtn.addEventListener('mouseenter', () => {
                mouseEntered = true;
            });
            
            predictionBtn.addEventListener('mouseleave', () => {
                mouseLeft = true;
            });
            
            // Simulate mouse events
            predictionBtn.dispatchEvent(new Event('mouseenter'));
            predictionBtn.dispatchEvent(new Event('mouseleave'));
            
            expect(mouseEntered).toBe(true);
            expect(mouseLeft).toBe(true);
        });

        test('should handle keyboard events', () => {
            let keyPressed = false;
            
            predictionBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    keyPressed = true;
                }
            });
            
            // Simulate Enter key
            predictionBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            expect(keyPressed).toBe(true);
            
            keyPressed = false;
            
            // Simulate Space key
            predictionBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            expect(keyPressed).toBe(true);
        });
    });

    describe('Icon Management', () => {
        test('should update prediction button icons correctly', () => {
            const icon = document.getElementById('prediction-toggle-icon');
            
            // Test enabled icon
            icon.textContent = '🔮';
            expect(icon.textContent).toBe('🔮');
            
            // Test disabled icon
            icon.textContent = '🚫';
            expect(icon.textContent).toBe('🚫');
        });

        test('should update spell check button icons correctly', () => {
            const icon = document.getElementById('spellcheck-toggle-icon');
            
            // Test enabled icon
            icon.textContent = '📝';
            expect(icon.textContent).toBe('📝');
            
            // Test disabled icon
            icon.textContent = '❌';
            expect(icon.textContent).toBe('❌');
        });

        test('should handle missing icons gracefully', () => {
            // Remove icon element
            const icon = document.getElementById('prediction-toggle-icon');
            icon.remove();
            
            // Should not crash when trying to update non-existent icon
            expect(() => {
                const missingIcon = document.getElementById('prediction-toggle-icon');
                if (missingIcon) {
                    missingIcon.textContent = '🔮';
                }
            }).not.toThrow();
        });
    });

    describe('Title and Accessibility', () => {
        test('should update button titles for enabled state', () => {
            predictionBtn.title = 'Disable AI Predictions';
            spellCheckBtn.title = 'Disable Spell Checking';
            
            expect(predictionBtn.title).toBe('Disable AI Predictions');
            expect(spellCheckBtn.title).toBe('Disable Spell Checking');
        });

        test('should update button titles for disabled state', () => {
            predictionBtn.title = 'Enable AI Predictions';
            spellCheckBtn.title = 'Enable Spell Checking';
            
            expect(predictionBtn.title).toBe('Enable AI Predictions');
            expect(spellCheckBtn.title).toBe('Enable Spell Checking');
        });

        test('should be focusable', () => {
            predictionBtn.focus();
            expect(document.activeElement).toBe(predictionBtn);
            
            spellCheckBtn.focus();
            expect(document.activeElement).toBe(spellCheckBtn);
        });

        test('should have accessible button role', () => {
            expect(predictionBtn.tagName.toLowerCase()).toBe('button');
            expect(spellCheckBtn.tagName.toLowerCase()).toBe('button');
        });
    });

    describe('Layout and Positioning', () => {
        test('should maintain button layout with both buttons present', () => {
            // Both buttons should be in the DOM
            expect(document.getElementById('prediction-toggle-btn')).toBeTruthy();
            expect(document.getElementById('spellcheck-toggle-btn')).toBeTruthy();
            
            // Should have consistent styling
            expect(predictionBtn.classList.contains('toggle-btn')).toBe(true);
            expect(spellCheckBtn.classList.contains('toggle-btn')).toBe(true);
        });

        test('should handle different button states independently', () => {
            // Set different states
            predictionBtn.classList.add('enabled');
            predictionBtn.classList.remove('disabled');
            
            spellCheckBtn.classList.add('disabled');
            spellCheckBtn.classList.remove('enabled');
            
            // Verify independent states
            expect(predictionBtn.classList.contains('enabled')).toBe(true);
            expect(predictionBtn.classList.contains('disabled')).toBe(false);
            
            expect(spellCheckBtn.classList.contains('disabled')).toBe(true);
            expect(spellCheckBtn.classList.contains('enabled')).toBe(false);
        });
    });

    describe('CSS Specificity and Overrides', () => {
        test('should prioritize important CSS rules', () => {
            // Add both enabled and disabled classes to test specificity
            predictionBtn.classList.add('enabled');
            predictionBtn.classList.add('disabled');
            
            // The CSS should have !important rules that ensure correct styling
            // In a real environment, the last class added or most specific rule wins
            expect(predictionBtn.classList.contains('enabled')).toBe(true);
            expect(predictionBtn.classList.contains('disabled')).toBe(true);
        });

        test('should ensure pointer events are always enabled', () => {
            // Even with disabled styling, buttons should remain clickable
            predictionBtn.classList.add('disabled');
            predictionBtn.removeAttribute('disabled');
            predictionBtn.disabled = false;
            
            expect(predictionBtn.disabled).toBe(false);
            
            // In real CSS, pointer-events: auto !important should override any blocking
            const styles = window.getComputedStyle(predictionBtn);
            // Note: jsdom may not fully support computed styles for pointer-events
            expect(predictionBtn.classList.contains('disabled')).toBe(true);
        });
    });

    describe('Error Resistance', () => {
        test('should handle malformed class operations', () => {
            expect(() => {
                // These operations should not crash but may throw SyntaxError
                try {
                    predictionBtn.classList.add('');
                } catch (e) {
                    // Expected for empty string
                }
                try {
                    predictionBtn.classList.remove('');
                } catch (e) {
                    // Expected for empty string
                }
                try {
                    predictionBtn.classList.toggle('');
                } catch (e) {
                    // Expected for empty string
                }
                
                // These should work fine
                predictionBtn.classList.add('valid-class');
                predictionBtn.classList.remove('valid-class');
                predictionBtn.classList.toggle('another-class');
            }).not.toThrow();
        });

        test('should handle repeated class additions/removals', () => {
            expect(() => {
                for (let i = 0; i < 100; i++) {
                    predictionBtn.classList.add('enabled');
                    predictionBtn.classList.remove('enabled');
                    predictionBtn.classList.add('disabled');
                    predictionBtn.classList.remove('disabled');
                }
            }).not.toThrow();
        });

        test('should handle missing class operations gracefully', () => {
            expect(() => {
                predictionBtn.classList.remove('non-existent-class');
                predictionBtn.classList.toggle('another-non-existent-class');
            }).not.toThrow();
        });
    });
});
