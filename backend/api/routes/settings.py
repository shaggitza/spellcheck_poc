"""
Settings API router - Handles user settings and preferences.

This module provides REST endpoints for managing user settings,
spell checker configurations, and application preferences.
"""

import json
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
import aiofiles

router = APIRouter()

# Settings file path
SETTINGS_FILE = Path("user_settings.json")


class UserSettings(BaseModel):
    """User settings model."""
    
    # Spell checking preferences
    spell_check_enabled: bool = Field(default=True, description="Enable spell checking")
    spell_check_engine: str = Field(default="auto", description="Preferred spell check engine")
    spell_check_language: str = Field(default="en", description="Language for spell checking")
    spell_check_auto_correct: bool = Field(default=False, description="Enable auto-correction")
    
    # Prediction preferences  
    predictions_enabled: bool = Field(default=True, description="Enable text predictions")
    prediction_engine: str = Field(default="frequency_based", description="Preferred prediction engine")
    max_predictions: int = Field(default=5, ge=1, le=20, description="Maximum number of predictions")
    prediction_trigger_length: int = Field(default=3, ge=1, le=10, description="Min characters before triggering predictions")
    
    # UI preferences
    theme: str = Field(default="light", description="UI theme")
    font_size: int = Field(default=14, ge=8, le=32, description="Editor font size")
    line_numbers: bool = Field(default=True, description="Show line numbers")
    word_wrap: bool = Field(default=True, description="Enable word wrapping")
    auto_save: bool = Field(default=True, description="Enable auto-save")
    auto_save_interval: int = Field(default=30, ge=5, le=300, description="Auto-save interval in seconds")
    
    # Advanced settings
    debug_mode: bool = Field(default=False, description="Enable debug mode")
    performance_monitoring: bool = Field(default=False, description="Enable performance monitoring")
    
    class Config:
        json_schema_extra = {
            "example": {
                "spell_check_enabled": True,
                "spell_check_engine": "pyspellchecker",
                "spell_check_language": "en",
                "predictions_enabled": True,
                "prediction_engine": "frequency_based",
                "max_predictions": 5,
                "theme": "light",
                "font_size": 14,
                "auto_save": True
            }
        }


class SettingsResponse(BaseModel):
    """Response model for settings operations."""
    
    success: bool
    message: Optional[str] = None
    settings: Optional[UserSettings] = None
    validation_errors: Optional[List[str]] = None


async def load_settings() -> UserSettings:
    """Load user settings from file or return defaults."""
    try:
        if SETTINGS_FILE.exists():
            async with aiofiles.open(SETTINGS_FILE, 'r') as f:
                settings_data = json.loads(await f.read())
                return UserSettings(**settings_data)
        else:
            # Return default settings
            return UserSettings()
    except Exception as e:
        print(f"⚠️  Failed to load settings: {e}, using defaults")
        return UserSettings()


async def save_settings(settings: UserSettings) -> bool:
    """Save user settings to file."""
    try:
        async with aiofiles.open(SETTINGS_FILE, 'w') as f:
            await f.write(settings.json(indent=2))
        return True
    except Exception as e:
        print(f"⚠️  Failed to save settings: {e}")
        return False


