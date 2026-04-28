// ============================================================
// Paquito Hub — Terminal Classifier Service
// Dual-mode: Action (rules + llama.cpp JSON) & Chat (llama.cpp conversational)
// ============================================================

const axios = require('axios');
const config = require('../config');
const { getAvailableActions } = require('./executor');

// ── Allowlist ──
const ALLOWLIST = [
    'check_hub_ram', 'check_hub_disk', 'check_hub_dns',
    'check_paquito_status', 'check_paquito_logs', 'restart_paquito_gateway',
    'check_paquito_ram', 'check_paquito_disk', 'check_paquito_dns',
    'check_proxmox_vms', 'check_proxmox_storage'
];

// ── Text normalizer (lowercase, remove accents, trim) ──
function normalize(text) {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// ── Action-intent keywords ──
// If the normalized message contains ANY of these, treat as action intent
const ACTION_KEYWORDS = [
    'reinicia', 'reiniciar', 'restart', 'relanza',
    'logs', 'ver logs', 'show logs',
    'estado', 'status', 'mira',
    'proxmox', 'vms', 'contenedores', 'maquinas',
    'storage', 'almacenamiento',
    'ram', 'memoria',
    'disco', 'disk',
    'dns',
    'check', 'comprueba', 'comprobar', 'verifica'
];

function looksLikeAction(text) {
    const norm = normalize(text);
    return ACTION_KEYWORDS.some(kw => norm.includes(kw));
}

// ── Fast Rules Classifier ──
const RULES = [
    { patterns: ['reinicia openclaw', 'reiniciar openclaw', 'reinicia paquito', 'reiniciar gateway', 'reinicia gateway', 'restart openclaw', 'restart paquito', 'restart gateway'], action: 'restart_paquito_gateway' },
    { patterns: ['logs paquito', 'logs openclaw', 'ver logs', 'mira logs', 'show logs'], action: 'check_paquito_logs' },
    { patterns: ['estado openclaw', 'estado paquito', 'paquito status', 'mira paquito', 'status openclaw', 'status paquito'], action: 'check_paquito_status' },
    { patterns: ['estado proxmox', 'ver proxmox', 'vms', 'contenedores', 'maquinas', 'mira proxmox'], action: 'check_proxmox_vms' },
    { patterns: ['storage proxmox', 'disco proxmox', 'almacenamiento proxmox'], action: 'check_proxmox_storage' },
    { patterns: ['ram paquito', 'memoria paquito'], action: 'check_paquito_ram' },
    { patterns: ['disco paquito'], action: 'check_paquito_disk' },
    { patterns: ['dns paquito'], action: 'check_paquito_dns' },
    { patterns: ['ram hub', 'memoria hub', 'ram server-web', 'ram servidor'], action: 'check_hub_ram' },
    { patterns: ['disco hub', 'disco server-web', 'disco servidor'], action: 'check_hub_disk' },
    { patterns: ['dns hub', 'dns server-web', 'dns servidor'], action: 'check_hub_dns' },
];

function classifyByRules(text) {
    const norm = normalize(text);
    for (const rule of RULES) {
        for (const pattern of rule.patterns) {
            if (norm.includes(pattern)) {
                return rule.action;
            }
        }
    }
    return null;
}

// ── llama.cpp Action Classifier (JSON mode) ──
async function classifyByLlama(userMessage) {
    const systemPrompt = `Eres un clasificador estricto de comandos para Paquito Hub. Devuelve SOLO JSON válido. No expliques nada. No inventes acciones. Solo puedes devolver una de estas acciones: ${ALLOWLIST.join(', ')}. Si el usuario pide reiniciar OpenClaw o Paquito, devuelve restart_paquito_gateway. Si no hay coincidencia clara devuelve {"action":"unknown"}.`;

    try {
        const res = await axios.post(config.llm.url, {
            model: config.llm.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0,
            max_tokens: 40
        }, { timeout: config.llm.timeout });

        const content = res.data.choices?.[0]?.message?.content?.trim();
        console.log('[Terminal] llama.cpp classifier response:', content);

        if (!content) return null;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.action || null;
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.error('[Terminal] llama.cpp classifier timeout');
            throw new Error('TIMEOUT');
        }
        console.error('[Terminal] llama.cpp classifier error:', error.message);
        return null;
    }
}

// ── llama.cpp Chat Mode (conversational, NO JSON) ──
async function chatWithLlama(userMessage) {
    const systemPrompt = `Eres Paquito, un asistente técnico local amigable. Ayudas a gestionar servidores Proxmox, contenedores LXC, OpenClaw y servicios de red. Respondes en español, de forma clara, concisa y útil. Si el usuario pide ejecutar algo, sugiérele que use un comando como "reinicia openclaw", "ram paquito", "estado proxmox", etc.`;

    try {
        const res = await axios.post(config.llm.url, {
            model: config.llm.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 300
        }, { timeout: config.llm.timeout });

        const content = res.data.choices?.[0]?.message?.content?.trim();
        console.log('[Terminal] llama.cpp chat response:', content?.substring(0, 100));

        return content || 'No he podido generar una respuesta.';
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.error('[Terminal] llama.cpp chat timeout');
            return 'La IA local ha tardado demasiado. Prueba de nuevo o usa un comando directo.';
        }
        console.error('[Terminal] llama.cpp chat error:', error.message);
        return 'No he podido conectar con la IA local. ¿Está corriendo llama.cpp?';
    }
}

// ── Main Terminal Handler (dual-mode) ──
async function processTerminal(message) {
    // Step 1: Try fast rules (always, regardless of intent)
    const rulesAction = classifyByRules(message);
    if (rulesAction && ALLOWLIST.includes(rulesAction)) {
        console.log(`[Terminal] Rules match: "${message}" -> ${rulesAction}`);
        return { type: 'action', mode: 'rules', action: rulesAction };
    }

    // Step 2: Check if it looks like an action intent
    if (looksLikeAction(message)) {
        // Try llama.cpp as action classifier
        try {
            const llamaAction = await classifyByLlama(message);

            if (llamaAction && llamaAction !== 'unknown' && ALLOWLIST.includes(llamaAction)) {
                console.log(`[Terminal] llama.cpp action match: "${message}" -> ${llamaAction}`);
                return { type: 'action', mode: 'llama.cpp', action: llamaAction };
            }
        } catch (err) {
            if (err.message === 'TIMEOUT') {
                return { type: 'error', mode: 'llama.cpp', error: 'La IA local ha tardado demasiado. Prueba con un comando más directo.' };
            }
        }

        // llama.cpp couldn't classify — fall through to chat
        console.log(`[Terminal] Action intent detected but no match, falling back to chat for: "${message}"`);
    }

    // Step 3: Chat mode — conversational response
    console.log(`[Terminal] Chat mode for: "${message}"`);
    const response = await chatWithLlama(message);
    return { type: 'chat', mode: 'llama.cpp', response };
}

module.exports = { processTerminal, classifyByRules, ALLOWLIST };
