#!/usr/bin/env python3
"""
Example usage of the EDA (Event-Driven Architecture) WebSocket API.
Shows how to send spellcheck requests using the new message format.
"""

import json
import asyncio
import websockets


class EDASpellcheckClient:
    """Example client for EDA spellcheck functionality"""
    
    def __init__(self, websocket_url="ws://localhost:8000/ws"):
        self.websocket_url = websocket_url
        self.websocket = None
    
    async def connect(self):
        """Connect to the WebSocket server"""
        self.websocket = await websockets.connect(self.websocket_url)
        print(f"✅ Connected to {self.websocket_url}")
    
    async def disconnect(self):
        """Disconnect from the WebSocket server"""
        if self.websocket:
            await self.websocket.close()
            print("✅ Disconnected from server")
    
    async def subscribe_to_topics(self, topics):
        """Subscribe to specific EDA topics"""
        message = {
            "type": "subscribe",
            "topics": topics
        }
        await self.websocket.send(json.dumps(message))
        
        # Wait for subscription confirmation
        response = await self.websocket.recv()
        result = json.loads(response)
        print(f"✅ Subscribed to topics: {result.get('subscribed_topics', [])}")
        return result
    
    async def send_spellcheck_request(self, lines, language="en", correlation_id=None):
        """Send spellcheck request using EDA message format"""
        
        message = {
            "message_key": "spellcheck_request",
            "lines": lines,
            "language": language,
            "correlation_id": correlation_id or f"spell-{id(lines)}"
        }
        
        print(f"📤 Sending spellcheck request for {len(lines)} lines...")
        await self.websocket.send(json.dumps(message))
        
        # Wait for response
        response = await self.websocket.recv()
        result = json.loads(response)
        
        print(f"📥 Received response: {result.get('message_key', 'unknown')}")
        return result
    
    async def send_legacy_spellcheck_request(self, lines, language="en"):
        """Send spellcheck request using legacy message format"""
        
        message = {
            "type": "spell_check_request",
            "lines": lines,
            "language": language
        }
        
        print(f"📤 Sending legacy spellcheck request for {len(lines)} lines...")
        await self.websocket.send(json.dumps(message))
        
        # Wait for response
        response = await self.websocket.recv()
        result = json.loads(response)
        
        print(f"📥 Received legacy response: {result.get('type', 'unknown')}")
        return result


async def demonstrate_eda_spellcheck():
    """Demonstrate EDA spellcheck functionality"""
    
    print("🚀 EDA Spellcheck API Demo")
    print("=" * 50)
    
    client = EDASpellcheckClient()
    
    try:
        # Connect to server
        await client.connect()
        
        # Subscribe to spellcheck events
        await client.subscribe_to_topics(["spellcheck_request"])
        
        # Example 1: Text with spelling errors
        print("\n📝 Example 1: Text with spelling errors")
        test_lines_with_errors = [
            "Hello world",
            "This sentance has some spellling errors",
            "Python is a powerfull programming language"
        ]
        
        result = await client.send_spellcheck_request(
            test_lines_with_errors,
            correlation_id="demo-errors-123"
        )
        
        if result.get('success'):
            errors = result.get('errors', {})
            print(f"   ✅ Found errors in {len(errors)} lines")
            for line_idx, line_errors in errors.items():
                print(f"   Line {line_idx}: {len(line_errors)} errors")
                for error in line_errors:
                    print(f"     - '{error['word']}' -> suggestions: {error['suggestions'][:3]}")
        else:
            print(f"   ❌ Error: {result.get('error', 'Unknown error')}")
        
        # Example 2: Clean text
        print("\n📝 Example 2: Clean text (no errors expected)")
        clean_lines = [
            "This is correctly spelled text.",
            "Python is a powerful programming language."
        ]
        
        result = await client.send_spellcheck_request(
            clean_lines,
            correlation_id="demo-clean-456"
        )
        
        if result.get('success'):
            errors = result.get('errors', {})
            print(f"   ✅ Text processed: {len(errors)} lines with errors")
        else:
            print(f"   ❌ Error: {result.get('error', 'Unknown error')}")
        
        # Example 3: Demonstrate backward compatibility
        print("\n📝 Example 3: Legacy API compatibility")
        legacy_result = await client.send_legacy_spellcheck_request([
            "This is a tset of the legacy API"
        ])
        
        if legacy_result.get('errors'):
            print(f"   ✅ Legacy API working: found errors")
        
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        
    finally:
        await client.disconnect()


async def demonstrate_invalid_requests():
    """Demonstrate error handling with invalid requests"""
    
    print("\n🚀 EDA Error Handling Demo")
    print("=" * 50)
    
    client = EDASpellcheckClient()
    
    try:
        await client.connect()
        
        # Example 1: Missing required field
        print("\n⚠️  Example 1: Invalid request (missing 'lines' field)")
        invalid_message = {
            "message_key": "spellcheck_request",
            "language": "en",
            # Missing required 'lines' field
        }
        
        await client.websocket.send(json.dumps(invalid_message))
        response = await client.websocket.recv()
        result = json.loads(response)
        
        if not result.get('success'):
            print(f"   ✅ Error handled correctly: {result.get('error', 'Unknown error')}")
        
        # Example 2: Unknown message key
        print("\n⚠️  Example 2: Unknown message key")
        unknown_message = {
            "message_key": "unknown_request_type",
            "data": "some data"
        }
        
        await client.websocket.send(json.dumps(unknown_message))
        response = await client.websocket.recv()
        result = json.loads(response)
        
        if not result.get('success'):
            print(f"   ✅ Unknown handler error: {result.get('error', 'Unknown error')}")
        
    except Exception as e:
        print(f"❌ Error handling demo failed: {str(e)}")
        
    finally:
        await client.disconnect()


# Usage instructions for developers
USAGE_INSTRUCTIONS = """
🔧 EDA Spellcheck API Usage Instructions
=====================================

1. **Connect to WebSocket**: ws://localhost:8000/ws

2. **Subscribe to topics** (optional):
   {
     "type": "subscribe",
     "topics": ["spellcheck_request"]
   }

3. **Send spellcheck request**:
   {
     "message_key": "spellcheck_request",
     "lines": ["Text to check", "Another line"],
     "language": "en",
     "correlation_id": "optional-id-123"
   }

4. **Receive response**:
   {
     "message_key": "spellcheck_response",
     "success": true,
     "errors": {
       "1": [
         {
           "word": "misspelled",
           "start_pos": 10,
           "end_pos": 20,
           "suggestions": ["misspelled", "miscalled"]
         }
       ]
     },
     "language": "en",
     "engine_used": "pyspellchecker",
     "lines_checked": 2,
     "correlation_id": "optional-id-123"
   }

5. **Error responses**:
   {
     "message_key": "spellcheck_response",
     "success": false,
     "error": "Validation error: ...",
     "correlation_id": "optional-id-123"
   }

🔄 **Backward Compatibility**: Legacy "spell_check_request" type still works!
"""


if __name__ == "__main__":
    print(USAGE_INSTRUCTIONS)
    
    print("\n📚 To run the demo, make sure the server is running:")
    print("   python main.py")
    print("\nThen run this script while the server is running:")
    print("   python example_eda_usage.py --demo")
    
    import sys
    if "--demo" in sys.argv:
        print("\n" + "="*60)
        asyncio.run(demonstrate_eda_spellcheck())
        asyncio.run(demonstrate_invalid_requests())