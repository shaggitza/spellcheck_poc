"""
API Routes package - Contains all API route modules.
"""

from .websocket import router as websocket_router
from .files import router as files_router
from .settings import router as settings_router
from .events import router as events_router

__all__ = [
    "websocket_router",
    "files_router", 
    "settings_router",
    "events_router"
]