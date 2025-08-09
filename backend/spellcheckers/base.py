"""
Base spellchecker interfaces and common functionality.

This module provides the abstract base class and common data structures
for all spellchecker implementations, ensuring consistent interfaces.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio


@dataclass
class SpellCheckResult:
    """
    Result of a spell check operation.
    
    Attributes:
        original_text: The original text that was checked
        errors: List of spelling errors found
        corrected_text: Text with suggested corrections applied (optional)
        language: Language used for spell checking
        engine: Name of the engine that performed the check
        metadata: Additional metadata from the spell check engine
    """
    original_text: str
    errors: List[Dict[str, Any]]
    corrected_text: Optional[str] = None
    language: str = "en"
    engine: str = "unknown"
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
    
    @property
    def has_errors(self) -> bool:
        """Check if any spelling errors were found."""
        return len(self.errors) > 0
    
    @property
    def error_count(self) -> int:
        """Get the number of spelling errors found."""
        return len(self.errors)


class BaseSpellChecker(ABC):
    """
    Abstract base class for all spell checker implementations.
    
    This class defines the interface that all spell checkers must implement,
    ensuring consistency across different spell checking engines.
    """
    
    def __init__(self, name: str, language: str = "en", **kwargs):
        """
        Initialize the spell checker.
        
        Args:
            name: Human-readable name for this spell checker
            language: Language code (e.g., 'en', 'es', 'fr')
            **kwargs: Additional configuration options
        """
        self.name = name
        self.language = language
        self.config = kwargs
        self._initialized = False
        self._available = False
    
    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the spell checker engine.
        
        This method should set up any necessary resources, download models,
        or perform other initialization tasks.
        
        Returns:
            True if initialization was successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def check_text(self, text: str, language: Optional[str] = None) -> SpellCheckResult:
        """
        Check a single text string for spelling errors.
        
        Args:
            text: The text to check for spelling errors
            language: Optional language override
            
        Returns:
            SpellCheckResult containing errors and suggestions
        """
        pass
    
    @abstractmethod
    async def check_lines(self, lines: List[str], language: Optional[str] = None) -> Dict[int, SpellCheckResult]:
        """
        Check multiple lines of text for spelling errors.
        
        Args:
            lines: List of text lines to check
            language: Optional language override
            
        Returns:
            Dictionary mapping line numbers to SpellCheckResult objects
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if this spell checker is available and ready to use.
        
        Returns:
            True if the spell checker can be used, False otherwise
        """
        pass
    
    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        """
        Get list of supported language codes.
        
        Returns:
            List of ISO language codes supported by this spell checker
        """
        pass
    
    async def cleanup(self) -> None:
        """
        Clean up resources used by the spell checker.
        
        This method should be called when the spell checker is no longer needed.
        Override if specific cleanup is required.
        """
        self._initialized = False
        self._available = False
    
    def __str__(self) -> str:
        return f"{self.name} SpellChecker (language: {self.language})"
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name='{self.name}', language='{self.language}', available={self.is_available()})>"


class SpellCheckerError(Exception):
    """Base exception for spell checker operations."""
    pass


class SpellCheckerNotAvailableError(SpellCheckerError):
    """Raised when trying to use an unavailable spell checker."""
    pass


class SpellCheckerInitializationError(SpellCheckerError):
    """Raised when spell checker initialization fails.""" 
    pass