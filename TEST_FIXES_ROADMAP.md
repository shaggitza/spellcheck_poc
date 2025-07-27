# Test Fixes Roadmap

## Issues Found and Required Fixes

### 1. **Module Export Issues** (Critical)

**Problem:** Modules not properly exported for Node.js testing
**Files affected:** All module files
**Fix required:** Add CommonJS exports

```javascript
// At end of each module file:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleName;
}
```

### 2. **Constructor Parameter Mismatches** (Critical)

**Problem:** Test constructors don't match actual module constructors
**Files affected:** All test files
**Fix required:** Update module constructors or test setup

**Current Issues:**
- PredictionEngine expects `options = {}` but tests pass `mockDependencies`
- SpellChecker expects `dependencies` object 
- FileManager expects `dependencies` object

### 3. **Missing Methods in Modules** (Critical)

**Problem:** Tests expect methods that don't exist in modules

**PredictionEngine missing methods:**
- `handlePredictionResponse()`
- `updatePrediction()`
- `showInlineSuggestion()`
- `hideInlineSuggestion()`
- `acceptInlineSuggestion()`
- `acceptPartialSuggestion()`
- `requestPrediction()`
- `setTypingState()`
- `getCurrentPrediction()`
- `isSuggestionVisible()`
- `clearPrediction()`
- `handleKeyEvent()`
- `destroy()`

**SpellChecker missing methods:**
- `handleSpellCheckResponse()`
- `checkSpelling()`
- `showSuggestions()`
- `clearSuggestions()`
- `replaceWord()`
- `replaceAllInstances()`
- `ignoreWord()`
- `addToPersonalDictionary()`
- `goToNextError()`
- `goToPreviousError()`
- `findErrorByPosition()`
- `findErrorContainingPosition()`
- `getCurrentError()`
- `isSpellChecking()`
- `getErrors()`
- `getErrorCount()`
- `clearErrors()`
- `updateSettings()`
- `showContextMenu()`
- `buildContextMenuItems()`
- `destroy()`

**FileManager missing methods:**
- `openFile()`
- `detectFileType()`
- `saveFile()`
- `saveFileAs()`
- `markAsModified()`
- `handleContentChange()`
- `getCurrentFileInfo()`
- `newFile()`
- `getRecentFiles()`
- `clearRecentFiles()`
- `removeFromRecentFiles()`
- `addToRecentFiles()`
- `exportAs()`
- `importFile()`
- `updateSettings()`
- `getSettings()`
- `saveSettings()`
- `validateFileSize()`
- `validateFileType()`
- `sanitizeFileName()`
- `openFileWithPicker()`
- `triggerFileInput()`
- `destroy()`

### 4. **Constructor State Initialization** (High)

**Problem:** Tests expect certain initial state that modules don't set

**PredictionEngine needs:**
- `currentPrediction = null`
- `suggestionVisible = false`
- `isTyping = false`
- `preserveSuggestion = false`

**SpellChecker needs:**
- `isChecking = false`
- `currentErrors = []`
- `lastKnownContent = ''`
- `selectedSuggestion = null`
- `currentErrorIndex = 0`

**FileManager needs:**
- `currentFile = null`
- `currentFileName = ''`
- `isModified = false`
- `lastSaveTime = null`
- `recentFiles = []`
- `settings = {}`

### 5. **DOM Mock Issues** (Medium)

**Problem:** Mock DOM elements not properly created
**Fix required:** Update createMockDOMElements function

### 6. **Method Implementation Priority** (High)

**Phase 1 - Core Methods (Required for basic tests):**
- Constructor fixes
- Basic state management methods
- Simple getter/setter methods

**Phase 2 - Business Logic (Medium complexity):**
- Request/response handling methods
- File operations
- Error management

**Phase 3 - Advanced Features (Complex):**
- Event handling
- DOM manipulation
- Integration methods

## Estimated Effort

- **Phase 1:** 4-6 hours (Core methods and constructors)
- **Phase 2:** 8-12 hours (Business logic implementation)  
- **Phase 3:** 6-8 hours (Advanced features and edge cases)
- **Total:** ~20-26 hours of implementation work

## Implementation Strategy

1. **Fix module exports first** (enables test loading)
2. **Standardize constructors** (enables test initialization)
3. **Add missing state properties** (enables basic tests)
4. **Implement core methods in order of test dependency**
5. **Add DOM manipulation methods**
6. **Implement complex business logic**
7. **Add error handling and edge cases**

## Success Metrics

- **Phase 1 Target:** 50+ tests passing
- **Phase 2 Target:** 80+ tests passing  
- **Phase 3 Target:** 100+ tests passing
- **Final Target:** All 123 tests passing with >90% coverage
