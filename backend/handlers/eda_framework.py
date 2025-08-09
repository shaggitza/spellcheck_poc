"""
Event Driven Architecture framework for WebSocket message handling.

This module provides the core EDA framework with base classes, routing,
and message validation using Pydantic models.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Type, TypeVar, Generic, Set
from pydantic import BaseModel, Field
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime
import uuid
import weakref


# Type variable for generic event handler
T = TypeVar('T', bound=BaseModel)


class BaseEventRequest(BaseModel):
    """Base class for all event request messages with common fields."""
    
    message_key: str = Field(..., description="Unique identifier for the message type")
    correlation_id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), 
                                         description="Unique ID for tracking this request")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, 
                                         description="When the request was created")
    client_id: Optional[str] = Field(default=None, description="Optional client identifier")
    
    class Config:
        # Allow extra fields for extensibility
        extra = "allow"


class BaseEventResponse(BaseModel):
    """Base class for all event response messages with common fields."""
    
    message_key: str = Field(..., description="Message type identifier for the response")
    success: bool = Field(default=True, description="Whether the operation succeeded")
    correlation_id: Optional[str] = Field(default=None, description="Correlation ID from original request")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")
    error_message: Optional[str] = Field(default=None, description="Error message if operation failed")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional response metadata")
    
    class Config:
        extra = "allow"


class BaseEventHandler(ABC, Generic[T]):
    """
    Abstract base class for all event handlers in the EDA architecture.
    
    Event handlers process specific types of messages identified by message_key
    and validated by message_schema (Pydantic model).
    """
    
    # These should be overridden in subclasses
    message_schema: Type[T] = None
    message_key: str = None
    
    def __init__(self):
        """Initialize the event handler."""
        if not self.message_schema:
            raise ValueError(f"{self.__class__.__name__} must define message_schema")
        if not self.message_key:
            raise ValueError(f"{self.__class__.__name__} must define message_key")
    
    async def handle_message(self, raw_message: Dict[str, Any], websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """
        Handle an incoming message with validation and processing.
        
        Args:
            raw_message: Raw message dictionary from WebSocket
            websocket: WebSocket connection for responses
            
        Returns:
            Optional response message dictionary
        """
        try:
            # Validate message using Pydantic schema
            validated_message = self.message_schema(**raw_message)
            
            # Process the validated message
            response = await self._process_message(validated_message, websocket)
            
            return response
            
        except Exception as e:
            # Return error response
            error_response = BaseEventResponse(
                message_key=f"{self.message_key}_error",
                success=False,
                error_message=str(e),
                correlation_id=raw_message.get("correlation_id"),
                metadata={"handler": self.__class__.__name__}
            )
            return error_response.dict()
    
    @abstractmethod
    async def _process_message(self, message: T, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """
        Process a validated message. Must be implemented by subclasses.
        
        Args:
            message: Validated Pydantic message model
            websocket: WebSocket connection for responses
            
        Returns:
            Optional response dictionary
        """
        pass
    
    def get_message_key(self) -> str:
        """Get the message key this handler processes."""
        return self.message_key
    
    def get_message_schema(self) -> Type[T]:
        """Get the Pydantic schema for message validation."""
        return self.message_schema


class WebSocketEventRouter:
    """
    Routes WebSocket messages to appropriate event handlers based on message_key.
    
    Supports topic-based subscriptions where clients can subscribe to specific
    message types and receive only relevant messages.
    """
    
    def __init__(self):
        """Initialize the WebSocket event router."""
        self._handlers: Dict[str, BaseEventHandler] = {}
        self._subscriptions: Dict[WebSocket, Set[str]] = {}
        self._websockets: Set[WebSocket] = set()
        
    def register_handler(self, handler: BaseEventHandler):
        """
        Register an event handler for its message type.
        
        Args:
            handler: Event handler instance to register
        """
        message_key = handler.get_message_key()
        if message_key in self._handlers:
            print(f"⚠️  Overwriting existing handler for message_key: {message_key}")
        
        self._handlers[message_key] = handler
        print(f"✅ Registered event handler for message_key: {message_key}")
    
    def unregister_handler(self, message_key: str) -> bool:
        """
        Unregister an event handler.
        
        Args:
            message_key: Message key to unregister
            
        Returns:
            True if handler was found and removed
        """
        if message_key in self._handlers:
            del self._handlers[message_key]
            print(f"✅ Unregistered event handler for message_key: {message_key}")
            return True
        return False
    
    def connect(self, websocket: WebSocket):
        """
        Register a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection to register
        """
        self._websockets.add(websocket)
        self._subscriptions[websocket] = set()
        print(f"✅ WebSocket connected: {id(websocket)}")
    
    def disconnect(self, websocket: WebSocket):
        """
        Unregister a WebSocket connection and clean up subscriptions.
        
        Args:
            websocket: WebSocket connection to unregister
        """
        self._websockets.discard(websocket)
        self._subscriptions.pop(websocket, None)
        print(f"✅ WebSocket disconnected: {id(websocket)}")
    
    def subscribe(self, websocket: WebSocket, topics: List[str]):
        """
        Subscribe a WebSocket to specific message topics.
        
        Args:
            websocket: WebSocket connection
            topics: List of message keys to subscribe to
        """
        if websocket not in self._subscriptions:
            self._subscriptions[websocket] = set()
        
        for topic in topics:
            self._subscriptions[websocket].add(topic)
        
        print(f"✅ WebSocket {id(websocket)} subscribed to topics: {topics}")
    
    def unsubscribe(self, websocket: WebSocket, topics: List[str]):
        """
        Unsubscribe a WebSocket from specific message topics.
        
        Args:
            websocket: WebSocket connection  
            topics: List of message keys to unsubscribe from
        """
        if websocket in self._subscriptions:
            for topic in topics:
                self._subscriptions[websocket].discard(topic)
        
        print(f"✅ WebSocket {id(websocket)} unsubscribed from topics: {topics}")
    
    async def route_message(self, message: Dict[str, Any], websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """
        Route a message to the appropriate handler.
        
        Args:
            message: Message dictionary from WebSocket
            websocket: Source WebSocket connection
            
        Returns:
            Optional response dictionary
        """
        message_key = message.get("message_key")
        
        if not message_key:
            return {
                "message_key": "error",
                "success": False,
                "error_message": "Message must include 'message_key' field",
                "correlation_id": message.get("correlation_id")
            }
        
        handler = self._handlers.get(message_key)
        if not handler:
            return {
                "message_key": "error",
                "success": False,
                "error_message": f"No handler registered for message_key: {message_key}",
                "correlation_id": message.get("correlation_id"),
                "available_handlers": list(self._handlers.keys())
            }
        
        # Route to handler
        try:
            response = await handler.handle_message(message, websocket)
            return response
        except Exception as e:
            return {
                "message_key": "error", 
                "success": False,
                "error_message": f"Handler error: {str(e)}",
                "correlation_id": message.get("correlation_id")
            }
    
    async def broadcast_to_subscribers(self, message: Dict[str, Any], message_key: str):
        """
        Broadcast a message to all WebSockets subscribed to a topic.
        
        Args:
            message: Message to broadcast
            message_key: Topic/message key to broadcast to
        """
        disconnected = []
        
        for websocket, topics in self._subscriptions.items():
            if message_key in topics:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"⚠️  Failed to send to WebSocket {id(websocket)}: {e}")
                    disconnected.append(websocket)
        
        # Clean up disconnected WebSockets
        for ws in disconnected:
            self.disconnect(ws)
    
    def get_registered_handlers(self) -> Dict[str, Dict[str, Any]]:
        """
        Get information about all registered handlers.
        
        Returns:
            Dictionary with handler information
        """
        handlers_info = {}
        
        for message_key, handler in self._handlers.items():
            handlers_info[message_key] = {
                "handler_class": handler.__class__.__name__,
                "message_schema": handler.message_schema.__name__ if handler.message_schema else None,
                "message_key": handler.message_key
            }
        
        return handlers_info
    
    def get_subscription_info(self) -> Dict[str, Any]:
        """
        Get information about WebSocket subscriptions.
        
        Returns:
            Dictionary with subscription statistics
        """
        total_connections = len(self._websockets)
        subscription_count = sum(len(topics) for topics in self._subscriptions.values())
        
        topic_subscribers = {}
        for topics in self._subscriptions.values():
            for topic in topics:
                topic_subscribers[topic] = topic_subscribers.get(topic, 0) + 1
        
        return {
            "total_connections": total_connections,
            "total_subscriptions": subscription_count,
            "topic_subscribers": topic_subscribers,
            "available_topics": list(self._handlers.keys())
        }


# Global event router instance
event_router = WebSocketEventRouter()