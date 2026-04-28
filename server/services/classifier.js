// ============================================================
// Paquito Hub — Classifier Service
// Uses Ollama to classify natural language into system actions
// ============================================================

const axios = require('axios');
const config = require('../config');
const { getAvailableActions } = require('./executor');

/**
 * Classify a natural language message into a system action using Ollama
 * @param {string} message - User's natural language message
 * @returns {Promise<{action: string, confidence: string}>}
 */
async function classify(message) {
    const availableActions = getAvailableActions();

    const prompt = `Eres un asistente de administración de sistemas. Tu trabajo es convertir mensajes en acciones del sistema.

Convierte este mensaje en una acción:
"${message}"

Opciones disponibles:
${availableActions.map(a => `- ${a}`).join('\n')}
- chat (si es una pregunta general o conversación)

Responde SOLO con un JSON válido, sin explicaciones ni markdown:
{ "action": "nombre_accion", "confidence": "high|medium|low" }`;

    try {
        const res = await axios.post(`${config.ollama.baseUrl}/api/generate`, {
            model: config.ollama.model,
            prompt,
            stream: false
        }, { timeout: 30000 });

        // Extract JSON from response (handle possible markdown wrapping)
        const responseText = res.data.response.trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return { action: 'chat', confidence: 'low' };
    } catch (error) {
        console.error('[Classifier] Error:', error.message);
        return { action: 'chat', confidence: 'low' };
    }
}

/**
 * Send a chat message to Ollama and get a response
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @returns {Promise<string>}
 */
async function chat(message, history = []) {
    try {
        const systemPrompt = `Eres Paquito, un asistente de administración de sistemas inteligente y amigable. 
Ayudas a gestionar servidores, contenedores, servicios como OpenClaw y Ollama. 
Respondes en español, de forma concisa y técnica pero cercana. 
Si te piden hacer algo en el sistema, indica qué acción ejecutarías.`;

        const res = await axios.post(`${config.ollama.baseUrl}/api/generate`, {
            model: config.ollama.model,
            prompt: `${systemPrompt}\n\nHistorial:\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}\n\nUsuario: ${message}\nPaquito:`,
            stream: false
        }, { timeout: 60000 });

        return res.data.response.trim();
    } catch (error) {
        console.error('[Chat] Error:', error.message);
        throw new Error('No se pudo conectar con Ollama. ¿Está corriendo el servicio?');
    }
}

module.exports = { classify, chat };
