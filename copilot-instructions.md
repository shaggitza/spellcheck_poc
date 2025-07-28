# Copilot Instructions for SpellCheck POC

This document contains instructions and best practices for Copilot to follow when working on this repository.

## 1. Always Run the Complete Test Pipeline First

Before making any code changes, **ALWAYS** run the entire test pipeline to understand the current state:

### 1.1 Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements-dev.txt
pip install -r requirements.txt

# Install JavaScript dependencies
npm install
```

### 1.2 Run All Tests

```bash
# Python tests (prediction engines are the core tests)
python -m pytest test_prediction_engines.py -v

# Python main tests (may fail if dependencies missing due to network issues)
python -m pytest test_main.py -v

# JavaScript tests (comprehensive UI and integration tests)
npm test

# JavaScript tests with coverage
npm run test:coverage
```

### 1.3 Run Code Quality Checks

```bash
# JavaScript linting and formatting
npm run lint
npm run format:check
npm run code-quality

# Python linting
python -m flake8 *.py --max-line-length=100

# Python formatting
python -m black --check *.py --line-length=100
python -m isort --check-only *.py
```

## 2. Code Quality Standards

### 2.1 Python Code Standards

- Maximum line length: 100 characters
- Use Black for formatting: `python -m black *.py --line-length=100`
- Use isort for imports: `python -m isort *.py`
- Fix all flake8 warnings before committing
- Remove unused imports
- Ensure proper file endings (newline at end)

### 2.2 JavaScript Code Standards

- Use ESLint configuration provided
- Use Prettier for formatting: `npm run format`
- Fix all linting issues: `npm run lint:fix`
- All tests must pass: `npm test`

## 3. Testing Strategy

### 3.1 Test Hierarchy (by importance)

1. **Prediction Engine Tests** (`test_prediction_engines.py`) - Core functionality
2. **JavaScript Integration Tests** - Full UI workflow testing
3. **JavaScript Unit Tests** - Component-level testing
4. **Main Python Tests** (`test_main.py`) - May fail due to dependency issues

### 3.2 Test Requirements

- Prediction engine tests MUST always pass (core functionality)
- JavaScript tests MUST always pass (206 tests total)
- Fix only tests related to your changes
- Don't break existing functionality

## 4. Architecture Overview

### 4.1 Prediction Engines

- `prediction_engines.py` - Core prediction implementations
- Three engines: Mock AI, Traditional Statistical, Frequency-Based Learning
- Engine selection via settings API
- Comprehensive test coverage in `test_prediction_engines.py`

### 4.2 Frontend Structure

- `static/app.js` - Main application logic
- `static/prediction-engine.js` - Prediction handling
- `static/spell-checker.js` - Spell checking functionality
- `static/file-manager.js` - File operations
- Settings modal for engine configuration

## 5. Development Workflow

### 5.1 Before Making Changes

1. Run complete test pipeline (see section 1)
2. Understand current test failures (distinguish between environment vs code issues)
3. Read existing code to understand patterns
4. Plan minimal changes

### 5.2 During Development

1. Make small, incremental changes
2. Test frequently: `npm test && python -m pytest test_prediction_engines.py -v`
3. Fix linting issues immediately: `npm run lint:fix && python -m black *.py`
4. Validate changes don't break existing functionality

### 5.3 Before Committing

1. Run full test pipeline again
2. Fix all code quality issues
3. Ensure prediction engine tests pass (critical)
4. Ensure JavaScript tests pass (206 tests)
5. Use `report_progress` tool for commits

## 6. Common Issues and Solutions

### 6.1 Network Timeout Issues

- Python dependency installation may timeout
- Focus on tests that work: prediction engines and JavaScript
- Core functionality tests are more important than full integration

### 6.2 Missing Dependencies

- Some main.py tests may fail due to missing `aiofiles` etc.
- This is environmental, not code-related
- Focus on prediction engine functionality which has full test coverage

### 6.3 Code Quality Issues

- Python: Run `python -m black *.py && python -m isort *.py` to auto-fix most issues
- JavaScript: Run `npm run code-fix` to auto-fix most issues
- Remove unused imports manually
- Fix complexity warnings by breaking down large functions

## 7. File Structure Priorities

### 7.1 Critical Files (always test after changes)

- `prediction_engines.py` - Core prediction logic
- `static/app.js` - Main application
- `static/prediction-engine.js` - Prediction handling
- Settings-related files

### 7.2 Test Files

- `test_prediction_engines.py` - Must always pass
- `tests/` directory - JavaScript test suite (206 tests)

## 8. Performance Considerations

### 8.1 Testing Performance

- JavaScript tests: ~3-4 seconds for full suite
- Python prediction tests: <1 second
- Linting: <10 seconds for both languages

### 8.2 Engine Performance

- Traditional engines: <10ms response time
- Mock AI: ~100ms simulation delay
- Frequency learning: Adaptive, improves over time

## 9. Documentation Standards

### 9.1 Code Documentation

- Use clear, descriptive function names
- Add docstrings for complex functions
- Comment non-obvious logic
- Update this file when adding new patterns or workflows

### 9.2 Commit Messages

- Use descriptive commit messages
- Reference specific functionality changed
- Include test results if relevant

## 10. Emergency Procedures

### 10.1 If Tests Fail

1. Check if it's environment-related (missing deps) vs code-related
2. Focus on core functionality (prediction engines) first
3. JavaScript tests are comprehensive - fix those issues priority
4. Revert changes if too many tests break: `git checkout <file>`

### 10.2 If Dependencies Won't Install

1. Continue with available tests (prediction engines, JavaScript)
2. Core functionality can be validated without full environment
3. Document any environment issues for maintainer

This document should be updated whenever new patterns or useful procedures are discovered.
