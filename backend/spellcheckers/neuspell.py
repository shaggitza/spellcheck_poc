"""
Neuspell implementation - Neural spell checking with context awareness.

This module provides a spell checker implementation using Neuspell,
a neural spell checker that considers context for better corrections.
"""

import re
from typing import Dict, List, Optional, Any

from .base import BaseSpellChecker, SpellCheckResult, SpellCheckerNotAvailableError

# Try to import neuspell
try:
    from neuspell import SclstmChecker
    NEUSPELL_AVAILABLE = True
except ImportError:
    NEUSPELL_AVAILABLE = False
    SclstmChecker = None


class NeuspellProvider(BaseSpellChecker):
    """
    Spell checker implementation using Neuspell library.
    
    Neuspell provides context-aware neural spell checking that can
    handle more complex errors than traditional word-based checkers.
    """
    
    def __init__(self, language: str = "en", model_name: str = "sclstm", **kwargs):
        super().__init__("Neuspell", language, **kwargs)
        self._checker = None
        self.model_name = model_name
        
    async def initialize(self) -> bool:
        """Initialize Neuspell checker with specified model."""
        if not NEUSPELL_AVAILABLE:
            print("⚠️  Neuspell library not available")
            return False
        
        try:
            # Initialize the appropriate model
            if self.model_name.lower() == "sclstm":
                self._checker = SclstmChecker()
            else:
                print(f"⚠️  Unknown Neuspell model: {self.model_name}")
                return False
                
            # Test the checker with a simple sentence
            test_result = self._checker.correct("This is a test sentance.")
            print(f"✅ Neuspell {self.model_name} initialized successfully")
            print(f"   Test correction: 'sentance' → {test_result}")
            
            self._initialized = True
            self._available = True
            return True
            
        except Exception as e:
            print(f"⚠️  Neuspell initialization failed: {e}")
            print(f"   This might be due to missing models or network issues")
            self._initialized = False
            self._available = False
            return False
    
    async def check_text(self, text: str, language: Optional[str] = None) -> SpellCheckResult:
        """Check a single text string for spelling errors using neural correction."""
        if not self.is_available():
            raise SpellCheckerNotAvailableError(f"{self.name} is not available")
        
        try:
            # Get corrected text from Neuspell
            corrected_text = self._checker.correct(text)
            
            # Find differences between original and corrected text
            errors = self._find_differences(text, corrected_text)
            
            return SpellCheckResult(
                original_text=text,
                errors=errors,
                corrected_text=corrected_text,
                language=language or self.language,
                engine=self.name,
                metadata={
                    "model": self.model_name,
                    "corrections_made": len(errors),
                    "confidence": "neural_model"  # Neuspell doesn't provide confidence scores
                }
            )
            
        except Exception as e:
            print(f"⚠️  Neuspell correction failed: {e}")
            return SpellCheckResult(
                original_text=text,
                errors=[],
                language=language or self.language,
                engine=self.name,
                metadata={"error": str(e)}
            )
    
    def _find_differences(self, original: str, corrected: str) -> List[Dict[str, Any]]:
        """
        Find differences between original and corrected text.
        
        This is a simplified diff implementation that identifies word-level changes.
        """
        errors = []
        
        # Simple word-based comparison
        original_words = re.findall(r'\b\w+\b', original)
        corrected_words = re.findall(r'\b\w+\b', corrected)
        
        # Find word positions in original text
        word_positions = []
        for match in re.finditer(r'\b\w+\b', original):
            word_positions.append((match.group(), match.start(), match.end()))
        
        # Compare words and identify changes
        min_len = min(len(original_words), len(corrected_words))
        
        for i in range(min_len):
            if original_words[i].lower() != corrected_words[i].lower():
                # Found a difference
                if i < len(word_positions):
                    word, start, end = word_positions[i]
                    error = {
                        "word": word,
                        "position": start,
                        "length": end - start,
                        "suggestions": [corrected_words[i]],
                        "line": 0,
                        "column": start,
                        "correction": corrected_words[i],
                        "confidence": "neural",
                        "type": "neural_correction"
                    }
                    errors.append(error)
        
        return errors
    
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
        """Check if Neuspell is available and initialized."""
        return (NEUSPELL_AVAILABLE and 
                self._available and 
                self._checker is not None)
    
    def get_supported_languages(self) -> List[str]:
        """Get supported languages for Neuspell."""
        # Neuspell primarily supports English
        return ["en"]
    
    def correct_sentence(self, sentence: str) -> str:
        """
        Get corrected version of a sentence.
        
        This is the main Neuspell functionality - context-aware correction.
        """
        if not self.is_available():
            return sentence
        
        try:
            return self._checker.correct(sentence)
        except Exception as e:
            print(f"⚠️  Neuspell correction failed: {e}")
            return sentence
    
    def correct_batch(self, sentences: List[str]) -> List[str]:
        """
        Correct multiple sentences efficiently.
        
        Args:
            sentences: List of sentences to correct
            
        Returns:
            List of corrected sentences
        """
        if not self.is_available():
            return sentences
        
        corrected = []
        for sentence in sentences:
            try:
                corrected.append(self._checker.correct(sentence))
            except Exception as e:
                print(f"⚠️  Neuspell batch correction failed for sentence: {e}")
                corrected.append(sentence)
        
        return corrected
    
    async def cleanup(self) -> None:
        """Clean up Neuspell resources."""
        if self._checker:
            # Neuspell cleanup is handled automatically
            self._checker = None
        await super().cleanup()