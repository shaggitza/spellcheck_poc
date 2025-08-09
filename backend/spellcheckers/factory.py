"""
Spellchecker Factory - Manages and provides access to different spell checking engines.

This module provides a factory pattern for creating and managing different
spell checker implementations with automatic fallbacks and availability detection.
"""

from typing import Dict, List, Optional, Type, Union
import asyncio
from enum import Enum

from .base import BaseSpellChecker, SpellCheckResult
from .pyspellchecker import PySpellCheckerProvider
from .hunspell import HunspellProvider
from .neuspell import NeuspellProvider  
from .autocorrect import AutocorrectProvider


class SpellCheckerType(Enum):
    """Available spell checker types."""
    PYSPELLCHECKER = "pyspellchecker"
    HUNSPELL = "hunspell"
    NEUSPELL = "neuspell"
    AUTOCORRECT = "autocorrect"


class SpellCheckerFactory:
    """
    Factory for creating and managing spell checker instances.
    
    This factory handles initialization, availability checking, and provides
    a unified interface for accessing different spell checking engines.
    """
    
    # Registry of available spell checker classes
    _PROVIDERS = {
        SpellCheckerType.PYSPELLCHECKER: PySpellCheckerProvider,
        SpellCheckerType.HUNSPELL: HunspellProvider,
        SpellCheckerType.NEUSPELL: NeuspellProvider,
        SpellCheckerType.AUTOCORRECT: AutocorrectProvider,
    }
    
    def __init__(self):
        self._instances: Dict[str, BaseSpellChecker] = {}
        self._initialized_providers: Dict[SpellCheckerType, bool] = {}
        self._default_language = "en"
        
    async def initialize_all(self, language: str = "en") -> Dict[SpellCheckerType, bool]:
        """
        Initialize all available spell checkers.
        
        Args:
            language: Default language to use
            
        Returns:
            Dictionary mapping provider types to initialization success
        """
        self._default_language = language
        results = {}
        
        for provider_type, provider_class in self._PROVIDERS.items():
            try:
                instance_key = f"{provider_type.value}_{language}"
                provider = provider_class(language=language)
                success = await provider.initialize()
                
                if success:
                    self._instances[instance_key] = provider
                    
                self._initialized_providers[provider_type] = success
                results[provider_type] = success
                
            except Exception as e:
                print(f"⚠️  Failed to initialize {provider_type.value}: {e}")
                self._initialized_providers[provider_type] = False
                results[provider_type] = False
        
        return results
    
    def get_checker(self, 
                   checker_type: Union[SpellCheckerType, str], 
                   language: Optional[str] = None) -> Optional[BaseSpellChecker]:
        """
        Get a specific spell checker instance.
        
        Args:
            checker_type: Type of spell checker to get
            language: Language for the checker (uses default if not specified)
            
        Returns:
            Spell checker instance or None if not available
        """
        if isinstance(checker_type, str):
            try:
                checker_type = SpellCheckerType(checker_type.lower())
            except ValueError:
                print(f"⚠️  Unknown spell checker type: {checker_type}")
                return None
        
        language = language or self._default_language
        instance_key = f"{checker_type.value}_{language}"
        
        # Return existing instance if available
        if instance_key in self._instances:
            return self._instances[instance_key]
        
        # Try to create new instance if not exists
        if checker_type in self._PROVIDERS:
            try:
                provider_class = self._PROVIDERS[checker_type]
                provider = provider_class(language=language)
                
                # Note: This is sync, caller should await initialize() if needed
                self._instances[instance_key] = provider
                return provider
                
            except Exception as e:
                print(f"⚠️  Failed to create {checker_type.value} instance: {e}")
        
        return None
    
    def get_available_checkers(self, language: Optional[str] = None) -> List[BaseSpellChecker]:
        """
        Get all available and initialized spell checkers.
        
        Args:
            language: Filter by language (uses default if not specified)
            
        Returns:
            List of available spell checker instances
        """
        language = language or self._default_language
        available = []
        
        for provider_type in SpellCheckerType:
            if self._initialized_providers.get(provider_type, False):
                checker = self.get_checker(provider_type, language)
                if checker and checker.is_available():
                    available.append(checker)
        
        return available
    
    def get_best_checker(self, language: Optional[str] = None) -> Optional[BaseSpellChecker]:
        """
        Get the best available spell checker based on quality ranking.
        
        Args:
            language: Language preference
            
        Returns:
            Best available spell checker or None
        """
        language = language or self._default_language
        
        # Priority order (best to worst)
        priority_order = [
            SpellCheckerType.NEUSPELL,      # Neural, context-aware
            SpellCheckerType.HUNSPELL,      # High-quality morphological
            SpellCheckerType.AUTOCORRECT,   # Fast, multi-language
            SpellCheckerType.PYSPELLCHECKER  # Reliable fallback
        ]
        
        for checker_type in priority_order:
            if self._initialized_providers.get(checker_type, False):
                checker = self.get_checker(checker_type, language)
                if checker and checker.is_available():
                    return checker
        
        return None
    
    async def check_text(self, 
                        text: str, 
                        checker_type: Optional[Union[SpellCheckerType, str]] = None,
                        language: Optional[str] = None) -> Optional[SpellCheckResult]:
        """
        Check text with specified or best available checker.
        
        Args:
            text: Text to check
            checker_type: Specific checker to use (uses best if not specified)
            language: Language for checking
            
        Returns:
            Spell check result or None if no checker available
        """
        if checker_type:
            checker = self.get_checker(checker_type, language)
        else:
            checker = self.get_best_checker(language)
        
        if not checker:
            print("⚠️  No spell checker available")
            return None
        
        try:
            return await checker.check_text(text, language)
        except Exception as e:
            print(f"⚠️  Spell check failed with {checker.name}: {e}")
            return None
    
    async def check_lines(self, 
                         lines: List[str], 
                         checker_type: Optional[Union[SpellCheckerType, str]] = None,
                         language: Optional[str] = None) -> Dict[int, SpellCheckResult]:
        """
        Check multiple lines with specified or best available checker.
        
        Args:
            lines: Lines of text to check
            checker_type: Specific checker to use (uses best if not specified)
            language: Language for checking
            
        Returns:
            Dictionary mapping line numbers to spell check results
        """
        if checker_type:
            checker = self.get_checker(checker_type, language)
        else:
            checker = self.get_best_checker(language)
        
        if not checker:
            print("⚠️  No spell checker available")
            return {}
        
        try:
            return await checker.check_lines(lines, language)
        except Exception as e:
            print(f"⚠️  Spell check failed with {checker.name}: {e}")
            return {}
    
    def get_status(self) -> Dict[str, Dict]:
        """
        Get status of all spell checkers.
        
        Returns:
            Dictionary with status information for each checker type
        """
        status = {}
        
        for provider_type in SpellCheckerType:
            checker = self.get_checker(provider_type)
            status[provider_type.value] = {
                "available": checker.is_available() if checker else False,
                "initialized": self._initialized_providers.get(provider_type, False),
                "name": checker.name if checker else "Not loaded",
                "supported_languages": checker.get_supported_languages() if checker and checker.is_available() else []
            }
        
        return status
    
    async def cleanup_all(self) -> None:
        """Clean up all spell checker instances."""
        for instance in self._instances.values():
            try:
                await instance.cleanup()
            except Exception as e:
                print(f"⚠️  Cleanup failed for {instance.name}: {e}")
        
        self._instances.clear()
        self._initialized_providers.clear()


# Global factory instance
spell_checker_factory = SpellCheckerFactory()


# Convenience functions for easy access
async def get_spell_checker(checker_type: Union[SpellCheckerType, str], 
                          language: str = "en") -> Optional[BaseSpellChecker]:
    """Get a specific spell checker instance."""
    return spell_checker_factory.get_checker(checker_type, language)


async def check_spelling(text: str, 
                        checker_type: Optional[Union[SpellCheckerType, str]] = None,
                        language: str = "en") -> Optional[SpellCheckResult]:
    """Quick spell check function using the best available checker."""
    return await spell_checker_factory.check_text(text, checker_type, language)


async def get_best_spell_checker(language: str = "en") -> Optional[BaseSpellChecker]:
    """Get the best available spell checker for a language."""
    return spell_checker_factory.get_best_checker(language)