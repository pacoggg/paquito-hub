// ============================================================
// 🧠 Paquito Hub — Main Server
// Express backend serving the dashboard and API routes
// ============================================================

const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'app')));

// API Routes
const actionRoutes = require('./routes/action');
const openclawRoutes = require('./routes/openclaw');
const ollamaRoutes = require('./routes/ollama');

app.use('/api/action', actionRoutes);
app.use('/api/openclaw', openclawRoutes);
app.use('/api/ollama', ollamaRoutes);

// Health check endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        name: 'Paquito Hub',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Aggregated system info endpoint (for dashboard cards)
const { runAction } = require('./services/executor');

app.get('/api/system-info', async (req, res) => {
    const results = {};

    const checks = ['check_hub_ram', 'check_hub_disk', 'check_dns', 'check_paquito_status', 'check_paquito_ram', 'check_paquito_disk', 'check_paquito_dns', 'check_ollama'];

    await Promise.allSettled(
        checks.map(async (check) => {
            try {
                results[check] = { success: true, output: await runAction(check) };
            } catch (err) {
                results[check] = { success: false, error: String(err) };
            }
        })
    );

    res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
    });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'app', 'index.html'));
});

// Start server
app.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   🧠 Paquito Hub v1.0.0                 ║
║   Servidor corriendo en puerto ${config.port}       ║
║   http://localhost:${config.port}                 ║
╚══════════════════════════════════════════╝
    `);
});
