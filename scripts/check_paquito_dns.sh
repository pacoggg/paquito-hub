#!/bin/bash
# check_paquito_dns.sh — Check DNS resolution on CT 103
SSH_KEY="/root/.ssh/id_ed25519"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
HOST="root@192.168.1.146"

ssh $SSH_OPTS $HOST "echo '--- resolv.conf ---'; cat /etc/resolv.conf; echo '--- DNS test ---'; getent hosts google.com || echo 'DNS falló en Paquito'" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "SSH_ERROR: exit code $EXIT_CODE"
fi
