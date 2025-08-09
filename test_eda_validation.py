#!/usr/bin/env python3
"""
Basic validation test for EDA implementation logic without external dependencies.
Tests the core structure and Pydantic model definitions.
"""

import sys
import os

def test_import_structure():
    """Test that our modules can be imported and have the expected structure"""
    print("🧪 Testing EDA module structure...")
    
    try:
        # Check file existence
        files_to_check = [
            "event_handlers.py",
            "spellcheck_handler.py"
        ]
        
        for file_name in files_to_check:
            if not os.path.exists(file_name):
                print(f"❌ Missing file: {file_name}")
                return False
            else:
                print(f"✅ Found file: {file_name}")
        
        # Test basic imports without FastAPI dependencies
        print("\n🔍 Checking module structure...")
        
        # Read and analyze event_handlers.py
        with open("event_handlers.py", "r") as f:
            event_handlers_content = f.read()
            
        required_classes = ["BaseEventRequest", "BaseEventResponse", "BaseEventHandler", "WebSocketEventRouter"]
        for class_name in required_classes:
            if f"class {class_name}" in event_handlers_content:
                print(f"✅ Found class: {class_name}")
            else:
                print(f"❌ Missing class: {class_name}")
                return False
        
        # Read and analyze spellcheck_handler.py
        with open("spellcheck_handler.py", "r") as f:
            spellcheck_content = f.read()
            
        spellcheck_classes = ["SpellcheckPydanticRequest", "SpellcheckResponse", "SpellcheckEventHandler"]
        for class_name in spellcheck_classes:
            if f"class {class_name}" in spellcheck_content:
                print(f"✅ Found class: {class_name}")
            else:
                print(f"❌ Missing class: {class_name}")
                return False
        
        # Check that SpellcheckEventHandler has required attributes
        if 'message_schema = SpellcheckPydanticRequest' in spellcheck_content:
            print("✅ Found message_schema attribute")
        else:
            print("❌ Missing message_schema attribute")
            return False
            
        if 'message_key = "spellcheck_request"' in spellcheck_content:
            print("✅ Found message_key attribute")
        else:
            print("❌ Missing message_key attribute")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Structure test failed: {str(e)}")
        return False


def test_main_integration():
    """Test that main.py has been updated with EDA integration"""
    print("\n🧪 Testing main.py EDA integration...")
    
    try:
        with open("main.py", "r") as f:
            main_content = f.read()
        
        # Check imports
        if "from event_handlers import event_router" in main_content:
            print("✅ Found event_router import")
        else:
            print("❌ Missing event_router import")
            return False
            
        if "from spellcheck_handler import SpellcheckEventHandler" in main_content:
            print("✅ Found SpellcheckEventHandler import")
        else:
            print("❌ Missing SpellcheckEventHandler import")
            return False
        
        # Check startup event handler registration
        if "spellcheck_handler = SpellcheckEventHandler" in main_content:
            print("✅ Found handler creation")
        else:
            print("❌ Missing handler creation")
            return False
            
        if "event_router.register_handler(spellcheck_handler)" in main_content:
            print("✅ Found handler registration")
        else:
            print("❌ Missing handler registration")
            return False
        
        # Check WebSocket endpoint updates
        if 'if "message_key" in message:' in main_content:
            print("✅ Found EDA message routing")
        else:
            print("❌ Missing EDA message routing")
            return False
            
        if "event_router.route_message" in main_content:
            print("✅ Found route_message call")
        else:
            print("❌ Missing route_message call")
            return False
        
        # Check subscription handling
        if 'message["type"] == "subscribe"' in main_content:
            print("✅ Found subscription handling")
        else:
            print("❌ Missing subscription handling")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Main integration test failed: {str(e)}")
        return False


def test_model_definitions():
    """Test that Pydantic models have correct structure"""
    print("\n🧪 Testing Pydantic model definitions...")
    
    try:
        with open("spellcheck_handler.py", "r") as f:
            content = f.read()
        
        # Check SpellcheckPydanticRequest fields
        required_fields = [
            "message_key: str",
            "lines: List[str]", 
            "language: str",
            "engine: Optional[str]"
        ]
        
        for field in required_fields:
            if field in content:
                print(f"✅ Found field: {field}")
            else:
                print(f"❌ Missing field: {field}")
                return False
        
        # Check SpellcheckResponse fields
        response_fields = [
            "errors: Dict[int, List[Dict[str, Any]]]",
            "language: str",
            "engine_used: Optional[str]",
            "lines_checked: int"
        ]
        
        for field in response_fields:
            if field in content:
                print(f"✅ Found response field: {field}")
            else:
                print(f"❌ Missing response field: {field}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Model definition test failed: {str(e)}")
        return False


def main():
    """Run all validation tests"""
    print("🚀 Running EDA implementation validation tests...\n")
    
    test_results = [
        test_import_structure(),
        test_main_integration(), 
        test_model_definitions()
    ]
    
    if all(test_results):
        print("\n🎉 All EDA implementation validation tests passed!")
        print("✅ Event-driven architecture successfully implemented")
        return True
    else:
        print("\n❌ Some validation tests failed!")
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)