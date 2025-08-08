#!/usr/bin/env python3
"""
Simple test for autocorrect integration.
This tests the autocorrect functionality without needing the full app to run.
"""

import asyncio
import sys
from typing import List, Tuple

# Test if autocorrect is available
try:
    from autocorrect import Speller
    AUTOCORRECT_AVAILABLE = True
    print("✅ Autocorrect library is available")
except ImportError:
    AUTOCORRECT_AVAILABLE = False
    print("❌ Autocorrect library is not available")
    sys.exit(1)

# Initialize autocorrect checker
try:
    autocorrect_checker = Speller(lang="en", threshold=10000)
    print("✅ Autocorrect speller initialized successfully with threshold=10000")
except Exception as e:
    print(f"❌ Autocorrect initialization failed: {e}")
    sys.exit(1)

async def spell_check_word_with_autocorrect(word: str) -> Tuple[bool, List[str]]:
    """
    Test implementation of spell checking with autocorrect
    Returns (is_correct, suggestions_list)
    """
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
        return False, []

async def test_words():
    """Test various words with autocorrect"""
    test_cases = [
        # (word, expected_to_be_correct)
        ("hello", True),
        ("world", True),
        ("teh", False),  # should be "the"
        ("recieve", False),  # should be "receive" 
        ("python", True),
        ("spellign", False),  # should be "spelling"
        ("autocorrect", True),
        ("availabel", False),  # should be "available"
        ("correct", True),
        ("incorect", False),  # should be "incorrect"
    ]
    
    print("\n🧪 Testing spell checking with autocorrect:")
    print("=" * 60)
    
    for word, expected_correct in test_cases:
        is_correct, suggestions = await spell_check_word_with_autocorrect(word)
        
        status = "✅" if is_correct == expected_correct else "❌"
        result = "CORRECT" if is_correct else "INCORRECT"
        
        print(f"{status} '{word}' -> {result}")
        
        if not is_correct and suggestions:
            print(f"    Suggestions: {', '.join(suggestions[:5])}")
        
        if not is_correct:
            # Test direct correction
            corrected = autocorrect_checker.autocorrect_word(word)
            print(f"    Direct correction: '{word}' -> '{corrected}'")
        
        print()

async def test_sentence_correction():
    """Test sentence-level correction"""
    print("🧪 Testing sentence correction:")
    print("=" * 60)
    
    test_sentences = [
        "I'm not sleapy and tehre is no place I'm giong to.",
        "This is a tset of the autocorect libary.",
        "Spellign errros can be fixxed automaticaly.",
        "Python is a gerat programing languag.",
    ]
    
    for sentence in test_sentences:
        corrected = autocorrect_checker.autocorrect_sentence(sentence)
        print(f"Original:  {sentence}")
        print(f"Corrected: {corrected}")
        print()

async def main():
    """Main test function"""
    print("🚀 Autocorrect Integration Test")
    print("=" * 60)
    
    # Test individual words
    await test_words()
    
    # Test sentence correction
    await test_sentence_correction()
    
    print("✅ Test completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())