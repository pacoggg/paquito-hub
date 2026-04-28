// ============================================================
// Paquito Hub — Ollama Routes
// AI chat and natural language command processing
// ============================================================

const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');
const { classify, chat } = require('../services/classifier');
const { runAction } = require('../services/executor');

// POST /chat — Smart chat that can classify and execute actions
router.post('/chat', async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere el campo "message"'
        });
    }

    try {
        // First, classify the intent
        const classification = await classify(message);

        // If it's a system action with reasonable confidence, execute it
        if (classification.action !== 'chat' && classification.confidence !== 'low') {
            try {
                const output = await runAction(classification.action);
                return res.json({
                    success: true,
                    type: 'action',
                    action: classification.action,
                    confidence: classification.confidence,
                    output,
                    timestamp: new Date().toISOString()
                });
            } catch (actionError) {
                return res.json({
                    success: false,
                    type: 'action',
                    action: classification.action,
                    error: String(actionError),
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Otherwise, just chat
        const response = await chat(message, history);
        res.json({
            success: true,
            type: 'chat',
            response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Error procesando el mensaje',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /models — List available Ollama models
router.get('/models', async (req, res) => {
    try {
        const response = await axios.get(`${config.ollama.baseUrl}/api/tags`, { timeout: 5000 });
        res.json({
            success: true,
            models: response.data.models || [],
            currentModel: config.ollama.model
        });
    } catch (error) {
        res.json({
            success: false,
            error: 'No se pudo conectar con Ollama',
            models: [],
            currentModel: config.ollama.model
        });
    }
});

// GET /status — Check if Ollama is reachable
router.get('/status', async (req, res) => {
    try {
        await axios.get(`${config.ollama.baseUrl}/api/tags`, { timeout: 5000 });
        res.json({ success: true, online: true });
    } catch (error) {
        res.json({ success: true, online: false });
    }
});

module.exports = router;
