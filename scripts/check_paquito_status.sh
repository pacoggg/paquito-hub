#!/bin/bash
# check_paquito_status.sh — Check OpenClaw process on CT 103
SSH_KEY="/root/.ssh/id_ed25519"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
HOST="root@192.168.1.146"

ssh $SSH_OPTS $HOST "hostname && pgrep -af openclaw || echo 'OpenClaw no detectado'" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "SSH_ERROR: exit code $EXIT_CODE"
fi
