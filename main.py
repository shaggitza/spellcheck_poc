#!/usr/bin/env python3
"""
Entry point for the Text Editor with AI Writing Assistance application.

This script starts the FastAPI application from the backend directory.
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
import uvicorn

# Import the app from backend
from backend.api.main import app

if __name__ == "__main__":
    print("🚀 Starting Text Editor with AI Writing Assistance...")
    uvicorn.run(app, host="0.0.0.0", port=8000)