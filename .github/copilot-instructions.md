# Text Editor with AI Writing Assistance

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

This is a FastAPI-based web application with real-time AI text predictions, spell checking, and intelligent writing assistance. The system uses WebSocket connections for real-time features and supports multiple file management.

## Working Effectively

### Environment Setup
- **Python 3.12.3** - Confirmed working perfectly
- **Node.js v20.19.4** - Confirmed working perfectly
- **Required**: Modern web browser for UI testing

### Bootstrap and Build Process
```bash
# Install Python dependencies - NEVER CANCEL, takes ~30 seconds
pip install -r requirements.txt

# Install Node.js dependencies - NEVER CANCEL, takes 2+ minutes. Set timeout to 180+ seconds.
npm install

# Validate setup - takes ~1 second
./validate-setup.sh
```

**CRITICAL**: Development dependencies (`requirements-dev.txt`) may fail due to network timeouts with safety/bandit packages. This is NOT critical - the application works fully without them.

### Build and Test
```bash
# Run JavaScript linting - takes ~1 second  
npm run lint

# Check code formatting - takes ~1 second
npm run format:check  

# Run comprehensive test suite - NEVER CANCEL, takes ~5 seconds. Set timeout to 30+ seconds.
npm test

# Python syntax validation (if dev deps available)
python -c "import main; print('Backend imports successfully')"
```

### Run the Application
```bash
# Start server - NEVER CANCEL, starts in ~5 seconds. Set timeout to 60+ seconds.
python main.py
# OR use the startup script
./start.sh

# Access at: http://localhost:8000
```

**Expected startup output:**
```
⚠️  Hunspell not available, using PySpellChecker only  
INFO:     Uvicorn running on http://0.0.0.0:8000
✅ Spell check database initialized
```

## Validation

### ALWAYS Test These User Scenarios After Changes
1. **File Creation Test**:
   - Navigate to http://localhost:8000
   - Enter filename ending in `.txt` in sidebar input
   - Click "Create File" - file should appear in sidebar
   
2. **Text Editor Functionality**:
   - Click on created file to open editor
   - Type text with intentional spelling errors (e.g., "spellling")
   - Verify red underlines appear on misspelled words
   - Verify prediction text appears in "Next tokens:" section
   
3. **Real-time Features**:
   - Confirm WebSocket connection shows "Connection restored"
   - Type text and verify auto-save ("File saved successfully")
   - Verify prediction engine provides contextual suggestions

4. **Toggle Features**:
   - Test 🔮 Predictions and 📝 Spell Check toggle buttons
   - Verify features can be enabled/disabled independently

### Quality Assurance Commands
```bash
# ALWAYS run before committing - takes ~2 seconds total
npm run lint && npm run format:check

# Run full test suite if making JavaScript changes - takes ~5 seconds  
npm test

# Validate Python imports if making backend changes
python -c "import main; print('Backend imports successfully')"
```

## Application Architecture

### Backend (Python FastAPI)
- **main.py** - FastAPI application with WebSocket support
- **prediction_engines.py** - AI prediction engines (Mock AI, Traditional Statistical, Frequency-Based)
- **Requirements**: Python 3.12+, FastAPI, Uvicorn, WebSocket support
- **Database**: SQLite for spell checking and user dictionaries
- **Spell checking**: PySpellChecker (Hunspell fallback if available)

### Frontend (JavaScript)
- **Plain JavaScript** - No build step required, runs directly in browser
- **Bootstrap 5** - UI framework loaded via CDN
- **WebSocket client** - Real-time communication with backend
- **Key files**:
  - `static/app.js` - Main application logic
  - `static/prediction-engine.js` - AI prediction handling
  - `static/spell-checker.js` - Spell checking functionality
  - `static/file-manager.js` - File operations
  - `templates/editor.html` - Main application interface

## Build and Run Commands

### Core Commands (ALWAYS VALIDATED)
```bash
# Install dependencies
pip install -r requirements.txt        # 30s - NEVER CANCEL
npm install                           # 2+ minutes - NEVER CANCEL

# Validate environment
./validate-setup.sh                   # 1s - Quick validation

# Test JavaScript (core functionality)
npm test                             # 5s - 206 tests must pass
npm run lint                         # 1s - Must pass

# Start application
python main.py                       # 5s startup
# Visit: http://localhost:8000
```

