#!/bin/bash

# ============================================================
# Paquito Hub — Install & Deploy Script
# Instalación rápida de producción para CT 102
# ============================================================

set -e

echo "[*] Iniciando despliegue de Paquito Hub..."

# 1. Dar permisos a los scripts
echo "[*] Dando permisos de ejecución a scripts..."
sh -c 'chmod +x scripts/*.sh'

# 2. Configurar acceso SSH para el contenedor
bash scripts/setup_ssh_access.sh

# 3. Instalar LLM rápido en CT 103 (idempotente)
echo "[*] Instalando LLM local en CT 103 (Paquito)..."
SSH_KEY="./ssh/id_ed25519"
if [ -f "$SSH_KEY" ]; then
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@192.168.1.146 "bash -s" < ./scripts/install_fast_llm.sh || {
        echo "[!] Advertencia: No se pudo instalar el LLM en CT 103."
        echo "[!] Puedes ejecutarlo manualmente: ssh root@192.168.1.146 'bash -s' < scripts/install_fast_llm.sh"
    }
else
    echo "[!] No se encontró clave SSH. Saltando instalación de LLM remoto."
fi

# 4. Levantar Docker Compose
echo "[*] Reiniciando contenedores Docker..."
docker compose down
docker compose up -d

echo "[*] Esperando a que el contenedor inicie (5s)..."
sleep 5

# 5. Verificar conexión SSH desde dentro del contenedor
echo "[*] Comprobando acceso SSH remoto a CT 103 desde el Hub..."
if docker exec paquito-hub ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@192.168.1.146 "hostname" > /dev/null 2>&1; then
    echo "[✓] Conexión SSH a CT 103 exitosa"
else
    echo "[!] Advertencia: No se pudo conectar por SSH al CT 103."
fi

echo "[*] Comprobando acceso SSH remoto a Proxmox desde el Hub..."
if docker exec paquito-hub ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@192.168.1.135 "hostname" > /dev/null 2>&1; then
    echo "[✓] Conexión SSH a Proxmox exitosa"
else
    echo "[!] Advertencia: No se pudo conectar por SSH a Proxmox."
fi

# 6. Verificar LLM desde Hub
echo "[*] Verificando conexión con LLM local..."
if curl -s --max-time 5 http://192.168.1.146:8080/v1/models | grep -q "model"; then
    echo "[✓] LLM local (llama.cpp) respondiendo correctamente"
else
    echo "[!] Advertencia: LLM local no responde. Revisa CT 103."
fi

# 7. Verificar salud del API
echo "[*] Comprobando API local..."
if curl -s http://localhost:3000/api/status | grep -q "ok"; then
    echo "[✓] API Local funcionando correctamente"
else
    echo "[!] Advertencia: El API local no responde correctamente"
fi

echo "============================================================"
echo "🚀 DESPLIEGUE FINALIZADO"
echo "============================================================"
echo "Paquito Hub desplegado correctamente en http://localhost:3000"
echo "LLM endpoint: http://192.168.1.146:8080/v1/chat/completions"
