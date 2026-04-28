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

    const checks = [
        'check_hub_ram', 'check_hub_disk', 'check_hub_dns', 
        'check_paquito_status', 'check_paquito_ram', 'check_paquito_disk', 'check_paquito_dns', 
        'check_proxmox_vms', 'check_proxmox_storage',
        'check_ollama'
    ];

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

// Parsers
function parseRAM(out) {
    if (!out) return "ERROR";
    const mem = out.split('\n').find(l => l.startsWith('Mem:'));
    if (!mem) return "ERROR";
    const parts = mem.split(/\s+/);
    return `${parts[2]} / ${parts[1]}`;
}

function parseDisk(out) {
    if (!out) return "ERROR";
    const root = out.split('\n').find(l => l.match(/\s\/$/));
    if (!root) return "ERROR";
    const parts = root.trim().split(/\s+/);
    return parts[4] || "ERROR";
}

function parseDNS(out) {
    if (!out) return "ERROR";
    return out.includes("falló") ? "FAIL" : "OK";
}

function parsePaquitoStatus(out) {
    if (!out) return "ERROR";
    return (out.includes("openclaw") && !out.includes("no detectado")) ? "ONLINE" : "OFFLINE";
}

function parseProxmoxVMs(out) {
    if (!out) return "ERROR";
    const running = (out.match(/running/g) || []).length;
    const stopped = (out.match(/stopped/g) || []).length;
    return `${running} activos / ${stopped} parados`;
}

function runActionWithTimeout(action, ms = 5000) {
    return Promise.race([
        runAction(action),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

// Overview Endpoint
app.get('/api/overview', async (req, res) => {
    const actions = [
        'check_hub_ram', 'check_hub_disk', 'check_hub_dns',
        'check_paquito_status', 'check_paquito_ram', 'check_paquito_disk', 'check_paquito_dns',
        'check_proxmox_vms', 'check_proxmox_storage'
    ];

    const results = {};
    await Promise.allSettled(
        actions.map(async (action) => {
            try {
                results[action] = await runActionWithTimeout(action, 5000);
            } catch (err) {
                results[action] = null;
            }
        })
    );

    res.json({
        hub: {
            ram: parseRAM(results['check_hub_ram']),
            disk: parseDisk(results['check_hub_disk']),
            dns: parseDNS(results['check_hub_dns'])
        },
        paquito: {
            status: parsePaquitoStatus(results['check_paquito_status']),
            ram: parseRAM(results['check_paquito_ram']),
            disk: parseDisk(results['check_paquito_disk']),
            dns: parseDNS(results['check_paquito_dns'])
        },
        proxmox: {
            vms: parseProxmoxVMs(results['check_proxmox_vms']),
            storage: parseDisk(results['check_proxmox_storage']) // Reuses disk parser for PVE root
        }
    });
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
