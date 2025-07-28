"""
Traditional prediction engines as alternatives to AI-based prediction.
This module provides statistical and rule-based text prediction methods.
"""

import asyncio
import re
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, Counter


class TraditionalPredictionEngine:
    """
    A simple, traditional prediction engine using statistical methods
    and rule-based approaches instead of AI.
    """
    
    def __init__(self):
        # Common English words by frequency
        self.common_words = [
            "the", "be", "to", "of", "and", "a", "in", "that", "have",
            "i", "it", "for", "not", "on", "with", "he", "as", "you",
            "do", "at", "this", "but", "his", "by", "from", "they",
            "we", "say", "her", "she", "or", "an", "will", "my",
            "one", "all", "would", "there", "their", "what", "so",
            "up", "out", "if", "about", "who", "get", "which", "go",
            "me", "when", "make", "can", "like", "time", "no", "just",
            "him", "know", "take", "people", "into", "year", "your",
            "good", "some", "could", "them", "see", "other", "than",
            "then", "now", "look", "only", "come", "its", "over",
            "think", "also", "back", "after", "use", "two", "how",
            "our", "work", "first", "well", "way", "even", "new",
            "want", "because", "any", "these", "give", "day", "most", "us"
        ]
        
        # Bigram predictions (word pairs)
        self.bigrams = {
            "the": ["quick", "best", "most", "first", "last", "only", "same", "next"],
            "a": ["new", "good", "great", "small", "large", "simple", "quick", "long"],
            "an": ["example", "important", "interesting", "easy", "effective", "old"],
            "is": ["a", "the", "not", "very", "also", "often", "always", "still"],
            "was": ["a", "the", "not", "very", "also", "once", "never", "still"],
            "are": ["not", "also", "very", "often", "always", "still", "usually"],
            "will": ["be", "not", "also", "never", "always", "probably", "definitely"],
            "can": ["be", "not", "also", "never", "always", "often", "sometimes"],
            "have": ["been", "not", "also", "never", "always", "often", "already"],
            "this": ["is", "was", "will", "can", "should", "might", "would"],
            "that": ["is", "was", "will", "can", "should", "might", "would"],
            "in": ["the", "a", "this", "that", "order", "fact", "general"],
            "on": ["the", "a", "this", "that", "top", "behalf", "time"],
            "at": ["the", "a", "this", "that", "least", "most", "first"],
            "for": ["the", "a", "this", "that", "example", "instance"],
            "with": ["the", "a", "this", "that", "respect", "regard"],
            "by": ["the", "a", "this", "that", "way", "means", "using"],
            "to": ["be", "have", "do", "get", "make", "take", "go", "come"],
            "of": ["the", "a", "this", "that", "course", "all", "some"],
            "and": ["the", "a", "this", "that", "then", "so", "also"],
            "or": ["not", "a", "the", "more", "less", "other", "another"],
            "but": ["not", "also", "the", "it", "they", "we", "I"],
            "if": ["you", "we", "they", "it", "the", "not", "possible"],
            "when": ["you", "we", "they", "it", "the", "not", "possible"],
            "where": ["you", "we", "they", "it", "the", "not", "possible"],
            "how": ["to", "do", "can", "will", "would", "should", "might"],
            "what": ["is", "was", "will", "can", "should", "might", "would"],
            "who": ["is", "was", "will", "can", "should", "might", "would"],
            "why": ["is", "was", "will", "can", "should", "might", "would"],
        }
        
        # Common sentence starters
        self.sentence_starters = [
            "The", "A", "An", "This", "That", "These", "Those", "I", "We", "You",
            "They", "It", "There", "Here", "When", "Where", "How", "What", "Why",
            "Who", "Which", "If", "Although", "Because", "Since", "After", "Before",
            "During", "For", "In", "On", "At", "By", "With", "Without", "Through",
            "Over", "Under", "Above", "Below", "Between", "Among", "Throughout"
        ]
        
        # Common word endings and their continuations
        self.word_completions = {
            "th": ["the", "that", "this", "then", "they", "them", "there", "think", "through"],
            "wh": ["what", "when", "where", "which", "who", "why", "while", "white"],
            "st": ["start", "stop", "still", "study", "student", "strong", "story"],
            "pr": ["provide", "problem", "process", "program", "project", "present", "previous"],
            "ex": ["example", "experience", "expect", "explain", "express", "excellent"],
            "in": ["information", "include", "increase", "interest", "important", "instead"],
            "de": ["development", "design", "decision", "description", "detail", "determine"],
            "re": ["result", "research", "report", "reason", "remember", "really", "recent"],
            "co": ["company", "computer", "continue", "complete", "consider", "control"],
            "un": ["understand", "under", "university", "until", "unless", "unique"],
        }
        
        # Programming-related completions
        self.programming_completions = {
            "def": ["define", "definition", "default"],
            "func": ["function"],
            "var": ["variable", "various"],
            "class": ["classification", "classic"],
            "import": ["important", "implementation"],
            "return": ["returns", "returned"],
            "if": ["if statement", "if condition"],
            "for": ["for loop", "for each"],
            "while": ["while loop", "while condition"],
        }
        
    async def predict_next_tokens(
        self, 
        prev_context: str, 
        current_text: str, 
        after_context: str, 
        cursor: int, 
        metadata: dict = {}
    ) -> str:
        """
        Predict next tokens using traditional statistical methods.
        
        Args:
            prev_context: Text from previous paragraphs
            current_text: Current paragraph text
            after_context: Text from following paragraphs  
            cursor: Cursor position within current_text
            metadata: Additional metadata about the context
            
        Returns:
            Predicted text continuation
        """
        await asyncio.sleep(0.05)  # Simulate processing time (faster than AI)
        
        # Get text before cursor
        text_before_cursor = current_text[:cursor] if cursor <= len(current_text) else current_text
        text_after_cursor = current_text[cursor:] if cursor < len(current_text) else ""
        
        print("DEBUG Traditional Engine:")
        print(f"  text_before_cursor: '{text_before_cursor[-30:]}'")
        print(f"  cursor: {cursor}")
        
        # Return empty for empty input
        if not text_before_cursor.strip():
            return ""
        
        # Determine spacing needs
        needs_space_prefix = text_before_cursor and not text_before_cursor.endswith(" ")
        needs_space_suffix = text_after_cursor and not text_after_cursor.startswith(" ")
        
        space_prefix = " " if needs_space_prefix else ""
        space_suffix = " " if needs_space_suffix else ""
        
        # Get the last few words for context
        words = text_before_cursor.strip().split()
        if not words:
            return ""
            
        prediction = ""
        
        # 1. Check for partial word completion
        last_word = words[-1].lower()
        if not text_before_cursor.endswith(" "):
            # We're in the middle of typing a word
            partial_completions = self._get_partial_word_completions(last_word)
            if partial_completions:
                # Return the rest of the most likely completion
                best_completion = partial_completions[0]
                if best_completion.startswith(last_word):
                    remaining = best_completion[len(last_word):]
                    if remaining:
                        prediction = remaining + space_suffix
                        print(f"  partial completion: '{last_word}' -> '{best_completion}' (adding '{remaining}')")
                        return space_prefix + prediction
        
        # 2. Bigram-based prediction (if we just finished a word)
        if text_before_cursor.endswith(" ") and len(words) >= 1:
            last_word = words[-1].lower()
            if last_word in self.bigrams:
                prediction = self.bigrams[last_word][0]  # Most common continuation
                print(f"  bigram prediction: '{last_word}' -> '{prediction}'")
                return space_prefix + prediction + space_suffix
        
        # 3. Context-based predictions
        text_lower = text_before_cursor.lower()
        
        # Programming context
        if any(word in text_lower for word in ["def", "function", "class", "import", "return"]):
            if text_lower.endswith("def "):
                prediction = "function_name():"
            elif text_lower.endswith("class "):
                prediction = "ClassName:"
            elif text_lower.endswith("import "):
                prediction = "module_name"
            elif text_lower.endswith("return "):
                prediction = "result"
            else:
                prediction = "code_statement"
        
        # Question context
        elif any(text_lower.strip().startswith(q) for q in ["what", "how", "why", "when", "where", "who"]):
            if not prediction:
                prediction = "is the answer to this question"
        
        # Beginning of sentence
        elif len(words) == 1 and text_before_cursor.endswith(" "):
            # Suggest common second words
            first_word = words[0].lower()
            if first_word in ["the", "a", "an"]:
                prediction = self._get_noun_suggestion()
            elif first_word in ["this", "that"]:
                prediction = "is"
            elif first_word in ["i", "we", "you", "they"]:
                prediction = self._get_verb_suggestion()
            else:
                prediction = self._get_common_continuation()
        
        # Default statistical prediction
        if not prediction:
            prediction = self._get_statistical_prediction(words[-2:] if len(words) >= 2 else words)
        
        # Fallback to common words
        if not prediction:
            prediction = self.common_words[0]  # "the"
        
        final_prediction = space_prefix + prediction + space_suffix
        print(f"  final prediction: '{final_prediction}'")
        return final_prediction
    
    def _get_partial_word_completions(self, partial: str) -> List[str]:
        """Get completions for partial words."""
        if len(partial) < 2:
            return []
            
        completions = []
        
        # Check predefined completions
        for prefix, words in self.word_completions.items():
            if partial.startswith(prefix):
                completions.extend([w for w in words if w.startswith(partial)])
        
        # Check programming completions
        for prefix, words in self.programming_completions.items():
            if partial.startswith(prefix):
                completions.extend([w for w in words if w.startswith(partial)])
        
        # Check common words
        for word in self.common_words:
            if word.startswith(partial) and word != partial:
                completions.append(word)
        
        # Remove duplicates and sort by length (prefer shorter completions)
        completions = list(set(completions))
        completions.sort(key=lambda x: (len(x), x))
        
        return completions[:5]  # Return top 5
    
    def _get_noun_suggestion(self) -> str:
        """Get a common noun suggestion."""
        nouns = ["user", "system", "data", "information", "process", "result", "example", "problem"]
        return nouns[0]
    
    def _get_verb_suggestion(self) -> str:
        """Get a common verb suggestion."""
        verbs = ["are", "will", "can", "should", "have", "need", "want", "use"]
        return verbs[0]
    
    def _get_common_continuation(self) -> str:
        """Get a common word continuation."""
        continuations = ["is", "are", "will", "can", "should", "have", "need", "was"]
        return continuations[0]
    
    def _get_statistical_prediction(self, context_words: List[str]) -> str:
        """Get prediction based on statistical analysis of context."""
        if not context_words:
            return "the"
        
        last_word = context_words[-1].lower()
        
        # Simple heuristics based on word endings
        if last_word.endswith("ing"):
            return "the"
        elif last_word.endswith("ed"):
            return "and"
        elif last_word.endswith("er"):
            return "is"
        elif last_word.endswith("ly"):
            return "the"
        else:
            # Return most common word that often follows
            return "and"


