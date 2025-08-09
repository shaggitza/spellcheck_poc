#!/bin/bash
source .venv/bin/activate


echo "Starting Text Editor with Next Token Prediction..."
echo "Make sure you have activated the virtual environment if using one."
echo ""


# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "Using virtual environment: $VIRTUAL_ENV"
else
    echo "No virtual environment detected. Using system Python."
fi

echo ""
echo "Starting server on http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload --workers 1
