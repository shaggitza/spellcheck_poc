"""
Event-Driven Architecture (EDA) framework for WebSocket message handling.
Provides base classes and routing functionality for topic-based event processing.
"""

import asyncio
import json
from abc import ABC, abstractmethod
from typing import Dict, List, Type, TypeVar, Generic, Any, Optional
from fastapi import WebSocket
from pydantic import BaseModel, ValidationError


class BaseEventRequest(BaseModel):
    """Base class for all event request models"""
    message_key: str
    correlation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseEventResponse(BaseModel):
    """Base class for all event response models"""
    message_key: str
    correlation_id: Optional[str] = None
    success: bool = True
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


T = TypeVar('T', bound=BaseEventRequest)


class BaseEventHandler(ABC, Generic[T]):
    """Base class for all event handlers with Pydantic validation"""
    
    message_schema: Type[T]
    message_key: str
    
    def __init__(self):
        if not hasattr(self, 'message_schema') or not hasattr(self, 'message_key'):
            raise NotImplementedError(
                "Event handlers must define 'message_schema' and 'message_key' class attributes"
            )
    
    async def handle_event(
        self, 
        raw_message: Dict[str, Any], 
        websocket: WebSocket
    ) -> Optional[BaseEventResponse]:
        """
        Handle incoming event with validation and processing
        
        Args:
            raw_message: Raw message dictionary from WebSocket
            websocket: WebSocket connection for sending responses
            
        Returns:
            Optional response message to send back to client
        """
        try:
            # Validate incoming message against schema
            validated_message = self.message_schema(**raw_message)
            
            # Process the validated message
            response = await self._process_message(validated_message, websocket)
            
            return response
            
        except ValidationError as e:
            # Return validation error response
            return BaseEventResponse(
                message_key=self.message_key + "_response",
                success=False,
                error=f"Validation error: {str(e)}",
                correlation_id=raw_message.get('correlation_id')
            )
        except Exception as e:
            # Return processing error response
            return BaseEventResponse(
                message_key=self.message_key + "_response",
                success=False,
                error=f"Processing error: {str(e)}",
                correlation_id=raw_message.get('correlation_id')
            )
    
    @abstractmethod
    async def _process_message(
        self, 
        message: T, 
        websocket: WebSocket
    ) -> Optional[BaseEventResponse]:
        """
        Process the validated message - must be implemented by subclasses
        
        Args:
            message: Validated Pydantic message model
            websocket: WebSocket connection for sending responses
            
        Returns:
            Optional response message to send back to client
        """
        pass


class WebSocketEventRouter:
    """Router for dispatching WebSocket events to appropriate handlers"""
    
    def __init__(self):
        self.handlers: Dict[str, BaseEventHandler] = {}
        self.subscriptions: Dict[WebSocket, List[str]] = {}
    
    def register_handler(self, handler: BaseEventHandler) -> None:
        """Register an event handler for a specific message key"""
        self.handlers[handler.message_key] = handler
        print(f"✅ Registered event handler for '{handler.message_key}'")
    
    async def subscribe(self, websocket: WebSocket, topics: List[str]) -> None:
        """Subscribe a WebSocket connection to specific topics"""
        if websocket not in self.subscriptions:
            self.subscriptions[websocket] = []
        
        for topic in topics:
            if topic not in self.subscriptions[websocket]:
                self.subscriptions[websocket].append(topic)
        
        print(f"✅ WebSocket subscribed to topics: {topics}")
    
    async def unsubscribe(self, websocket: WebSocket, topics: List[str] = None) -> None:
        """Unsubscribe a WebSocket from specific topics or all topics"""
        if websocket not in self.subscriptions:
            return
        
        if topics is None:
            # Unsubscribe from all topics
            del self.subscriptions[websocket]
        else:
            # Unsubscribe from specific topics
            for topic in topics:
                if topic in self.subscriptions[websocket]:
                    self.subscriptions[websocket].remove(topic)
            
            # Remove websocket if no subscriptions left
            if not self.subscriptions[websocket]:
                del self.subscriptions[websocket]
    
    def disconnect(self, websocket: WebSocket) -> None:
        """Clean up subscriptions when WebSocket disconnects"""
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
    
    async def route_message(
        self, 
        raw_message: Dict[str, Any], 
        websocket: WebSocket
    ) -> Optional[BaseEventResponse]:
        """
        Route incoming message to appropriate handler
        
        Args:
            raw_message: Raw message dictionary from WebSocket
            websocket: WebSocket connection
            
        Returns:
            Optional response message to send back to client
        """
        message_key = raw_message.get('message_key')
        
        if not message_key:
            return BaseEventResponse(
                message_key="error",
                success=False,
                error="Missing 'message_key' in message",
                correlation_id=raw_message.get('correlation_id')
            )
        
        # Check if handler exists for this message key
        if message_key not in self.handlers:
            return BaseEventResponse(
                message_key="error",
                success=False,
                error=f"No handler registered for message_key: '{message_key}'",
                correlation_id=raw_message.get('correlation_id')
            )
        
        # Check if WebSocket is subscribed to this topic
        if websocket in self.subscriptions:
            if message_key not in self.subscriptions[websocket]:
                return BaseEventResponse(
                    message_key="error", 
                    success=False,
                    error=f"WebSocket not subscribed to topic: '{message_key}'",
                    correlation_id=raw_message.get('correlation_id')
                )
        else:
            # Auto-subscribe to the topic if not already subscribed
            await self.subscribe(websocket, [message_key])
        
        # Route to handler
        handler = self.handlers[message_key]
        return await handler.handle_event(raw_message, websocket)
    
    async def broadcast_to_topic(
        self, 
        topic: str, 
        message: BaseEventResponse,
        exclude_websocket: WebSocket = None
    ) -> None:
        """
        Broadcast message to all WebSockets subscribed to a topic
        
        Args:
            topic: Topic to broadcast to
            message: Message to broadcast
            exclude_websocket: WebSocket to exclude from broadcast
        """
        message_json = json.dumps(message.model_dump())
        
        disconnected_websockets = []
        
        for websocket, topics in self.subscriptions.items():
            if topic in topics and websocket != exclude_websocket:
                try:
                    await websocket.send_text(message_json)
                except Exception:
                    # Mark for cleanup
                    disconnected_websockets.append(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected_websockets:
            self.disconnect(websocket)


# Global event router instance
event_router = WebSocketEventRouter()