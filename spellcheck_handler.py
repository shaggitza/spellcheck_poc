"""
Spellcheck event handler implementation for the EDA architecture.
Handles spellcheck requests with Pydantic validation and structured responses.
"""

import json
from typing import List, Optional, Dict, Any
from fastapi import WebSocket
from pydantic import BaseModel, Field

from event_handlers import BaseEventHandler, BaseEventRequest, BaseEventResponse


class SpellcheckPydanticRequest(BaseEventRequest):
    """Pydantic model for spellcheck request validation"""
    
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
    """Response model for spellcheck results"""
    
    message_key: str = Field(default="spellcheck_response", description="Response message identifier")
    errors: Dict[int, List[Dict[str, Any]]] = Field(default_factory=dict, description="Spelling errors by line index")
    language: str = Field(default="en", description="Language used for checking")
    engine_used: Optional[str] = Field(default=None, description="Engine that was used for checking")
    lines_checked: int = Field(default=0, description="Number of lines processed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "spellcheck_response", 
                "success": True,
                "errors": {
                    "1": [
                        {
                            "word": "spellling",
                            "start_pos": 35,
                            "end_pos": 44,
                            "suggestions": ["spelling", "spilling", "smelling"]
                        }
                    ]
                },
                "language": "en",
                "engine_used": "pyspellchecker",
                "lines_checked": 2,
                "correlation_id": "spell-check-123"
            }
        }


class SpellcheckEventHandler(BaseEventHandler[SpellcheckPydanticRequest]):
    """Event handler for spellcheck requests with EDA architecture"""
    
    message_schema = SpellcheckPydanticRequest
    message_key = "spellcheck_request"
    
    def __init__(self, spell_check_function=None):
        """
        Initialize the spellcheck event handler
        
        Args:
            spell_check_function: Function to use for spell checking (for dependency injection)
        """
        super().__init__()
        self._spell_check_function = spell_check_function
    
    async def _process_message(
        self, 
        message: SpellcheckPydanticRequest, 
        websocket: WebSocket
    ) -> Optional[SpellcheckResponse]:
        """
        Process validated spellcheck request
        
        Args:
            message: Validated spellcheck request
            websocket: WebSocket connection for potential streaming responses
            
        Returns:
            SpellcheckResponse with results
        """
        try:
            # Use injected spell check function if available
            if self._spell_check_function:
                spell_check_line = self._spell_check_function
            else:
                # Import the spell check function from main module
                from main import spell_check_line
            
            # Process each line for spelling errors
            all_errors = {}
            lines_processed = 0
            
            for line_index, line_text in enumerate(message.lines):
                if line_text.strip():  # Only check non-empty lines
                    try:
                        # Call the existing spell check function
                        errors = await spell_check_line(line_text, message.language)
                        if errors:
                            all_errors[line_index] = errors
                        lines_processed += 1
                    except Exception as line_error:
                        print(f"Error checking line {line_index}: {str(line_error)}")
                        # Continue with other lines even if one fails
                        continue
            
            # Create response
            response = SpellcheckResponse(
                message_key="spellcheck_response",
                success=True,
                errors=all_errors,
                language=message.language,
                engine_used=message.engine or "default",
                lines_checked=lines_processed,
                correlation_id=message.correlation_id
            )
            
            print(f"✅ Processed spellcheck request: {lines_processed} lines, {len(all_errors)} lines with errors")
            return response
            
        except Exception as e:
            # Return error response
            error_response = SpellcheckResponse(
                message_key="spellcheck_response",
                success=False,
                error=f"Spellcheck processing failed: {str(e)}",
                language=message.language,
                lines_checked=0,
                correlation_id=message.correlation_id
            )
            
            print(f"❌ Spellcheck processing error: {str(e)}")
            return error_response
    
    async def process_streaming_spellcheck(
        self,
        message: SpellcheckPydanticRequest,
        websocket: WebSocket
    ) -> None:
        """
        Process spellcheck with streaming results (optional advanced feature)
        
        Args:
            message: Validated spellcheck request
            websocket: WebSocket connection for streaming responses
        """
        try:
            # Import spell check function
            if self._spell_check_function:
                spell_check_line = self._spell_check_function
            else:
                from main import spell_check_line
            
            lines_total = len(message.lines)
            
            # Send progress updates for large documents
            for line_index, line_text in enumerate(message.lines):
                if line_text.strip():
                    try:
                        errors = await spell_check_line(line_text, message.language)
                        
                        # Send partial result
                        partial_response = {
                            "message_key": "spellcheck_partial_response",
                            "line_index": line_index,
                            "errors": errors if errors else [],
                            "progress": {
                                "current": line_index + 1,
                                "total": lines_total,
                                "percentage": round(((line_index + 1) / lines_total) * 100, 2)
                            },
                            "correlation_id": message.correlation_id
                        }
                        
                        await websocket.send_text(json.dumps(partial_response))
                        
                    except Exception as line_error:
                        print(f"Error in streaming spellcheck for line {line_index}: {str(line_error)}")
                        continue
            
            # Send completion message
            completion_response = {
                "message_key": "spellcheck_completed",
                "success": True,
                "lines_processed": lines_total,
                "correlation_id": message.correlation_id
            }
            
            await websocket.send_text(json.dumps(completion_response))
            
        except Exception as e:
            # Send error completion
            error_completion = {
                "message_key": "spellcheck_completed",
                "success": False,
                "error": str(e),
                "correlation_id": message.correlation_id
            }
            
            await websocket.send_text(json.dumps(error_completion))