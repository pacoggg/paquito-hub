#!/bin/bash
# restart_paquito_gateway.sh — Restart OpenClaw gateway on CT 103
SSH_KEY="/root/.ssh/id_ed25519"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
HOST="root@192.168.1.146"

ssh $SSH_OPTS $HOST "pkill -f 'openclaw gateway' || true; sleep 2; nohup openclaw gateway >/tmp/openclaw/gateway-manual.log 2>&1 & echo 'Gateway OpenClaw relanzado'" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "SSH_ERROR: exit code $EXIT_CODE"
fi
