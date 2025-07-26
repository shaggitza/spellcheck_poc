# Text Editor with Next Token Prediction

A simple FastAPI web application with WebSocket support for editing text files with real-time next token prediction.

## Features

- **Real-time text editing**: Edit text files with live saving
- **WebSocket communication**: Real-time updates between client and server
- **Next token prediction**: Mock implementation that can be replaced with actual ML models
- **File management**: Create, list, and edit text files
- **Responsive UI**: Bootstrap-based interface that works on desktop and mobile

## Project Structure

```
spellcheck_poc/
├── main.py              # FastAPI application with WebSocket support
├── requirements.txt     # Python dependencies
├── start.sh            # Startup script
├── templates/
│   └── editor.html     # HTML template for the editor
├── static/
│   ├── style.css       # CSS styling
│   └── app.js          # JavaScript for WebSocket and editor logic
└── text_files/         # Directory for text files to edit
    └── sample.txt      # Sample text file
```

## Installation

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the application:
   ```bash
   python main.py
   ```
   
   Or use the startup script:
   ```bash
   ./start.sh
   ```

3. Open your browser and go to: http://localhost:8000

## Usage

1. **View Files**: The sidebar shows all `.txt` files in the `text_files/` directory
2. **Create New File**: Enter a filename in the input field and click "Create File"
3. **Edit Files**: Click on a file in the sidebar to load it in the editor
4. **Auto-save**: Changes are automatically saved after 1 second of inactivity
5. **Manual Save**: Click the "Save" button or press Ctrl+S
6. **Next Token Prediction**: See predictions in the blue box below the editor

## Next Token Prediction

The current implementation includes a mock prediction system that responds to certain patterns:

- `"the "` → `"quick brown fox"`
- `"hello "` → `"world"`
- `"function "` → `"name()"`
- `"import "` → `"os, sys, json"`
- Other cases → `"next tokens here"` or `"prediction"`

To integrate a real language model:

1. Replace the `predict_next_tokens()` function in `main.py`
2. Install your preferred ML library (transformers, openai, etc.)
3. Load your model and implement the prediction logic

## WebSocket API

The application uses WebSocket for real-time communication:

### Client → Server Messages

```json
{
    "type": "edit",
    "filename": "example.txt",
    "content": "file content",
    "cursor_position": 123
}
```

```json
{
    "type": "prediction_request",
    "content": "text content",
    "cursor_position": 123
}
```

### Server → Client Messages

```json
{
    "type": "edit_response",
    "filename": "example.txt",
    "success": true,
    "prediction": "next tokens here",
    "cursor_position": 123
}
```

```json
{
    "type": "prediction_response",
    "prediction": "predicted text",
    "cursor_position": 123
}
```

## Development

To extend this application:

1. **Add new file formats**: Modify the file listing and validation logic
2. **Improve predictions**: Replace the mock function with actual ML models
3. **Add collaborative editing**: Extend WebSocket handling for multiple users
4. **Add syntax highlighting**: Integrate a code editor like Monaco or CodeMirror
5. **Add authentication**: Implement user management and file permissions

## Requirements

- Python 3.7+
- FastAPI
- Uvicorn
- WebSocket support
- Modern web browser with JavaScript enabled
