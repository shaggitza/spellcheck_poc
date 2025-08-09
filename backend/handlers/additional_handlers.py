"""
Additional event handlers for the EDA architecture.

This module contains handlers for predictions, dictionary operations,
health checks, and other system functions.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import WebSocket

from .eda_framework import BaseEventHandler, BaseEventRequest, BaseEventResponse
from ..engines.prediction_engines import get_prediction_engine, PREDICTION_ENGINES
from ..spellcheckers import spell_checker_factory


# ===== PREDICTION HANDLER =====

class PredictionRequest(BaseEventRequest):
    """Request model for text prediction."""
    
    message_key: str = Field(default="prediction_request", description="Message identifier")
    text: str = Field(..., description="Current text for prediction context")
    max_predictions: int = Field(default=5, description="Maximum number of predictions to return")
    engine: Optional[str] = Field(default=None, description="Preferred prediction engine")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "prediction_request", 
                "text": "The weather today is very",
                "max_predictions": 3,
                "engine": "frequency_based",
                "correlation_id": "pred-123"
            }
        }


class PredictionResponse(BaseEventResponse):
    """Response model for text predictions."""
    
    message_key: str = Field(default="prediction_response", description="Response identifier")
    predictions: List[str] = Field(default_factory=list, description="List of predicted text continuations")
    engine_used: Optional[str] = Field(default=None, description="Prediction engine that was used")
    confidence_scores: Optional[List[float]] = Field(default=None, description="Confidence scores for predictions")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "prediction_response",
                "success": True,
                "predictions": ["nice", "sunny", "cloudy"],
                "engine_used": "frequency_based",
                "correlation_id": "pred-123"
            }
        }


class PredictionEventHandler(BaseEventHandler[PredictionRequest]):
    """Handler for text prediction requests."""
    
    message_schema = PredictionRequest
    message_key = "prediction_request"
    
    async def _process_message(self, message: PredictionRequest, websocket: WebSocket) -> Dict[str, Any]:
        """Process prediction request."""
        try:
            # Get prediction engine
            engine_name = message.engine or "frequency_based"  
            engine = get_prediction_engine(engine_name)
            
            if not engine:
                available_engines = list(PREDICTION_ENGINES.keys())
                return PredictionResponse(
                    success=False,
                    error_message=f"Unknown prediction engine: {engine_name}",
                    correlation_id=message.correlation_id,
                    metadata={"available_engines": available_engines}
                ).dict()
            
            # Get predictions
            predictions = await engine.get_next_tokens(message.text, max_tokens=message.max_predictions)
            
            response = PredictionResponse(
                success=True,
                predictions=predictions,
                engine_used=engine_name,
                correlation_id=message.correlation_id,
                metadata={"text_length": len(message.text)}
            )
            
            return response.dict()
            
        except Exception as e:
            return PredictionResponse(
                success=False,
                error_message=f"Prediction failed: {str(e)}",
                correlation_id=message.correlation_id,
                metadata={"error_type": type(e).__name__}
            ).dict()


# ===== DICTIONARY HANDLER =====

class DictionaryRequest(BaseEventRequest):
    """Request model for dictionary operations."""
    
    message_key: str = Field(default="dictionary_request", description="Message identifier")
    operation: str = Field(..., description="Operation: 'add', 'remove', 'check', 'list'")
    word: Optional[str] = Field(default=None, description="Word for add/remove/check operations")
    language: str = Field(default="en", description="Language for dictionary operations")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "dictionary_request",
                "operation": "add",
                "word": "customword",
                "language": "en",
                "correlation_id": "dict-123"
            }
        }


class DictionaryResponse(BaseEventResponse):
    """Response model for dictionary operations."""
    
    message_key: str = Field(default="dictionary_response", description="Response identifier")
    operation: str = Field(..., description="Operation that was performed")
    word: Optional[str] = Field(default=None, description="Word that was operated on")
    result: Any = Field(default=None, description="Operation result (varies by operation)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "dictionary_response",
                "success": True,
                "operation": "add", 
                "word": "customword",
                "result": True,
                "correlation_id": "dict-123"
            }
        }


class DictionaryEventHandler(BaseEventHandler[DictionaryRequest]):
    """Handler for dictionary operations."""
    
    message_schema = DictionaryRequest
    message_key = "dictionary_request"
    
    async def _process_message(self, message: DictionaryRequest, websocket: WebSocket) -> Dict[str, Any]:
        """Process dictionary operation request."""
        try:
            operation = message.operation.lower()
            
            if operation == "add" and message.word:
                # Add word to dictionary (using best available checker)
                checker = spell_checker_factory.get_best_checker(message.language)
                if checker and hasattr(checker, 'add_word_to_dictionary'):
                    result = checker.add_word_to_dictionary(message.word)
                else:
                    result = False
                    
            elif operation == "remove" and message.word:
                # Remove word from dictionary
                checker = spell_checker_factory.get_best_checker(message.language)
                if checker and hasattr(checker, 'remove_word_from_dictionary'):
                    result = checker.remove_word_from_dictionary(message.word)
                else:
                    result = False
                    
            elif operation == "check" and message.word:
                # Check if word is in dictionary
                result_obj = await spell_checker_factory.check_text(
                    message.word, 
                    language=message.language
                )
                result = not result_obj.has_errors if result_obj else False
                
            elif operation == "list":
                # List available checkers and their status
                result = spell_checker_factory.get_status()
                
            else:
                return DictionaryResponse(
                    success=False,
                    error_message=f"Invalid operation: {operation}",
                    operation=operation,
                    word=message.word,
                    correlation_id=message.correlation_id
                ).dict()
            
            return DictionaryResponse(
                success=True,
                operation=operation,
                word=message.word,
                result=result,
                correlation_id=message.correlation_id,
                metadata={"language": message.language}
            ).dict()
            
        except Exception as e:
            return DictionaryResponse(
                success=False,
                error_message=f"Dictionary operation failed: {str(e)}",
                operation=message.operation,
                word=message.word,
                correlation_id=message.correlation_id
            ).dict()


# ===== HEALTH CHECK HANDLER =====

class HealthCheckRequest(BaseEventRequest):
    """Request model for health checks."""
    
    message_key: str = Field(default="health_request", description="Message identifier")
    component: Optional[str] = Field(default=None, description="Specific component to check")
    detailed: bool = Field(default=False, description="Include detailed status information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "health_request",
                "component": "spellcheckers", 
                "detailed": True,
                "correlation_id": "health-123"
            }
        }


class HealthCheckResponse(BaseEventResponse):
    """Response model for health checks."""
    
    message_key: str = Field(default="health_response", description="Response identifier")
    status: str = Field(..., description="Overall status: 'healthy', 'degraded', 'unhealthy'")
    components: Dict[str, Any] = Field(default_factory=dict, description="Status of individual components")
    uptime: Optional[float] = Field(default=None, description="System uptime in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message_key": "health_response",
                "success": True,
                "status": "healthy",
                "components": {
                    "spellcheckers": {"available": 2, "total": 4},
                    "prediction_engines": {"available": 3, "total": 3}
                },
                "correlation_id": "health-123"
            }
        }


class HealthCheckEventHandler(BaseEventHandler[HealthCheckRequest]):
    """Handler for system health checks."""
    
    message_schema = HealthCheckRequest
    message_key = "health_request"
    
    async def _process_message(self, message: HealthCheckRequest, websocket: WebSocket) -> Dict[str, Any]:
        """Process health check request."""
        try:
            components = {}
            overall_status = "healthy"
            
            if not message.component or message.component == "spellcheckers":
                # Check spellchecker status
                spell_status = spell_checker_factory.get_status()
                available_count = sum(1 for status in spell_status.values() if status["available"])
                total_count = len(spell_status)
                
                components["spellcheckers"] = {
                    "available": available_count,
                    "total": total_count,
                    "status": "healthy" if available_count > 0 else "unhealthy"
                }
                
                if message.detailed:
                    components["spellcheckers"]["details"] = spell_status
                
                if available_count == 0:
                    overall_status = "unhealthy"
                elif available_count < total_count:
                    overall_status = "degraded"
            
            if not message.component or message.component == "prediction_engines":
                # Check prediction engines
                engine_count = len(PREDICTION_ENGINES)
                components["prediction_engines"] = {
                    "available": engine_count,
                    "total": engine_count,
                    "status": "healthy" if engine_count > 0 else "unhealthy"
                }
                
                if message.detailed:
                    components["prediction_engines"]["engines"] = list(PREDICTION_ENGINES.keys())
            
            return HealthCheckResponse(
                success=True,
                status=overall_status,
                components=components,
                correlation_id=message.correlation_id,
                metadata={
                    "check_time": "now",
                    "requested_component": message.component
                }
            ).dict()
            
        except Exception as e:
            return HealthCheckResponse(
                success=False,
                status="unhealthy",
                error_message=f"Health check failed: {str(e)}",
                correlation_id=message.correlation_id
            ).dict()


# Create singleton instances for registration
prediction_handler = PredictionEventHandler()
dictionary_handler = DictionaryEventHandler() 
health_check_handler = HealthCheckEventHandler()