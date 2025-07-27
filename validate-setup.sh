#!/bin/bash

# Development environment validation script
# Run this to verify your development setup is working correctly

set -e

echo "🔍 Validating spellcheck_poc development environment..."
echo

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>&1 | cut -d ' ' -f 2)
echo "✅ Python version: $python_version"

# Check Node.js version  
echo "📋 Checking Node.js version..."
node_version=$(node --version)
echo "✅ Node.js version: $node_version"

# Install dependencies if not present
echo "📋 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Check if flake8 is available
if ! command -v python3 -m flake8 >/dev/null 2>&1 && ! python3 -c "import flake8" 2>/dev/null; then
    echo "Installing backend dependencies..."
    pip install -r requirements-dev.txt
fi

# Check Python dependencies
echo "📋 Checking Python dependencies..."
if python3 -c "import main; print('Backend imports successfully')" 2>/dev/null; then
    echo "✅ Python backend imports successfully"
else
    echo "❌ Python backend import failed. Run: pip install -r requirements.txt"
    exit 1
fi

# Check Python syntax
echo "📋 Validating Python syntax..."
python3 -m py_compile main.py
python3 -m py_compile test_main.py
echo "✅ Python syntax validation passed"

# Check JavaScript syntax
echo "📋 Validating JavaScript syntax..."
for f in static/*.js; do
    if ! node -c "$f" >/dev/null 2>&1; then
        echo "❌ JavaScript syntax error in $f"
        exit 1
    fi
done
echo "✅ JavaScript syntax validation passed"

# Check CI workflow syntax
echo "📋 Validating CI workflows..."
if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>/dev/null; then
    echo "✅ CI workflow YAML is valid"
else
    echo "❌ CI workflow YAML validation failed"
    exit 1
fi

if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/code-quality.yml'))" 2>/dev/null; then
    echo "✅ Code quality workflow YAML is valid"
else
    echo "❌ Code quality workflow YAML validation failed"
    exit 1
fi

# Check package.json
echo "📋 Validating package.json..."
if python3 -c "import json; json.load(open('package.json'))" 2>/dev/null; then
    echo "✅ package.json is valid"
else
    echo "❌ package.json validation failed"
    exit 1
fi

echo
echo "🎉 All checks passed! Your development environment is ready."
echo
echo "Next steps:"
echo "  • Run tests: npm test && python -m pytest" 
echo "  • Check code quality: npm run lint"
echo "  • Check frontend: npm run lint:frontend"
echo "  • Check backend: npm run lint:backend"  
echo "  • Start the application: python main.py"
echo "  • Visit: http://localhost:8000"
echo