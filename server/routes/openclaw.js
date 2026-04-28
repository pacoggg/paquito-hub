// ============================================================
// Paquito Hub — OpenClaw Routes
// Dedicated endpoints for OpenClaw service management
// ============================================================

const express = require('express');
const router = express.Router();
const { runAction } = require('../services/executor');

// GET /status — Check OpenClaw status
router.get('/status', async (req, res) => {
    try {
        const output = await runAction('check_openclaw');
        const isRunning = output.toLowerCase().includes('active (running)');
        res.json({
            success: true,
            service: 'openclaw',
            running: isRunning,
            output,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: false,
            service: 'openclaw',
            running: false,
            error: String(error),
            timestamp: new Date().toISOString()
        });
    }
});

// POST /restart — Restart OpenClaw
router.post('/restart', async (req, res) => {
    try {
        const output = await runAction('restart_openclaw');
        res.json({
            success: true,
            action: 'restart',
            output,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            action: 'restart',
            error: String(error),
            timestamp: new Date().toISOString()
        });
    }
});

// GET /logs — Get OpenClaw logs
router.get('/logs', async (req, res) => {
    try {
        const output = await runAction('logs_openclaw');
        res.json({
            success: true,
            logs: output,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: String(error),
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
