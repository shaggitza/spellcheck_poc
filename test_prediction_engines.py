"""
Tests for the new prediction engines
"""

import asyncio
import os
import sys

import pytest

# Add the parent directory to the path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# flake8: noqa: E402
from prediction_engines import (
    FrequencyBasedPredictor,
    TraditionalPredictionEngine,
    get_prediction_engine,
)


def test_import_prediction_engines():
    """Test that prediction engines can be imported."""
    from prediction_engines import PREDICTION_ENGINES

    assert "traditional" in PREDICTION_ENGINES
    assert "frequency" in PREDICTION_ENGINES

    # Test engine classes
    engine = TraditionalPredictionEngine()
    assert engine is not None

    freq_engine = FrequencyBasedPredictor()
    assert freq_engine is not None


@pytest.mark.asyncio
async def test_traditional_engine_basic():
    """Test basic functionality of the traditional engine."""
    engine = TraditionalPredictionEngine()

    # Test basic bigram prediction
    result = await engine.predict_next_tokens("", "the ", "", 4)
    assert isinstance(result, str)
    assert len(result) > 0
    print(f"Traditional engine prediction for 'the ': '{result}'")

    # Test partial word completion
    result = await engine.predict_next_tokens("", "th", "", 2)
    assert isinstance(result, str)
    print(f"Traditional engine completion for 'th': '{result}'")


@pytest.mark.asyncio
async def test_frequency_engine_basic():
    """Test basic functionality of the frequency-based engine."""
    engine = FrequencyBasedPredictor()

    # Test basic prediction
    result = await engine.predict_next_tokens("", "the ", "", 4)
    assert isinstance(result, str)
    print(f"Frequency engine prediction for 'the ': '{result}'")

    # Test learning capability
    engine.learn_from_text("the cat sat on the mat. the dog ran in the park.")
    result = await engine.predict_next_tokens("", "the ", "", 4)
    assert isinstance(result, str)
    print(f"Frequency engine prediction after learning: '{result}'")


@pytest.mark.asyncio
async def test_get_prediction_engine():
    """Test the engine factory function."""
    # Test traditional engine
    engine = await get_prediction_engine("traditional")
    assert isinstance(engine, TraditionalPredictionEngine)

    # Test frequency engine
    engine = await get_prediction_engine("frequency")
    assert isinstance(engine, FrequencyBasedPredictor)

    # Test invalid engine
    try:
        await get_prediction_engine("invalid")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass  # Expected


@pytest.mark.asyncio
async def test_prediction_comparison():
    """Compare predictions from different engines."""
    traditional = TraditionalPredictionEngine()
    frequency = FrequencyBasedPredictor()

    test_cases = [
        ("", "hello ", "", 6),
        ("", "the ", "", 4),
        ("", "function ", "", 9),
        ("", "this is a ", "", 10),
    ]

    for prev, current, after, cursor in test_cases:
        trad_result = await traditional.predict_next_tokens(prev, current, after, cursor)
        freq_result = await frequency.predict_next_tokens(prev, current, after, cursor)

        print(f"\nInput: '{current}' (cursor at {cursor})")
        print(f"Traditional: '{trad_result}'")
        print(f"Frequency:   '{freq_result}'")

        assert isinstance(trad_result, str)
        assert isinstance(freq_result, str)


if __name__ == "__main__":
    # Run basic tests
    print("Testing prediction engines...")

    # Test imports
    test_import_prediction_engines()
    print("✅ Import test passed")

    # Test traditional engine
    asyncio.run(test_traditional_engine_basic())
    print("✅ Traditional engine test passed")

    # Test frequency engine
    asyncio.run(test_frequency_engine_basic())
    print("✅ Frequency engine test passed")

    # Test factory function
    asyncio.run(test_get_prediction_engine())
    print("✅ Engine factory test passed")

    # Test comparison
    asyncio.run(test_prediction_comparison())
    print("✅ Prediction comparison test passed")

    print("\n🎉 All tests passed!")
