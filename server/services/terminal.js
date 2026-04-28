// ============================================================
// Paquito Hub — Terminal Classifier Service
// Hybrid: fast JS rules + llama.cpp fallback
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

// ── llama.cpp Fallback Classifier ──
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
        console.log('[Terminal] llama.cpp raw response:', content);

        if (!content) return null;

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.action || null;
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.error('[Terminal] llama.cpp timeout');
            throw new Error('TIMEOUT');
        }
        console.error('[Terminal] llama.cpp error:', error.message);
        return null;
    }
}

// ── Main Terminal Classifier (hybrid) ──
async function classifyTerminal(message) {
    // Step 1: Try fast rules
    const rulesAction = classifyByRules(message);
    if (rulesAction && ALLOWLIST.includes(rulesAction)) {
        console.log(`[Terminal] Rules match: "${message}" -> ${rulesAction}`);
        return { mode: 'rules', action: rulesAction };
    }

    // Step 2: Try llama.cpp fallback
    try {
        const llamaAction = await classifyByLlama(message);

        if (!llamaAction || llamaAction === 'unknown') {
            return { mode: 'llama.cpp', action: null, error: 'No he entendido el comando o la acción no está permitida.' };
        }

        if (!ALLOWLIST.includes(llamaAction)) {
            console.warn(`[Terminal] llama.cpp returned non-allowed action: ${llamaAction}`);
            return { mode: 'llama.cpp', action: null, error: 'No he entendido el comando o la acción no está permitida.' };
        }

        console.log(`[Terminal] llama.cpp match: "${message}" -> ${llamaAction}`);
        return { mode: 'llama.cpp', action: llamaAction };
    } catch (err) {
        if (err.message === 'TIMEOUT') {
            return { mode: 'llama.cpp', action: null, error: 'La IA local ha tardado demasiado. Prueba con un comando más directo.' };
        }
        return { mode: 'llama.cpp', action: null, error: 'No he entendido el comando.' };
    }
}

module.exports = { classifyTerminal, classifyByRules, ALLOWLIST };
