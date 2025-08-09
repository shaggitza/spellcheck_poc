#!/usr/bin/env python3
"""
Test script for EDA architecture implementation.
Tests the event handlers and message routing functionality.
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

# Import our EDA components
from event_handlers import WebSocketEventRouter, BaseEventResponse
from spellcheck_handler import SpellcheckEventHandler, SpellcheckPydanticRequest, SpellcheckResponse


async def test_spellcheck_handler():
    """Test the SpellcheckEventHandler functionality"""
    print("🧪 Testing SpellcheckEventHandler...")
    
    # Mock spell check function
    async def mock_spell_check_line(line_text, language="en"):
        # Simulate finding a spelling error
        if "spellling" in line_text:
            return [{
                "word": "spellling",
                "start_pos": line_text.find("spellling"),
                "end_pos": line_text.find("spellling") + len("spellling"),
                "suggestions": ["spelling", "spilling", "smelling"]
            }]
        return []
    
    # Create handler
    handler = SpellcheckEventHandler(spell_check_function=mock_spell_check_line)
    
    # Test valid message
    test_message = {
        "message_key": "spellcheck_request",
        "lines": ["Hello world", "This has a spellling error"],
        "language": "en",
        "correlation_id": "test-123"
    }
    
    # Mock WebSocket
    mock_websocket = MagicMock()
    
    # Process message
    response = await handler.handle_event(test_message, mock_websocket)
    
    # Validate response
    assert response is not None
    assert response.success is True
    assert response.message_key == "spellcheck_response"
    assert response.lines_checked == 2
    assert 1 in response.errors  # Second line has error
    assert response.correlation_id == "test-123"
    
    print("✅ SpellcheckEventHandler test passed")
    return True


async def test_event_router():
    """Test the WebSocketEventRouter functionality"""
    print("🧪 Testing WebSocketEventRouter...")
    
    # Create router
    router = WebSocketEventRouter()
    
    # Mock spell check function
    async def mock_spell_check_line(line_text, language="en"):
        return []
    
    # Create and register handler
    handler = SpellcheckEventHandler(spell_check_function=mock_spell_check_line)
    router.register_handler(handler)
    
    # Mock WebSocket
    mock_websocket = MagicMock()
    
    # Test message routing
    test_message = {
        "message_key": "spellcheck_request",
        "lines": ["Test line"],
        "language": "en",
        "correlation_id": "router-test-123"
    }
    
    # Route message
    response = await router.route_message(test_message, mock_websocket)
    
    # Validate response
    assert response is not None
    assert response.success is True
    assert response.message_key == "spellcheck_response"
    assert response.correlation_id == "router-test-123"
    
    print("✅ WebSocketEventRouter test passed")
    return True


async def test_invalid_message():
    """Test handling of invalid messages"""
    print("🧪 Testing invalid message handling...")
    
    # Create handler
    handler = SpellcheckEventHandler()
    
    # Mock WebSocket
    mock_websocket = MagicMock()
    
    # Test invalid message (missing required field)
    invalid_message = {
        "message_key": "spellcheck_request",
        "language": "en"
        # Missing required 'lines' field
    }
    
    # Process invalid message
    response = await handler.handle_event(invalid_message, mock_websocket)
    
    # Validate error response
    assert response is not None
    assert response.success is False
    assert "Validation error" in response.error
    assert response.message_key == "spellcheck_response"
    
    print("✅ Invalid message handling test passed")
    return True


async def test_router_subscription():
    """Test WebSocket subscription functionality"""
    print("🧪 Testing subscription functionality...")
    
    # Create router
    router = WebSocketEventRouter()
    
    # Mock WebSocket
    mock_websocket = MagicMock()
    
    # Test subscription
    await router.subscribe(mock_websocket, ["spellcheck_request", "prediction_request"])
    
    # Verify subscription
    assert mock_websocket in router.subscriptions
    assert "spellcheck_request" in router.subscriptions[mock_websocket]
    assert "prediction_request" in router.subscriptions[mock_websocket]
    
    # Test unsubscribe
    await router.unsubscribe(mock_websocket, ["prediction_request"])
    assert "spellcheck_request" in router.subscriptions[mock_websocket]
    assert "prediction_request" not in router.subscriptions[mock_websocket]
    
    # Test disconnect cleanup
    router.disconnect(mock_websocket)
    assert mock_websocket not in router.subscriptions
    
    print("✅ Subscription functionality test passed")
    return True


async def main():
    """Run all tests"""
    print("🚀 Running EDA architecture tests...\n")
    
    try:
        # Run all tests
        test_results = await asyncio.gather(
            test_spellcheck_handler(),
            test_event_router(),
            test_invalid_message(),
            test_router_subscription()
        )
        
        if all(test_results):
            print("\n🎉 All EDA architecture tests passed!")
            return True
        else:
            print("\n❌ Some tests failed!")
            return False
            
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)