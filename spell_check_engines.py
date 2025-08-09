"""
Spell Check Engines - Refactored spell checking functionality with interface-based architecture.

This module provides an abstract base class and concrete implementations for various
spell checking engines that work with entire sentences rather than individual words.

Each engine follows a consistent interface and handles full sentence spell checking
with context-aware corrections and suggestions.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple
import re
import json


class SpellCheckResult:
    """Represents the result of a spell check operation for a sentence."""
    
    def __init__(self, sentence: str, errors: List[Dict] = None):
        self.sentence = sentence
        self.errors = errors or []
        
    def has_errors(self) -> bool:
        """Check if there are any spelling errors."""
        return len(self.errors) > 0
        
    def get_error_count(self) -> int:
        """Get the total number of spelling errors."""
        return len(self.errors)


class SpellCheckEngine(ABC):
    """
    Abstract base class for all spell checking engines.
    
    All spell checking engines must inherit from this class and implement
    the required methods. Engines work with full sentences and provide
    contextual spell checking and suggestions.
    """
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.is_available = False
        
    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the spell checking engine.
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        pass
        
    @abstractmethod
    async def check_sentence(self, sentence: str, language: str = "en") -> SpellCheckResult:
        """
        Check spelling for an entire sentence.
        
        Args:
            sentence: The sentence to check for spelling errors
            language: Language code (e.g., 'en' for English)
            
        Returns:
            SpellCheckResult: Object containing sentence and any errors found
        """
        pass
        
    @abstractmethod
    def is_engine_available(self) -> bool:
        """
        Check if the spell checking engine is available for use.
        
        Returns:
            bool: True if engine is available, False otherwise
        """
        pass
        
    def get_engine_info(self) -> Dict:
        """Get information about this spell checking engine."""
        return {
            "name": self.name,
            "description": self.description,
            "available": self.is_engine_available(),
            "type": self._get_engine_type()
        }
        
    @abstractmethod
    def _get_engine_type(self) -> str:
        """Get the type classification of this engine."""
        pass
        
    def _extract_words_with_positions(self, sentence: str) -> List[Tuple[str, int, int]]:
        """
        Extract words from sentence with their start and end positions.
        
        Returns:
            List of tuples: (word, start_pos, end_pos)
        """
        words = []
        for match in re.finditer(r'\b\w+\b', sentence):
            word = match.group()
            start_pos = match.start()
            end_pos = match.end()
            words.append((word, start_pos, end_pos))
        return words


class PySpellCheckerEngine(SpellCheckEngine):
    """PySpellChecker implementation for sentence-based spell checking."""
    
    def __init__(self):
        super().__init__(
            name="PySpellChecker",
            description="Fast and reliable Python spell checker with word suggestions"
        )
        self.checker = None
        
    async def initialize(self) -> bool:
        """Initialize the PySpellChecker engine."""
        try:
            from spellchecker import SpellChecker
            self.checker = SpellChecker()
            self.is_available = True
            print(f"✅ {self.name} initialized successfully")
            return True
        except ImportError as e:
            print(f"⚠️  {self.name} not available: {e}")
            self.is_available = False
            return False
        except Exception as e:
            print(f"⚠️  {self.name} initialization failed: {e}")
            self.is_available = False
            return False
            
    async def check_sentence(self, sentence: str, language: str = "en") -> SpellCheckResult:
        """Check spelling for an entire sentence using PySpellChecker."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        errors = []
        words_with_positions = self._extract_words_with_positions(sentence)
        
        for word, start_pos, end_pos in words_with_positions:
            if word.lower() not in self.checker:
                # Word is misspelled, get suggestions
                candidates = self.checker.candidates(word)
                suggestions = list(candidates)[:15] if candidates else []
                
                errors.append({
                    "word": word,
                    "start_pos": start_pos,
                    "end_pos": end_pos,
                    "suggestions": suggestions
                })
                
        return SpellCheckResult(sentence, errors)
        
    def is_engine_available(self) -> bool:
        """Check if PySpellChecker is available."""
        return self.is_available and self.checker is not None
        
    def _get_engine_type(self) -> str:
        """Get engine type."""
        return "dictionary-based"


