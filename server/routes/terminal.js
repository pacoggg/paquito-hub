// ============================================================
// Paquito Hub — Terminal Route
// POST /api/terminal — Dual-mode: actions + conversational chat
// Includes elapsed_ms for frontend speed indicators
// ============================================================

const express = require('express');
const router = express.Router();
const { processTerminal } = require('../services/terminal');
const { runAction } = require('../services/executor');

router.post('/', async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere el campo "message"'
        });
    }

    const startTime = Date.now();

    try {
        const result = await processTerminal(message.trim());
        const classifyMs = Date.now() - startTime;

        // ── Chat mode: return conversational response ──
        if (result.type === 'chat') {
            return res.json({
                success: true,
                type: 'chat',
                mode: result.mode,
                response: result.response,
                elapsed_ms: classifyMs,
                timestamp: new Date().toISOString()
            });
        }

        // ── Error from classifier ──
        if (result.type === 'error') {
            return res.json({
                success: false,
                type: 'error',
                mode: result.mode,
                error: result.error,
                elapsed_ms: classifyMs,
                timestamp: new Date().toISOString()
            });
        }

        // ── Action mode: execute whitelisted action ──
        try {
            const output = await runAction(result.action);
            const totalMs = Date.now() - startTime;
            return res.json({
                success: true,
                type: 'action',
                mode: result.mode,
                action: result.action,
                output: output,
                elapsed_ms: totalMs,
                timestamp: new Date().toISOString()
            });
        } catch (execError) {
            const totalMs = Date.now() - startTime;
            return res.json({
                success: false,
                type: 'action',
                mode: result.mode,
                action: result.action,
                error: String(execError),
                elapsed_ms: totalMs,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('[Terminal Route] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno procesando el mensaje.',
            elapsed_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
