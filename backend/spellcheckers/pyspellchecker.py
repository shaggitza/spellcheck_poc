"""
PySpellChecker implementation - Pure Python spell checking.

This module provides a spell checker implementation using the pyspellchecker library,
which is a pure Python spell checker based on word frequency analysis.
"""

import re
from typing import Dict, List, Optional, Any

from .base import BaseSpellChecker, SpellCheckResult, SpellCheckerNotAvailableError

# Try to import pyspellchecker
try:
    from pyspellchecker import SpellChecker
    PYSPELLCHECKER_AVAILABLE = True
except ImportError:
    PYSPELLCHECKER_AVAILABLE = False
    SpellChecker = None


class PySpellCheckerProvider(BaseSpellChecker):
    """
    Spell checker implementation using the pyspellchecker library.
    
    This is a lightweight, pure Python spell checker that works well for
    basic spell checking without external dependencies.
    """
    
    def __init__(self, language: str = "en", **kwargs):
        super().__init__("PySpellChecker", language, **kwargs)
        self._spell_checker = None
        
    async def initialize(self) -> bool:
        """Initialize PySpellChecker engine."""
        if not PYSPELLCHECKER_AVAILABLE:
            print("⚠️  PySpellChecker library not available")
            return False
            
        try:
            # Initialize with specified language
            self._spell_checker = SpellChecker(language=self.language)
            self._initialized = True
            self._available = True
            return True
        except Exception as e:
            print(f"⚠️  PySpellChecker initialization failed: {e}")
            self._initialized = False
            self._available = False
            return False
    
    async def check_text(self, text: str, language: Optional[str] = None) -> SpellCheckResult:
        """Check a single text string for spelling errors."""
        if not self.is_available():
            raise SpellCheckerNotAvailableError(f"{self.name} is not available")
        
        # Use provided language or default
        lang = language or self.language
        if lang != self.language:
            # Re-initialize with new language if needed
            temp_checker = SpellChecker(language=lang)
        else:
            temp_checker = self._spell_checker
        
        errors = []
        
        # Extract words from text (simple tokenization)
        words = re.findall(r'\b\w+\b', text.lower())
        word_positions = []
        
        # Find word positions in original text
        for match in re.finditer(r'\b\w+\b', text):
            word_positions.append((match.group(), match.start(), match.end()))
        
        # Find misspelled words
        misspelled = temp_checker.unknown(words)
        
        # Build error list with positions and suggestions
        for original_word, start, end in word_positions:
            if original_word.lower() in misspelled:
                # Get suggestions (limit to top 5)
                suggestions = list(temp_checker.candidates(original_word.lower()))[:5]
                
                error = {
                    "word": original_word,
                    "position": start,
                    "length": end - start,
                    "suggestions": suggestions,
                    "line": 0,  # Single text, so line 0
                    "column": start
                }
                errors.append(error)
        
        return SpellCheckResult(
            original_text=text,
            errors=errors,
            language=lang,
            engine=self.name,
            metadata={
                "total_words": len(words),
                "unique_words": len(set(words)),
                "misspelled_count": len(errors)
            }
        )
    
    async def check_lines(self, lines: List[str], language: Optional[str] = None) -> Dict[int, SpellCheckResult]:
        """Check multiple lines of text for spelling errors."""
        results = {}
        
        for line_num, line_text in enumerate(lines):
            if line_text.strip():  # Skip empty lines
                result = await self.check_text(line_text, language)
                # Update error positions to include line information
                for error in result.errors:
                    error["line"] = line_num
                results[line_num] = result
        
        return results
    
    def is_available(self) -> bool:
        """Check if PySpellChecker is available."""
        return (PYSPELLCHECKER_AVAILABLE and 
                self._available and 
                self._spell_checker is not None)
    
    def get_supported_languages(self) -> List[str]:
        """Get supported languages for PySpellChecker."""
        # PySpellChecker supports these languages out of the box
        return [
            "en",  # English
            "es",  # Spanish  
            "fr",  # French
            "pt",  # Portuguese
            "de",  # German
            "ru",  # Russian
        ]
    
    def add_word_to_dictionary(self, word: str) -> bool:
        """
        Add a word to the personal dictionary.
        
        Args:
            word: Word to add to dictionary
            
        Returns:
            True if word was added successfully
        """
        if not self.is_available():
            return False
        
        try:
            self._spell_checker.word_frequency.load_words([word.lower()])
            return True
        except Exception as e:
            print(f"⚠️  Failed to add word '{word}' to dictionary: {e}")
            return False
    
    def remove_word_from_dictionary(self, word: str) -> bool:
        """
        Remove a word from the personal dictionary.
        
        Args:
            word: Word to remove from dictionary
            
        Returns:
            True if word was removed successfully
        """
        if not self.is_available():
            return False
        
        try:
            # PySpellChecker doesn't have a direct remove method,
            # but we can set frequency to 0
            if word.lower() in self._spell_checker.word_frequency:
                del self._spell_checker.word_frequency[word.lower()]
                return True
            return False
        except Exception as e:
            print(f"⚠️  Failed to remove word '{word}' from dictionary: {e}")
            return False