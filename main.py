from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import json
import aiofiles
import aiosqlite
from pathlib import Path
from typing import List, Optional, Dict, Tuple
import asyncio
import re
import hashlib
from spellchecker import SpellChecker
try:
    import hunspell
    HUNSPELL_AVAILABLE = True
except ImportError:
    HUNSPELL_AVAILABLE = False

app = FastAPI(title="Text Editor with Next Token Prediction and Spell Checking")

# Create necessary directories
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)
os.makedirs("text_files", exist_ok=True)

# Initialize spell checkers
pyspell_checker = SpellChecker()
hunspell_checker = None

# Try to initialize Hunspell with fallback
if HUNSPELL_AVAILABLE:
    try:
        hunspell_checker = hunspell.HunSpell('/usr/share/hunspell/en_US.dic', '/usr/share/hunspell/en_US.aff')
        print("✅ Hunspell initialized successfully")
    except Exception as e:
        print(f"⚠️  Hunspell initialization failed: {e}")
        try:
            # Try alternative paths
            hunspell_checker = hunspell.HunSpell('/usr/share/myspell/en_US.dic', '/usr/share/myspell/en_US.aff')
            print("✅ Hunspell initialized with myspell path")
        except Exception as e2:
            print(f"⚠️  Hunspell fallback failed: {e2}")
            hunspell_checker = None
else:
    print("⚠️  Hunspell not available, using PySpellChecker only")
    hunspell_checker = None

# Database path
DB_PATH = "spellcheck.db"

async def init_database():
    """Initialize the spell check database with line-based caching"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Line-based spell check cache
        await db.execute("""
            CREATE TABLE IF NOT EXISTS spell_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                line_hash TEXT UNIQUE NOT NULL,
                line_text TEXT NOT NULL,
                errors_json TEXT,
                language TEXT DEFAULT 'en',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # User custom dictionary
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_dictionary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT UNIQUE NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # File-specific metadata
        await db.execute("""
            CREATE TABLE IF NOT EXISTS file_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT UNIQUE NOT NULL,
                language TEXT DEFAULT 'en',
                custom_words TEXT,
                last_spell_check TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # User settings and preferences
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                setting_type TEXT DEFAULT 'string',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Initialize default settings
        await db.execute("""
            INSERT OR IGNORE INTO user_settings (setting_key, setting_value, setting_type)
            VALUES 
                ('spell_checker_engine', 'pyspellchecker', 'string'),
                ('spell_checker_language', 'en', 'string'),
                ('spell_suggestions_count', '15', 'integer'),
                ('spell_check_enabled', 'true', 'boolean')
        """)
        
        await db.commit()
        print("✅ Spell check database initialized")

async def get_user_setting(setting_key: str, default_value: Optional[str] = None) -> Optional[str]:
    """Get a user setting from the database"""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT setting_value FROM user_settings WHERE setting_key = ?",
            (setting_key,)
        ) as cursor:
            result = await cursor.fetchone()
            return result[0] if result else default_value

async def set_user_setting(setting_key: str, setting_value: str, setting_type: str = 'string'):
    """Set a user setting in the database"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO user_settings (setting_key, setting_value, setting_type, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, (setting_key, setting_value, setting_type))
        await db.commit()
        print(f"✅ Updated setting {setting_key} = {setting_value}")

async def spell_check_word_with_engine(word: str, engine: str = 'pyspellchecker') -> Tuple[bool, List[str]]:
    """
    Check if a word is spelled correctly using the specified engine
    Returns (is_correct, suggestions_list)
    """
    if engine == 'hunspell' and hunspell_checker and HUNSPELL_AVAILABLE:
        try:
            is_correct = hunspell_checker.spell(word)
            if not is_correct:
                suggestions = hunspell_checker.suggest(word)[:15]  # Top 15 suggestions
                return False, suggestions
            return True, []
        except Exception as e:
            print(f"⚠️  Hunspell error for word '{word}': {e}")
            # Fallback to PySpellChecker
            engine = 'pyspellchecker'
    
    # Use PySpellChecker (default or fallback)
    if word.lower() not in pyspell_checker:
        candidates = pyspell_checker.candidates(word)
        suggestions = list(candidates)[:15] if candidates else []
        return False, suggestions
    
    return True, []

def hash_line(line_text: str) -> str:
    """Create a hash for a line of text for caching"""
    return hashlib.sha256(line_text.encode('utf-8')).hexdigest()

async def spell_check_line(line_text: str, language: str = 'en') -> List[Dict]:
    """
    Check spelling for a single line with caching
    Returns list of spelling errors with positions
    """
    if not line_text.strip():
        return []
    
    # Get user's preferred spell checking engine
    engine = await get_user_setting('spell_checker_engine', 'pyspellchecker') or 'pyspellchecker'
    
    line_hash = hash_line(line_text + f"_{engine}")  # Include engine in hash for cache separation
    
    # Check cache first
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT errors_json FROM spell_cache WHERE line_hash = ?", 
            (line_hash,)
        ) as cursor:
            cached_result = await cursor.fetchone()
            
        if cached_result:
            # Update last_used timestamp
            await db.execute(
                "UPDATE spell_cache SET last_used = CURRENT_TIMESTAMP WHERE line_hash = ?",
                (line_hash,)
            )
            await db.commit()
            
            # Return cached results
            if cached_result[0]:
                return json.loads(cached_result[0])
            else:
                return []
    
    # Cache miss - perform spell check
    errors = []
    words = re.findall(r'\b\w+\b', line_text)
    
    # Get user's custom dictionary
    custom_words = set()
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT word FROM user_dictionary") as cursor:
            async for row in cursor:
                custom_words.add(row[0].lower())
    
    # Check each word
    current_pos = 0
    for word in words:
        # Find word position in line
        word_start = line_text.find(word, current_pos)
        if word_start == -1:
            continue
            
        word_end = word_start + len(word)
        current_pos = word_end
        
        # Skip if word is in custom dictionary
        if word.lower() in custom_words:
            continue
            
        # Check if word is misspelled using the selected engine
        is_correct, suggestions = await spell_check_word_with_engine(word, engine)
        
        if not is_correct:
            errors.append({
                "word": word,
                "start_pos": word_start,
                "end_pos": word_end,
                "suggestions": suggestions
            })
    
    # Cache the results
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO spell_cache 
            (line_hash, line_text, errors_json, language, last_used) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (line_hash, line_text, json.dumps(errors), language))
        await db.commit()
    
    print(f"DEBUG Spell Check ({engine}): Line '{line_text[:50]}...' -> {len(errors)} errors")
    return errors

