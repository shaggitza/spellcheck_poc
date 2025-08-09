"""
WebSocket API router - Handles WebSocket connections and EDA message routing.

This module provides WebSocket endpoints with EDA integration and 
backward compatibility with legacy message formats.
"""

import json
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

from ..handlers import event_router
from ..handlers.spellcheck_handler import spellcheck_handler
from ..handlers.additional_handlers import prediction_handler, dictionary_handler, health_check_handler
from ..engines.spell_check_engines import SpellCheckEngineFactory

router = APIRouter()

# Initialize spell check engine factory (legacy compatibility)
spell_engine_factory = SpellCheckEngineFactory()


class WebSocketConnectionManager:
    """Manager for WebSocket connections with EDA integration."""
    
    def __init__(self):
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}
        
    def connect(self, websocket: WebSocket, client_info: Dict[str, Any] = None):
        """Register a new WebSocket connection."""
        self.active_connections[websocket] = client_info or {}
        # Register with EDA event router
        event_router.connect(websocket)
        
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection."""
        self.active_connections.pop(websocket, None)
        # Unregister from EDA event router
        event_router.disconnect(websocket)
        
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to a specific WebSocket."""
        if websocket.client_state == WebSocketState.CONNECTED:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"⚠️  Failed to send message to WebSocket: {e}")
                self.disconnect(websocket)
        
    async def broadcast(self, message: Dict[str, Any], exclude: WebSocket = None):
        """Broadcast message to all connected WebSockets."""
        disconnected = []
        
        for websocket in self.active_connections:
            if websocket != exclude:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"⚠️  Failed to broadcast to WebSocket: {e}")
                    disconnected.append(websocket)
        
        # Clean up disconnected WebSockets
        for ws in disconnected:
            self.disconnect(ws)

# Global connection manager
manager = WebSocketConnectionManager()

# Register EDA event handlers
event_router.register_handler(spellcheck_handler)
event_router.register_handler(prediction_handler)
event_router.register_handler(dictionary_handler)
event_router.register_handler(health_check_handler)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint supporting both EDA and legacy message formats.
    
    EDA Format:
    {
        "message_key": "spellcheck_request",
        "lines": ["text to check"],
        "language": "en",
        "correlation_id": "optional-id"
    }
    
    Legacy Format:
    {
        "type": "spell_check_request", 
        "lines": ["text to check"],
        "language": "en"
    }
    """
    await websocket.accept()
    manager.connect(websocket, {"connected_at": "now", "format": "auto"})
    
    # Send connection confirmation
    await manager.send_personal_message({
        "type": "connection_status",
        "status": "connected",
        "message": "Connection restored",
        "eda_enabled": True,
        "available_handlers": list(event_router.get_registered_handlers().keys())
    }, websocket)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message_dict = json.loads(data)
            
            # Handle EDA subscription management
            if message_dict.get("type") == "subscribe":
                topics = message_dict.get("topics", [])
                event_router.subscribe(websocket, topics)
                await manager.send_personal_message({
                    "type": "subscription_confirmed",
                    "topics": topics,
                    "status": "subscribed"
                }, websocket)
                continue
                
            elif message_dict.get("type") == "unsubscribe":
                topics = message_dict.get("topics", [])
                event_router.unsubscribe(websocket, topics)
                await manager.send_personal_message({
                    "type": "subscription_confirmed",
                    "topics": topics,
                    "status": "unsubscribed"
                }, websocket)
                continue
            
            # Route message based on format
            response = None
            
            # Check if it's an EDA format message
            if "message_key" in message_dict:
                # Route through EDA system
                response = await event_router.route_message(message_dict, websocket)
                
            # Legacy format handling
            elif message_dict.get("type") == "spell_check_request":
                response = await handle_legacy_spell_check(message_dict, websocket)
                
            elif message_dict.get("type") == "prediction_request":
                response = await handle_legacy_prediction(message_dict, websocket)
                
            else:
                # Unknown message format
                response = {
                    "type": "error",
                    "error": "Unknown message format",
                    "message": "Use EDA format with 'message_key' or legacy format with 'type'",
                    "supported_formats": ["eda", "legacy"],
                    "eda_example": {"message_key": "spellcheck_request", "lines": ["text"]},
                    "legacy_example": {"type": "spell_check_request", "lines": ["text"]}
                }
            
            # Send response if generated
            if response:
                await manager.send_personal_message(response, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"⚠️  WebSocket error: {e}")
        try:
            await manager.send_personal_message({
                "type": "error", 
                "error": str(e),
                "message": "WebSocket processing error"
            }, websocket)
        except:
            pass
        manager.disconnect(websocket)


async def handle_legacy_spell_check(message: Dict[str, Any], websocket: WebSocket) -> Dict[str, Any]:
    """Handle legacy spell check request format."""
    try:
        lines = message.get("lines", [])
        language = message.get("language", "en")
        
        # Convert to EDA format and route
        eda_message = {
            "message_key": "spellcheck_request",
            "lines": lines,
            "language": language,
            "correlation_id": f"legacy_{id(message)}"
        }
        
        eda_response = await event_router.route_message(eda_message, websocket)
        
        # Convert back to legacy format
        if eda_response and eda_response.get("success"):
            return {
                "type": "spell_check_response",
                "success": True,
                "errors": eda_response.get("errors", {}),
                "language": eda_response.get("language_used", language),
                "engine": eda_response.get("engine_used", "unknown")
            }
        else:
            return {
                "type": "spell_check_response",
                "success": False,
                "error": eda_response.get("error_message", "Spell check failed") if eda_response else "No response"
            }
            
    except Exception as e:
        return {
            "type": "spell_check_response",
            "success": False,
            "error": f"Legacy spell check error: {str(e)}"
        }


async def handle_legacy_prediction(message: Dict[str, Any], websocket: WebSocket) -> Dict[str, Any]:
    """Handle legacy prediction request format."""
    try:
        text = message.get("text", "")
        max_predictions = message.get("max_predictions", 5)
        
        # Convert to EDA format and route
        eda_message = {
            "message_key": "prediction_request",
            "text": text,
            "max_predictions": max_predictions,
            "correlation_id": f"legacy_{id(message)}"
        }
        
        eda_response = await event_router.route_message(eda_message, websocket)
        
        # Convert back to legacy format
        if eda_response and eda_response.get("success"):
            return {
                "type": "prediction_response",
                "success": True,
                "predictions": eda_response.get("predictions", []),
                "engine": eda_response.get("engine_used", "unknown")
            }
        else:
            return {
                "type": "prediction_response",
                "success": False,
                "error": eda_response.get("error_message", "Prediction failed") if eda_response else "No response"
            }
            
    except Exception as e:
        return {
            "type": "prediction_response",
            "success": False,
            "error": f"Legacy prediction error: {str(e)}"
        }