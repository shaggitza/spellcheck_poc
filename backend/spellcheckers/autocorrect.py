"""
Autocorrect implementation - Simple and fast spell correction.

This module provides a spell checker implementation using the autocorrect library,
which provides fast, lightweight spell correction for multiple languages.
"""

import re
from typing import Dict, List, Optional, Any

from .base import BaseSpellChecker, SpellCheckResult, SpellCheckerNotAvailableError

# Try to import autocorrect
try:
    from autocorrect import Speller
    AUTOCORRECT_AVAILABLE = True
except ImportError:
    AUTOCORRECT_AVAILABLE = False
    Speller = None


class AutocorrectProvider(BaseSpellChecker):
    """
    Spell checker implementation using the autocorrect library.
    
    Autocorrect provides fast, lightweight spell correction with support
    for multiple languages and is good for simple corrections.
    """
    
    def __init__(self, language: str = "en", **kwargs):
        super().__init__("Autocorrect", language, **kwargs)
        self._speller = None
        
    async def initialize(self) -> bool:
        """Initialize Autocorrect speller with specified language."""
        if not AUTOCORRECT_AVAILABLE:
            print("⚠️  Autocorrect library not available")
            return False
        
        try:
            # Initialize speller for the specified language
            self._speller = Speller(lang=self.language)
            
            # Test the speller with a simple word
            test_word = "spellling"
            corrected = self._speller(test_word)
            print(f"✅ Autocorrect initialized for language '{self.language}'")
            print(f"   Test correction: '{test_word}' → '{corrected}'")
            
            self._initialized = True
            self._available = True
            return True
            
        except Exception as e:
            print(f"⚠️  Autocorrect initialization failed: {e}")
            self._initialized = False
            self._available = False
            return False
    
    async def check_text(self, text: str, language: Optional[str] = None) -> SpellCheckResult:
        """Check a single text string for spelling errors."""
        if not self.is_available():
            raise SpellCheckerNotAvailableError(f"{self.name} is not available")
        
        # Use different speller if language is specified and different
        speller = self._speller
        if language and language != self.language:
            try:
                speller = Speller(lang=language)
            except Exception:
                speller = self._speller  # Fallback to default
        
        errors = []
        
        # Extract words with their positions
        word_matches = re.finditer(r'\b\w+\b', text)
        
        for match in word_matches:
            word = match.group()
            start_pos = match.start()
            
            # Get corrected version of the word
            corrected_word = speller(word)
            
            # If correction is different, it's likely a misspelling
            if corrected_word.lower() != word.lower():
                error = {
                    "word": word,
                    "position": start_pos,
                    "length": len(word),
                    "suggestions": [corrected_word],
                    "line": 0,
                    "column": start_pos,
                    "correction": corrected_word,
                    "confidence": "autocorrect",
                    "type": "spelling"
                }
                errors.append(error)
        
        # Generate corrected text by applying all corrections
        corrected_text = text
        # Apply corrections in reverse order to maintain positions
        for error in reversed(errors):
            start = error["position"]
            end = start + error["length"]
            corrected_text = (corrected_text[:start] + 
                            error["correction"] + 
                            corrected_text[end:])
        
        return SpellCheckResult(
            original_text=text,
            errors=errors,
            corrected_text=corrected_text,
            language=language or self.language,
            engine=self.name,
            metadata={
                "total_words": len(list(re.finditer(r'\b\w+\b', text))),
                "corrections_made": len(errors),
                "language_used": language or self.language
            }
        )
    
    async def check_lines(self, lines: List[str], language: Optional[str] = None) -> Dict[int, SpellCheckResult]:
        """Check multiple lines of text for spelling errors."""
        results = {}
        
        for line_num, line_text in enumerate(lines):
            if line_text.strip():  # Skip empty lines
                result = await self.check_text(line_text, language)
                # Update error line numbers
                for error in result.errors:
                    error["line"] = line_num
                results[line_num] = result
        
        return results
    
    def is_available(self) -> bool:
        """Check if Autocorrect is available and initialized."""
        return (AUTOCORRECT_AVAILABLE and 
                self._available and 
                self._speller is not None)
    
    def get_supported_languages(self) -> List[str]:
        """Get supported languages for Autocorrect."""
        # Autocorrect supports these languages
        return [
            "en",  # English
            "es",  # Spanish
            "fr",  # French
            "pt",  # Portuguese
            "tr",  # Turkish
            "ru",  # Russian
            "uk",  # Ukrainian
            "it",  # Italian
            "cs",  # Czech
            "de",  # German
            "pl",  # Polish
            "ar",  # Arabic
            "sl",  # Slovenian
            "sk",  # Slovak
            "lv",  # Latvian
            "lt",  # Lithuanian
            "et",  # Estonian
        ]
    
    def correct_word(self, word: str, language: Optional[str] = None) -> str:
        """
        Correct a single word.
        
        Args:
            word: Word to correct
            language: Optional language override
            
        Returns:
            Corrected word
        """
        if not self.is_available():
            return word
        
        try:
            if language and language != self.language:
                speller = Speller(lang=language)
                return speller(word)
            else:
                return self._speller(word)
        except Exception as e:
            print(f"⚠️  Autocorrect word correction failed: {e}")
            return word
    
    def correct_text(self, text: str, language: Optional[str] = None) -> str:
        """
        Apply autocorrect to entire text.
        
        Args:
            text: Text to correct
            language: Optional language override
            
        Returns:
            Corrected text
        """
        if not self.is_available():
            return text
        
        try:
            # Use different speller if language is specified
            speller = self._speller
            if language and language != self.language:
                speller = Speller(lang=language)
            
            # Apply correction to each word while preserving formatting
            def correct_match(match):
                word = match.group()
                return speller(word)
            
            return re.sub(r'\b\w+\b', correct_match, text)
            
        except Exception as e:
            print(f"⚠️  Autocorrect text correction failed: {e}")
            return text
    
    async def cleanup(self) -> None:
        """Clean up Autocorrect resources."""
        self._speller = None
        await super().cleanup()