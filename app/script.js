// ============================================================
// 🧠 Paquito Hub — Frontend Logic
// Dashboard interactions, API calls, polling, chat
// ============================================================

const API = '';
let chatHistory = [];

// ── Utilities ──
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

// ── Toast Notifications ──
function toast(message, type = 'info') {
    const container = $('.toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// ── Console Output ──
function consoleLog(text, type = '') {
    const out = $('#console-output');
    const line = document.createElement('span');
    line.className = type;
    line.textContent = text + '\n';
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

function consoleClear() {
    $('#console-output').innerHTML = '<span class="info">Consola lista. Ejecuta una acción para ver resultados.\n</span>';
}

// ── API Calls ──
async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API}${endpoint}`);
        return await res.json();
    } catch (e) {
        console.error(`GET ${endpoint}:`, e);
        return { success: false, error: e.message };
    }
}

async function apiPost(endpoint, body) {
    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (e) {
        console.error(`POST ${endpoint}:`, e);
        return { success: false, error: e.message };
    }
}

// ── Execute Action ──
async function runAction(action) {
    consoleLog(`$ Ejecutando: ${action}...`, 'prompt');
    const data = await apiPost('/api/action', { action });
    if (data.success) {
        consoleLog(data.output);
        toast(`✓ ${action} completado`, 'success');
    } else {
        consoleLog(`Error: ${data.error}`, 'error');
        toast(`✗ ${action} falló`, 'error');
    }
    return data;
}

// ── Metric Cards ──
function updateMetric(id, value) {
    const el = document.getElementById(`metric-${id}`);
    if (el) {
        el.textContent = value;
        el.classList.remove('loading');
    }
}

async function refreshMetrics() {
    $$('.metric-value').forEach(el => { el.classList.add('loading'); el.textContent = '...'; });

    // Server status
    const status = await apiGet('/api/status');
    const dot = $('#server-dot');
    const label = $('#server-label');
    if (status.status === 'ok') {
        dot.classList.remove('offline');
        label.textContent = 'Online';
        updateMetric('uptime', formatUptime(status.uptime));
    } else {
        dot.classList.add('offline');
        label.textContent = 'Offline';
    }

    // System info
    const sys = await apiGet('/api/system-info');
    if (sys.success) {
        const d = sys.data;
        updateMetric('ram', d.check_ram?.success ? parseRAM(d.check_ram.output) : 'N/A');
        updateMetric('disk', d.check_disk?.success ? parseDisk(d.check_disk.output) : 'N/A');
        updateMetric('dns', d.check_dns?.success ? '● OK' : '✗ Fail');
        updateMetric('containers', d.check_containers?.success ? parseCT(d.check_containers.output) : 'N/A');
    }

    // Ollama status
    const ollama = await apiGet('/api/ollama/status');
    updateMetric('ollama', ollama.online ? '● Online' : '✗ Offline');
    const badge = $('#openclaw-badge');
    // OpenClaw status
    const oc = await apiGet('/api/openclaw/status');
    if (badge) {
        badge.textContent = oc.running ? 'RUNNING' : 'STOPPED';
        badge.className = `panel-badge ${oc.running ? 'badge-online' : 'badge-offline'}`;
    }
}

// ── Parsers ──
function parseRAM(output) {
    const lines = output.split('\n');
    const mem = lines.find(l => l.startsWith('Mem:'));
    if (!mem) return output.substring(0, 20);
    const parts = mem.split(/\s+/);
    return `${parts[2]} / ${parts[1]}`;
}

function parseDisk(output) {
    const lines = output.split('\n');
    const root = lines.find(l => l.includes(' /$') || l.endsWith('/'));
    if (!root) return 'Ver consola';
    const parts = root.split(/\s+/);
    return parts[4] || parts[3] || 'Ver consola';
}

function parseCT(output) {
    const lines = output.trim().split('\n').filter(l => l.trim());
    return `${Math.max(0, lines.length - 1)} CTs`;
}

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── OpenClaw Controls ──
async function ocStatus() { await runAction('check_openclaw'); }
async function ocRestart() {
    if (!confirm('¿Reiniciar OpenClaw?')) return;
    await runAction('restart_openclaw');
    setTimeout(refreshMetrics, 3000);
}
async function ocLogs() { await runAction('logs_openclaw'); }
async function checkDNS() { await runAction('check_dns'); }
async function checkDisk() { await runAction('check_disk'); }
async function checkRAM() { await runAction('check_ram'); }
async function checkContainers() { await runAction('check_containers'); }

// ── AI Chat ──
async function sendChat() {
    const input = $('#chat-input');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    addChatMsg(message, 'user');
    chatHistory.push({ role: 'user', content: message });

    const btn = $('#chat-send-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    const data = await apiPost('/api/ollama/chat', { message, history: chatHistory.slice(-10) });

    btn.disabled = false;
    btn.textContent = 'Enviar';

    if (data.success) {
        if (data.type === 'action') {
            addChatMsg(`⚡ Ejecutado: ${data.action}`, 'system');
            consoleLog(`$ ${data.action}`, 'prompt');
            consoleLog(data.output || data.error || 'Sin output');
            chatHistory.push({ role: 'assistant', content: `Ejecuté: ${data.action}` });
        } else {
            addChatMsg(data.response, 'assistant');
            chatHistory.push({ role: 'assistant', content: data.response });
        }
    } else {
        addChatMsg('⚠ ' + (data.error || 'Error de conexión con Ollama'), 'system');
    }
}

function addChatMsg(text, role) {
    const container = $('#chat-messages');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    consoleClear();
    refreshMetrics();
    setInterval(refreshMetrics, 30000);

    $('#chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });

    addChatMsg('¡Hola! Soy Paquito 🧠 Tu asistente de sistema. Escribe algo como "reinicia openclaw" o hazme una pregunta.', 'assistant');
});
