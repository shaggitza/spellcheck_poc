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
        """Check spelling for an entire sentence using PySpellChecker with context-aware processing."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        errors = []
        words_with_positions = self._extract_words_with_positions(sentence)
        
        # Process sentence for context - check for proper nouns and abbreviations
        sentence_words = [word for word, _, _ in words_with_positions]
        sentence_context = self._analyze_sentence_context(sentence, sentence_words)
        
        for word, start_pos, end_pos in words_with_positions:
            # Skip words that appear to be proper nouns or abbreviations based on context
            if self._should_skip_word_in_context(word, sentence_context):
                continue
                
            if word.lower() not in self.checker:
                # Word is misspelled, get suggestions with context awareness
                candidates = self.checker.candidates(word)
                suggestions = list(candidates)[:15] if candidates else []
                
                # Filter suggestions based on sentence context
                suggestions = self._filter_suggestions_by_context(word, suggestions, sentence_context)
                
                errors.append({
                    "word": word,
                    "start_pos": start_pos,
                    "end_pos": end_pos,
                    "suggestions": suggestions
                })
                
        return SpellCheckResult(sentence, errors)
    
    def _analyze_sentence_context(self, sentence: str, words: List[str]) -> Dict:
        """Analyze sentence context to improve spell checking accuracy."""
        context = {
            "has_capitalized_words": any(word[0].isupper() and len(word) > 1 for word in words),
            "sentence_start_index": 0,
            "sentence_length": len(words),
            "appears_formal": any(word.lower() in ['mr', 'mrs', 'dr', 'prof', 'inc', 'ltd', 'corp'] for word in words),
            "has_abbreviations": any(len(word) <= 3 and word.isupper() for word in words),
            "word_positions": {word.lower(): i for i, word in enumerate(words)}
        }
        return context
    
    def _should_skip_word_in_context(self, word: str, context: Dict) -> bool:
        """Determine if a word should be skipped based on sentence context."""
        # Skip single letters (often abbreviations)
        if len(word) == 1:
            return True
            
        # Skip words that are all uppercase and short (likely abbreviations)
        if word.isupper() and len(word) <= 4:
            return True
            
        # Skip words that appear to be proper nouns (capitalized in middle of sentence)
        word_pos = context['word_positions'].get(word.lower(), -1)
        if word[0].isupper() and word_pos > 0 and not word.lower() in ['i']:
            return True
            
        return False
    
    def _filter_suggestions_by_context(self, word: str, suggestions: List[str], context: Dict) -> List[str]:
        """Filter and rank suggestions based on sentence context."""
        if not suggestions:
            return suggestions
            
        # If original word was capitalized, prioritize capitalized suggestions
        if word[0].isupper():
            capitalized_suggestions = [s for s in suggestions if s[0].isupper()]
            lowercase_suggestions = [s.capitalize() for s in suggestions if s[0].islower()]
            return (capitalized_suggestions + lowercase_suggestions)[:15]
        
        return suggestions
        
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
        """Check spelling for an entire sentence using Hunspell with context-aware processing."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        errors = []
        words_with_positions = self._extract_words_with_positions(sentence)
        
        # Process sentence for context - check for proper nouns and abbreviations
        sentence_words = [word for word, _, _ in words_with_positions]
        sentence_context = self._analyze_sentence_context(sentence, sentence_words)
        
        for word, start_pos, end_pos in words_with_positions:
            # Skip words that appear to be proper nouns or abbreviations based on context
            if self._should_skip_word_in_context(word, sentence_context):
                continue
                
            try:
                if not self.checker.spell(word):
                    # Word is misspelled, get suggestions with context awareness
                    suggestions = self.checker.suggest(word)[:15]
                    
                    # Filter suggestions based on sentence context
                    suggestions = self._filter_suggestions_by_context(word, suggestions, sentence_context)
                    
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
        
    def _analyze_sentence_context(self, sentence: str, words: List[str]) -> Dict:
        """Analyze sentence context to improve spell checking accuracy."""
        context = {
            "has_capitalized_words": any(word[0].isupper() and len(word) > 1 for word in words),
            "sentence_start_index": 0,
            "sentence_length": len(words),
            "appears_formal": any(word.lower() in ['mr', 'mrs', 'dr', 'prof', 'inc', 'ltd', 'corp'] for word in words),
            "has_abbreviations": any(len(word) <= 3 and word.isupper() for word in words),
            "word_positions": {word.lower(): i for i, word in enumerate(words)}
        }
        return context
    
    def _should_skip_word_in_context(self, word: str, context: Dict) -> bool:
        """Determine if a word should be skipped based on sentence context."""
        # Skip single letters (often abbreviations)
        if len(word) == 1:
            return True
            
        # Skip words that are all uppercase and short (likely abbreviations)
        if word.isupper() and len(word) <= 4:
            return True
            
        # Skip words that appear to be proper nouns (capitalized in middle of sentence)
        word_pos = context['word_positions'].get(word.lower(), -1)
        if word[0].isupper() and word_pos > 0 and not word.lower() in ['i']:
            return True
            
        return False
    
    def _filter_suggestions_by_context(self, word: str, suggestions: List[str], context: Dict) -> List[str]:
        """Filter and rank suggestions based on sentence context."""
        if not suggestions:
            return suggestions
            
        # If original word was capitalized, prioritize capitalized suggestions
        if word[0].isupper():
            capitalized_suggestions = [s for s in suggestions if s[0].isupper()]
            lowercase_suggestions = [s.capitalize() for s in suggestions if s[0].islower()]
            return (capitalized_suggestions + lowercase_suggestions)[:15]
        
        return suggestions
        
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
        """Check spelling for an entire sentence using Autocorrect with context-aware processing."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        errors = []
        words_with_positions = self._extract_words_with_positions(sentence)
        
        # Process sentence for context - check for proper nouns and abbreviations
        sentence_words = [word for word, _, _ in words_with_positions]
        sentence_context = self._analyze_sentence_context(sentence, sentence_words)
        
        # Try full sentence correction first (Autocorrect can handle this)
        try:
            full_sentence_corrected = self.checker.spell(sentence)
            if full_sentence_corrected != sentence:
                # Use sentence-level correction to inform word-level analysis
                sentence_context['full_correction'] = full_sentence_corrected
        except Exception:
            sentence_context['full_correction'] = None
        
        for word, start_pos, end_pos in words_with_positions:
            # Skip words that appear to be proper nouns or abbreviations based on context
            if self._should_skip_word_in_context(word, sentence_context):
                continue
                
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
                    
                    # Filter suggestions based on sentence context
                    suggestions = self._filter_suggestions_by_context(word, suggestions, sentence_context)
                    
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
        
    def _analyze_sentence_context(self, sentence: str, words: List[str]) -> Dict:
        """Analyze sentence context to improve spell checking accuracy."""
        context = {
            "has_capitalized_words": any(word[0].isupper() and len(word) > 1 for word in words),
            "sentence_start_index": 0,
            "sentence_length": len(words),
            "appears_formal": any(word.lower() in ['mr', 'mrs', 'dr', 'prof', 'inc', 'ltd', 'corp'] for word in words),
            "has_abbreviations": any(len(word) <= 3 and word.isupper() for word in words),
            "word_positions": {word.lower(): i for i, word in enumerate(words)}
        }
        return context
    
    def _should_skip_word_in_context(self, word: str, context: Dict) -> bool:
        """Determine if a word should be skipped based on sentence context."""
        # Skip single letters (often abbreviations)
        if len(word) == 1:
            return True
            
        # Skip words that are all uppercase and short (likely abbreviations)
        if word.isupper() and len(word) <= 4:
            return True
            
        # Skip words that appear to be proper nouns (capitalized in middle of sentence)
        word_pos = context['word_positions'].get(word.lower(), -1)
        if word[0].isupper() and word_pos > 0 and not word.lower() in ['i']:
            return True
            
        return False
    
    def _filter_suggestions_by_context(self, word: str, suggestions: List[str], context: Dict) -> List[str]:
        """Filter and rank suggestions based on sentence context."""
        if not suggestions:
            return suggestions
            
        # If we have a full sentence correction, prefer suggestions that match it
        if 'full_correction' in context and context['full_correction']:
            full_correction_words = context['full_correction'].split()
            word_pos = context['word_positions'].get(word.lower(), -1)
            if 0 <= word_pos < len(full_correction_words):
                sentence_suggestion = full_correction_words[word_pos]
                if sentence_suggestion in suggestions:
                    # Move the sentence-level suggestion to the front
                    suggestions.remove(sentence_suggestion)
                    suggestions.insert(0, sentence_suggestion)
            
        # If original word was capitalized, prioritize capitalized suggestions
        if word[0].isupper():
            capitalized_suggestions = [s for s in suggestions if s[0].isupper()]
            lowercase_suggestions = [s.capitalize() for s in suggestions if s[0].islower()]
            return (capitalized_suggestions + lowercase_suggestions)[:15]
        
        return suggestions
        
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
        """Check spelling for an entire sentence using Neuspell's neural network approach."""
        if not self.is_engine_available():
            return SpellCheckResult(sentence, [])
            
        if not sentence.strip():
            return SpellCheckResult(sentence, [])
            
        try:
            # Neuspell works with full sentences - this is its main strength for context-aware correction
            corrected_sentence = self.checker.correct(sentence)
            
            # Compare original and corrected sentences to find errors with improved matching
            errors = self._compare_sentences_advanced(sentence, corrected_sentence)
            return SpellCheckResult(sentence, errors)
            
        except Exception as e:
            print(f"⚠️  Neuspell error for sentence: {e}")
            return SpellCheckResult(sentence, [])
            
    def _compare_sentences_advanced(self, original: str, corrected: str) -> List[Dict]:
        """Advanced comparison of original and corrected sentences using context."""
        errors = []
        
        if original.strip() == corrected.strip():
            return errors  # No corrections needed
        
        # Extract words with positions for both sentences
        original_words = self._extract_words_with_positions(original)
        corrected_words = self._extract_words_with_positions(corrected)
        
        # Create word mappings for better alignment
        orig_words_only = [word for word, _, _ in original_words]
        corr_words_only = [word for word, _, _ in corrected_words]
        
        # Use sequence alignment to match words correctly
        alignments = self._align_word_sequences(orig_words_only, corr_words_only)
        
        for orig_idx, corr_idx in alignments:
            if orig_idx >= len(original_words):
                continue
                
            orig_word, start_pos, end_pos = original_words[orig_idx]
            
            if corr_idx < len(corr_words_only):
                corr_word = corr_words_only[corr_idx]
                
                # Check if word was actually corrected (not just case change)
                if orig_word.lower() != corr_word.lower():
                    errors.append({
                        "word": orig_word,
                        "start_pos": start_pos,
                        "end_pos": end_pos,
                        "suggestions": [corr_word],
                        "context_aware": True,  # Mark as context-aware correction
                        "confidence": "high"  # Neural networks typically have high confidence
                    })
            else:
                # Word was removed in correction (very likely an error)
                errors.append({
                    "word": orig_word,
                    "start_pos": start_pos,
                    "end_pos": end_pos,
                    "suggestions": [],  # No direct replacement
                    "context_aware": True,
                    "confidence": "medium"
                })
                    
        return errors
        
    def _align_word_sequences(self, orig_words: List[str], corr_words: List[str]) -> List[Tuple[int, int]]:
        """Align original and corrected word sequences for better error detection."""
        alignments = []
        orig_idx = 0
        corr_idx = 0
        
        while orig_idx < len(orig_words) and corr_idx < len(corr_words):
            orig_word = orig_words[orig_idx].lower()
            corr_word = corr_words[corr_idx].lower()
            
            if orig_word == corr_word:
                # Perfect match, align and continue
                alignments.append((orig_idx, corr_idx))
                orig_idx += 1
                corr_idx += 1
            elif self._words_similar(orig_word, corr_word):
                # Similar words (likely a correction), align them
                alignments.append((orig_idx, corr_idx))
                orig_idx += 1
                corr_idx += 1
            else:
                # Look ahead for potential matches
                next_match_orig = self._find_next_match(orig_words[orig_idx:], corr_words[corr_idx:])
                if next_match_orig >= 0:
                    # Found a match ahead, align current word anyway
                    alignments.append((orig_idx, corr_idx))
                    orig_idx += 1
                    corr_idx += 1
                else:
                    # No clear match, skip the original word (likely needs removal)
                    alignments.append((orig_idx, -1))
                    orig_idx += 1
        
        # Handle remaining original words
        while orig_idx < len(orig_words):
            alignments.append((orig_idx, -1))
            orig_idx += 1
            
        return alignments
    
    def _words_similar(self, word1: str, word2: str) -> bool:
        """Check if two words are similar enough to be considered corrections."""
        if len(word1) == 0 or len(word2) == 0:
            return False
        
        # Simple edit distance check for similarity
        max_len = max(len(word1), len(word2))
        if max_len <= 3:
            return abs(len(word1) - len(word2)) <= 1
        else:
            return abs(len(word1) - len(word2)) <= 2 and word1[:2] == word2[:2]
    
    def _find_next_match(self, orig_words: List[str], corr_words: List[str]) -> int:
        """Find the next matching word in the sequences."""
        for i, orig_word in enumerate(orig_words[:3]):  # Look ahead 3 words max
            for j, corr_word in enumerate(corr_words[:3]):
                if orig_word.lower() == corr_word.lower():
                    return i
        return -1
        
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