class HunspellEngine(SpellCheckEngine):
    """Hunspell implementation for sentence-based spell checking."""
    
    def __init__(self):
        super().__init__(
            name="Hunspell",
            description="Industry-standard spell checker used in LibreOffice and Firefox"
        )
        self.checker = None
        
    async def initialize(self) -> bool:
        """Initialize the Hunspell engine."""
        try:
            import hunspell
            
            # Try different paths for Hunspell dictionaries
            dict_paths = [
                ("/usr/share/hunspell/en_US.dic", "/usr/share/hunspell/en_US.aff"),
                ("/usr/share/myspell/en_US.dic", "/usr/share/myspell/en_US.aff"),
            ]
            
            for dic_path, aff_path in dict_paths:
                try:
                    self.checker = hunspell.HunSpell(dic_path, aff_path)
                    self.is_available = True
                    print(f"✅ {self.name} initialized successfully with {dic_path}")
                    return True
                except Exception:
                    continue
                    
            print(f"⚠️  {self.name} dictionary files not found")
            self.is_available = False
            return False
            
        except ImportError as e:
            print(f"⚠️  {self.name} not available: {e}")
            self.is_available = False
            return False
        except Exception as e:
            print(f"⚠️  {self.name} initialization failed: {e}")
            self.is_available = False
            return False
            
    async def check_sentence(self, sentence: str, language: str = "en") -> SpellCheckResult:
        """Check spelling for an entire sentence using Hunspell."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        errors = []
        words_with_positions = self._extract_words_with_positions(sentence)
        
        for word, start_pos, end_pos in words_with_positions:
            try:
                if not self.checker.spell(word):
                    # Word is misspelled, get suggestions
                    suggestions = self.checker.suggest(word)[:15]
                    
                    errors.append({
                        "word": word,
                        "start_pos": start_pos,
                        "end_pos": end_pos,
                        "suggestions": suggestions
                    })
            except Exception as e:
                print(f"⚠️  Hunspell error for word '{word}': {e}")
                continue
                
        return SpellCheckResult(sentence, errors)
        
    def is_engine_available(self) -> bool:
        """Check if Hunspell is available."""
        return self.is_available and self.checker is not None
        
    def _get_engine_type(self) -> str:
        """Get engine type."""
        return "dictionary-based"


class AutocorrectEngine(SpellCheckEngine):
    """Autocorrect implementation for sentence-based spell checking."""
    
    def __init__(self):
        super().__init__(
            name="Autocorrect",
            description="Modern spell corrector with machine learning approach and multi-language support"
        )
        self.checker = None
        
    async def initialize(self) -> bool:
        """Initialize the Autocorrect engine."""
        try:
            from autocorrect import Speller
            # Use threshold to filter out uncommon words for better spell checking
            self.checker = Speller(lang="en", threshold=10000)
            self.is_available = True
            print(f"✅ {self.name} initialized successfully with threshold=10000")
            return True
        except ImportError as e:
            print(f"⚠️  {self.name} not available: {e}")
            self.is_available = False
            return False
        except Exception as e:
            print(f"⚠️  {self.name} initialization failed: {e}")
            self.is_available = False
            return False
            
    async def check_sentence(self, sentence: str, language: str = "en") -> SpellCheckResult:
        """Check spelling for an entire sentence using Autocorrect."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        errors = []
        words_with_positions = self._extract_words_with_positions(sentence)
        
        for word, start_pos, end_pos in words_with_positions:
            try:
                corrected_word = self.checker.autocorrect_word(word)
                
                if corrected_word.lower() != word.lower():
                    # Word was corrected, so original is incorrect
                    candidates = self.checker.get_candidates(word)
                    if candidates:
                        suggestions = [candidate[1] for candidate in sorted(candidates, key=lambda x: x[0], reverse=True)][:15]
                        # Make sure corrected word is first in suggestions
                        if corrected_word not in suggestions:
                            suggestions.insert(0, corrected_word)
                    else:
                        suggestions = [corrected_word]
                    
                    errors.append({
                        "word": word,
                        "start_pos": start_pos,
                        "end_pos": end_pos,
                        "suggestions": suggestions
                    })
            except Exception as e:
                print(f"⚠️  Autocorrect error for word '{word}': {e}")
                continue
                
        return SpellCheckResult(sentence, errors)
        
    def is_engine_available(self) -> bool:
        """Check if Autocorrect is available."""
        return self.is_available and self.checker is not None
        
    def _get_engine_type(self) -> str:
        """Get engine type."""
        return "statistical"


