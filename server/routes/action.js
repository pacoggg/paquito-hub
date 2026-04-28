// ============================================================
// Paquito Hub — Action Routes
// POST /api/action — Execute a system action
// ============================================================

const express = require('express');
const router = express.Router();
const { runAction, getAvailableActions } = require('../services/executor');

// POST / — Execute an action
router.post('/', async (req, res) => {
    const { action } = req.body;

    if (!action) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere el campo "action"',
            available: getAvailableActions()
        });
    }

    try {
        const output = await runAction(action);
        res.json({
            success: true,
            action,
            output,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            action,
            error: String(error),
            timestamp: new Date().toISOString()
        });
    }
});

// GET /available — List available actions
router.get('/available', (req, res) => {
    res.json({
        actions: getAvailableActions()
    });
});

module.exports = router;
