/**
 * Test for spell checker error badges to prevent the "numbers at end of paragraphs" issue
 */

// Import required modules and setup
require('../setup');
const SpellChecker = require('../../static/spell-checker');
const { 
    createMockUtils, 
    createMockValidator, 
    createMockErrorHandler, 
    createMockEnvironment,
    createMockDOMElements,
    createMockConfig
} = require('../mocks/dependencies');

describe('SpellChecker Badge Behavior', () => {
    let spellChecker;
    let mockDependencies;
    let mockTextEditor;
    let mockParagraph;

    beforeEach(() => {
        // Setup DOM environment
        document.body.innerHTML = `
            <div id="textEditor" contenteditable="true">
                <p class="test-paragraph">This is a test paragraph with a misspeled word.</p>
            </div>
        `;

        mockTextEditor = document.getElementById('textEditor');
        mockParagraph = mockTextEditor.querySelector('.test-paragraph');

        // Create mock dependencies
        mockDependencies = {
            utils: createMockUtils(),
            validator: createMockValidator(),
            errorHandler: createMockErrorHandler(),
            environment: createMockEnvironment(),
            config: {
                ...createMockConfig(),
                CSS_CLASSES: {
                    ERROR_COUNT_BADGE: 'error-count-badge'  // Use correct class name
                }
            },
            textEditor: mockTextEditor,
            getWebSocket: jest.fn(() => ({ readyState: WebSocket.OPEN })),
            getConnectionState: jest.fn(() => true),
            getTextEditor: jest.fn(() => mockTextEditor),
            getIsTyping: jest.fn(() => false),
            getSuggestionVisible: jest.fn(() => false),
            fileManager: { hasCurrentFile: jest.fn(() => true) },
            getEditorContent: jest.fn(() => 'Test content'),
            getCursorPosition: jest.fn(() => 0),
            setCursorPosition: jest.fn(),
            handleTextChange: jest.fn(),
            clearTimeoutSafe: jest.fn(),
            setTimeoutSafe: jest.fn(),
            addWordToDictionary: jest.fn()
        };

        spellChecker = new SpellChecker(mockDependencies);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Error Count Badge Behavior', () => {
        test('should not add badges when user is typing', () => {
            // Mock user is typing
            mockDependencies.getIsTyping.mockReturnValue(true);

            // Try to add error badge
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);

            // Badge should not be added
            const badge = mockParagraph.querySelector('.error-count-badge');
            expect(badge).toBeNull();
        });

        test('should hide badges by default and only show on hover', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Add error badge
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);

            // Badge should exist but be hidden
            const badge = mockParagraph.querySelector('.error-count-badge');
            expect(badge).toBeTruthy();
            expect(badge.style.visibility).toBe('hidden');
            expect(badge.style.pointerEvents).toBe('none');
        });

        test('should position badges outside the text flow', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Add error badge
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);

            // Badge should be positioned absolutely outside the paragraph
            const badge = mockParagraph.querySelector('.error-count-badge');
            expect(badge).toBeTruthy();
            expect(badge.style.position).toBe('absolute');
            expect(badge.style.right).toBe('-35px'); // Outside the paragraph
            expect(mockParagraph.style.position).toBe('relative'); // Parent positioned relatively
        });

        test('should show badge on paragraph hover and hide on leave', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Add error badge
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);

            const badge = mockParagraph.querySelector('.error-count-badge');
            expect(badge.style.visibility).toBe('hidden');

            // Simulate mouse enter
            const mouseEnterEvent = new Event('mouseenter');
            mockParagraph.dispatchEvent(mouseEnterEvent);

            expect(badge.style.visibility).toBe('visible');

            // Simulate mouse leave
            const mouseLeaveEvent = new Event('mouseleave');
            mockParagraph.dispatchEvent(mouseLeaveEvent);

            expect(badge.style.visibility).toBe('hidden');
        });

        test('should remove existing badge before adding new one', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Add first badge
            spellChecker.addErrorCountBadge(mockParagraph, 1, 2);
            let badges = mockParagraph.querySelectorAll('.error-count-badge');
            expect(badges.length).toBe(1);
            expect(badges[0].textContent).toBe('2');

            // Add second badge (should replace first)
            spellChecker.addErrorCountBadge(mockParagraph, 2, 3);
            badges = mockParagraph.querySelectorAll('.error-count-badge');
            expect(badges.length).toBe(1); // Only one badge should exist
            expect(badges[0].textContent).toBe('3');
        });

        test('should not interfere with text selection or editing', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Add error badge
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);

            const badge = mockParagraph.querySelector('.error-count-badge');
            expect(badge.style.pointerEvents).toBe('none');
        });

        test('should properly color badges based on error count', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Test complete highlighting (all errors highlighted) - #dc3545 = rgb(220, 53, 69)
            spellChecker.addErrorCountBadge(mockParagraph, 2, 2);
            let badge = mockParagraph.querySelector('.error-count-badge');
            expect(badge.style.backgroundColor).toBe('rgb(220, 53, 69)'); // Red for complete

            // Remove badge
            badge.remove();

            // Test partial highlighting (some errors highlighted) - #ffc107 = rgb(255, 193, 7)
            spellChecker.addErrorCountBadge(mockParagraph, 1, 2);
            badge = mockParagraph.querySelector('.error-count-badge');
            expect(badge.style.backgroundColor).toBe('rgb(255, 193, 7)'); // Yellow for partial
        });
    });

    describe('Badge Cleanup', () => {
        test('should remove all badges when clearing spell check state', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Add some badges
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);
            
            // Create another paragraph with badge
            const anotherP = document.createElement('p');
            anotherP.textContent = 'Another paragraph';
            mockTextEditor.appendChild(anotherP);
            spellChecker.addErrorCountBadge(anotherP, 1, 1);

            // Verify badges exist
            expect(mockTextEditor.querySelectorAll('.error-count-badge').length).toBe(2);

            // Clear spell check state
            spellChecker.clearSpellCheckState();

            // All badges should be removed
            expect(mockTextEditor.querySelectorAll('.error-count-badge').length).toBe(0);
        });

        test('should remove badges when clearing spell error highlights', () => {
            // Mock user is not typing
            mockDependencies.getIsTyping.mockReturnValue(false);

            // Add badge
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);
            expect(mockParagraph.querySelector('.error-count-badge')).toBeTruthy();

            // Clear highlights
            spellChecker.clearSpellErrorHighlights();

            // Badge should be removed
            expect(mockParagraph.querySelector('.error-count-badge')).toBeFalsy();
        });
    });

    describe('Integration with Typing State', () => {
        test('should respect typing state from dependency injection', () => {
            const mockGetIsTyping = jest.fn();
            mockDependencies.getIsTyping = mockGetIsTyping;
            spellChecker = new SpellChecker(mockDependencies);

            // Test when typing
            mockGetIsTyping.mockReturnValue(true);
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);
            expect(mockParagraph.querySelector('.error-count-badge')).toBeFalsy();

            // Test when not typing
            mockGetIsTyping.mockReturnValue(false);
            spellChecker.addErrorCountBadge(mockParagraph, 1, 1);
            expect(mockParagraph.querySelector('.error-count-badge')).toBeTruthy();
        });

        test('should handle missing getIsTyping dependency gracefully', () => {
            // Create spell checker without getIsTyping
            delete mockDependencies.getIsTyping;
            spellChecker = new SpellChecker(mockDependencies);

            // Should not throw error
            expect(() => {
                spellChecker.addErrorCountBadge(mockParagraph, 1, 1);
            }).not.toThrow();

            // Badge should be added since we can't determine typing state
            expect(mockParagraph.querySelector('.error-count-badge')).toBeTruthy();
        });
    });
});
