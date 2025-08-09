"""
Additional event handlers to demonstrate EDA architecture extensibility.
These handlers show how easy it is to add new event types using the framework.
"""

from typing import List, Optional, Dict, Any
from fastapi import WebSocket
from pydantic import BaseModel, Field

from event_handlers import BaseEventHandler, BaseEventRequest, BaseEventResponse


class PredictionRequest(BaseEventRequest):
    """Pydantic model for prediction request validation"""
    
    message_key: str = Field(default="prediction_request", description="Message identifier")
    prev_context: str = Field(default="", description="Text before cursor position")
    current_text: str = Field(..., description="Current paragraph text")
    after_context: str = Field(default="", description="Text after cursor position")
    cursor: int = Field(default=0, description="Cursor position within current text")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class PredictionResponse(BaseEventResponse):
    """Response model for prediction results"""
    
    message_key: str = Field(default="prediction_response", description="Response message identifier")
    prediction: str = Field(default="", description="Predicted text")
    confidence: Optional[float] = Field(default=None, description="Prediction confidence score")
    engine_used: Optional[str] = Field(default=None, description="Engine that generated prediction")


class PredictionEventHandler(BaseEventHandler[PredictionRequest]):
    """Event handler for text prediction requests"""
    
    message_schema = PredictionRequest
    message_key = "prediction_request"
    
    def __init__(self, prediction_function=None):
        super().__init__()
        self._prediction_function = prediction_function
    
    async def _process_message(
        self, 
        message: PredictionRequest, 
        websocket: WebSocket
    ) -> Optional[PredictionResponse]:
        """Process prediction request"""
        try:
            # Use injected function or import from main
            if self._prediction_function:
                predict_func = self._prediction_function
            else:
                from main import predict_next_tokens_structured
                predict_func = predict_next_tokens_structured
            
            # Get prediction
            prediction = await predict_func(
                message.prev_context,
                message.current_text, 
                message.after_context,
                message.cursor,
                message.metadata or {}
            )
            
            return PredictionResponse(
                message_key="prediction_response",
                success=True,
                prediction=prediction,
                confidence=0.85,  # Mock confidence score
                engine_used="mock_ai",
                correlation_id=message.correlation_id
            )
            
        except Exception as e:
            return PredictionResponse(
                message_key="prediction_response",
                success=False,
                error=f"Prediction failed: {str(e)}",
                correlation_id=message.correlation_id
            )


class DictionaryRequest(BaseEventRequest):
    """Pydantic model for dictionary operations"""
    
    message_key: str = Field(default="dictionary_request", description="Message identifier") 
    action: str = Field(..., description="Action: 'add', 'remove', 'list', 'check'")
    word: Optional[str] = Field(default=None, description="Word to add/remove/check")


class DictionaryResponse(BaseEventResponse):
    """Response model for dictionary operations"""
    
    message_key: str = Field(default="dictionary_response", description="Response message identifier")
    action: str = Field(default="", description="Action that was performed")
    word: Optional[str] = Field(default=None, description="Word that was processed")
    words: Optional[List[Dict[str, Any]]] = Field(default=None, description="List of dictionary words")
    word_exists: Optional[bool] = Field(default=None, description="Whether word exists in dictionary")


class DictionaryEventHandler(BaseEventHandler[DictionaryRequest]):
    """Event handler for custom dictionary operations"""
    
    message_schema = DictionaryRequest
    message_key = "dictionary_request"
    
    async def _process_message(
        self, 
        message: DictionaryRequest, 
        websocket: WebSocket
    ) -> Optional[DictionaryResponse]:
        """Process dictionary request"""
        try:
            if message.action == "add" and message.word:
                from main import add_word_to_dictionary
                await add_word_to_dictionary(message.word)
                
                return DictionaryResponse(
                    message_key="dictionary_response",
                    success=True,
                    action="add",
                    word=message.word,
                    correlation_id=message.correlation_id
                )
            
            elif message.action == "list":
                # Import database operations
                import aiosqlite
                from main import DB_PATH
                
                words = []
                async with aiosqlite.connect(DB_PATH) as db:
                    async with db.execute(
                        "SELECT word, added_at FROM user_dictionary ORDER BY word"
                    ) as cursor:
                        async for row in cursor:
                            words.append({"word": row[0], "added_at": row[1]})
                
                return DictionaryResponse(
                    message_key="dictionary_response",
                    success=True,
                    action="list",
                    words=words,
                    correlation_id=message.correlation_id
                )
            
            elif message.action == "check" and message.word:
                # Check if word exists in dictionary
                import aiosqlite
                from main import DB_PATH
                
                async with aiosqlite.connect(DB_PATH) as db:
                    async with db.execute(
                        "SELECT word FROM user_dictionary WHERE word = ?", (message.word.lower(),)
                    ) as cursor:
                        result = await cursor.fetchone()
                        word_exists = result is not None
                
                return DictionaryResponse(
                    message_key="dictionary_response",
                    success=True,
                    action="check",
                    word=message.word,
                    word_exists=word_exists,
                    correlation_id=message.correlation_id
                )
            
            else:
                return DictionaryResponse(
                    message_key="dictionary_response",
                    success=False,
                    error=f"Unsupported action: {message.action}",
                    correlation_id=message.correlation_id
                )
                
        except Exception as e:
            return DictionaryResponse(
                message_key="dictionary_response", 
                success=False,
                error=f"Dictionary operation failed: {str(e)}",
                correlation_id=message.correlation_id
            )


class HealthCheckRequest(BaseEventRequest):
    """Health check request model"""
    
    message_key: str = Field(default="health_check", description="Message identifier")
    include_stats: bool = Field(default=False, description="Include system statistics")


class HealthCheckResponse(BaseEventResponse):
    """Health check response model"""
    
    message_key: str = Field(default="health_check_response", description="Response message identifier")
    status: str = Field(default="healthy", description="System status")
    timestamp: Optional[str] = Field(default=None, description="Response timestamp")
    stats: Optional[Dict[str, Any]] = Field(default=None, description="System statistics")


class HealthCheckEventHandler(BaseEventHandler[HealthCheckRequest]):
    """Event handler for health checks and system status"""
    
    message_schema = HealthCheckRequest
    message_key = "health_check"
    
    async def _process_message(
        self, 
        message: HealthCheckRequest, 
        websocket: WebSocket
    ) -> Optional[HealthCheckResponse]:
        """Process health check request"""
        try:
            from datetime import datetime
            from event_handlers import event_router
            
            timestamp = datetime.utcnow().isoformat()
            stats = None
            
            if message.include_stats:
                stats = {
                    "registered_handlers": len(event_router.handlers),
                    "active_websockets": len(event_router.subscriptions),
                    "total_subscriptions": sum(len(topics) for topics in event_router.subscriptions.values()),
                    "available_engines": ["pyspellchecker", "hunspell", "autocorrect", "neuspell"]
                }
            
            return HealthCheckResponse(
                message_key="health_check_response",
                success=True,
                status="healthy",
                timestamp=timestamp,
                stats=stats,
                correlation_id=message.correlation_id
            )
            
        except Exception as e:
            return HealthCheckResponse(
                message_key="health_check_response",
                success=False,
                error=f"Health check failed: {str(e)}",
                status="unhealthy",
                correlation_id=message.correlation_id
            )