// ============================================================
// 🧠 Paquito Hub — Frontend Logic
// Dashboard interactions, API calls, polling, chat, tabs
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
    if (!out) return;
    const line = document.createElement('span');
    line.className = type;
    line.textContent = text + '\n';
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

function consoleClear() {
    const out = $('#console-output');
    if (out) out.innerHTML = '<span class="info">Consola lista. Ejecuta una acción para ver resultados.\n</span>';
}

// ── Tab Management ──
function switchTab(tabName) {
    // Buttons
    $$('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = $(`#tab-btn-${tabName}`);
    if (targetBtn) targetBtn.classList.add('active');

    // Content
    $$('.tab-content').forEach(content => content.classList.remove('active'));
    const targetContent = $(`#tab-content-${tabName}`);
    if (targetContent) targetContent.classList.add('active');

    localStorage.setItem('paquito-active-tab', tabName);
}

function toggleFullscreen() {
    document.body.classList.toggle('work-fullscreen');
    const btn = $('.fullscreen-btn');
    if (document.body.classList.contains('work-fullscreen')) {
        btn.textContent = '◶';
    } else {
        btn.textContent = '⛶';
    }
}

// ── Layout Resizer ──
function initResizer() {
    const resizer = $('#column-resizer');
    if (!resizer) return;

    let isDragging = false;

    // Load saved width
    const savedWidth = localStorage.getItem('paquito-left-width');
    if (savedWidth && window.innerWidth > 900) {
        document.documentElement.style.setProperty('--left-width', savedWidth);
    }

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let percentage = (e.clientX / window.innerWidth) * 100;
        
        // Limits
        if (percentage < 32) percentage = 32;
        if (percentage > 68) percentage = 68;

        const value = percentage + '%';
        document.documentElement.style.setProperty('--left-width', value);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';

        const finalWidth = document.documentElement.style.getPropertyValue('--left-width');
        if (finalWidth) {
            localStorage.setItem('paquito-left-width', finalWidth);
        }
    });
}

function resetLayout() {
    if (!confirm('¿Restablecer el diseño original (50/50)?')) return;
    localStorage.removeItem('paquito-left-width');
    document.documentElement.style.setProperty('--left-width', '50%');
    toast('✓ Diseño restablecido', 'success');
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

// ── Overview Fetching ──
async function fetchOverview() {
    const data = await apiGet('/api/overview');
    if (!data) return;

    // Hub
    updateStatus('metric-hub-ram', data.hub?.ram);
    updateStatus('metric-hub-disk', data.hub?.disk);
    updateStatus('metric-hub-dns', data.hub?.dns);

    // Paquito
    updateStatus('metric-paquito-status', data.paquito?.status);
    const badge = $('#openclaw-badge');
    if (badge) {
        const status = data.paquito?.status || 'ERROR';
        badge.textContent = status;
        
        let badgeClass = 'badge-offline'; // Default: Rojo
        if (status === 'ONLINE') badgeClass = 'badge-online'; // Verde
        else if (status === 'TIMEOUT') badgeClass = 'badge-loading'; // Amarillo
        
        badge.className = `panel-badge ${badgeClass}`;
    }
    updateStatus('metric-paquito-ram', data.paquito?.ram);
    updateStatus('metric-paquito-disk', data.paquito?.disk);
    updateStatus('metric-paquito-dns', data.paquito?.dns);

    // Proxmox
    updateStatus('metric-proxmox-vms', data.proxmox?.vms);
    updateStatus('metric-proxmox-storage', data.proxmox?.storage);
}

function updateStatus(id, value) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    
    el.classList.remove('loading');
    
    if (value === 'ONLINE' || value === 'OK') {
        el.innerHTML = `🟢 ${value}`;
    } else if (value === 'OFFLINE' || value === 'FAIL') {
        el.innerHTML = `🔴 ${value}`;
    } else if (value === 'ERROR' || value === 'TIMEOUT') {
        el.innerHTML = `🟡 ${value}`;
    } else {
        el.innerHTML = value;
    }
}

// ── OpenClaw Controls ──
async function ocStatus() { await runAction('check_paquito_status'); }
async function ocRestart() {
    if (!confirm('¿Reiniciar OpenClaw de forma remota en CT 103?')) return;
    await runAction('restart_paquito_gateway');
    setTimeout(fetchOverview, 3000);
}
async function ocLogs() { await runAction('check_paquito_logs'); }

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

    const data = await apiPost('/api/terminal', { message });

    btn.disabled = false;
    btn.textContent = 'Enviar';

    if (data.success) {
        const modeLabel = data.mode === 'rules' ? '⚡ Reglas rápidas' : '🧠 llama.cpp';
        addChatMsg(`✅ Acción: ${data.action}\nModo: ${modeLabel}`, 'system');
        addChatMsg(data.output || 'Sin output', 'assistant');
        consoleLog(`$ ${data.action} [${data.mode}]`, 'prompt');
        consoleLog(data.output || 'Sin output');
        chatHistory.push({ role: 'assistant', content: `Ejecuté: ${data.action}` });
    } else {
        const errorMsg = data.error || 'Error procesando el comando';
        const modeLabel = data.mode ? (data.mode === 'rules' ? '⚡ Reglas' : '🧠 llama.cpp') : '';
        addChatMsg(`⚠ ${errorMsg}${modeLabel ? '\nModo: ' + modeLabel : ''}`, 'system');
        consoleLog(`Error: ${errorMsg}`, 'error');
    }
}

function addChatMsg(text, role) {
    const container = $('#chat-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    consoleClear();
    
    // Layout
    initResizer();
    
    // Restore tab state
    const activeTab = localStorage.getItem('paquito-active-tab') || 'terminal';
    switchTab(activeTab);

    fetchOverview();
    setInterval(fetchOverview, 10000);

    $('#chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });

    addChatMsg('¡Hola! Soy Paquito 🧠 Tu asistente de sistema. Escribe algo como "reinicia openclaw" o hazme una pregunta.', 'assistant');
});
