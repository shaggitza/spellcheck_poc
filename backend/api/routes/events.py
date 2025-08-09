"""
EDA Events API router - Provides REST endpoints for EDA framework management.

This module exposes EDA framework functionality via REST APIs for
debugging, monitoring, and management purposes.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...handlers import event_router
from ...handlers.spellcheck_handler import spellcheck_handler
from ...handlers.additional_handlers import prediction_handler, dictionary_handler, health_check_handler

router = APIRouter()


class EventHandlerInfo(BaseModel):
    """Information about an event handler."""
    
    message_key: str = Field(..., description="Message key handled by this handler")
    handler_class: str = Field(..., description="Class name of the handler")
    message_schema: str = Field(..., description="Pydantic schema name for message validation")
    description: Optional[str] = Field(None, description="Description of what this handler does")


class SubscriptionInfo(BaseModel):
    """Information about WebSocket subscriptions."""
    
    total_connections: int = Field(..., description="Total number of active WebSocket connections")
    total_subscriptions: int = Field(..., description="Total number of topic subscriptions")
    topic_subscribers: Dict[str, int] = Field(..., description="Number of subscribers per topic")
    available_topics: List[str] = Field(..., description="List of available topics")


class EventMessage(BaseModel):
    """Model for testing event messages."""
    
    message_key: str = Field(..., description="Message key to test")
    message_data: Dict[str, Any] = Field(..., description="Message data to validate")


class ValidationResult(BaseModel):
    """Result of message validation."""
    
    valid: bool = Field(..., description="Whether the message is valid")
    errors: Optional[List[str]] = Field(None, description="Validation errors if invalid")
    validated_data: Optional[Dict[str, Any]] = Field(None, description="Validated message data if valid")


@router.get("/api/event-handlers", response_model=Dict[str, EventHandlerInfo])
async def get_event_handlers():
    """
    Get information about all registered event handlers.
    
    Returns:
        Dictionary mapping message keys to handler information
    """
    try:
        handlers_info = {}
        registered = event_router.get_registered_handlers()
        
        # Add descriptions for known handlers
        descriptions = {
            "spellcheck_request": "Handles spell checking requests with multiple engine support",
            "prediction_request": "Provides text prediction using various AI engines", 
            "dictionary_request": "Manages user dictionary operations (add/remove/check words)",
            "health_request": "Performs system health checks and component status"
        }
        
        for message_key, info in registered.items():
            handlers_info[message_key] = EventHandlerInfo(
                message_key=message_key,
                handler_class=info["handler_class"],
                message_schema=info["message_schema"] or "Unknown",
                description=descriptions.get(message_key, "Custom event handler")
            )
        
        return handlers_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get event handlers: {str(e)}")


@router.get("/api/websocket-subscriptions", response_model=SubscriptionInfo)
async def get_websocket_subscriptions():
    """
    Get information about active WebSocket subscriptions.
    
    Returns:
        Subscription statistics and topic information
    """
    try:
        sub_info = event_router.get_subscription_info()
        
        return SubscriptionInfo(
            total_connections=sub_info["total_connections"],
            total_subscriptions=sub_info["total_subscriptions"], 
            topic_subscribers=sub_info["topic_subscribers"],
            available_topics=sub_info["available_topics"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription info: {str(e)}")


@router.post("/api/validate-event-message", response_model=ValidationResult)
async def validate_event_message(event_message: EventMessage):
    """
    Validate an event message against its schema without processing.
    
    Args:
        event_message: Event message to validate
        
    Returns:
        Validation result with errors or validated data
    """
    try:
        message_key = event_message.message_key
        message_data = event_message.message_data
        
        # Get the handler for this message type
        handlers = event_router.get_registered_handlers()
        if message_key not in handlers:
            return ValidationResult(
                valid=False,
                errors=[f"No handler registered for message_key: {message_key}"],
                validated_data=None
            )
        
        # Get the actual handler instance
        handler = event_router._handlers.get(message_key)
        if not handler:
            return ValidationResult(
                valid=False,
                errors=[f"Handler not found for message_key: {message_key}"],
                validated_data=None
            )
        
        # Validate using the handler's schema
        try:
            validated = handler.message_schema(**message_data)
            return ValidationResult(
                valid=True,
                errors=None,
                validated_data=validated.dict()
            )
        except Exception as validation_error:
            return ValidationResult(
                valid=False,
                errors=[str(validation_error)],
                validated_data=None
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/api/event-schemas/{message_key}")
async def get_event_schema(message_key: str):
    """
    Get the Pydantic schema for a specific event message type.
    
    Args:
        message_key: Message key to get schema for
        
    Returns:
        JSON schema for the message type
    """
    try:
        # Get the handler
        handler = event_router._handlers.get(message_key)
        if not handler:
            raise HTTPException(
                status_code=404, 
                detail=f"No handler registered for message_key: {message_key}"
            )
        
        # Get the schema
        schema = handler.message_schema.schema()
        
        return {
            "message_key": message_key,
            "schema": schema,
            "handler_class": handler.__class__.__name__
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema: {str(e)}")


@router.get("/api/event-examples")
async def get_event_examples():
    """
    Get example messages for all registered event types.
    
    Returns:
        Dictionary with example messages for each event type
    """
    try:
        examples = {}
        
        # Add predefined examples for known handlers
        examples["spellcheck_request"] = {
            "message_key": "spellcheck_request",
            "lines": ["Hello world", "This sentance has errors"],
            "language": "en",
            "engine": "pyspellchecker",
            "correlation_id": "example-spell-123"
        }
        
        examples["prediction_request"] = {
            "message_key": "prediction_request",
            "text": "The weather today is very",
            "max_predictions": 5,
            "engine": "frequency_based",
            "correlation_id": "example-pred-123"
        }
        
        examples["dictionary_request"] = {
            "message_key": "dictionary_request",
            "operation": "add",
            "word": "customword",
            "language": "en",
            "correlation_id": "example-dict-123"
        }
        
        examples["health_request"] = {
            "message_key": "health_request",
            "component": "spellcheckers",
            "detailed": True,
            "correlation_id": "example-health-123"
        }
        
        # Add subscription management examples
        examples["subscribe"] = {
            "type": "subscribe",
            "topics": ["spellcheck_request", "prediction_request"]
        }
        
        examples["unsubscribe"] = {
            "type": "unsubscribe", 
            "topics": ["spellcheck_request"]
        }
        
        return {
            "examples": examples,
            "usage_notes": {
                "websocket": "Send these messages to /ws endpoint",
                "correlation_id": "Optional field for tracking requests",
                "subscription": "Use 'type' field for subscription management",
                "eda_messages": "Use 'message_key' field for EDA event routing"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get examples: {str(e)}")


@router.post("/api/register-handler")
async def register_custom_handler(handler_info: Dict[str, Any]):
    """
    Register a custom event handler (placeholder for future extensibility).
    
    Args:
        handler_info: Information about the custom handler
        
    Returns:
        Registration result
    """
    # This is a placeholder for future extensibility
    # In a full implementation, this would allow dynamic handler registration
    
    return {
        "success": False,
        "message": "Custom handler registration not implemented",
        "note": "Use the WebSocket API to interact with existing handlers"
    }


@router.delete("/api/event-handlers/{message_key}")
async def unregister_handler(message_key: str):
    """
    Unregister an event handler.
    
    Args:
        message_key: Message key of handler to unregister
        
    Returns:
        Unregistration result
    """
    try:
        # Prevent unregistering core handlers
        core_handlers = ["spellcheck_request", "prediction_request", "dictionary_request", "health_request"]
        if message_key in core_handlers:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot unregister core handler: {message_key}"
            )
        
        success = event_router.unregister_handler(message_key)
        
        if success:
            return {
                "success": True,
                "message": f"Handler unregistered successfully: {message_key}"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Handler not found: {message_key}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unregister handler: {str(e)}")