### Optional Commands (may fail due to environment)
```bash
# Python dev dependencies (may timeout)
pip install -r requirements-dev.txt  # May fail - not required for core functionality

# Python tests (may fail without dev deps)
python -m pytest test_main.py -v     # May fail - use JavaScript tests instead

# JavaScript formatting
npm run format:check                 # Check formatting
npm run format                       # Auto-format
```

## Critical Testing Scenarios

After making any changes, ALWAYS test these scenarios manually:

### File Management
1. Create new file: Enter filename ending with `.txt` → Click "Create File"
2. File appears in sidebar and opens for editing
3. Switch between files by clicking filenames in sidebar

### Text Editing and AI Features  
1. Click in text area to focus cursor
2. Type text: "Hello world, this is a test"
3. Verify AI predictions appear as grayed-out text
4. Test Tab key to accept full suggestions
5. Test Ctrl+Right Arrow to accept partial suggestions
6. Verify spell checking highlights misspelled words

### UI Controls
1. Test "🔮 Predictions" toggle button - should enable/disable AI
2. Test "📝 Spell Check" toggle button - should enable/disable spell checking
3. Open Settings modal - verify all options work
4. Test Dashboard view for file overview

### WebSocket Communication
1. Verify "Connection restored" appears in bottom-right
2. Type text and confirm predictions are requested (check browser console)
3. Verify real-time updates work without page refresh

## Common Tasks

### Repository Structure
```
/home/runner/work/spellcheck_poc/spellcheck_poc/
├── main.py                    # FastAPI backend with WebSocket support
├── prediction_engines.py     # AI prediction engine implementations  
├── templates/editor.html      # Main application interface
├── static/                    # Frontend JavaScript and CSS
│   ├── app.js                # Main application logic
│   ├── prediction-engine.js  # Real-time prediction handling
│   ├── spell-checker.js      # Spell checking implementation
│   └── *.js                  # Additional modules
├── text_files/               # User document storage (created at runtime)
├── tests/                    # JavaScript test suites  
├── package.json              # Node.js dependencies and scripts
├── requirements.txt          # Python runtime dependencies
└── requirements-dev.txt      # Python development dependencies
```

### Key Endpoints and APIs
- `GET /` - Main application interface
- `GET /api/files` - List user text files
- `GET /api/files/{filename}` - Get file content
- `WebSocket /ws` - Real-time predictions and spell checking
- `GET /api/settings` - User preferences
- `POST /api/settings` - Save user preferences

### Key package.json scripts
```json
{
  "scripts": {
    "test": "jest",                    # Run all JavaScript tests
    "lint": "eslint static/**/*.js",   # Lint JavaScript
    "lint:fix": "eslint --fix",        # Auto-fix linting
    "format": "prettier --write",       # Format code
    "format:check": "prettier --check"  # Check formatting
  }
}
```