class FrequencyBasedPredictor:
    """
    A frequency-based predictor that learns from text patterns.
    This is a more advanced traditional approach.
    """
    
    def __init__(self):
        # Simple frequency tables
        self.word_frequencies = Counter()
        self.bigram_frequencies = defaultdict(Counter)
        self.trigram_frequencies = defaultdict(Counter)
        
        # Initialize with some basic patterns
        self._initialize_basic_patterns()
    
    def _initialize_basic_patterns(self):
        """Initialize with basic English patterns."""
        # Common word sequences
        sample_text = """
        The quick brown fox jumps over the lazy dog. This is a sample text.
        We need to provide some basic patterns for prediction. The system
        should be able to predict common word sequences. For example, when
        you type the word the, it might suggest quick or best or most.
        A good prediction system will help users write more efficiently.
        """
        
        self.learn_from_text(sample_text)
    
    def learn_from_text(self, text: str):
        """Learn patterns from text."""
        # Clean and tokenize
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Update word frequencies
        self.word_frequencies.update(words)
        
        # Update bigram frequencies
        for i in range(len(words) - 1):
            self.bigram_frequencies[words[i]][words[i + 1]] += 1
        
        # Update trigram frequencies  
        for i in range(len(words) - 2):
            context = f"{words[i]} {words[i + 1]}"
            self.trigram_frequencies[context][words[i + 2]] += 1
    
    async def predict_next_tokens(
        self, 
        prev_context: str, 
        current_text: str, 
        after_context: str, 
        cursor: int, 
        metadata: dict = {}
    ) -> str:
        """Predict using frequency analysis."""
        await asyncio.sleep(0.05)
        
        text_before_cursor = current_text[:cursor] if cursor <= len(current_text) else current_text
        
        if not text_before_cursor.strip():
            return ""
        
        # Get last words for context
        words = re.findall(r'\b\w+\b', text_before_cursor.lower())
        
        if not words:
            return ""
        
        # Determine spacing
        needs_space_prefix = text_before_cursor and not text_before_cursor.endswith(" ")
        text_after_cursor = current_text[cursor:] if cursor < len(current_text) else ""
        needs_space_suffix = text_after_cursor and not text_after_cursor.startswith(" ")
        
        space_prefix = " " if needs_space_prefix else ""
        space_suffix = " " if needs_space_suffix else ""
        
        prediction = ""
        
        # Try trigram prediction first
        if len(words) >= 2:
            context = f"{words[-2]} {words[-1]}"
            if context in self.trigram_frequencies:
                most_common = self.trigram_frequencies[context].most_common(1)
                if most_common:
                    prediction = most_common[0][0]
        
        # Fall back to bigram prediction
        if not prediction and words:
            last_word = words[-1]
            if last_word in self.bigram_frequencies:
                most_common = self.bigram_frequencies[last_word].most_common(1)
                if most_common:
                    prediction = most_common[0][0]
        
        # Fall back to most common words
        if not prediction:
            most_common = self.word_frequencies.most_common(10)
            if most_common:
                # Avoid suggesting the same word we just typed
                for word, _ in most_common:
                    if word != words[-1]:
                        prediction = word
                        break
        
        if prediction:
            return space_prefix + prediction + space_suffix
        
        return ""


# Available prediction engines
PREDICTION_ENGINES = {
    "traditional": TraditionalPredictionEngine,
    "frequency": FrequencyBasedPredictor,
}


async def get_prediction_engine(engine_name: str):
    """Get a prediction engine instance by name."""
    if engine_name not in PREDICTION_ENGINES:
        raise ValueError(f"Unknown prediction engine: {engine_name}")
    
    return PREDICTION_ENGINES[engine_name]()