async def add_word_to_dictionary(word: str):
    """Add a word to the user's custom dictionary"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO user_dictionary (word) VALUES (?)",
            (word.lower(),)
        )
        
        # Invalidate cache for lines containing this word
        # We need to clear cached results that might have flagged this word as an error
        await db.execute(
            "DELETE FROM spell_cache WHERE errors_json LIKE ?",
            (f'%"{word.lower()}"%',)
        )
        
        await db.commit()
        print(f"✅ Added '{word}' to user dictionary and invalidated related cache")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    await init_database()

@app.get("/", response_class=HTMLResponse)
async def get_editor(request: Request):
    return templates.TemplateResponse("editor.html", {"request": request})

@app.get("/api/files")
async def list_files():
    """List all text files in the text_files directory"""
    text_files_dir = Path("text_files")
    files = []
    
    for file_path in text_files_dir.glob("*.txt"):
        files.append({
            "name": file_path.name,
            "path": str(file_path)
        })
    
    return {"files": files}

@app.get("/api/files/{filename}")
async def get_file_content(filename: str):
    """Get content of a specific file"""
    file_path = Path("text_files") / filename
    
    if not file_path.exists():
        return {"error": "File not found"}, 404
    
    try:
        async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
        return {"content": content, "filename": filename}
    except Exception as e:
        return {"error": str(e)}, 500

async def predict_next_tokens_structured(prev_context: str, current_text: str, after_context: str, cursor: int, metadata: dict = {}) -> str:
    """
    Structured implementation of next token prediction using separated context
    """
    await asyncio.sleep(0.1)  # Simulate processing time
    
    # Get text before cursor within the current paragraph
    text_before_cursor = current_text[:cursor] if cursor <= len(current_text) else current_text
    # Get text after cursor within the current paragraph
    text_after_cursor = current_text[cursor:] if cursor < len(current_text) else ""
    
    print("DEBUG Backend Structured:")
    print(f"  prev_context: '{prev_context[:50]}{'...' if len(prev_context) > 50 else ''}'")
    print(f"  current_text: '{current_text[:50]}{'...' if len(current_text) > 50 else ''}'")
    print(f"  after_context: '{after_context[:50]}{'...' if len(after_context) > 50 else ''}'")
    print(f"  cursor: {cursor} (in current_text)")
    print(f"  text_before_cursor: '{text_before_cursor[-30:]}'")
    print(f"  text_after_cursor: '{text_after_cursor[:30]}'")
    if metadata:
        print(f"  metadata: paragraph_index={metadata.get('paragraph_index')}, total_paragraphs={metadata.get('total_paragraphs')}")
    
    # Simple mock predictions based on current text context
    text_lower = text_before_cursor.lower()
    
    # Check for empty cursor position or newlines
    if not text_before_cursor or text_before_cursor.endswith('\n'):
        return ""  # No prediction for empty lines
    
    # Determine if we need a space prefix (at beginning)
    needs_space_prefix = text_before_cursor and not text_before_cursor.endswith(' ')
    space_prefix = " " if needs_space_prefix else ""
    
    # Determine if we need a space suffix (at end) - check if text after cursor doesn't start with space
    needs_space_suffix = text_after_cursor and not text_after_cursor.startswith(' ')
    space_suffix = " " if needs_space_suffix else ""
    
    # More flexible pattern matching based on current paragraph context
    prediction = ""
    if text_lower.endswith("the "):
        prediction = "quick brown fox jumps over the lazy dog"
    elif text_lower.endswith("hello "):
        prediction = "world! How are you today?"
    elif text_lower.endswith("function "):
        prediction = "calculate_result(x, y):"
    elif text_lower.endswith("import "):
        prediction = "numpy as np"
    elif text_lower.endswith("python "):
        prediction = "is a powerful programming language"
    elif text_lower.endswith("ai "):
        prediction = "will revolutionize how we write code"
    elif text_lower.endswith("this "):
        prediction = "is an example of contextual prediction"
    elif text_lower.endswith("writing "):
        prediction = "code is much easier with AI assistance"
    elif text_lower.endswith("context "):
        prediction = "makes predictions more accurate"
    elif text_lower.endswith(" "):
        prediction = "suggestion based on context"
    elif len(text_before_cursor.strip()) == 0:
        return ""  # No prediction for whitespace-only content
    else:
        prediction = "contextual prediction"
    
    # Add space prefix and suffix if needed and return
    final_prediction = space_prefix + prediction + space_suffix
    print(f"  needs_space_prefix: {needs_space_prefix}, needs_space_suffix: {needs_space_suffix}")
    print(f"  final_prediction: '{final_prediction}'")
    return final_prediction



@app.get("/api/dictionary")
async def get_dictionary():
    """Get all words in the user's custom dictionary"""
    try:
        words = []
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT word, added_at FROM user_dictionary ORDER BY word") as cursor:
                async for row in cursor:
                    words.append({
                        "word": row[0],
                        "created_at": row[1]
                    })
        return {"words": words}
    except Exception as e:
        return {"error": str(e)}, 500

