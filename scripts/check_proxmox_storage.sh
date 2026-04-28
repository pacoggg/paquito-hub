#!/bin/bash
# check_proxmox_storage.sh — Check Proxmox storage via SSH
SSH_KEY="/root/.ssh/id_ed25519"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
HOST="root@192.168.1.135"

ssh $SSH_OPTS $HOST "df -h && echo '--- PVE storage ---' && pvesm status" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "SSH_ERROR: exit code $EXIT_CODE"
fi
