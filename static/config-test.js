/**
 * Configuration Test Script
 * Verify that all configuration values are properly loaded and accessible
 */

function testConfiguration() {
    console.log('🧪 Testing Configuration...');

    // Test that CONFIG is available
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG is not defined!');
        return false;
    }

    console.log('✅ CONFIG is available');

    // Test key configuration sections
    const requiredSections = [
        'TIMING',
        'UI',
        'TEXT',
        'FILES',
        'WEBSOCKET',
        'SPELL_CHECK',
        'PREDICTION',
        'PERFORMANCE',
        'DEBUG',
        'SELECTORS',
        'CSS_CLASSES',
        'EVENTS',
        'MESSAGES',
        'SHORTCUTS',
    ];

    for (const section of requiredSections) {
        if (!CONFIG[section]) {
            console.error(`❌ CONFIG.${section} is missing!`);
            return false;
        }
        console.log(`✅ CONFIG.${section} is available`);
    }

    // Test specific values
    console.log('🔍 Testing specific configuration values:');
    console.log(`  Save debounce: ${CONFIG.TIMING.SAVE_DEBOUNCE}ms`);
    console.log(`  File extension: ${CONFIG.FILES.EXTENSION}`);
    console.log(`  Spell check language: ${CONFIG.SPELL_CHECK.DEFAULT_LANGUAGE}`);
    console.log(`  Current suggestion selector: ${CONFIG.SELECTORS.CURRENT_SUGGESTION}`);

    // Test that objects are frozen (immutable)
    try {
        CONFIG.TIMING.SAVE_DEBOUNCE = 9999;
        if (CONFIG.TIMING.SAVE_DEBOUNCE === 9999) {
            console.warn('⚠️ CONFIG is not properly frozen - values can be modified!');
        } else {
            console.log('✅ CONFIG is properly frozen and immutable');
        }
    } catch {
        console.log('✅ CONFIG is properly frozen and immutable');
    }

    console.log('🎉 Configuration test completed successfully!');
    return true;
}

// Auto-run test when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testConfiguration);
} else {
    testConfiguration();
}
