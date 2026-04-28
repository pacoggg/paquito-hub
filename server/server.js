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
const terminalRoutes = require('./routes/terminal');

app.use('/api/action', actionRoutes);
app.use('/api/openclaw', openclawRoutes);
app.use('/api/ollama', ollamaRoutes);
app.use('/api/terminal', terminalRoutes);

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

// SPA fallback removed from here, moved to the bottom

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
    if (out === 'TIMEOUT') return "TIMEOUT";
    if (!out) return "ERROR";
    console.log("[Overview] raw check_paquito_status:\n", out);
    
    // Buscar si hay algún proceso "openclaw" ignorando el propio comando de chequeo
    const lines = out.split('\n');
    for (const line of lines) {
        if (line.includes('bash -c') || line.includes('echo') || line.toLowerCase().includes('no detectado')) {
            continue;
        }
        if (/openclaw/i.test(line)) {
            return "ONLINE";
        }
    }
    return "OFFLINE";
}

function parseProxmoxVMs(out) {
    if (out === 'TIMEOUT') return "TIMEOUT";
    if (!out) return "ERROR";
    try {
        const lower = out.toLowerCase();
        const lines = lower.split('\n');
        
        let ctRunning = 0;
        let vmRunning = 0;
        let vmStopped = 0;
        let isVmSection = false;

        for (const line of lines) {
            if (line.includes('--- vms qemu ---')) {
                isVmSection = true;
                continue;
            }
            if (line.includes('running')) {
                if (isVmSection) vmRunning++;
                else ctRunning++;
            } else if (line.includes('stopped')) {
                if (isVmSection) vmStopped++;
            }
        }
        return `${ctRunning} CT running / ${vmRunning} VM running / ${vmStopped} VM stopped`;
    } catch (e) {
        console.error("Error parseando Proxmox VMs:", e);
        return "ERROR_PARSE";
    }
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
                results[action] = await runActionWithTimeout(action, 15000); // 15s timeout
            } catch (err) {
                console.error(`[Overview] Action ${action} failed:`, err);
                if (err && err.message === 'Timeout') {
                    results[action] = 'TIMEOUT';
                } else {
                    results[action] = null;
                }
            }
        })
    );

    res.json({
        status: "ok",
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
            storage: parseDisk(results['check_proxmox_storage'])
        },
        timestamp: new Date().toISOString()
    });
});

// Fallback for SPA and unmatched API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
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
