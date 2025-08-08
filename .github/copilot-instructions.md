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

### Development Notes
- **Real-time features**: Uses WebSocket for low-latency communication
- **File storage**: Text files stored in `text_files/` directory
- **Database**: SQLite for caching spell check results and user settings
- **Spell checking**: PySpellChecker (Hunspell fallback if available)
- **Prediction engine**: Configurable AI text prediction system

### Timing Expectations - NEVER CANCEL
- **pip install requirements.txt**: ~30 seconds
- **npm install**: ~2 minutes  
- **npm test**: ~5 seconds
- **npm run lint**: ~1 second
- **Application startup**: ~5 seconds
- **./validate-setup.sh**: ~1 second

### Known Issues and Workarounds
- **Development dependencies**: `pip install -r requirements-dev.txt` may timeout due to network issues with safety/bandit packages. Not critical for functionality.
- **Hunspell**: May not be available in all environments. Application gracefully falls back to PySpellChecker.
- **CDN blocking**: Some CSS resources may be blocked but application functions normally.
- **ESLint warning**: `.eslintignore` deprecation warning is expected, does not affect functionality.

### CI/CD Integration
- **GitHub Actions**: Comprehensive workflows in `.github/workflows/`
- **Frontend testing**: Jest with 206 tests covering UI, spell checking, predictions
- **Backend testing**: Python tests (requires pytest installation)
- **Code quality**: ESLint, Prettier for JavaScript; Black, Flake8 for Python
- **Security scanning**: Bandit, Safety (when available)

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