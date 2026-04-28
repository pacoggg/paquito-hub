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
    check_dns: 'check_dns.sh',
    check_openclaw: 'check_openclaw.sh',
    logs_openclaw: 'logs_openclaw.sh',
    restart_openclaw: 'restart_openclaw.sh',
    check_paquito_status: 'check_paquito_status.sh',
    check_paquito_ram: 'check_paquito_ram.sh',
    check_paquito_disk: 'check_paquito_disk.sh',
    check_paquito_dns: 'check_paquito_dns.sh',
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
