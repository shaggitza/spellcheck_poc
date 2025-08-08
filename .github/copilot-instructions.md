# Text Editor with Intelligent Writing Assistance

Text Editor with Intelligent Writing Assistance is a Python FastAPI web application with JavaScript frontend that provides real-time AI writing assistance, next-token prediction, spell checking, and intelligent suggestions to enhance writing experience.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

Bootstrap, build, and test the repository:

- **Install Python dependencies**:
  - `pip install -r requirements.txt` -- takes 30 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- **Install JavaScript dependencies**: 
  - `npm install` -- takes 70 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
- **Validate setup**: `./validate-setup.sh` -- takes 1 second
- **Run JavaScript tests**: `npm test` -- takes 4 seconds. All 206 tests must pass.
- **Run JavaScript linting**: `npm run lint` -- takes 1 second
- **Start the application**: `python main.py` -- starts immediately on http://localhost:8000
- **Note on Python dev dependencies**: `pip install -r requirements-dev.txt` may timeout due to network issues with PyPI. This is expected - core functionality works without dev dependencies.

## Validation

- ALWAYS manually validate any new code by running the application and testing functionality in the browser.
- ALWAYS run through complete user scenarios after making changes:
  1. Create a new text file
  2. Type text and verify AI predictions appear
  3. Test spell checking functionality  
  4. Test file saving and loading
  5. Test toggle buttons for predictions and spell check
- The application is fully functional in the browser - you can interact with all UI elements.
- WebSocket communication works for real-time predictions.
- ALWAYS run `npm run lint` and fix any linting issues before committing.
- Python tests (`python -m pytest`) may not work due to missing dev dependencies - this is expected.

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
npm install                           # 70s - NEVER CANCEL

# Validate environment
./validate-setup.sh                   # 1s - Quick validation

# Test JavaScript (core functionality)
npm test                             # 4s - 206 tests must pass
npm run lint                         # 1s - Must pass

# Start application
python main.py                       # Immediate startup
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

The following are outputs from frequently run commands to save time:

### Repository structure
```
spellcheck_poc/
├── main.py                    # FastAPI backend
├── prediction_engines.py     # AI engines  
├── requirements.txt          # Python dependencies
├── requirements-dev.txt      # Python dev dependencies
├── package.json             # Node.js dependencies
├── start.sh                 # Startup script
├── validate-setup.sh        # Environment validator
├── templates/
│   └── editor.html          # Main UI
├── static/
│   ├── app.js              # Main application logic
│   ├── prediction-engine.js # AI prediction handling
│   ├── spell-checker.js    # Spell checking
│   ├── file-manager.js     # File operations
│   └── style.css           # Styling
├── tests/
│   ├── unit/               # JavaScript unit tests
│   └── integration/        # JavaScript integration tests  
├── text_files/             # User documents
└── .github/
    └── workflows/          # CI pipelines
```

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

## Timing Expectations

### Build Operations
- Python dependencies: 30 seconds - NEVER CANCEL
- Node.js dependencies: 70 seconds - NEVER CANCEL  
- Environment validation: 1 second
- Application startup: Immediate (< 1 second)

### Testing Operations
- JavaScript test suite: 4 seconds (206 tests)
- JavaScript linting: 1 second
- Python import validation: < 1 second
- Manual UI testing: 2-3 minutes for full scenario

### Development Operations
- Code formatting: < 5 seconds
- File changes: Auto-reload in development mode
- WebSocket reconnection: Automatic with visual indicator

## Error Handling and Known Issues

### Expected Warnings/Issues
- **Hunspell warning**: "⚠️ Hunspell not available, using PySpellChecker only" - Normal
- **Dev dependencies timeout**: PyPI network timeouts during `pip install -r requirements-dev.txt` - Expected
- **CDN blocked resources**: Bootstrap CDN may be blocked in some environments - UI still functions
- **ESLint deprecation**: .eslintignore deprecated warning - Does not affect functionality

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

## CI/CD Pipeline

The repository uses GitHub Actions with workflows in `.github/workflows/`:

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

## Security Considerations

### Input Validation
- **File names**: Validated for .txt extension and safe characters
- **Text content**: Sanitized before storage and display
- **WebSocket messages**: Validated message format and content

### Dependencies
- **Regular updates**: CI checks for outdated dependencies weekly
- **Vulnerability scanning**: Automated security checks on all dependencies
- **Minimal attack surface**: No file system access beyond text_files/ directory