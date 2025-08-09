"""
Main FastAPI application - Integrates all components with modular architecture.

This is the main application file that combines the EDA framework, modular
spellcheckers, prediction engines, and API routes into a cohesive system.
"""

import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Import our modular components
from backend.spellcheckers import spell_checker_factory
from backend.handlers import event_router
from backend.handlers.spellcheck_handler import spellcheck_handler
from backend.handlers.additional_handlers import (
    prediction_handler, 
    dictionary_handler, 
    health_check_handler
)

# Import API routers
from backend.api.routes import (
    websocket_router,
    files_router,
    settings_router, 
    events_router
)

# Create FastAPI app
app = FastAPI(
    title="Text Editor with AI Writing Assistance",
    description="A modern text editor with EDA architecture, modular spell checking, and AI predictions",
    version="2.0.0"
)

# Create necessary directories
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)
os.makedirs("text_files", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup Jinja2 templates
templates = Jinja2Templates(directory="templates")


@app.on_event("startup")
async def startup_event():
    """Initialize application components on startup."""
    print("🚀 Initializing Text Editor with AI Writing Assistance...")
    
    # Initialize spellchecker factory with all available providers
    print("📚 Initializing spell checkers...")
    spell_results = await spell_checker_factory.initialize_all(language="en")
    
    available_count = sum(1 for success in spell_results.values() if success)
    total_count = len(spell_results)
    
    print(f"✅ Spell checkers initialized: {available_count}/{total_count} available")
    for provider, success in spell_results.items():
        status = "✅" if success else "❌"
        print(f"   {status} {provider.value}")
    
    # Register event handlers with the EDA router
    print("🔄 Registering EDA event handlers...")
    event_router.register_handler(spellcheck_handler)
    event_router.register_handler(prediction_handler)
    event_router.register_handler(dictionary_handler)
    event_router.register_handler(health_check_handler)
    
    handlers_count = len(event_router.get_registered_handlers())
    print(f"✅ EDA event handlers registered: {handlers_count}")
    
    print("✅ Application initialization complete!")


@app.on_event("shutdown") 
async def shutdown_event():
    """Clean up resources on shutdown."""
    print("🛑 Shutting down application...")
    
    # Clean up spell checkers
    await spell_checker_factory.cleanup_all()
    
    print("✅ Application shutdown complete!")


# Include API routers
app.include_router(websocket_router, tags=["WebSocket"])
app.include_router(files_router, tags=["Files"])
app.include_router(settings_router, tags=["Settings"])
app.include_router(events_router, tags=["Events"])


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main application interface."""
    return templates.TemplateResponse("editor.html", {"request": request})


@app.get("/api/status")
async def get_application_status():
    """
    Get overall application status and component health.
    
    Returns:
        Application status with component details
    """
    # Get spell checker status
    spell_status = spell_checker_factory.get_status()
    available_spell_checkers = sum(1 for status in spell_status.values() if status["available"])
    
    # Get EDA handler status
    handlers_info = event_router.get_registered_handlers()
    subscription_info = event_router.get_subscription_info()
    
    # Get prediction engines status
    from backend.engines.prediction_engines import PREDICTION_ENGINES
    prediction_engines_count = len(PREDICTION_ENGINES)
    
    return {
        "status": "healthy",
        "version": "2.0.0",
        "components": {
            "spell_checkers": {
                "available": available_spell_checkers,
                "total": len(spell_status),
                "providers": spell_status
            },
            "prediction_engines": {
                "available": prediction_engines_count,
                "total": prediction_engines_count,
                "engines": list(PREDICTION_ENGINES.keys())
            },
            "eda_framework": {
                "handlers": len(handlers_info),
                "active_connections": subscription_info["total_connections"],
                "total_subscriptions": subscription_info["total_subscriptions"]
            }
        },
        "features": {
            "eda_architecture": True,
            "modular_spellcheckers": True,
            "websocket_support": True,
            "file_management": True,
            "user_settings": True,
            "backward_compatibility": True
        }
    }


@app.get("/api/health")
async def health_check():
    """
    Simple health check endpoint.
    
    Returns:
        Basic health status
    """
    return {
        "status": "healthy",
        "message": "Text Editor with AI Writing Assistance is running"
    }


# Legacy compatibility endpoints (if needed)
@app.get("/dashboard")
async def dashboard_redirect():
    """Redirect to main interface for backward compatibility."""
    return {"message": "Dashboard functionality integrated into main interface", "redirect": "/"}


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Text Editor with AI Writing Assistance...")
    uvicorn.run(app, host="0.0.0.0", port=8000)