"""
Basic tests for the spellcheck_poc application.
These tests ensure the main application module can be imported and basic functionality works.
"""

from unittest.mock import patch

import pytest


def test_import_main():
    """Test that the main module can be imported successfully."""
    try:
        from backend.api import main

        assert main is not None
    except ImportError as e:
        pytest.fail(f"Failed to import main module: {e}")


@pytest.mark.asyncio
async def test_predict_next_tokens_structured():
    """Test the structured prediction function."""
    import main

    # Mock database settings to avoid real database dependency
    with patch("main.get_user_setting") as mock_get_setting:
        # Configure mock to return default values for settings
        async def mock_setting_side_effect(setting_key, default_value=None):
            if setting_key == "prediction_engine":
                return "mock_ai"
            elif setting_key == "prediction_enabled":
                return "true"
            return default_value

        mock_get_setting.side_effect = mock_setting_side_effect

        # Test basic prediction
        result = await main.predict_next_tokens_structured(
            prev_context="", current_text="hello ", after_context="", cursor=6, metadata={}
        )

        assert isinstance(result, str)
        assert len(result) > 0
        
        # Verify that settings were queried
        mock_get_setting.assert_any_call("prediction_engine", "mock_ai")
        mock_get_setting.assert_any_call("prediction_enabled", "true")


@pytest.mark.asyncio
async def test_spell_check_word_with_engine():
    """Test spell checking functionality."""
    import main

    # Test a correctly spelled word
    is_correct, suggestions = await main.spell_check_word_with_engine("hello", "pyspellchecker")
    assert is_correct is True
    assert suggestions == []

    # Test a misspelled word
    is_correct, suggestions = await main.spell_check_word_with_engine("helo", "pyspellchecker")
    assert is_correct is False
    assert isinstance(suggestions, list)


@pytest.mark.asyncio 
async def test_spell_check_word_with_autocorrect():
    """Test autocorrect spell checking functionality."""
    import main
    
    # Only run if autocorrect is available
    if main.AUTOCORRECT_AVAILABLE and main.autocorrect_checker:
        # Test a correctly spelled word
        is_correct, suggestions = await main.spell_check_word_with_engine("hello", "autocorrect")
        assert is_correct is True
        assert suggestions == []

        # Test a misspelled word that should be corrected
        is_correct, suggestions = await main.spell_check_word_with_engine("teh", "autocorrect")
        assert is_correct is False
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
        # The first suggestion should be "the"
        assert "the" in suggestions
        
        # Test another misspelled word
        is_correct, suggestions = await main.spell_check_word_with_engine("recieve", "autocorrect")
        assert is_correct is False
        assert isinstance(suggestions, list)
        assert "receive" in suggestions
    else:
        # Skip test if autocorrect is not available
        pytest.skip("Autocorrect library not available")


def test_hash_line():
    """Test line hashing function."""
    import main

    hash1 = main.hash_line("test line")
    hash2 = main.hash_line("test line")
    hash3 = main.hash_line("different line")

    assert hash1 == hash2  # Same input should produce same hash
    assert hash1 != hash3  # Different input should produce different hash
    assert len(hash1) == 64  # SHA256 hash should be 64 characters


def test_app_creation():
    """Test that the FastAPI app is created properly."""
    import main

    assert main.app is not None
    assert hasattr(main.app, "routes")
    assert len(main.app.routes) > 0


@pytest.mark.asyncio
async def test_init_database():
    """Test database initialization."""
    import os
    import tempfile

    import main

    # Use a temporary database file for testing
    with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp_file:
        temp_db_path = tmp_file.name

    # Patch the DB_PATH for this test
    with patch.object(main, "DB_PATH", temp_db_path):
        try:
            await main.init_database()
            # If we get here without exception, the database was initialized successfully
            assert os.path.exists(temp_db_path)
        finally:
            # Clean up
            if os.path.exists(temp_db_path):
                os.unlink(temp_db_path)


if __name__ == "__main__":
    pytest.main([__file__])
