"""
Spellchecker package - Modular spell checking with provider abstraction.
"""

from .base import BaseSpellChecker, SpellCheckResult
from .factory import SpellCheckerFactory, SpellCheckerType, spell_checker_factory
from .factory import get_spell_checker, check_spelling, get_best_spell_checker

__all__ = [
    "BaseSpellChecker", 
    "SpellCheckResult",
    "SpellCheckerFactory",
    "SpellCheckerType", 
    "spell_checker_factory",
    "get_spell_checker",
    "check_spelling", 
    "get_best_spell_checker"
]