@router.get("/api/settings", response_model=SettingsResponse)
async def get_settings():
    """
    Get current user settings.
    
    Returns:
        Current user settings
    """
    try:
        settings = await load_settings()
        return SettingsResponse(
            success=True,
            message="Settings loaded successfully",
            settings=settings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load settings: {str(e)}")


@router.post("/api/settings", response_model=SettingsResponse)
async def update_settings(settings: UserSettings):
    """
    Update user settings.
    
    Args:
        settings: New user settings
        
    Returns:
        Update confirmation with saved settings
    """
    try:
        # Validate settings
        validation_errors = []
        
        # Validate spell check engine
        valid_engines = ["auto", "pyspellchecker", "hunspell", "neuspell", "autocorrect"]
        if settings.spell_check_engine not in valid_engines:
            validation_errors.append(f"Invalid spell check engine. Must be one of: {valid_engines}")
        
        # Validate prediction engine
        valid_prediction_engines = ["frequency_based", "mock_ai", "statistical"]
        if settings.prediction_engine not in valid_prediction_engines:
            validation_errors.append(f"Invalid prediction engine. Must be one of: {valid_prediction_engines}")
        
        # Validate theme
        valid_themes = ["light", "dark", "auto"]
        if settings.theme not in valid_themes:
            validation_errors.append(f"Invalid theme. Must be one of: {valid_themes}")
        
        # Validate language
        valid_languages = ["en", "es", "fr", "de", "it", "pt", "ru", "pl", "nl"]
        if settings.spell_check_language not in valid_languages:
            validation_errors.append(f"Invalid language. Must be one of: {valid_languages}")
        
        if validation_errors:
            return SettingsResponse(
                success=False,
                message="Settings validation failed",
                validation_errors=validation_errors
            )
        
        # Save settings
        saved = await save_settings(settings)
        
        if saved:
            return SettingsResponse(
                success=True,
                message="Settings saved successfully", 
                settings=settings
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to save settings")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")


@router.patch("/api/settings", response_model=SettingsResponse)
async def patch_settings(partial_settings: Dict[str, Any]):
    """
    Partially update user settings.
    
    Args:
        partial_settings: Dictionary with settings to update
        
    Returns:
        Update confirmation with merged settings
    """
    try:
        # Load current settings
        current_settings = await load_settings()
        
        # Apply partial updates
        settings_dict = current_settings.dict()
        settings_dict.update(partial_settings)
        
        # Create new settings object with validation
        updated_settings = UserSettings(**settings_dict)
        
        # Save updated settings
        saved = await save_settings(updated_settings)
        
        if saved:
            return SettingsResponse(
                success=True,
                message="Settings updated successfully",
                settings=updated_settings
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to save settings")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to patch settings: {str(e)}")


@router.delete("/api/settings")
async def reset_settings():
    """
    Reset settings to defaults.
    
    Returns:
        Confirmation with default settings
    """
    try:
        default_settings = UserSettings()
        saved = await save_settings(default_settings)
        
        if saved:
            return SettingsResponse(
                success=True,
                message="Settings reset to defaults",
                settings=default_settings
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to reset settings")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset settings: {str(e)}")


@router.get("/api/settings/available-options")
async def get_available_options():
    """
    Get available options for settings fields.
    
    Returns:
        Dictionary with available options for each setting
    """
    from ...spellcheckers import spell_checker_factory
    from ...engines.prediction_engines import PREDICTION_ENGINES
    
    try:
        # Get available spell checkers
        spell_status = spell_checker_factory.get_status()
        available_spell_engines = ["auto"] + [
            engine for engine, status in spell_status.items() 
            if status.get("available", False)
        ]
        
        return {
            "spell_check_engines": available_spell_engines,
            "prediction_engines": list(PREDICTION_ENGINES.keys()),
            "themes": ["light", "dark", "auto"],
            "languages": ["en", "es", "fr", "de", "it", "pt", "ru", "pl", "nl"],
            "font_sizes": list(range(8, 33)),
            "auto_save_intervals": [5, 10, 15, 30, 60, 120, 300]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available options: {str(e)}")


@router.get("/api/settings/validate")
async def validate_settings(
    spell_check_engine: Optional[str] = None,
    prediction_engine: Optional[str] = None,
    theme: Optional[str] = None,
    language: Optional[str] = None
):
    """
    Validate specific setting values without saving.
    
    Args:
        spell_check_engine: Spell check engine to validate
        prediction_engine: Prediction engine to validate
        theme: Theme to validate
        language: Language to validate
        
    Returns:
        Validation results for each provided setting
    """
    results = {}
    
    try:
        if spell_check_engine:
            valid_engines = ["auto", "pyspellchecker", "hunspell", "neuspell", "autocorrect"]
            results["spell_check_engine"] = {
                "valid": spell_check_engine in valid_engines,
                "options": valid_engines
            }
        
        if prediction_engine:
            from ...engines.prediction_engines import PREDICTION_ENGINES
            valid_engines = list(PREDICTION_ENGINES.keys())
            results["prediction_engine"] = {
                "valid": prediction_engine in valid_engines,
                "options": valid_engines
            }
        
        if theme:
            valid_themes = ["light", "dark", "auto"]
            results["theme"] = {
                "valid": theme in valid_themes,
                "options": valid_themes
            }
        
        if language:
            valid_languages = ["en", "es", "fr", "de", "it", "pt", "ru", "pl", "nl"]
            results["language"] = {
                "valid": language in valid_languages,
                "options": valid_languages
            }
        
        return {
            "success": True,
            "validation_results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")