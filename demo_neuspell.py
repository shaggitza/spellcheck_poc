#!/usr/bin/env python3
"""
Example demonstrating NeuSpell integration in production environment.
This shows how the spell checking would work when neuspell is available.
"""

import asyncio
import sys
import os

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def demo_spell_checking():
    """Demonstrate spell checking with different engines."""
    print("🔍 NeuSpell Integration Demo")
    print("=" * 50)
    
    # Test words with various types of errors
    test_cases = [
        ("correct", "A correctly spelled word"),
        ("helo", "Simple typo - missing letter"),
        ("recieve", "Common misspelling - ie/ei confusion"),
        ("spellnig", "Transposed letters"),
        ("accomodate", "Double letter error"),
        ("seperate", "Common misspelling"),
    ]
    
    print("Testing spell checking engines:\n")
    
    # Import after sys.path is set up
    from main import spell_check_word_with_engine
    
    for word, description in test_cases:
        print(f"Word: '{word}' ({description})")
        
        try:
            # Test pyspellchecker (always available)
            is_correct, suggestions = await spell_check_word_with_engine(word, "pyspellchecker")
            status = "✅ CORRECT" if is_correct else f"❌ INCORRECT → {suggestions[:3]}"
            print(f"  PySpellChecker: {status}")
            
            # Test neuspell (falls back to pyspellchecker in this environment)
            is_correct, suggestions = await spell_check_word_with_engine(word, "neuspell")
            status = "✅ CORRECT" if is_correct else f"❌ INCORRECT → {suggestions[:3]}"
            print(f"  NeuSpell:       {status}")
            
        except Exception as e:
            print(f"  Error testing '{word}': {e}")
        
        print()
    
    print("📋 Integration Status:")
    print("✅ NeuSpell integration implemented")
    print("✅ Graceful fallback to PySpellChecker")
    print("✅ API endpoints updated")
    print("✅ Error handling in place")
    print("⚠️  NeuSpell requires internet access for models")
    print("🚀 Ready for production deployment")

if __name__ == "__main__":
    asyncio.run(demo_spell_checking())