@app.delete("/api/dictionary/{word}")
async def remove_word_from_dictionary(word: str):
    """Remove a word from the user's custom dictionary"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Remove the word
            await db.execute("DELETE FROM user_dictionary WHERE word = ?", (word.lower(),))
            
            # Invalidate cache for lines that might now have errors for this word
            await db.execute(
                "DELETE FROM spell_cache WHERE errors_json NOT LIKE ? OR errors_json IS NULL",
                (f'%"{word.lower()}"%',)
            )
            
            await db.commit()
            
        print(f"✅ Removed '{word}' from user dictionary and invalidated cache")
        return {"success": True, "word": word}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/settings")
async def get_settings():
    """Get all user settings"""
    try:
        settings = {}
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT setting_key, setting_value, setting_type FROM user_settings") as cursor:
                async for row in cursor:
                    key, value, setting_type = row
                    # Convert string values to appropriate types
                    if setting_type == 'integer':
                        settings[key] = int(value)
                    elif setting_type == 'boolean':
                        settings[key] = value.lower() == 'true'
                    else:
                        settings[key] = value
        
        return {"settings": settings}
    except Exception as e:
        return {"error": str(e)}, 500

@app.post("/api/settings")
async def update_settings(request: Request):
    """Update user settings"""
    try:
        data = await request.json()
        settings = data.get("settings", {})
        
        async with aiosqlite.connect(DB_PATH) as db:
            for key, value in settings.items():
                # Determine setting type
                setting_type = 'string'
                if isinstance(value, bool):
                    setting_type = 'boolean'
                    value = str(value).lower()
                elif isinstance(value, int):
                    setting_type = 'integer'
                    value = str(value)
                else:
                    value = str(value)
                
                await db.execute("""
                    INSERT OR REPLACE INTO user_settings (setting_key, setting_value, setting_type, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                """, (key, value, setting_type))
            
            await db.commit()
        
        # Clear spell check cache if engine changed
        if 'spell_checker_engine' in settings:
            async with aiosqlite.connect(DB_PATH) as db:
                await db.execute("DELETE FROM spell_cache")
                await db.commit()
                print("✅ Cleared spell check cache due to engine change")
        
        print(f"✅ Updated {len(settings)} settings")
        return {"success": True, "updated_count": len(settings)}
    except Exception as e:
        return {"error": str(e)}, 500

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "edit":
                # Handle text editing
                filename = message["filename"]
                content = message["content"]  # Full content for saving
                cursor_position = message.get("cursor_position", 0)  # Original cursor position
                
                # Save the file
                file_path = Path("text_files") / filename
                try:
                    async with aiofiles.open(file_path, mode='w', encoding='utf-8') as f:
                        await f.write(content)
                    
                    # For predictions on save, we'll skip it since frontend handles predictions separately
                    # This keeps save operations fast and prediction requests separate
                    
                    # Send response back
                    response = {
                        "type": "edit_response",
                        "filename": filename,
                        "success": True,
                        "cursor_position": cursor_position
                    }
                    await manager.send_personal_message(response, websocket)
                    
                except Exception as e:
                    error_response = {
                        "type": "error",
                        "message": f"Failed to save file: {str(e)}"
                    }
                    await manager.send_personal_message(error_response, websocket)
            
            elif message["type"] == "prediction_request":
                # Handle structured prediction requests
                prev_context = message.get("prevContext", "")
                current_text = message.get("currentText", "")
                after_context = message.get("afterContext", "")
                cursor = message.get("cursor", 0)  # Relative position within current text
                metadata = message.get("metadata", {})
                
                prediction = await predict_next_tokens_structured(
                    prev_context, current_text, after_context, cursor, metadata
                )
                
                response = {
                    "type": "prediction_response",
                    "prediction": prediction,
                    "cursor_position": cursor,
                    "metadata": metadata
                }
                await manager.send_personal_message(response, websocket)
            
            elif message["type"] == "spell_check_request":
                # Handle spell check requests for lines
                lines = message.get("lines", [])
                language = message.get("language", "en")
                
                # Check each line for spelling errors
                all_errors = {}
                for line_index, line_text in enumerate(lines):
                    if line_text.strip():  # Only check non-empty lines
                        errors = await spell_check_line(line_text, language)
                        if errors:
                            all_errors[line_index] = errors
                
                response = {
                    "type": "spell_check_response",
                    "errors": all_errors,
                    "language": language
                }
                await manager.send_personal_message(response, websocket)

            elif message["type"] == "add_word":
                # Add word to user's custom dictionary
                word = message.get("word", "")
                if word:
                    await add_word_to_dictionary(word)
                    
                    response = {
                        "type": "dictionary_updated",
                        "word": word,
                        "success": True
                    }
                    await manager.send_personal_message(response, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
