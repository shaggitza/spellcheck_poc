"""
Hunspell implementation - High-quality spell checking with morphological analysis.

This module provides a spell checker implementation using the Hunspell library,
which is used by many popular applications like LibreOffice and Firefox.
"""

import re
from typing import Dict, List, Optional, Any
from pathlib import Path

from .base import BaseSpellChecker, SpellCheckResult, SpellCheckerNotAvailableError

# Try to import hunspell
try:
    import hunspell
    HUNSPELL_AVAILABLE = True
except ImportError:
    HUNSPELL_AVAILABLE = False
    hunspell = None


class HunspellProvider(BaseSpellChecker):
    """
    Spell checker implementation using Hunspell library.
    
    Hunspell provides high-quality spell checking with morphological analysis
    and is widely used in professional applications.
    """
    
    def __init__(self, language: str = "en", dictionary_path: Optional[str] = None, 
                 affix_path: Optional[str] = None, **kwargs):
        super().__init__("Hunspell", language, **kwargs)
        self._hunspell = None
        self.dictionary_path = dictionary_path
        self.affix_path = affix_path
        
    async def initialize(self) -> bool:
        """Initialize Hunspell engine with appropriate dictionaries."""
        if not HUNSPELL_AVAILABLE:
            print("⚠️  Hunspell library not available")
            return False
        
        try:
            # Try to find appropriate dictionary files
            if not self.dictionary_path or not self.affix_path:
                dict_path, affix_path = self._find_dictionary_files()
                if not dict_path or not affix_path:
                    print(f"⚠️  Could not find Hunspell dictionaries for language '{self.language}'")
                    return False
                self.dictionary_path = dict_path
                self.affix_path = affix_path
            
            # Initialize Hunspell
            self._hunspell = hunspell.HunSpell(self.dictionary_path, self.affix_path)
            self._initialized = True
            self._available = True
            print(f"✅ Hunspell initialized for language '{self.language}'")
            return True
            
        except Exception as e:
            print(f"⚠️  Hunspell initialization failed: {e}")
            self._initialized = False
            self._available = False
            return False
    
    def _find_dictionary_files(self) -> tuple[Optional[str], Optional[str]]:
        """Find appropriate dictionary and affix files for the language."""
        # Common paths for Hunspell dictionaries
        common_paths = [
            "/usr/share/hunspell",
            "/usr/share/myspell", 
            "/usr/local/share/hunspell",
            "/opt/homebrew/share/hunspell",  # macOS with Homebrew
            Path.home() / ".hunspell",
            Path(".") / "dictionaries"
        ]
        
        # Language-specific filename patterns
        patterns = [
            f"{self.language}_US",  # en_US
            f"{self.language}_GB",  # en_GB
            f"{self.language}",     # en
            f"{self.language.upper()}",  # EN
        ]
        
        for base_path in common_paths:
            base_path = Path(base_path)
            if not base_path.exists():
                continue
                
            for pattern in patterns:
                dict_file = base_path / f"{pattern}.dic"
                affix_file = base_path / f"{pattern}.aff"
                
                if dict_file.exists() and affix_file.exists():
                    return str(dict_file), str(affix_file)
        
        return None, None
    
    async def check_text(self, text: str, language: Optional[str] = None) -> SpellCheckResult:
        """Check a single text string for spelling errors."""
        if not self.is_available():
            raise SpellCheckerNotAvailableError(f"{self.name} is not available")
        
        errors = []
        
        # Extract words with their positions
        word_matches = re.finditer(r'\b\w+\b', text)
        
        for match in word_matches:
            word = match.group()
            start_pos = match.start()
            
            # Check if word is spelled correctly
            if not self._hunspell.spell(word):
                # Get suggestions (limit to top 5)
                suggestions = self._hunspell.suggest(word)[:5]
                
                error = {
                    "word": word,
                    "position": start_pos,
                    "length": len(word),
                    "suggestions": suggestions,
                    "line": 0,
                    "column": start_pos,
                    "severity": "error"
                }
                errors.append(error)
        
        return SpellCheckResult(
            original_text=text,
            errors=errors,
            language=language or self.language,
            engine=self.name,
            metadata={
                "dictionary_path": self.dictionary_path,
                "affix_path": self.affix_path,
                "total_words_checked": len(list(re.finditer(r'\b\w+\b', text))),
                "errors_found": len(errors)
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
        """Check if Hunspell is available and initialized."""
        return (HUNSPELL_AVAILABLE and 
                self._available and 
                self._hunspell is not None)
    
    def get_supported_languages(self) -> List[str]:
        """Get supported languages based on available dictionaries."""
        # This would ideally scan available dictionary files
        # For now, return common languages
        return [
            "en", "es", "fr", "de", "it", "pt", "ru", "pl", "nl", "sv", 
            "da", "no", "fi", "hu", "cs", "sk", "sl", "hr", "bg", "ro"
        ]
    
    def add_word_to_dictionary(self, word: str) -> bool:
        """
        Add a word to personal dictionary.
        
        Note: Hunspell doesn't support runtime dictionary modification.
        This would typically require writing to a personal dictionary file.
        """
        print(f"⚠️  Hunspell doesn't support runtime dictionary modification for '{word}'")
        return False
    
    def get_word_stems(self, word: str) -> List[str]:
        """
        Get morphological stems for a word.
        
        This is a Hunspell-specific feature that provides word analysis.
        """
        if not self.is_available():
            return []
        
        try:
            return self._hunspell.stem(word)
        except Exception as e:
            print(f"⚠️  Failed to get stems for '{word}': {e}")
            return []
    
    def analyze_word(self, word: str) -> List[str]:
        """
        Analyze word morphology.
        
        Returns detailed morphological analysis of the word.
        """
        if not self.is_available():
            return []
        
        try:
            return self._hunspell.analyze(word)
        except Exception as e:
            print(f"⚠️  Failed to analyze '{word}': {e}")
            return []
    
    async def cleanup(self) -> None:
        """Clean up Hunspell resources."""
        if self._hunspell:
            # Hunspell cleanup is handled automatically by the library
            self._hunspell = None
        await super().cleanup()