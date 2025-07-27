# Text Editor with Intelligent Writing Assistance

A modern web-based text editor with real-time writing assistance, featuring next-token prediction, spell checking, and intelligent suggestions to enhance your writing experience.

## ✨ Key Features

### 📝 **Smart Text Editing**

- **Real-time editing** with instant auto-save
- **Rich text interface** with paragraph-based structure
- **Intelligent suggestions** displayed inline as you type
- **Multiple file management** with easy switching between documents

### 🤖 **AI-Powered Assistance**

- **Next-token prediction** for writing continuation suggestions
- **Context-aware predictions** based on your writing style
- **Inline suggestions** with Tab to accept, Ctrl+Right for partial acceptance
- **Spell checking** with real-time error highlighting

### 🔄 **Real-time Collaboration Ready**

- **WebSocket communication** for instant updates
- **Live prediction streaming** with low-latency responses
- **Robust connection handling** with automatic reconnection

### 💾 **File Management**

- **Create and edit** text files with `.txt` format
- **Automatic saving** with visual save status indicators
- **File browser** sidebar for quick navigation
- **Dashboard view** for project overview

### 🎨 **Modern Interface**

- **Responsive design** that works on desktop and mobile
- **Bootstrap-based UI** with clean, professional styling
- **Accessibility features** including keyboard navigation
- **Environment-aware debugging** tools for developers

## 🚀 Quick Start

### Installation

1. **Clone the repository** and navigate to the project directory

2. **Install Python dependencies**:

    ```bash
    pip install -r requirements.txt
    ```

3. **Start the application**:

    ```bash
    python main.py
    ```

    Or use the startup script:

    ```bash
    ./start.sh
    ```

4. **Open your browser** and go to: http://localhost:8000

### First Steps

1. **Dashboard**: Start at the dashboard to see your file overview
2. **Create a file**: Enter a filename ending in `.txt` and click "Create File"
3. **Start writing**: Begin typing and watch the AI suggestions appear
4. **Accept suggestions**: Press Tab to accept full suggestions, Ctrl+Right for partial
5. **Auto-save**: Your changes are automatically saved as you type

## 🎯 How to Use

### Writing with AI Assistance

1. **Start typing** - The editor detects your writing context and provides intelligent suggestions
2. **Accept suggestions**:
    - **Tab** - Accept the full suggestion
    - **Ctrl + Right Arrow** - Accept just the first word
    - **Escape** - Dismiss the current suggestion
3. **Auto-complete** - Suggestions appear as grayed-out text at your cursor position
4. **Spell checking** - Misspelled words are highlighted with error badges

### File Management

- **View files** - All `.txt` files appear in the left sidebar
- **Switch files** - Click any file name to open it instantly
- **Create new files** - Use the "New File" input at the top of the sidebar
- **Dashboard mode** - Click the dashboard button for a project overview

### Keyboard Shortcuts

- **Ctrl + S** - Manual save (though auto-save handles this automatically)
- **Tab** - Accept AI writing suggestion
- **Ctrl + Right** - Accept partial suggestion (first word only)
- **Escape** - Hide current suggestion
- **Enter** - Create new paragraph

## 🤖 AI Writing Features

### Smart Predictions

The AI system analyzes your writing context and provides contextually relevant suggestions:

- **Contextual awareness** - Predictions adapt to your writing style and topic
- **Real-time streaming** - Suggestions update as you type
- **Multiple prediction modes** - Full sentence completion and word-by-word assistance

### Current Prediction Patterns

The system includes intelligent responses for common writing patterns:

- **Article beginnings** - "the " → contextual noun phrases
- **Greetings** - "hello " → appropriate continuations
- **Technical writing** - "function " → programming-related suggestions
- **Lists and imports** - "import " → relevant module suggestions

### Customization

- **Adaptive learning** - The system learns from your writing patterns
- **Environment-aware** - Behaves differently in development vs. production
- **Configurable timing** - Suggestion delays and debouncing can be adjusted

## 🔧 Technical Features

### Robust Architecture

- **Error handling** - Comprehensive error catching with user-friendly messages
- **Input validation** - All user inputs are validated and sanitized
- **Environment detection** - Automatic development/production mode switching
- **Performance optimization** - Debounced operations and efficient DOM handling

### Real-time Communication

- **WebSocket integration** - Low-latency bidirectional communication
- **Automatic reconnection** - Handles connection drops gracefully
- **Message validation** - All WebSocket messages are validated for security

### Modern Development

- **Modular architecture** - Separated concerns across multiple JavaScript modules
- **Utility functions** - Reusable helper functions for common operations
- **Debug tools** - Development mode includes debugging aids and performance monitoring

### Continuous Integration

- **GitHub Actions CI/CD** - Automated testing and quality checks
- **Multi-version testing** - Tests against Python 3.9, 3.10, 3.11, and 3.12
- **Code quality enforcement** - Linting, formatting, and security scanning
- **Automated testing** - Both frontend (Jest) and backend (pytest) test suites
- **Security scanning** - Dependency vulnerability checks and code analysis

## 🛠 For Developers

### Extending the Application

**Add Language Models**: Replace the prediction system with your preferred ML model (OpenAI, Transformers, etc.)

**Custom File Formats**: Extend beyond `.txt` files by modifying the validation and processing logic

**Collaborative Features**: Build on the WebSocket foundation to add real-time collaborative editing

**Enhanced UI**: The modular frontend architecture makes it easy to add new interface components

### Project Structure

```
spellcheck_poc/
├── main.py                    # FastAPI backend with WebSocket support
├── templates/editor.html      # Main application interface
├── static/
│   ├── app.js                # Main application logic
│   ├── environment.js        # Environment detection and configuration
│   ├── error-handler.js      # Centralized error handling
│   ├── validator.js          # Input validation and sanitization
│   ├── utils.js             # Common utility functions
│   └── style.css            # Application styling
└── text_files/              # User document storage
```

## 📋 Requirements

- **Python 3.7+**
- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **WebSocket support** - For real-time communication
- **Modern web browser** - Chrome, Firefox, Safari, or Edge with JavaScript enabled

## 📄 License

This project is available for educational and development purposes. Feel free to fork, modify, and extend it for your own use cases.

---

**Built with ❤️ using FastAPI, WebSockets, and modern JavaScript**
