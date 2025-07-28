# Traditional Prediction Engines Documentation

## Overview

This implementation adds non-AI-based prediction alternatives to the text editor, providing users with traditional computational linguistics approaches for text prediction.

## Available Prediction Engines

### 1. Mock AI (Original)

- **Type**: Pattern-based
- **Description**: Original pattern-based prediction with simulated AI responses
- **How it works**: Uses hard-coded patterns and responses to simulate AI behavior
- **Use case**: Demonstrating AI-like behavior without actual AI

### 2. Traditional Statistical

- **Type**: Statistical
- **Description**: Statistical prediction using bigrams, trigrams, and frequency analysis
- **How it works**:
    - Uses bigram associations (e.g., "the" → "quick", "best", "most")
    - Partial word completion based on common prefixes
    - Context-aware predictions for programming terms
    - Statistical analysis of word patterns
- **Use case**: Fast, reliable predictions based on established language patterns

### 3. Frequency-Based Learning

- **Type**: Adaptive
- **Description**: Adaptive prediction that learns from text patterns and word frequencies
- **How it works**:
    - Learns from text as you type
    - Builds frequency tables for words, bigrams, and trigrams
    - Adapts predictions based on your writing style
    - Improves over time with usage
- **Use case**: Personalized predictions that adapt to your writing style

## Technical Implementation

### Backend Components

#### `prediction_engines.py`

Contains the core prediction engine classes:

```python
class TraditionalPredictionEngine:
    """Statistical prediction using bigrams and word completion"""

class FrequencyBasedPredictor:
    """Adaptive prediction with learning capabilities"""
```

#### Database Integration

- Added `prediction_engine` and `prediction_enabled` settings to the database
- Settings are persisted and loaded on application startup

#### API Endpoints

- `GET /api/prediction-engines` - Returns available engines with descriptions
- `POST /api/settings` - Updated to handle prediction engine settings

### Frontend Components

#### Settings Modal

- Added prediction engine dropdown with real-time description updates
- Integrated with existing settings management system
- Validates settings before saving

#### Prediction Integration

- Routes predictions through different engines based on user settings
- Maintains compatibility with existing prediction display system
- Handles engine fallbacks gracefully

## Usage

### Changing Prediction Engines

1. Click the "⚙️ Settings" button
2. In the "🔮 Text Prediction" section, select your preferred engine:
    - **Mock AI**: Original pattern-based system
    - **Traditional Statistical**: Statistical bigram/trigram analysis
    - **Frequency-Based**: Adaptive learning system
3. Click "Save Settings"

### Engine Behavior Examples

#### Traditional Statistical Engine

- Type "the " → predicts "quick" (common bigram)
- Type "th" → completes to "the" (partial completion)
- Type "function " → predicts "calculate_result(x, y):" (programming context)

#### Frequency-Based Engine

- Initially provides basic predictions
- Learns from your text as you write
- Adapts predictions to your writing patterns over time

## Testing

### Backend Tests

Run the prediction engine tests:

```bash
python test_prediction_engines.py
```

### Manual Testing

1. Create a new file
2. Change prediction engine in settings
3. Type common words like "the", "hello", "function"
4. Observe different prediction behaviors

### API Testing

```bash
# Get available engines
curl http://localhost:8000/api/prediction-engines

# Get current settings
curl http://localhost:8000/api/settings

# Change prediction engine
curl -X POST http://localhost:8000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"settings": {"prediction_engine": "traditional"}}'
```

## Performance Characteristics

### Traditional Statistical Engine

- **Speed**: Very fast (< 50ms)
- **Memory**: Low memory usage
- **Accuracy**: Good for common language patterns
- **Learning**: No learning capability

### Frequency-Based Engine

- **Speed**: Fast (< 100ms)
- **Memory**: Moderate (grows with usage)
- **Accuracy**: Improves over time
- **Learning**: Learns from user input

### Mock AI Engine

- **Speed**: Slower (100ms, simulated processing)
- **Memory**: Low
- **Accuracy**: Fixed patterns only
- **Learning**: No learning capability

## Configuration

### Default Settings

- **Default Engine**: `mock_ai`
- **Prediction Enabled**: `true`
- **Fallback**: Falls back to Mock AI if selected engine fails

### Customization

Users can easily switch between engines without restarting the application. Settings are persisted in the database and loaded automatically.

## Future Enhancements

### Potential Improvements

1. **More Engines**: Add more sophisticated statistical models
2. **Language Support**: Multi-language prediction engines
3. **Import/Export**: Allow users to export/import learned patterns
4. **Performance Monitoring**: Add metrics for prediction accuracy
5. **Custom Training**: Allow users to train engines on specific text corpora

### Integration Points

The modular design makes it easy to add new prediction engines by:

1. Implementing the prediction interface in `prediction_engines.py`
2. Adding the engine to the `PREDICTION_ENGINES` dictionary
3. Updating the frontend descriptions in the API endpoint

## Migration Guide

### From Previous Versions

Existing installations will automatically:

1. Add the new database settings with defaults
2. Use the Mock AI engine by default (maintaining existing behavior)
3. Allow users to opt-in to new engines via settings

### No Breaking Changes

This implementation maintains full backward compatibility with existing functionality while adding new capabilities.
