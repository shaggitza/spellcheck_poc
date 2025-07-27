"""
Basic tests for the spellcheck_poc application.
These tests ensure the main application module can be imported and basic functionality works.
"""

from unittest.mock import patch

import pytest


def test_import_main():
    """Test that the main module can be imported successfully."""
    try:
        import main

        assert main is not None
    except ImportError as e:
        pytest.fail(f"Failed to import main module: {e}")


@pytest.mark.asyncio
async def test_predict_next_tokens_structured():
    """Test the structured prediction function."""
    import main

    # Test basic prediction
    result = await main.predict_next_tokens_structured(
        prev_context="", current_text="hello ", after_context="", cursor=6, metadata={}
    )

    assert isinstance(result, str)
    assert len(result) > 0


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
