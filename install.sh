#!/bin/bash

# ============================================================
# Paquito Hub — Install & Deploy Script
# Instalación rápida de producción para CT 102
# ============================================================

set -e

echo "[*] Iniciando despliegue de Paquito Hub..."

# 1. Dar permisos a los scripts
echo "[*] Dando permisos de ejecución a scripts..."
chmod +x scripts/*.sh

# 2. Configurar acceso SSH para el contenedor
bash scripts/setup_ssh_access.sh

# 3. Levantar Docker Compose
echo "[*] Reiniciando contenedores Docker..."
docker compose down
docker compose up -d

echo "[*] Esperando a que el contenedor inicie (5s)..."
sleep 5

# 4. Verificar conexión SSH desde dentro del contenedor
echo "[*] Comprobando acceso SSH remoto a CT 103 desde el Hub..."
if docker exec paquito-hub ssh root@192.168.1.146 "hostname" > /dev/null 2>&1; then
    echo "[✓] Conexión SSH exitosa (CT 103 responde)"
else
    echo "[!] Advertencia: No se pudo conectar por SSH al CT 103."
    echo "    Asegúrate de haber copiado la clave con ssh-copy-id"
fi

# 5. Verificar salud del API
echo "[*] Comprobando API local..."
if curl -s http://localhost:3000/api/status | grep -q "ok"; then
    echo "[✓] API Local funcionando correctamente"
else
    echo "[!] Advertencia: El API local no responde correctamente"
fi

echo "============================================================"
echo "🚀 DESPLIEGUE FINALIZADO"
echo "============================================================"
echo "Accede al Hub en: http://localhost:3000"
echo "Puedes ver los logs con: docker logs -f paquito-hub"
