// ============================================================
// Paquito Hub — Configuration
// Centralizes all environment variables and settings
// ============================================================

require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
        model: process.env.OLLAMA_MODEL || 'phi3'
    },
    scriptsDir: process.env.SCRIPTS_DIR || './scripts'
};
