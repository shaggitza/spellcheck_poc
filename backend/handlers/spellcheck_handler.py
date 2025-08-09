"""
Spellcheck event handler - Handles spell checking requests in the EDA architecture.

This handler processes spell check requests using the modular spellchecker 
providers and returns structured responses with errors and suggestions.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import WebSocket

from .eda_framework import BaseEventHandler, BaseEventRequest, BaseEventResponse
from ..spellcheckers import spell_checker_factory, SpellCheckerType


class SpellcheckPydanticRequest(BaseEventRequest):
    """Pydantic model for spellcheck request validation."""
    
    message_key: str = Field(default="spellcheck_request", description="Message identifier")
    lines: List[str] = Field(..., description="List of text lines to spell check")
    language: str = Field(default="en", description="Language code for spell checking")
    engine: Optional[str] = Field(default=None, description="Preferred spell check engine")
    
    class Config:
        # Example for API documentation
        json_schema_extra = {
            "example": {
                "message_key": "spellcheck_request",
                "lines": ["Hello world", "This is a misspelled word: spellling"],
                "language": "en",
                "engine": "pyspellchecker",
                "correlation_id": "spell-check-123"
            }
        }


class SpellcheckResponse(BaseEventResponse):
    """Structured response for spellcheck operations."""
    
    message_key: str = Field(default="spellcheck_response", description="Response type identifier")
    errors: Dict[int, List[Dict[str, Any]]] = Field(default_factory=dict, 
                                                   description="Errors found, keyed by line number")
    lines_checked: int = Field(default=0, description="Number of lines that were checked")
    engine_used: Optional[str] = Field(default=None, description="Spell check engine that was used")
    language_used: str = Field(default="en", description="Language used for spell checking")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "spellcheck_response",
                "success": True,
                "errors": {
                    "1": [
                        {
                            "word": "spellling",
                            "position": 30,
                            "suggestions": ["spelling", "spilling", "shelling"]
                        }
                    ]
                },
                "lines_checked": 2,
                "engine_used": "pyspellchecker",
                "language_used": "en",
                "correlation_id": "spell-check-123"
            }
        }


class SpellcheckEventHandler(BaseEventHandler[SpellcheckPydanticRequest]):
    """
    Event handler for spellcheck requests using the EDA architecture.
    
    This handler processes validated spellcheck requests using the modular
    spellchecker factory and returns structured responses.
    """
    
    message_schema = SpellcheckPydanticRequest
    message_key = "spellcheck_request"
    
    def __init__(self):
        """Initialize the spellcheck event handler."""
        super().__init__()
        
    async def _process_message(self, message: SpellcheckPydanticRequest, websocket: WebSocket) -> Dict[str, Any]:
        """
        Process a validated spellcheck request.
        
        Args:
            message: Validated spellcheck request
            websocket: WebSocket connection (for potential streaming responses)
            
        Returns:
            Dictionary containing spellcheck response
        """
        try:
            # Determine which spell checker to use
            checker_type = None
            if message.engine:
                try:
                    checker_type = SpellCheckerType(message.engine.lower())
                except ValueError:
                    print(f"⚠️  Unknown spell check engine: {message.engine}, using best available")
            
            # Perform spell check using the factory
            results = await spell_checker_factory.check_lines(
                lines=message.lines,
                checker_type=checker_type,
                language=message.language
            )
            
            # Convert results to the expected format
            errors = {}
            engine_used = None
            
            for line_num, result in results.items():
                if result.has_errors:
                    errors[line_num] = result.errors
                
                # Track which engine was used (should be consistent across lines)
                if not engine_used and result.engine:
                    engine_used = result.engine
            
            # Create structured response
            response = SpellcheckResponse(
                success=True,
                errors=errors,
                lines_checked=len(message.lines),
                engine_used=engine_used,
                language_used=message.language,
                correlation_id=message.correlation_id,
                metadata={
                    "total_errors": sum(len(line_errors) for line_errors in errors.values()),
                    "lines_with_errors": len(errors),
                    "requested_engine": message.engine
                }
            )
            
            return response.dict()
            
        except Exception as e:
            # Return error response
            error_response = SpellcheckResponse(
                success=False,
                error_message=f"Spellcheck processing failed: {str(e)}",
                lines_checked=0,
                language_used=message.language,
                correlation_id=message.correlation_id,
                metadata={
                    "error_type": type(e).__name__,
                    "requested_engine": message.engine
                }
            )
            
            return error_response.dict()


# Create singleton instance for registration
spellcheck_handler = SpellcheckEventHandler()