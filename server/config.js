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
    llm: {
        url: process.env.LLM_URL || 'http://192.168.1.146:8080/v1/chat/completions',
        model: process.env.LLM_MODEL || 'qwen2.5-1.5b-instruct',
        timeout: parseInt(process.env.LLM_TIMEOUT_MS, 10) || 20000
    },
    scriptsDir: process.env.SCRIPTS_DIR || './scripts'
};
