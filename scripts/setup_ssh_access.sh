#!/bin/bash

# ============================================================
# Paquito Hub — SSH Setup Script
# Prepara las claves SSH para acceder a CT 103 desde el Hub
# ============================================================

set -e

SSH_DIR="./ssh"
TARGET_PAQUITO="192.168.1.146"
TARGET_PROXMOX="192.168.1.135"
KEY_FILE="$SSH_DIR/id_ed25519"

echo "[*] Preparando acceso SSH para Paquito Hub..."

# 1. Asegurar que existe la carpeta ssh/
mkdir -p "$SSH_DIR"

# 2. Generar clave SSH en root si no existe
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "[*] Generando nueva clave SSH en /root/.ssh/id_ed25519..."
    ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -q
else
    echo "[✓] Clave SSH existente encontrada en /root/.ssh/id_ed25519"
fi

# 3. Copiar la clave privada al volumen de Docker
echo "[*] Copiando clave a $KEY_FILE..."
cp ~/.ssh/id_ed25519 "$KEY_FILE"
cp ~/.ssh/id_ed25519.pub "$SSH_DIR/id_ed25519.pub"
chmod 600 "$KEY_FILE"

# 4. Generar known_hosts escaneando el destino
echo "[*] Añadiendo hosts a known_hosts..."
ssh-keyscan -H "$TARGET_PAQUITO" > "$SSH_DIR/known_hosts" 2>/dev/null
ssh-keyscan -H "$TARGET_PROXMOX" >> "$SSH_DIR/known_hosts" 2>/dev/null

echo "============================================================"
echo "✅ PREPARACIÓN SSH COMPLETADA"
echo "============================================================"
echo "Si algún host todavía no conoce esta clave, ejecuta:"
echo "ssh-copy-id -i ~/.ssh/id_ed25519.pub root@$TARGET_PAQUITO"
echo "ssh-copy-id -i ~/.ssh/id_ed25519.pub root@$TARGET_PROXMOX"
echo "============================================================"
