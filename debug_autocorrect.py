#!/usr/bin/env python3
"""
Debug the autocorrect candidate logic
"""

from autocorrect import Speller

# Test different thresholds
print("Testing different thresholds:")
for threshold in [0, 1000, 5000, 10000]:
    spell = Speller(lang="en", threshold=threshold)
    candidates = spell.get_candidates("teh")
    corrected = spell.autocorrect_word("teh")
    print(f"Threshold {threshold}: candidates={candidates}, corrected='{corrected}'")