#!/usr/bin/env python3
"""Simple validation script to test backend structure."""

import sys
import os

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    # Test imports without running the app
    print("🔍 Testing backend structure...")
    
    from backend.engines import spell_check_engines
    print("✅ Spell check engines module imported")
    
    from backend.engines import prediction_engines
    print("✅ Prediction engines module imported")
    
    # Test factory import
    factory = spell_check_engines.SpellCheckEngineFactory()
    print("✅ SpellCheckEngineFactory created")
    
    print("🎉 Backend structure validation successful!")
    
except Exception as e:
    print(f"❌ Backend validation failed: {e}")
    sys.exit(1)