// ============================================================
// Paquito Hub — Terminal Route
// POST /api/terminal — Hybrid classifier + executor
// ============================================================

const express = require('express');
const router = express.Router();
const { classifyTerminal } = require('../services/terminal');
const { runAction } = require('../services/executor');

router.post('/', async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere el campo "message"'
        });
    }

    try {
        const classification = await classifyTerminal(message.trim());

        // No action found
        if (!classification.action) {
            return res.json({
                success: false,
                mode: classification.mode,
                action: null,
                error: classification.error || 'No he entendido el comando.',
                timestamp: new Date().toISOString()
            });
        }

        // Execute whitelisted action
        try {
            const output = await runAction(classification.action);
            return res.json({
                success: true,
                mode: classification.mode,
                action: classification.action,
                output: output,
                timestamp: new Date().toISOString()
            });
        } catch (execError) {
            return res.json({
                success: false,
                mode: classification.mode,
                action: classification.action,
                error: String(execError),
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('[Terminal Route] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno procesando el comando.',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