class NeuspellEngine(SpellCheckEngine):
    """Neuspell implementation for sentence-based spell checking."""
    
    def __init__(self):
        super().__init__(
            name="NeuSpell",
            description="Neural spell checker using deep learning for context-aware corrections"
        )
        self.checker = None
        
    async def initialize(self) -> bool:
        """Initialize the Neuspell engine."""
        try:
            from neuspell import SclstmChecker
            self.checker = SclstmChecker()
            self.is_available = True
            print(f"✅ {self.name} SclstmChecker initialized successfully")
            return True
        except ImportError as e:
            print(f"⚠️  {self.name} not available: {e}")
            self.is_available = False
            return False
        except Exception as e:
            print(f"⚠️  {self.name} initialization failed: {e}")
            print("⚠️  This might be due to missing pretrained models or network issues")
            self.is_available = False
            return False
            
    async def check_sentence(self, sentence: str, language: str = "en") -> SpellCheckResult:
        """Check spelling for an entire sentence using Neuspell."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        try:
            # Neuspell works with full sentences - this is its strength
            corrected_sentence = self.checker.correct(sentence)
            
            # Compare original and corrected sentences to find errors
            errors = self._compare_sentences(sentence, corrected_sentence)
            return SpellCheckResult(sentence, errors)
            
        except Exception as e:
            print(f"⚠️  Neuspell error for sentence: {e}")
            return SpellCheckResult(sentence, [])
            
    def _compare_sentences(self, original: str, corrected: str) -> List[Dict]:
        """Compare original and corrected sentences to identify errors."""
        errors = []
        
        # Simple word-by-word comparison
        original_words = self._extract_words_with_positions(original)
        corrected_words = [word for word, _, _ in self._extract_words_with_positions(corrected)]
        
        # Match words and find differences
        for i, (orig_word, start_pos, end_pos) in enumerate(original_words):
            if i < len(corrected_words):
                corr_word = corrected_words[i]
                if orig_word.lower() != corr_word.lower():
                    errors.append({
                        "word": orig_word,
                        "start_pos": start_pos,
                        "end_pos": end_pos,
                        "suggestions": [corr_word]
                    })
                    
        return errors
        
    def is_engine_available(self) -> bool:
        """Check if Neuspell is available."""
        return self.is_available and self.checker is not None
        
    def _get_engine_type(self) -> str:
        """Get engine type."""
        return "neural-network"


class SpellCheckEngineFactory:
    """Factory class for creating and managing spell check engines."""
    
    _engines = {
        "pyspellchecker": PySpellCheckerEngine,
        "hunspell": HunspellEngine,
        "autocorrect": AutocorrectEngine,
        "neuspell": NeuspellEngine,
    }
    
    _initialized_engines = {}
    
    @classmethod
    async def get_engine(cls, engine_name: str) -> Optional[SpellCheckEngine]:
        """Get an initialized spell check engine by name."""
        if engine_name not in cls._engines:
            return None
            
        # Return cached engine if already initialized
        if engine_name in cls._initialized_engines:
            return cls._initialized_engines[engine_name]
            
        # Create and initialize new engine
        engine_class = cls._engines[engine_name]
        engine = engine_class()
        
        if await engine.initialize():
            cls._initialized_engines[engine_name] = engine
            return engine
        else:
            return None
            
    @classmethod
    async def get_available_engines(cls) -> Dict[str, Dict]:
        """Get information about all available engines."""
        engines_info = {}
        
        for engine_name, engine_class in cls._engines.items():
            engine = await cls.get_engine(engine_name)
            if engine:
                engines_info[engine_name] = engine.get_engine_info()
            else:
                # Create a basic info object for unavailable engines
                temp_engine = engine_class()
                info = temp_engine.get_engine_info()
                info["available"] = False
                engines_info[engine_name] = info
                
        return engines_info
        
    @classmethod
    def get_supported_engines(cls) -> List[str]:
        """Get list of supported engine names."""
        return list(cls._engines.keys())