### Application startup logs
```
⚠️  Hunspell not available, using PySpellChecker only
INFO:     Started server process [PID]
✅ Spell check database initialized  
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Development Environment Notes

### Python Environment
- **Tested versions**: Python 3.12.3
- **Core dependencies work**: FastAPI, Uvicorn, PySpellChecker
- **Dev dependencies may fail**: pytest, black, flake8 (network timeout issues)
- **Fallback behavior**: Application works fully without dev dependencies

### JavaScript Environment  
- **Tested versions**: Node.js 20.19.4
- **All dependencies install successfully**: Jest, ESLint, Prettier
- **Full test coverage**: 206 tests across unit and integration suites
- **No build step required**: Plain JavaScript served directly

### System Dependencies
- **Required**: Python 3.12+, Node.js 18+
- **Optional**: Hunspell (falls back to PySpellChecker if unavailable)
- **Storage**: SQLite database created automatically

## Timing Expectations - NEVER CANCEL

### Build Operations
- **pip install requirements.txt**: ~30 seconds
- **npm install**: ~2 minutes  
- **npm test**: ~5 seconds
- **npm run lint**: ~1 second
- **Application startup**: ~5 seconds
- **./validate-setup.sh**: ~1 second

### Testing Operations
- JavaScript test suite: 5 seconds (206 tests)
- JavaScript linting: 1 second
- Python import validation: < 1 second
- Manual UI testing: 2-3 minutes for full scenario

### Development Operations
- Code formatting: < 5 seconds
- File changes: Auto-reload in development mode
- WebSocket reconnection: Automatic with visual indicator

## Known Issues and Workarounds

### Expected Warnings/Issues
- **Development dependencies**: `pip install -r requirements-dev.txt` may timeout due to network issues with safety/bandit packages. Not critical for functionality.
- **Hunspell**: May not be available in all environments. Application gracefully falls back to PySpellChecker.
- **CDN blocking**: Some CSS resources may be blocked but application functions normally.
- **ESLint warning**: `.eslintignore` deprecation warning is expected, does not affect functionality.

### Critical Success Indicators
- **Application starts**: Server runs on http://localhost:8000
- **UI loads**: Editor interface appears with sidebar and main editing area  
- **WebSocket connects**: "Connection restored" indicator appears
- **File operations work**: Can create, edit, and save text files
- **AI predictions work**: Grayed-out text predictions appear while typing
- **All JavaScript tests pass**: 206/206 tests must pass

### Troubleshooting
- **If application won't start**: Check Python dependencies with `python -c "import main"`
- **If UI doesn't load**: Verify static files are accessible at `/static/`
- **If predictions don't work**: Check browser console for WebSocket errors
- **If tests fail**: Run `npm test --verbose` for detailed output

## CI/CD Integration

### GitHub Actions
- **Comprehensive workflows**: in `.github/workflows/`
- **Frontend testing**: Jest with 206 tests covering UI, spell checking, predictions
- **Backend testing**: Python tests (requires pytest installation)
- **Code quality**: ESLint, Prettier for JavaScript; Black, Flake8 for Python
- **Security scanning**: Bandit, Safety (when available)

### Main CI Pipeline (`ci.yml`)
- **Frontend testing**: Node.js 18, ESLint, Prettier, Jest (206 tests)
- **Backend testing**: Python 3.12+, syntax validation, import checks
- **Build verification**: Application startup smoke tests
- **Security scanning**: Dependency vulnerability checks

### Code Quality Pipeline (`code-quality.yml`)  
- **CodeQL analysis**: Security and quality analysis
- **Dependency review**: Automated vulnerability checks

All pull requests must pass CI checks. The pipeline mirrors the manual validation steps above.

## Performance Characteristics

### Response Times
- **File operations**: < 100ms for small files
- **AI predictions**: 200-400ms (includes WebSocket round-trip)
- **Spell checking**: < 50ms for typical paragraphs  
- **UI interactions**: < 10ms for local operations

### Resource Usage
- **Memory**: ~50MB Python backend + browser memory
- **CPU**: Low usage except during AI prediction requests
- **Storage**: SQLite database grows with user dictionary additions
- **Network**: WebSocket connection for real-time features

## Debugging

### Application Logs
Monitor browser console for detailed debugging:
- WebSocket connection status
- Prediction engine requests/responses  
- Spell checking progress
- Performance warnings for long tasks

### Network Issues
If experiencing connectivity issues:
- Check WebSocket connection in browser console
- Verify server is running on http://localhost:8000
- Test basic HTTP endpoints with curl

### Performance Monitoring
The application includes built-in performance monitoring:
- Long task detection (>300ms operations)
- WebSocket timing measurements
- Spell check and prediction response times

## Security Considerations

### Input Validation
- **File names**: Validated for .txt extension and safe characters
- **Text content**: Sanitized before storage and display
- **WebSocket messages**: Validated message format and content

### Dependencies
- **Regular updates**: CI checks for outdated dependencies weekly
- **Vulnerability scanning**: Automated security checks on all dependencies
- **Minimal attack surface**: No file system access beyond text_files/ directory
