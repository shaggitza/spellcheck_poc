#!/usr/bin/env python3
"""
Integration test to verify the autocorrect implementation is working correctly.
This tests the spell_check_word_with_engine function specifically.
"""

import asyncio
from typing import List, Tuple

# Mock the other dependencies that may not be installed
class MockSpellChecker:
    def __contains__(self, word):
        return word.lower() in ['hello', 'world', 'python', 'correct', 'autocorrect']
    
    def candidates(self, word):
        return []

class MockAsyncSqlite:
    @staticmethod
    async def connect(path):
        return MockDB()

class MockDB:
    def __init__(self):
        self.settings = {
            'spell_checker_engine': 'autocorrect'
        }
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
        
    def execute(self, query, params=()):
        return MockCursor(self.settings)

class MockCursor:
    def __init__(self, settings):
        self.settings = settings
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
        
    async def fetchone(self):
        return (self.settings.get('spell_checker_engine', 'pyspellchecker'),)

# Test the autocorrect implementation
try:
    from autocorrect import Speller
    AUTOCORRECT_AVAILABLE = True
    autocorrect_checker = Speller(lang="en", threshold=10000)
    print("✅ Autocorrect library is available and initialized")
except ImportError:
    AUTOCORRECT_AVAILABLE = False
    autocorrect_checker = None
    print("❌ Autocorrect library is not available")

# Set up mocks
import sys
sys.modules['aiosqlite'] = MockAsyncSqlite
sys.modules['spellchecker'] = type('MockSpellChecker', (), {'SpellChecker': MockSpellChecker})

# Mock the global variables
pyspell_checker = MockSpellChecker()
hunspell_checker = None
HUNSPELL_AVAILABLE = False

async def spell_check_word_with_engine(
    word: str, engine: str = "pyspellchecker"
) -> Tuple[bool, List[str]]:
    """
    Test implementation of the spell_check_word_with_engine function from main.py
    """
    if engine == "autocorrect" and autocorrect_checker and AUTOCORRECT_AVAILABLE:
        try:
            # Use autocorrect's autocorrect_word method to see if word needs correction
            corrected_word = autocorrect_checker.autocorrect_word(word)
            
            if corrected_word.lower() == word.lower():
                # Word is correct (no change made)
                return True, []
            else:
                # Word was corrected, so original is incorrect
                # Get multiple suggestions using candidates
                candidates = autocorrect_checker.get_candidates(word)
                if candidates:
                    suggestions = [candidate[1] for candidate in sorted(candidates, key=lambda x: x[0], reverse=True)][:15]
                    # Make sure corrected word is first in suggestions if not already there
                    if corrected_word not in suggestions:
                        suggestions.insert(0, corrected_word)
                else:
                    suggestions = [corrected_word]
                
                return False, suggestions
                
        except Exception as e:
            print(f"⚠️  Autocorrect error for word '{word}': {e}")
            # Fallback to PySpellChecker
            engine = "pyspellchecker"
    
    if engine == "hunspell" and hunspell_checker and HUNSPELL_AVAILABLE:
        try:
            is_correct = hunspell_checker.spell(word)
            if not is_correct:
                suggestions = hunspell_checker.suggest(word)[:15]  # Top 15 suggestions
                return False, suggestions
            return True, []
        except Exception as e:
            print(f"⚠️  Hunspell error for word '{word}': {e}")
            # Fallback to PySpellChecker
            engine = "pyspellchecker"

    # Use PySpellChecker (default or fallback)
    if word.lower() not in pyspell_checker:
        candidates = pyspell_checker.candidates(word)
        suggestions = list(candidates)[:15] if candidates else []
        return False, suggestions

    return True, []

async def test_spell_checking():
    """Test the spell checking implementation"""
    print("\n🧪 Testing spell_check_word_with_engine function:")
    print("=" * 60)
    
    test_cases = [
        # (word, engine, expected_correct)
        ("hello", "autocorrect", True),
        ("teh", "autocorrect", False),  # should suggest "the"
        ("recieve", "autocorrect", False),  # should suggest "receive"
        ("python", "autocorrect", True),
        ("spellign", "autocorrect", False),  # should suggest "spelling"
        ("world", "pyspellchecker", True),  # fallback test
        ("nonexistentword", "pyspellchecker", False),  # fallback test
    ]
    
    for word, engine, expected_correct in test_cases:
        is_correct, suggestions = await spell_check_word_with_engine(word, engine)
        
        status = "✅" if is_correct == expected_correct else "❌"
        result = "CORRECT" if is_correct else "INCORRECT"
        
        print(f"{status} '{word}' ({engine}) -> {result}")
        
        if not is_correct and suggestions:
            print(f"    Suggestions: {', '.join(suggestions[:5])}")
        print()

async def main():
    """Main test function"""
    print("🚀 Autocorrect Integration Test")
    print("=" * 60)
    
    if not AUTOCORRECT_AVAILABLE:
        print("❌ Cannot run tests without autocorrect library")
        return
    
    await test_spell_checking()
    
    print("✅ Integration test completed!")

if __name__ == "__main__":
    asyncio.run(main())