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

        exec(`bash ${scriptPath}`, { timeout: 15000 }, (err, stdout, stderr) => {
            if (err) {
                return reject(stderr || err.message);
            }
            resolve(stdout.trim());
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
