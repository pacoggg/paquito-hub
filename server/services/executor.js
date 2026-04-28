// ============================================================
// Paquito Hub — Executor Service
// Maps action names to bash scripts and executes them safely
// ============================================================

const { exec } = require('child_process');
const path = require('path');
const config = require('../config');

const actions = {
    check_openclaw: 'check_openclaw.sh',
    restart_openclaw: 'restart_openclaw.sh',
    logs_openclaw: 'logs_openclaw.sh',
    check_dns: 'check_dns.sh',
    check_containers: 'check_containers.sh',
    check_disk: 'check_disk.sh',
    check_ram: 'check_ram.sh',
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
