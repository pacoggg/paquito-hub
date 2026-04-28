// ============================================================
// Paquito Hub — Executor Service
// Maps action names to bash scripts and executes them safely
// ============================================================

const { exec } = require('child_process');
const path = require('path');
const config = require('../config');

const actions = {
    check_hub_ram: 'check_hub_ram.sh',
    check_hub_disk: 'check_hub_disk.sh',
    check_hub_dns: 'check_hub_dns.sh',
    check_paquito_status: 'check_paquito_status.sh',
    check_paquito_logs: 'check_paquito_logs.sh',
    restart_paquito_gateway: 'restart_paquito_gateway.sh',
    check_paquito_ram: 'check_paquito_ram.sh',
    check_paquito_disk: 'check_paquito_disk.sh',
    check_paquito_dns: 'check_paquito_dns.sh',
    check_proxmox_vms: 'check_proxmox_vms.sh',
    check_proxmox_storage: 'check_proxmox_storage.sh',
    check_ollama: 'check_ollama.sh'
};

/**
 * Run a whitelisted system action
 * @param {string} action - The action name to execute
 * @returns {Promise<string>} - stdout of the script
 */
function runAction(action) {
    return new Promise((resolve, reject) => {
        if (!actions[action]) {
            return reject(`Acción no permitida: "${action}". Acciones válidas: ${Object.keys(actions).join(', ')}`);
        }

        const scriptPath = path.resolve(config.scriptsDir, actions[action]);

        console.log(`[Executor] Running: ${action} -> ${scriptPath}`);

        exec(`bash ${scriptPath}`, { timeout: 15000 }, (err, stdout, stderr) => {
            const out = (stdout || '').trim();
            const errOut = (stderr || '').trim();
            const exitCode = err ? err.code || 1 : 0;

            console.log(`[Executor] ${action} exit=${exitCode} stdout=${out.length}B stderr=${errOut.length}B`);

            if (errOut) {
                console.log(`[Executor] ${action} stderr: ${errOut.substring(0, 500)}`);
            }

            // If we got useful stdout, treat as success even if exit code is non-zero
            // (SSH commands often write warnings to stderr but still produce output)
            if (out) {
                resolve(out);
                return;
            }

            // No stdout at all — check if it's a real failure
            if (err) {
                const fullError = [
                    `Script: ${actions[action]}`,
                    `Exit code: ${exitCode}`,
                    errOut ? `Error: ${errOut}` : `Error: ${err.message}`
                ].join('\n');

                console.error(`[Executor] ${action} FAILED:\n${fullError}`);
                return reject(fullError);
            }

            // Exit 0, no stdout — return empty
            resolve('(sin output)');
        });
    });
}

/**
 * Get list of all available actions
 * @returns {string[]}
 */
function getAvailableActions() {
    return Object.keys(actions);
}

module.exports = { runAction, getAvailableActions };
