#!/bin/bash
# check_proxmox_vms.sh — List Proxmox CTs and VMs via SSH
SSH_KEY="/root/.ssh/id_ed25519"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
HOST="root@192.168.1.135"

echo "[DEBUG] Running proxmox VMs check..."
ssh $SSH_OPTS $HOST "pct list && echo '--- VMs QEMU ---' && qm list" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "SSH_ERROR: exit code $EXIT_CODE"
fi
